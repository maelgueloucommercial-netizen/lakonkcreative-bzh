/**
 * Construit le glossaire de maillage interne au build.
 *
 * Lecture directe des front-matters Markdown (sans astro:content car ce module
 * tourne côté Vite/Node depuis astro.config.mjs, hors runtime Astro).
 *
 * Renvoie une liste plate { term, href, kind } où :
 *  - term : forme normalisée à matcher (FR ou IT, plus alias plausibles)
 *  - href : URL relative de la fiche
 *  - kind : 'region' | 'pate' | 'lexique' — utilisé pour styliser et trier la
 *    priorité (lexique < region < pate, le terme le plus spécifique gagne).
 *
 * Le matching se fait sur la forme exacte (insensible à la casse + accents).
 * Pas de variations morphologiques (pluriels) — c'est le rédacteur qui choisit
 * la forme canonique.
 *
 * Item #82 : anti-cross-linking entre sites du réseau. Le glossaire est
 * volontairement local au site courant (lecture des fichiers MD du même
 * projet). Si un autre site du réseau utilise le même plugin, son glossaire
 * sera distinct — pas de cross-linking accidentel possible.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../content/', import.meta.url));

/** Lecture YAML front-matter minimaliste — on extrait juste les champs utiles. */
function parseFrontMatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out = {};
  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, '');
    const km = line.match(/^([a-zA-Z0-9_]+):\s*"?([^"\n]*?)"?\s*$/);
    if (km) out[km[1]] = km[2];
  }
  return out;
}

async function listMd(dir) {
  try {
    const entries = await readdir(dir);
    return entries.filter((f) => f.endsWith('.md'));
  } catch {
    return [];
  }
}

async function loadCollection(name, slugFromFm) {
  const dir = join(ROOT, name);
  const files = await listMd(dir);
  const out = [];
  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const fm = parseFrontMatter(await readFile(join(dir, file), 'utf8'));
    out.push({ slug, fm, slugFromFm: slugFromFm?.(fm, slug) ?? slug });
  }
  return out;
}

export async function buildGlossary() {
  const [regions, pates, lex] = await Promise.all([
    loadCollection('regions'),
    loadCollection('pates'),
    loadCollection('lexique'),
  ]);

  const entries = [];

  for (const { slug, fm } of regions) {
    const href = `/regions/${slug}`;
    if (fm.name) entries.push({ term: fm.name, href, kind: 'region' });
    if (fm.nameItalian && fm.nameItalian !== fm.name) entries.push({ term: fm.nameItalian, href, kind: 'region' });
  }

  for (const { slug, fm } of pates) {
    const href = `/pates/${slug}`;
    if (fm.name) entries.push({ term: fm.name, href, kind: 'pate' });
    if (fm.nameItalian && fm.nameItalian !== fm.name) entries.push({ term: fm.nameItalian, href, kind: 'pate' });
  }

  for (const { slug, fm } of lex) {
    const href = `/lexique/${slug}`;
    if (fm.term) entries.push({ term: fm.term, href, kind: 'lexique' });
  }

  // Dédoublonnage sur (term lowercased, href). En cas de collision sur le même
  // terme, on garde l'entrée la plus prioritaire (pate > region > lexique).
  const KIND_PRIORITY = { pate: 3, region: 2, lexique: 1 };
  const byTerm = new Map();
  for (const e of entries) {
    if (!e.term || e.term.length < 3) continue;
    const key = e.term.toLowerCase();
    const existing = byTerm.get(key);
    if (!existing || KIND_PRIORITY[e.kind] > KIND_PRIORITY[existing.kind]) {
      byTerm.set(key, e);
    }
  }

  // Tri par longueur décroissante : on essaie de matcher les termes les plus
  // longs en premier ("Émilie-Romagne" avant "Romagne").
  return Array.from(byTerm.values()).sort((a, b) => b.term.length - a.term.length);
}
