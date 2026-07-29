/**
 * Retire du sitemap les pages qui portent `noindex`.
 *
 * Pourquoi : 919 pages du réseau sont en `noindex` ET listées dans le sitemap.
 * Google les signale en « URL envoyée avec la balise noindex » — une erreur de
 * couverture dans la Search Console, et surtout du budget de crawl dépensé sur
 * des pages qu'on lui demande de ne pas indexer.
 *
 * Pourquoi en POST-TRAITEMENT plutôt que via `filter:` de @astrojs/sitemap :
 * le filtre ne reçoit qu'une URL, il faudrait donc rejouer la règle d'URL du
 * dépôt (`article-url.ts`, `dateUrlFormat`, `urlPath`…) pour savoir à quel
 * fichier elle correspond. Ces règles diffèrent d'un site à l'autre. Ici on lit
 * le HTML RÉELLEMENT produit : la question « cette page est-elle en noindex ? »
 * a une réponse directe, la même partout.
 *
 * ⚠️ Le hook ne lève JAMAIS : une exception ici casserait le build, et un build
 * cassé gèle le site en silence. En cas de pépin, on n'a rien fait, c'est tout.
 * ⚠️ Doit être déclaré APRÈS `sitemap()` : les hooks tournent dans l'ordre
 * d'enregistrement, et il faut que le sitemap existe pour le corriger.
 */
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';

const NOINDEX = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i;

async function fichiers(racine, filtre) {
  const out = [];
  async function descendre(d) {
    for (const e of await fs.readdir(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await descendre(p);
      else if (filtre(e.name)) out.push(p);
    }
  }
  await descendre(racine);
  return out;
}

export default function sitemapSansNoindex() {
  return {
    name: 'sitemap-sans-noindex',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        try {
          const racine = fileURLToPath(dir);
          const plans = (await fichiers(racine, (n) => /^sitemap.*\.xml$/.test(n)))
            .filter((p) => !p.endsWith('sitemap-index.xml'));
          if (!plans.length) return;

          // 1. les chemins des pages en noindex, lus dans le HTML produit
          const exclus = new Set();
          for (const p of await fichiers(racine, (n) => n.endsWith('.html'))) {
            const html = await fs.readFile(p, 'utf8');
            if (!NOINDEX.test(html)) continue;
            let rel = path.relative(racine, p).split(path.sep).join('/');
            rel = rel.replace(/index\.html$/, '').replace(/\.html$/, '');
            exclus.add('/' + rel.replace(/^\/+/, ''));
          }
          if (!exclus.size) return;

          // 2. on les retire des plans
          let retires = 0;
          for (const p of plans) {
            const xml = await fs.readFile(p, 'utf8');
            const neuf = xml.replace(/<url>[\s\S]*?<\/url>/g, (bloc) => {
              const loc = /<loc>(?:<!\[CDATA\[)?([^<\]]+)/.exec(bloc);
              if (!loc) return bloc;
              let chemin;
              try {
                chemin = new URL(loc[1]).pathname;
              } catch {
                return bloc;
              }
              if (!exclus.has(chemin)) return bloc;
              retires += 1;
              return '';
            });
            if (neuf !== xml) await fs.writeFile(p, neuf, 'utf8');
          }
          logger?.info?.(`sitemap : ${retires} URL(s) en noindex retirée(s)`);
        } catch (e) {
          // volontairement silencieux : jamais au prix du build
          logger?.warn?.(`sitemap-sans-noindex ignoré : ${e?.message ?? e}`);
        }
      },
    },
  };
}
