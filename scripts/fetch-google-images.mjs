#!/usr/bin/env node
/**
 * Pre-build script v2 : récupère les images Google (via Serper.dev) pour la
 * homepage + les articles, et génère deux fichiers TS :
 *   - src/lib/site-wiki-images.ts      (homepage / pages utilitaires)
 *   - src/lib/article-wiki-images.ts   (mapping slug → image)
 *
 * Différence avec fetch-wiki-images.mjs (legacy):
 *   - Source : Google Images via Serper API (cohérence visuelle parfaite)
 *   - Format : URLs wrappées dans wsrv.nl pour servir en WebP avec resize
 *   - Cache  : .google-image-cache.json (TTL 30 jours, évite re-fetch)
 *
 * Variables :
 *   SERPER_API_KEY (env)            — clé API Serper.dev (~50€/mois illimité)
 *   IMAGE_QUERY_SUFFIX (env, opt)   — suffixe ajouté aux queries (ex. "photo HD")
 *
 * Idempotent : si SERPER_API_KEY absent, ne fait rien (skip silencieux).
 * Le fichier site-wiki-images.ts d'origine est gardé si fetch échoue.
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const ROOT = process.cwd();
const OUTPUT_SITE_TS = path.join(ROOT, 'src', 'lib', 'site-wiki-images.ts');
const OUTPUT_ARTICLE_TS = path.join(ROOT, 'src', 'lib', 'article-wiki-images.ts');
const CACHE_FILE = path.join(ROOT, '.google-image-cache.json');
const CACHE_TTL_MS = 30 * 24 * 3600 * 1000; // 30 jours

// Source de SERPER_API_KEY : 1) env directe, 2) proxy via felleries-cron worker
const SERPER_API_KEY = process.env.SERPER_API_KEY;
const SERPER_PROXY_URL = process.env.SERPER_PROXY_URL ?? 'https://felleries-cron.mael-guelou-commercial.workers.dev/search-images';
const QUERY_SUFFIX = process.env.IMAGE_QUERY_SUFFIX ?? ''; // ex: ' photo'

// =============================================================================
// HELPERS
// =============================================================================

function getDomain() {
  try {
    const cfg = fs.readFileSync(path.join(ROOT, 'astro.config.mjs'), 'utf-8');
    let m = cfg.match(/const\s+SITE_URL\s*=\s*['"]([^'"]+)['"]/);
    if (!m) m = cfg.match(/site\s*:\s*['"]([^'"]+)['"]/);
    if (m) return m[1].replace(/^https?:\/\//, '').replace(/\/$/, '');
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
    return pkg.name?.replace(/-(fr|com|eu|info|net|org)$/, '.$1') ?? null;
  } catch { return null; }
}

function getWikiSubjects(domain) {
  try {
    const file = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'site-profile.ts'), 'utf-8');
    const escaped = domain.replace(/\./g, '\\.');
    const re = new RegExp(`'${escaped}':\\s*\\{[\\s\\S]*?wikiImageSubjects:\\s*\\[([^\\]]+)\\]`, 'm');
    const match = file.match(re);
    if (!match) return [];
    return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  } catch { return []; }
}

/** Wrappe une URL d'image dans wsrv.nl pour conversion WebP + resize.
 *  - w : largeur cible (px)
 *  - q : qualité (1-100)
 *  - output : format de sortie ('webp', 'jpg', 'png', 'avif')
 *  Doc : https://wsrv.nl/docs/
 */
function wsrvWrap(imgUrl, { w = 1200, q = 82, output = 'webp' } = {}) {
  // wsrv.nl supporte URL en clair (sans encode) tant qu'il n'y a pas de char spécial
  // dans la query string. On utilise quand même encodeURIComponent pour safety.
  const u = encodeURIComponent(imgUrl);
  return `https://wsrv.nl/?url=${u}&output=${output}&w=${w}&q=${q}&we`; // we = "webp without enlargement"
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function searchGoogleImages(query, count = 5) {
  // Mode 1 : SERPER_API_KEY en env direct → appel direct
  // Mode 2 : SERPER_PROXY_URL (default = felleries-cron worker) → proxy
  const useDirect = !!SERPER_API_KEY;
  const url = useDirect ? 'https://google.serper.dev/images' : SERPER_PROXY_URL;
  const headers = useDirect
    ? { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
  const payload = useDirect
    ? { q: query, num: count, gl: 'fr', hl: 'fr' }
    : { q: query, count, gl: 'fr', hl: 'fr' };
  const body = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'POST', headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try {
          const json = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
          resolve(json.images ?? []);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

/** Filtre les images : éviter SVG + dimensions raisonnables. */
function pickBestImage(images, { minW = 800, minH = 500 } = {}) {
  for (const img of images) {
    if (!img.imageUrl) continue;
    if (img.imageUrl.toLowerCase().endsWith('.svg')) continue; // wsrv ne convertit pas bien les SVG
    if (img.imageWidth && img.imageWidth < minW) continue;
    if (img.imageHeight && img.imageHeight < minH) continue;
    return img.imageUrl;
  }
  // fallback : première image disponible quelque soit la taille
  return images[0]?.imageUrl ?? null;
}

function loadCache() {
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    const cache = JSON.parse(raw);
    const now = Date.now();
    // Filtre les entrées expirées
    const valid = {};
    for (const [k, v] of Object.entries(cache)) {
      if (v && v.ts && now - v.ts < CACHE_TTL_MS) valid[k] = v;
    }
    return valid;
  } catch { return {}; }
}

function saveCache(cache) {
  try { fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2)); } catch {}
}

// =============================================================================
// SITE-LEVEL IMAGES (homepage / pages utilitaires)
// =============================================================================

async function fetchSiteImages(subjects, cache) {
  const results = {};
  for (const subject of subjects) {
    const cacheKey = `subject:${subject}`;
    if (cache[cacheKey]?.url) {
      results[subject] = cache[cacheKey].url;
      continue;
    }
    try {
      const query = subject + QUERY_SUFFIX;
      console.log(`  query Google Images: "${query}"`);
      const imgs = await searchGoogleImages(query, 5);
      const picked = pickBestImage(imgs);
      if (picked) {
        const wrapped = wsrvWrap(picked, { w: 1600, q: 85, output: 'webp' });
        results[subject] = wrapped;
        cache[cacheKey] = { url: wrapped, ts: Date.now() };
        console.log(`    ✓ ${picked.slice(0, 60)}...`);
      } else {
        console.log(`    ✗ no result`);
      }
      await sleep(300); // anti-throttle Serper
    } catch (e) {
      console.log(`    ! error: ${e.message}`);
    }
  }
  return results;
}

// =============================================================================
// ARTICLE-LEVEL IMAGES (mapping slug → image)
// =============================================================================

function listArticles() {
  const dir = path.join(ROOT, 'src', 'content', 'articles');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const slug = f.replace(/\.md$/, '');
      const raw = fs.readFileSync(path.join(dir, f), 'utf-8');
      const titleMatch = raw.match(/^title:\s*['"]?([^\n'"]+)['"]?/m);
      return { slug, title: titleMatch?.[1]?.trim() ?? slug };
    });
}

/** Pour chaque article : on cherche une image basée sur le titre principal.
 *  On limite à MAX_ARTICLES (Serper coûte 1 cred/query → budget contrôlé).
 */
async function fetchArticleImages(articles, cache, maxToFetch) {
  const results = {};
  let fetched = 0;
  for (const art of articles) {
    if (fetched >= maxToFetch) break;
    const cacheKey = `art:${art.slug}`;
    if (cache[cacheKey]?.url) {
      results[art.slug] = cache[cacheKey].url;
      continue;
    }
    if (cache[cacheKey]?.failed) continue; // déjà tenté, sans succès
    try {
      // Query courte = mot-clé principal extrait du titre
      const cleanTitle = art.title.replace(/[«»"',!?:.]/g, '').slice(0, 80);
      const query = cleanTitle + QUERY_SUFFIX;
      console.log(`  [${fetched + 1}/${maxToFetch}] "${art.slug.slice(0, 50)}"`);
      const imgs = await searchGoogleImages(query, 3);
      const picked = pickBestImage(imgs);
      if (picked) {
        const wrapped = wsrvWrap(picked, { w: 1600, q: 85, output: 'webp' });
        results[art.slug] = wrapped;
        cache[cacheKey] = { url: wrapped, ts: Date.now() };
      } else {
        cache[cacheKey] = { failed: true, ts: Date.now() };
      }
      fetched++;
      await sleep(250);
    } catch (e) {
      console.log(`    ! error: ${e.message}`);
    }
  }
  return results;
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const domain = getDomain();
  if (!domain) {
    console.log('[google-images] No domain detected, skip');
    return;
  }
  console.log(`[google-images] domain = ${domain}`);

  if (!SERPER_API_KEY && !SERPER_PROXY_URL) {
    console.log('[google-images] No SERPER_API_KEY or proxy, skip (keeping existing files)');
    return;
  }
  console.log(`[google-images] mode = ${SERPER_API_KEY ? 'direct API' : 'proxy via worker'}`);

  const cache = loadCache();
  const subjects = getWikiSubjects(domain);
  console.log(`[google-images] ${subjects.length} subjects + scanning articles...`);

  // 1) Site-level
  const siteResults = await fetchSiteImages(subjects, cache);
  writeSiteOutput(siteResults);
  console.log(`[google-images] site: ${Object.keys(siteResults).length} images`);

  // 2) Article-level (limite par défaut : 200 articles max)
  const articles = listArticles();
  const MAX_ARTICLES = parseInt(process.env.MAX_ARTICLE_IMAGES ?? '200', 10);
  console.log(`[google-images] articles: ${articles.length} found, fetching up to ${MAX_ARTICLES}`);
  const articleResults = await fetchArticleImages(articles, cache, MAX_ARTICLES);
  writeArticleOutput(articleResults);
  console.log(`[google-images] articles: ${Object.keys(articleResults).length} images`);

  saveCache(cache);
}

function writeSiteOutput(results) {
  const lines = [
    '// AUTO-GENERATED by scripts/fetch-google-images.mjs',
    `// Generated: ${new Date().toISOString()}`,
    `// Source: Google Images via Serper.dev, wrapped in wsrv.nl for WebP`,
    `export const WIKI_IMAGES: Record<string, string> = ${JSON.stringify(results, null, 2)};`,
    '',
    'export function getWikiImage(subject: string): string | undefined {',
    '  return WIKI_IMAGES[subject];',
    '}',
    '',
  ];
  fs.writeFileSync(OUTPUT_SITE_TS, lines.join('\n'));
}

function writeArticleOutput(results) {
  const lines = [
    '// AUTO-GENERATED by scripts/fetch-google-images.mjs',
    `// Generated: ${new Date().toISOString()}`,
    `export const ARTICLE_WIKI_IMAGES: Record<string, string> = ${JSON.stringify(results, null, 2)};`,
    '',
    'export const ARTICLE_PHRASES: Record<string, string> = {};',
    '',
    'export function getArticleImage(slug: string): string | undefined {',
    '  return ARTICLE_WIKI_IMAGES[slug];',
    '}',
    '',
  ];
  fs.writeFileSync(OUTPUT_ARTICLE_TS, lines.join('\n'));
}

main().catch((e) => {
  console.error('[google-images] fatal:', e.message);
  process.exit(0); // exit 0 → ne bloque pas le build
});
