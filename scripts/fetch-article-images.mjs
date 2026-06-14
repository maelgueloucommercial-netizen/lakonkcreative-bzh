#!/usr/bin/env node
/**
 * Pre-build : fetch hero image Wikipedia Commons par article.
 *
 * 1. Walk src/content/articles/*.md
 * 2. Pour chaque article, extrait le proper noun principal du titre
 * 3. Dedupe les phrases uniques
 * 4. Fetch image Wikipedia pour chaque phrase (cache file)
 * 5. Génère src/lib/article-wiki-images.ts avec mapping slug → image URL
 *
 * Cap à 100 phrases par site pour limiter le temps de build.
 * Cache JSON local pour éviter les refetch.
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import matter from 'gray-matter';

const ROOT = process.cwd();
const ARTICLES_DIR = path.join(ROOT, 'src', 'content', 'articles');
const OUTPUT_TS = path.join(ROOT, 'src', 'lib', 'article-wiki-images.ts');
const CACHE_FILE = path.join(ROOT, '.article-wiki-cache.json');
const MAX_PHRASES = 100;
const STOPWORDS = new Set([
  'Le', 'La', 'Les', 'Un', 'Une', 'Des', 'Du', 'De', 'Et', 'Ou',
  'Mon', 'Ma', 'Mes', 'Pour', 'Avec', 'Dans', 'Sur', 'Comment',
  'Pourquoi', 'Quand', 'Que', 'Qui', 'Quel', 'Quelle', 'Quels',
  'Voir', 'Acheter', 'Choisir', 'Trouver', 'Découvrir', 'Decouvrez',
  'Découvrez', 'Visitez', 'Tester', 'Comparer', 'Réussir',
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet',
  'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]);

const UA = 'felleries-image-fetcher/1.0 (https://felleries.fr; contact@felleries.fr) NodeJS';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function httpsGet(url, timeoutMs = 10000, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': UA, 'Accept': '*/*' } }, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && redirectsLeft > 0 && res.headers.location) {
        return httpsGet(res.headers.location, timeoutMs, redirectsLeft - 1).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function extractMainProperNoun(title) {
  // 1. Composés tirets : "Seine-et-Marne", "Marne-la-Vallée", "Saint-Denis"
  const composeRe = /\b([A-ZÀ-ÝŒŸÆ][a-zà-ÿœæ]+(?:-(?:[a-zà-ÿœæ]+|[A-ZÀ-ÝŒŸÆ][a-zà-ÿœæ]+))+)\b/u;
  let m = title.match(composeRe);
  if (m && m[1].length >= 5 && !STOPWORDS.has(m[1].split('-')[0])) return m[1];
  // 2. 2-3 mots capitalisés : "Notre Dame", "Mont Blanc"
  const multiRe = /\b([A-ZÀ-ÝŒŸÆ][a-zà-ÿœæ]{2,}(?:\s+[A-ZÀ-ÝŒŸÆ][a-zà-ÿœæ]{2,}){1,2})\b/u;
  m = title.match(multiRe);
  if (m && m[1].length >= 5 && !STOPWORDS.has(m[1].split(/\s+/)[0])) return m[1];
  // 3. 1 seul mot capitalisé > 5 lettres
  const singleRe = /\b([A-ZÀ-ÝŒŸÆ][a-zà-ÿœæ]{4,})\b/u;
  m = title.match(singleRe);
  if (m && !STOPWORDS.has(m[1])) return m[1];
  return null;
}

async function fetchWikiImage(subject) {
  const apiUrl = `https://fr.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=original&titles=${encodeURIComponent(subject)}&format=json`;
  try {
    const res = await httpsGet(apiUrl, 6000);
    if (res.status !== 200) return null;
    const data = JSON.parse(res.body.toString('utf-8'));
    const pages = data?.query?.pages;
    if (!pages) return null;
    const firstPage = Object.values(pages)[0];
    return firstPage?.original?.source ?? null;
  } catch {
    return null;
  }
}

function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

function saveCache(cache) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
  } catch {}
}

function walkMd(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkMd(full));
    else if (e.isFile() && e.name.endsWith('.md')) out.push(full);
  }
  return out;
}

async function main() {
  if (!fs.existsSync(ARTICLES_DIR)) {
    console.log('[article-images] No articles dir, skip');
    writeOutput({}, {});
    return;
  }

  const files = walkMd(ARTICLES_DIR);
  console.log(`[article-images] ${files.length} articles found`);
  const slugToPhrase = {};
  const phraseToSlug = new Map();

  for (const file of files) {
    try {
      const raw = fs.readFileSync(file, 'utf-8');
      const { data } = matter(raw);
      if (!data.title || !data.slug) continue;
      // Skip if already has heroImage (legacy WP)
      if (data.heroImage) continue;
      const phrase = extractMainProperNoun(data.title);
      if (!phrase) continue;
      slugToPhrase[data.slug] = phrase;
      if (!phraseToSlug.has(phrase)) phraseToSlug.set(phrase, []);
      phraseToSlug.get(phrase).push(data.slug);
    } catch {}
  }

  const uniquePhrases = [...phraseToSlug.keys()];
  console.log(`[article-images] ${uniquePhrases.length} unique phrases (mapping ${Object.keys(slugToPhrase).length} articles)`);

  const cache = loadCache();
  const phraseToImage = { ...cache };

  let phrasesProcessed = 0;
  for (const phrase of uniquePhrases.slice(0, MAX_PHRASES)) {
    if (phrase in phraseToImage) continue; // cached (incl. null)
    const wikiUrl = await fetchWikiImage(phrase);
    phraseToImage[phrase] = wikiUrl ?? null;
    if (wikiUrl) console.log(`  ✓ "${phrase}" → ${wikiUrl.slice(0, 60)}...`);
    phrasesProcessed++;
    await sleep(500); // anti-throttle
    if (phrasesProcessed % 10 === 0) saveCache(phraseToImage);
  }
  saveCache(phraseToImage);

  // Build slug → image URL mapping
  const slugToImage = {};
  for (const [slug, phrase] of Object.entries(slugToPhrase)) {
    const url = phraseToImage[phrase];
    if (url) slugToImage[slug] = url;
  }

  console.log(`[article-images] done : ${Object.keys(slugToImage).length} articles ont une image`);
  writeOutput(slugToImage, slugToPhrase);
}

function writeOutput(slugToImage, slugToPhrase) {
  const lines = [
    '// AUTO-GENERATED by scripts/fetch-article-images.mjs',
    `// Generated: ${new Date().toISOString()}`,
    `export const ARTICLE_WIKI_IMAGES: Record<string, string> = ${JSON.stringify(slugToImage, null, 2)};`,
    '',
    `export const ARTICLE_PHRASES: Record<string, string> = ${JSON.stringify(slugToPhrase, null, 2)};`,
    '',
    'export function getArticleImage(slug: string): string | undefined {',
    '  return ARTICLE_WIKI_IMAGES[slug];',
    '}',
    '',
  ];
  fs.mkdirSync(path.dirname(OUTPUT_TS), { recursive: true });
  fs.writeFileSync(OUTPUT_TS, lines.join('\n'), 'utf-8');
}

main().catch((e) => {
  console.warn('[article-images] error (non-fatal):', e.message);
  writeOutput({}, {});
});
