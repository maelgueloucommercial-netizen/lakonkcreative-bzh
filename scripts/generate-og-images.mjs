#!/usr/bin/env node
/**
 * Génération d'OG images au build pour chaque région et chaque article
 * (item #50 roadmap).
 *
 * Approche pragmatique : on compose une PNG 1200×630 avec Sharp en partant
 * de l'image principale (régions/articles) ou d'un fond uni, et on superpose
 * un titre + branding "DaRocco" via SVG converti raster.
 *
 * Sortie : `public/og/<kind>/<slug>.png`. Le composant SEOHead lira ces
 * images (idéalement, on l'élargira plus tard pour pointer dessus quand
 * elles existent).
 *
 * Exécution :
 *   node scripts/generate-og-images.mjs
 *
 * Idempotent : skip si l'output existe déjà avec mtime ≥ source.
 */
import { readdir, stat, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, parse } from 'node:path';
import sharp from 'sharp';

const PROJECT = new URL('../', import.meta.url);
const PROJECT_PATH = PROJECT.pathname.replace(/^\//, '');
const CONTENT = join(PROJECT_PATH, 'src/content');
const PUBLIC_IMAGES = join(PROJECT_PATH, 'public/images');
const PUBLIC_OG = join(PROJECT_PATH, 'public/og');

const W = 1200;
const H = 630;

function escapeXml(s) {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

/** Découpe un titre en lignes pour le rendu SVG (max ~22 char/ligne). */
function wrap(text, maxChars = 22) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 4); // 4 lignes max
}

/**
 * Construit l'overlay SVG : un dégradé sombre en bas + titre + sous-titre + brand.
 */
function buildSvgOverlay(title, kicker) {
  const lines = wrap(title, 22);
  const lineHeight = 78;
  const startY = H - 80 - lines.length * lineHeight;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(26,20,17,0)"/>
        <stop offset="60%" stop-color="rgba(26,20,17,0.45)"/>
        <stop offset="100%" stop-color="rgba(26,20,17,0.92)"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <text x="60" y="80" font-family="Inter, sans-serif" font-size="22" fill="#f3d3c2" letter-spacing="3" font-weight="600">${escapeXml(kicker.toUpperCase())}</text>
    ${lines.map((l, i) =>
      `<text x="60" y="${startY + (i + 1) * lineHeight}" font-family="Cormorant Garamond, Georgia, serif" font-size="68" fill="#faf6ef" font-weight="600">${escapeXml(l)}</text>`,
    ).join('')}
    <text x="60" y="${H - 30}" font-family="Inter, sans-serif" font-size="20" fill="#e09075" letter-spacing="3" font-weight="600">DAROCCO.FR — ENCYCLOPÉDIE CUISINE ITALIENNE</text>
  </svg>`;
}

/**
 * Lit un .md pour extraire le front-matter minimal (titre + image éventuelle).
 */
async function readFrontmatter(path) {
  const src = await readFile(path, 'utf8');
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out = {};
  for (const raw of m[1].split(/\r?\n/)) {
    const km = raw.match(/^([a-zA-Z0-9_]+):\s*"?([^"\n]*?)"?\s*$/);
    if (km) out[km[1]] = km[2];
  }
  return out;
}

async function newer(src, dest) {
  try {
    const sa = await stat(src);
    const sb = await stat(dest);
    return sa.mtimeMs > sb.mtimeMs;
  } catch {
    return true;
  }
}

async function generateForCollection(collectionDir, kindLabel, subdir, titleField = 'name') {
  const dir = join(CONTENT, collectionDir);
  if (!existsSync(dir)) return 0;

  const outDir = join(PUBLIC_OG, subdir);
  await mkdir(outDir, { recursive: true });

  const files = await readdir(dir);
  let made = 0;
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const slug = file.replace(/\.md$/, '');
    const fmPath = join(dir, file);
    const fm = await readFrontmatter(fmPath);
    const title = fm[titleField] || fm.title || slug;

    const outPath = join(outDir, `${slug}.png`);
    const baseImagePath = fm.image
      ? join(PUBLIC_IMAGES, ...fm.image.replace(/^\/?images\//, '').split('/'))
      : null;

    // Skip si l'output est récent
    const srcs = [fmPath, ...(baseImagePath && existsSync(baseImagePath) ? [baseImagePath] : [])];
    let isNew = false;
    for (const s of srcs) if (await newer(s, outPath)) { isNew = true; break; }
    if (!isNew) continue;

    let pipeline;
    if (baseImagePath && existsSync(baseImagePath)) {
      pipeline = sharp(baseImagePath).rotate().resize({
        width: W,
        height: H,
        fit: 'cover',
        position: 'center',
      });
    } else {
      // Fond uni cream si pas d'image
      pipeline = sharp({
        create: {
          width: W,
          height: H,
          channels: 3,
          background: { r: 250, g: 246, b: 239 },
        },
      });
    }

    const overlay = Buffer.from(buildSvgOverlay(title, kindLabel));
    await pipeline.composite([{ input: overlay, top: 0, left: 0 }]).png({ quality: 85 }).toFile(outPath);
    made++;
    process.stdout.write(`✓ og/${subdir}/${slug}.png\n`);
  }
  return made;
}

async function main() {
  await mkdir(PUBLIC_OG, { recursive: true });

  const r1 = await generateForCollection('regions', 'Région d\'Italie', 'regions', 'name');
  const r2 = await generateForCollection('pates', 'Pâte italienne', 'pates', 'name');
  const r3 = await generateForCollection('blog', 'Article', 'blog', 'title');
  const r4 = await generateForCollection('produits', 'Catalogue B2B', 'produits', 'name');
  const r5 = await generateForCollection('lexique', 'Lexique culinaire italien', 'lexique', 'term');

  const total = r1 + r2 + r3 + r4 + r5;
  console.log(`\nOG images générées : ${total}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
