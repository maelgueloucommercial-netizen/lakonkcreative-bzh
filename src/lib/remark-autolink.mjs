/**
 * Plugin remark — maillage interne automatique.
 *
 * À chaque build, on remplace la **première occurrence** de chaque terme du
 * glossaire (régions, pâtes, lexique) dans le corps Markdown par un lien
 * Markdown pointant vers la fiche correspondante.
 *
 * Garde-fous :
 *  - skip les fichiers dont l'URL canonique est égale à la cible (pas d'auto-lien)
 *  - skip les nœuds `code`, `inlineCode`, `link`, `linkReference`
 *  - une seule occurrence par terme et par fichier
 *  - un plafond global de `maxLinksPerFile` (3 par défaut) par fiche
 *  - matching sensible à la limite de mots (\b sur Unicode élargi)
 *
 * Source : item #42 de la roadmap réseau de sites.
 */
import { visit, SKIP } from 'unist-util-visit';
import { buildGlossary } from './autolink-glossary.mjs';

let GLOSSARY_PROMISE = null;

/**
 * Échappe les caractères spéciaux regex pour qu'un terme du glossaire soit
 * traité comme un littéral.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extrait le slug d'URL d'un fichier MD pour deviner sa fiche-cible et
 * éviter de l'auto-linker vers lui-même. Très approximatif mais suffisant
 * (il s'agit juste d'éviter "Toscane" → /regions/toscane sur la page
 * /regions/toscane elle-même).
 */
function ownHrefFromHistory(file) {
  const hist = file?.history?.[0] ?? '';
  const m = hist.replace(/\\/g, '/').match(/\/content\/(regions|pates|lexique)\/([^/]+)\.md$/);
  if (!m) return null;
  const [, kind, slug] = m;
  return `/${kind === 'pates' ? 'pates' : kind}/${slug}`;
}

export function remarkAutolink({ maxLinksPerFile = 3 } = {}) {
  return async function transformer(tree, file) {
    if (!GLOSSARY_PROMISE) GLOSSARY_PROMISE = buildGlossary();
    const glossary = await GLOSSARY_PROMISE;

    const ownHref = ownHrefFromHistory(file);
    const used = new Set(); // hrefs déjà placés dans cette fiche
    let placed = 0;

    visit(tree, 'text', (node, index, parent) => {
      if (placed >= maxLinksPerFile) return;
      if (!parent || index === undefined) return;
      // Ne pas linker à l'intérieur d'un lien existant ni d'un titre
      if (parent.type === 'link' || parent.type === 'linkReference' || parent.type === 'heading') return;
      if (!node.value || node.value.length < 3) return;

      for (const entry of glossary) {
        if (placed >= maxLinksPerFile) break;
        if (used.has(entry.href)) continue;
        if (ownHref && entry.href === ownHref) continue;

        // Frontière de mot Unicode pragmatique : ni lettre/chiffre adjacente.
        // \p{L} et \p{N} couvrent les accents et le grec (ricotta, etc.).
        // Matching **sensible à la casse pour les régions** uniquement :
        // les noms propres italiens (Marche, Molise…) sont toujours capitalisés,
        // donc on évite la collision avec des mots français courants
        // (verbe "marche"). Lexique et pâtes restent insensibles pour
        // attraper "al dente", "mantecatura", "tagliatelle" en milieu de
        // phrase.
        const flags = entry.kind === 'region' ? 'u' : 'iu';
        const re = new RegExp(`(?<![\\p{L}\\p{N}])(${escapeRegex(entry.term)})(?![\\p{L}\\p{N}])`, flags);
        const match = node.value.match(re);
        if (!match) continue;

        const start = match.index;
        const end = start + match[0].length;
        const before = node.value.slice(0, start);
        const matched = node.value.slice(start, end);
        const after = node.value.slice(end);

        const newNodes = [];
        if (before) newNodes.push({ type: 'text', value: before });
        newNodes.push({
          type: 'link',
          url: entry.href,
          data: {
            hProperties: {
              class: `autolink autolink-${entry.kind}`,
              'data-autolink': entry.kind,
            },
          },
          children: [{ type: 'text', value: matched }],
        });
        if (after) newNodes.push({ type: 'text', value: after });

        parent.children.splice(index, 1, ...newNodes);
        used.add(entry.href);
        placed += 1;
        // On a muté parent.children — on saute le sous-arbre pour que visit()
        // ne reparcoure pas les nœuds qu'on vient d'insérer.
        return [SKIP, index + newNodes.length];
      }
    });
  };
}
