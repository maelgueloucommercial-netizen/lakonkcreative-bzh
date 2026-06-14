#!/usr/bin/env node
/**
 * Pre-build script : récupère les images Wikipedia Commons pour la homepage.
 *
 * Pour le SITE_DOMAIN courant (lu dans astro.config.mjs ou env), :
 * 1. Charge le profile (wikiImageSubjects)
 * 2. Pour chaque sujet, requête Wikipedia API pour l'image principale
 * 3. Télécharge en /public/images/wiki/<slug>.jpg
 * 4. Génère /src/lib/site-wiki-images.ts avec les URLs locales
 *
 * Lancé via package.json en prebuild (best-effort, non-bloquant si offline).
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const ROOT = process.cwd();
const PUBLIC_IMAGES = path.join(ROOT, 'public', 'images', 'wiki');
const OUTPUT_TS = path.join(ROOT, 'src', 'lib', 'site-wiki-images.ts');

// Lit le domaine depuis astro.config.mjs (parsing simple)
function getDomain() {
  try {
    const cfg = fs.readFileSync(path.join(ROOT, 'astro.config.mjs'), 'utf-8');
    // Format: const SITE_URL = 'https://carces.fr'; → match ce const
    let m = cfg.match(/const\s+SITE_URL\s*=\s*['"]([^'"]+)['"]/);
    if (!m) {
      // Format alternatif: site: 'https://carces.fr'
      m = cfg.match(/site\s*:\s*['"]([^'"]+)['"]/);
    }
    if (!m) {
      // Lookup via package.json name
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
        const name = pkg.name; // ex: 'carces-fr'
        if (name && name !== '__SITE_PACKAGE_NAME__') {
          // carces-fr → carces.fr ; meuleuse-disqueuse-com → meuleuse-disqueuse.com
          return name.replace(/-(fr|com|eu|info|net|org)$/, '.$1');
        }
      } catch {}
      return null;
    }
    return m[1].replace(/^https?:\/\//, '').replace(/\/$/, '');
  } catch {
    return null;
  }
}

// Lit le profile depuis le fichier site-profile.ts (regex pour wikiImageSubjects)
function getWikiSubjects(domain) {
  try {
    const file = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'site-profile.ts'), 'utf-8');
    // Match: "<domain>": { ... wikiImageSubjects: [...] ... }
    const escaped = domain.replace(/\./g, '\\.');
    const re = new RegExp(`'${escaped}':\\s*\\{[\\s\\S]*?wikiImageSubjects:\\s*\\[([^\\]]+)\\]`, 'm');
    const match = file.match(re);
    if (!match) return [];
    const subjectsRaw = match[1];
    return [...subjectsRaw.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  } catch {
    return [];
  }
}

// Slugify un sujet
function slugify(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// HTTPS GET wrapper avec timeout (respecte la policy Wikimedia avec UA + email)
const UA = 'felleries-image-fetcher/1.0 (https://felleries.fr; contact@felleries.fr) NodeJS';
function httpsGet(url, timeoutMs = 10000, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': UA, 'Accept': '*/*' } }, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && redirectsLeft > 0 && res.headers.location) {
        return httpsGet(res.headers.location, timeoutMs, redirectsLeft - 1).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks), headers: res.headers }));
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// Sleep utility for rate limiting
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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

async function downloadImage(url, dest) {
  try {
    const res = await httpsGet(url, 10000);
    if (res.status !== 200) return false;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, res.body);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const domain = getDomain();
  if (!domain) {
    console.log('[wiki-fetch] No domain detected, skip');
    writeEmptyOutput();
    return;
  }
  console.log(`[wiki-fetch] domain = ${domain}`);
  const subjects = getWikiSubjects(domain);
  if (subjects.length === 0) {
    console.log('[wiki-fetch] No subjects in profile, skip');
    writeEmptyOutput();
    return;
  }
  console.log(`[wiki-fetch] ${subjects.length} subjects to try`);

  const results = {};
  for (const subject of subjects) {
    const slug = slugify(subject);
    const localPath = path.join(PUBLIC_IMAGES, `${slug}.jpg`);
    const localUrl = `/images/wiki/${slug}.jpg`;

    if (fs.existsSync(localPath)) {
      // Cached, skip
      results[subject] = localUrl;
      continue;
    }
    console.log(`  fetching "${subject}"...`);
    const wikiUrl = await fetchWikiImage(subject);
    if (!wikiUrl) {
      console.log(`    no image found`);
      await sleep(800); // anti-throttle
      continue;
    }
    // Plutôt que télécharger, on garde l'URL distante directement (CDN Wikimedia)
    // Cela évite les 429 et garde le bundle léger.
    results[subject] = wikiUrl;
    console.log(`    referenced → ${wikiUrl.slice(0, 80)}...`);
    await sleep(500); // anti-throttle entre subjects
  }
  writeOutput(results);
  console.log(`[wiki-fetch] done, ${Object.keys(results).length} images saved`);
}

function writeOutput(results) {
  const lines = [
    '// AUTO-GENERATED by scripts/fetch-wiki-images.mjs',
    `// Generated: ${new Date().toISOString()}`,
    `export const WIKI_IMAGES: Record<string, string> = ${JSON.stringify(results, null, 2)};`,
    '',
    'export function getWikiImage(subject: string): string | undefined {',
    '  return WIKI_IMAGES[subject];',
    '}',
    '',
  ];
  fs.mkdirSync(path.dirname(OUTPUT_TS), { recursive: true });
  fs.writeFileSync(OUTPUT_TS, lines.join('\n'), 'utf-8');
}

function writeEmptyOutput() {
  writeOutput({});
}

main().catch((e) => {
  console.warn('[wiki-fetch] error (non-fatal):', e.message);
  writeEmptyOutput();
});
