#!/usr/bin/env node
/**
 * #45 master plan — Téléchargement local des fonts subset latin.
 *
 * Source : fontsource CDN (woff2 déjà subsetted).
 * Destination : public/fonts/ (servies en self-host, font-display:swap).
 *
 * Exécuter une fois par site : `node scripts/download-fonts.mjs`.
 * Idempotent — skip si fichier déjà présent.
 */
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const ROOT = process.cwd();
const FONTS_DIR = path.join(ROOT, 'public', 'fonts');
fs.mkdirSync(FONTS_DIR, { recursive: true });

const FONTS = [
  {
    name: 'inter-variable-latin.woff2',
    url: 'https://cdn.jsdelivr.net/fontsource/fonts/inter:vf@latest/latin-wght-normal.woff2',
  },
  {
    name: 'cormorant-garamond-latin.woff2',
    url: 'https://cdn.jsdelivr.net/fontsource/fonts/cormorant-garamond@latest/latin-400-normal.woff2',
  },
  {
    name: 'cormorant-garamond-latin-italic.woff2',
    url: 'https://cdn.jsdelivr.net/fontsource/fonts/cormorant-garamond@latest/latin-400-italic.woff2',
  },
];

function downloadOnce(url, dest, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'felleries-font-fetch/1.0' } }, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && redirectsLeft > 0 && res.headers.location) {
        res.resume();
        downloadOnce(res.headers.location, dest, redirectsLeft - 1).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode} on ${url}`));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        fs.writeFileSync(dest, Buffer.concat(chunks));
        resolve();
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(new Error('timeout')); });
  });
}

let downloaded = 0;
let skipped = 0;
for (const f of FONTS) {
  const dest = path.join(FONTS_DIR, f.name);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
    console.log(`skip ${f.name} (${(fs.statSync(dest).size / 1024).toFixed(1)} KB)`);
    skipped++;
    continue;
  }
  try {
    await downloadOnce(f.url, dest);
    console.log(`dl ${f.name} (${(fs.statSync(dest).size / 1024).toFixed(1)} KB)`);
    downloaded++;
  } catch (e) {
    console.warn(`fail ${f.name}: ${e.message}`);
  }
}
console.log(`\nDone: ${downloaded} downloaded, ${skipped} skipped.`);
