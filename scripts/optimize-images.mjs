#!/usr/bin/env node
/**
 * Optimisation des images public/images/* en AVIF + WebP + JPEG fallback,
 * avec dimensions originales lues à la volée (item #46-47 roadmap).
 *
 * Sortie : pour chaque `foo.jpg`, on génère
 *   foo.avif    (qualité 50, 1.5x plus léger qu'AVIF default)
 *   foo.webp    (qualité 80, fallback Safari < 16.4 / vieux Edge)
 *   foo.meta.json  (width/height — pour éviter le CLS dans <img>)
 *
 * Idempotent : si la cible existe déjà avec une mtime ≥ source, skip.
 *
 * Usage :
 *   node scripts/optimize-images.mjs
 *
 * Intégré au build via package.json "build".
 */
import { readdir, stat, writeFile, mkdir } from 'node:fs/promises';
import { join, parse, relative } from 'node:path';
import sharp from 'sharp';

const ROOT = new URL('../public/images/', import.meta.url);
const ROOT_PATH = ROOT.pathname.replace(/^\//, '').replace(/\//g, '\\').startsWith('C:')
  ? ROOT.pathname.slice(1).replace(/\//g, '/') // Windows path normalization
  : ROOT.pathname;

const QUALITY_AVIF = 50;
const QUALITY_WEBP = 80;
const MAX_WIDTH = 1600; // les images régions sont en 16:9, 1600x900 suffit largement

/**
 * Watermark "darocco.fr" — anti-vol/attribution discrète (item #59 roadmap).
 * Petit texte serif en bas-droite, 4% opacity, couleur cream pour rester lisible
 * sur fonds sombres comme clairs. Composite via Sharp avant l'encodage final.
 */
function buildWatermarkSvg(width, height) {
  const fontSize = Math.max(11, Math.round(width / 110));
  const margin = Math.max(8, Math.round(width / 100));
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <text x="${width - margin}" y="${height - margin}" text-anchor="end"
        font-family="Cormorant Garamond, Georgia, serif" font-size="${fontSize}"
        font-style="italic" fill="#faf6ef" fill-opacity="0.55"
        stroke="#000000" stroke-width="0.3" stroke-opacity="0.25" paint-order="stroke">darocco.fr</text>
</svg>`);
}

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

async function newer(a, b) {
  try {
    const sa = await stat(a);
    const sb = await stat(b);
    return sa.mtimeMs > sb.mtimeMs;
  } catch {
    return true; // b absent → a is newer
  }
}

async function processOne(src) {
  const { dir, name } = parse(src);
  const avifOut = join(dir, `${name}.avif`);
  const webpOut = join(dir, `${name}.webp`);
  const metaOut = join(dir, `${name}.meta.json`);

  const force = process.argv.includes('--force');
  const needAvif = force || (await newer(src, avifOut));
  const needWebp = force || (await newer(src, webpOut));
  const needMeta = force || (await newer(src, metaOut));
  if (!needAvif && !needWebp && !needMeta) return { src, skipped: true };

  const img = sharp(src).rotate(); // applique l'EXIF orientation
  const meta = await img.metadata();
  const targetWidth = meta.width && meta.width > MAX_WIDTH ? MAX_WIDTH : meta.width;
  const targetHeight = targetWidth && meta.width && meta.height
    ? Math.round(meta.height * (targetWidth / meta.width))
    : meta.height;
  const resized = targetWidth ? img.resize({ width: targetWidth, withoutEnlargement: true }) : img;

  // Watermark composite (item #59) — appliqué APRÈS resize, AVANT encodage.
  const watermark = targetWidth && targetHeight
    ? buildWatermarkSvg(targetWidth, targetHeight)
    : null;
  const pipeline = watermark
    ? resized.composite([{ input: watermark, top: 0, left: 0 }])
    : resized;

  const tasks = [];
  if (needAvif) {
    tasks.push(pipeline.clone().avif({ quality: QUALITY_AVIF, effort: 4 }).toFile(avifOut));
  }
  if (needWebp) {
    tasks.push(pipeline.clone().webp({ quality: QUALITY_WEBP }).toFile(webpOut));
  }
  await Promise.all(tasks);

  if (needMeta) {
    // Recharger la meta après resize (au cas où on a downscale)
    const resizedMeta = targetWidth && meta.width && meta.width > MAX_WIDTH
      ? { width: targetWidth, height: Math.round((meta.height ?? 0) * (targetWidth / meta.width)) }
      : { width: meta.width, height: meta.height };
    await writeFile(metaOut, JSON.stringify(resizedMeta));
  }
  return { src, processed: true, width: meta.width, height: meta.height };
}

async function main() {
  const root = ROOT_PATH;
  let count = 0;
  let skipped = 0;
  const exts = new Set(['.jpg', '.jpeg', '.png']);
  for await (const file of walk(root)) {
    const ext = parse(file).ext.toLowerCase();
    if (!exts.has(ext)) continue;
    try {
      const r = await processOne(file);
      if (r.skipped) skipped++;
      else {
        count++;
        process.stdout.write(`✓ ${relative(root, file)}\n`);
      }
    } catch (e) {
      process.stderr.write(`✗ ${relative(root, file)}: ${e.message}\n`);
    }
  }
  console.log(`\nOptimisation terminée : ${count} traitée(s), ${skipped} déjà à jour.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
