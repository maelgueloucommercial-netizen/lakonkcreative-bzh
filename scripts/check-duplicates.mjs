#!/usr/bin/env node
/**
 * Détecteur de duplication interne au build (item #58 roadmap).
 *
 * Pour chaque paire de fichiers Markdown du contenu, on calcule la
 * similarité par shingles 5-grams Jaccard. Si > 30%, on warn ; > 50%, on
 * fail le build.
 *
 * Cible : éviter le contenu paraphrasé entre fiches du même site (Google
 * pénalise la cannibalisation interne).
 *
 * Usage :
 *   node scripts/check-duplicates.mjs               # warn-only
 *   STRICT=1 node scripts/check-duplicates.mjs      # fail si >50%
 *
 * Intégré au build via package.json (post-build).
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../src/content/', import.meta.url));
const STRICT = !!process.env.STRICT;

const SHINGLE_SIZE = 5;
const WARN_THRESHOLD = 0.30; // 30%
const FAIL_THRESHOLD = 0.50; // 50%

function tokenize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function shingles(text, n = SHINGLE_SIZE) {
  const tokens = tokenize(text);
  const out = new Set();
  for (let i = 0; i + n <= tokens.length; i++) {
    out.add(tokens.slice(i, i + n).join(' '));
  }
  return out;
}

function jaccard(a, b) {
  let inter = 0;
  for (const s of a) if (b.has(s)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function stripFrontmatter(src) {
  return src.replace(/^---[\s\S]*?---\s*/, '');
}

async function* walkMd(dir) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); }
  catch { return; }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkMd(full);
    else if (entry.name.endsWith('.md')) yield full;
  }
}

async function main() {
  const files = [];
  for await (const f of walkMd(ROOT)) files.push(f);

  if (files.length === 0) {
    console.log('Aucun fichier MD trouvé.');
    return;
  }

  // Charge tous les contenus + shingles
  const docs = [];
  for (const f of files) {
    const src = await readFile(f, 'utf8');
    const body = stripFrontmatter(src);
    if (tokenize(body).length < 100) continue; // skip stubs
    docs.push({ file: relative(ROOT, f).replace(/\\/g, '/'), shingles: shingles(body) });
  }

  // Compare toutes les paires
  const warnings = [];
  const failures = [];
  for (let i = 0; i < docs.length; i++) {
    for (let j = i + 1; j < docs.length; j++) {
      const sim = jaccard(docs[i].shingles, docs[j].shingles);
      if (sim >= FAIL_THRESHOLD) {
        failures.push({ a: docs[i].file, b: docs[j].file, sim });
      } else if (sim >= WARN_THRESHOLD) {
        warnings.push({ a: docs[i].file, b: docs[j].file, sim });
      }
    }
  }

  if (warnings.length === 0 && failures.length === 0) {
    console.log(`✓ Pas de duplication interne détectée sur ${docs.length} fichiers (Jaccard ${SHINGLE_SIZE}-grams).`);
    return;
  }

  if (warnings.length > 0) {
    console.log(`⚠ ${warnings.length} paire(s) avec similarité ≥ ${WARN_THRESHOLD * 100}% :`);
    for (const w of warnings.sort((a, b) => b.sim - a.sim).slice(0, 20)) {
      console.log(`   ${(w.sim * 100).toFixed(1)}%  ${w.a}  ↔  ${w.b}`);
    }
  }

  if (failures.length > 0) {
    console.log(`\n✗ ${failures.length} paire(s) AU-DESSUS du seuil critique ${FAIL_THRESHOLD * 100}% :`);
    for (const f of failures.sort((a, b) => b.sim - a.sim).slice(0, 20)) {
      console.log(`   ${(f.sim * 100).toFixed(1)}%  ${f.a}  ↔  ${f.b}`);
    }
    if (STRICT) {
      console.error('\nBuild interrompu (STRICT=1). Corrige les duplications avant de redéployer.');
      process.exit(1);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
