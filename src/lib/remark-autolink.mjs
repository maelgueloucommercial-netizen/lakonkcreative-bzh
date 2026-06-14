/**
 * Sprint 10 v7 — Autolinking interne par extraction de noms propres.
 *
 * Les articles legacy WP n'ont pas de tags/categories extraits. On
 * construit le glossaire en cherchant des PHRASES NOMINALES DISTINCTIVES
 * dans les titres (noms propres, lieux composés, marques).
 *
 * Patterns détectés :
 *   - Composé "Mot-Mot" ou "Mot-Mot-Mot" (Seine-et-Marne, Marne-la-Vallée, La Ferté-Gaucher)
 *   - Acronymes capitalisés (DPE, RT2012, ...)
 *   - Suite de 2-3 mots capitalisés (Grisy Suisnes, Notre Dame)
 *
 * Match dans le body insensible au début de phrase (Seine-et-Marne match
 * que ce soit en début ou milieu de phrase) mais respecte les frontières
 * de mot.
 *
 * Limites :
 *   - 5 autolinks max par article
 *   - Chaque cible URL liée 1 fois max par article
 *   - Skip self-link
 *   - Skip dans headings, liens existants, code, raw HTML
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const MAX_AUTOLINKS_PER_ARTICLE = 5;
const MIN_PHRASE_LENGTH = 5;

// Mots à NE JAMAIS considérer comme noms propres distinctifs
const STOPWORDS = new Set([
  'Le', 'La', 'Les', 'Un', 'Une', 'Des', 'Du', 'De', 'Et', 'Ou',
  'Mon', 'Ma', 'Mes', 'Ton', 'Ta', 'Tes', 'Son', 'Sa', 'Ses',
  'Pour', 'Avec', 'Dans', 'Sur', 'Comment', 'Pourquoi', 'Quand',
  'Que', 'Qui', 'Quel', 'Quelle', 'Quels', 'Quelles',
  'Voir', 'Acheter', 'Choisir', 'Trouver', 'Découvrir', 'Decouvrez',
  'Découvrez', 'Visitez', 'Tester', 'Comparer', 'Réussir',
  'Ce', 'Cette', 'Ces', 'Cet', 'Tout', 'Tous', 'Toutes',
  'Notre', 'Votre', 'Leurs', 'Plus', 'Moins',
  // Mois français
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  // Adjectifs courants en début de titre
  'Meilleur', 'Meilleure', 'Top',
]);

let GLOSSARY_CACHE = null;

/**
 * Extrait les noms propres distinctifs d'un titre.
 * Heuristique :
 *   1. Mots composés avec tirets (Seine-et-Marne) → match prioritaire
 *   2. Suites de 2-3 mots capitalisés
 *   3. Acronymes 3+ lettres capitales
 */
function extractProperNouns(title) {
  const phrases = new Set();

  // 1. Composés avec tirets : "Seine-et-Marne", "Marne-la-Vallée", "La Ferté-Gaucher"
  const composeRegex = /\b([A-ZÀ-ÝŒŸÆ][a-zà-ÿœæ]+(?:-(?:[a-zà-ÿœæ]+|[A-ZÀ-ÝŒŸÆ][a-zà-ÿœæ]+))+)\b/gu;
  let m;
  while ((m = composeRegex.exec(title)) !== null) {
    const p = m[1];
    if (p.length >= MIN_PHRASE_LENGTH && !STOPWORDS.has(p.split('-')[0])) {
      phrases.add(p);
    }
  }

  // 2. Suites de 2-3 mots capitalisés "Grisy Suisnes", "Notre-Dame de Paris"
  const multiCapRegex = /\b([A-ZÀ-ÝŒŸÆ][a-zà-ÿœæ]{2,}(?:\s+[A-ZÀ-ÝŒŸÆ][a-zà-ÿœæ]{2,}){1,2})\b/gu;
  while ((m = multiCapRegex.exec(title)) !== null) {
    const p = m[1];
    const firstWord = p.split(/\s+/)[0];
    if (p.length >= MIN_PHRASE_LENGTH && !STOPWORDS.has(firstWord)) {
      phrases.add(p);
    }
  }

  // 3. Acronymes (3+ lettres capitales)
  const acronymRegex = /\b([A-Z]{3,})\b/g;
  while ((m = acronymRegex.exec(title)) !== null) {
    if (m[1].length >= MIN_PHRASE_LENGTH && !STOPWORDS.has(m[1])) {
      phrases.add(m[1]);
    }
  }

  return [...phrases];
}

function buildGlossary(articlesDir) {
  if (GLOSSARY_CACHE) return GLOSSARY_CACHE;

  const phraseToUrl = new Map(); // phrase → first article using it

  if (!fs.existsSync(articlesDir)) {
    GLOSSARY_CACHE = [];
    return GLOSSARY_CACHE;
  }

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          const raw = fs.readFileSync(full, 'utf-8');
          const { data } = matter(raw);
          if (!data.title || !data.slug) continue;

          let url = '/';
          if (data.dateUrlFormat !== false && data.urlYear && data.urlMonth && data.urlDay) {
            const m = String(data.urlMonth).padStart(2, '0');
            const d = String(data.urlDay).padStart(2, '0');
            url = `/${data.urlYear}/${m}/${d}/${data.slug}/`;
          } else if (data.urlPath) {
            url = `/${data.urlPath}/${data.slug}/`;
          } else {
            url = `/${data.slug}/`;
          }

          // Extract proper nouns from title
          const phrases = extractProperNouns(data.title);
          for (const phrase of phrases) {
            // Première occurrence gagne (article qui a ce nom dans son titre)
            if (!phraseToUrl.has(phrase)) {
              phraseToUrl.set(phrase, { url, slug: data.slug, phrase });
            }
          }
        } catch (_) { /* ignore parse errors */ }
      }
    }
  }
  walk(articlesDir);

  const all = [...phraseToUrl.values()];
  // Tri par longueur DESC pour matcher les plus spécifiques en premier
  all.sort((a, b) => b.phrase.length - a.phrase.length);
  GLOSSARY_CACHE = all;
  return all;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default function remarkAutolink(opts = {}) {
  const articlesDir = opts.articlesDir || path.resolve(process.cwd(), 'src/content/articles');

  return (tree, file) => {
    const glossary = buildGlossary(articlesDir);
    if (glossary.length === 0) return;

    const filename = file?.history?.[0] || '';
    const currentSlug = path.basename(filename, '.md');

    let autolinkCount = 0;
    const usedUrls = new Set();

    function visit(node, parent) {
      if (autolinkCount >= MAX_AUTOLINKS_PER_ARTICLE) return;
      if (!node) return;

      if (node.type === 'heading') return;
      if (node.type === 'link') return;
      if (node.type === 'code' || node.type === 'inlineCode') return;
      if (node.type === 'html') return;

      if (node.type === 'text' && node.value && node.value.length >= MIN_PHRASE_LENGTH) {
        for (const entry of glossary) {
          if (autolinkCount >= MAX_AUTOLINKS_PER_ARTICLE) break;
          if (entry.slug === currentSlug) continue;
          if (usedUrls.has(entry.url)) continue;

          // Match case-sensitive (proper nouns)
          const re = new RegExp(`(^|[^\\p{L}\\p{N}-])(${escapeRegex(entry.phrase)})(?=[^\\p{L}\\p{N}-]|$)`, 'u');
          const match = re.exec(node.value);
          if (!match) continue;

          const before = node.value.slice(0, match.index + match[1].length);
          const matched = match[2];
          const after = node.value.slice(match.index + match[1].length + matched.length);

          const linkNode = {
            type: 'link',
            url: entry.url,
            title: null,
            data: { hProperties: { className: ['autolink'] } },
            children: [{ type: 'text', value: matched }],
          };
          const newNodes = [];
          if (before) newNodes.push({ type: 'text', value: before });
          newNodes.push(linkNode);
          if (after) newNodes.push({ type: 'text', value: after });

          if (parent && Array.isArray(parent.children)) {
            const i = parent.children.indexOf(node);
            if (i >= 0) {
              parent.children.splice(i, 1, ...newNodes);
              autolinkCount++;
              usedUrls.add(entry.url);
              return;
            }
          }
        }
      }

      if (node.children && Array.isArray(node.children)) {
        const kids = [...node.children];
        for (const child of kids) visit(child, node);
      }
    }

    visit(tree, null);
  };
}
