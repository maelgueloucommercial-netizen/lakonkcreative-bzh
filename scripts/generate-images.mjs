#!/usr/bin/env node
/**
 * Génération en batch des images de couverture pour les fiches darocco.
 *
 * Backends supportés :
 *   - Cloudflare Workers AI (Flux 1 Schnell) — DÉFAUT, GRATUIT, utilise le
 *     token wrangler local (~/.wrangler/config/default.toml).
 *     Quota free tier : ~10 000 neurones/jour ≈ 30 000 images.
 *   - Replicate Flux 1.1 Pro — qualité supérieure, $0.04/image. Utilisé si
 *     REPLICATE_API_TOKEN est défini.
 *
 * Usage :
 *   node scripts/generate-images.mjs                          # tout, CF Workers AI
 *   node scripts/generate-images.mjs regions                  # juste les régions
 *   node scripts/generate-images.mjs regions sicile           # une seule fiche
 *   node scripts/generate-images.mjs --force                  # re-génère même si image existe
 *   REPLICATE_API_TOKEN=r8_xxx node scripts/generate-images.mjs  # Replicate à la place
 */

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ACCOUNT_ID = '2f14298c51dd3c132b34e848ba617944';

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const TYPE_ARG = args.find((a) => !a.startsWith('--'));
const SLUG_ARG = args.filter((a) => !a.startsWith('--'))[1];

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
const BACKEND = REPLICATE_TOKEN ? 'replicate' : 'cloudflare';

let CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
if (BACKEND === 'cloudflare' && !CF_TOKEN) {
  // Lit ~/.wrangler/config/default.toml — extrait l'oauth_token
  try {
    const cfg = await readFile(join(homedir(), 'AppData/Roaming/xdg.config/.wrangler/config/default.toml'), 'utf8');
    const m = cfg.match(/^oauth_token\s*=\s*"([^"]+)"/m);
    if (m) CF_TOKEN = m[1];
  } catch {
    /* fall through */
  }
  if (!CF_TOKEN) {
    try {
      const cfg = await readFile(join(homedir(), '.wrangler/config/default.toml'), 'utf8');
      const m = cfg.match(/^oauth_token\s*=\s*"([^"]+)"/m);
      if (m) CF_TOKEN = m[1];
    } catch {
      /* */
    }
  }
}

if (BACKEND === 'cloudflare' && !CF_TOKEN) {
  console.error('❌ Pas de CLOUDFLARE_API_TOKEN ni de token wrangler trouvé.');
  console.error('   Lance `wrangler login` ou exporte CLOUDFLARE_API_TOKEN.');
  process.exit(1);
}

const TYPES = TYPE_ARG ? [TYPE_ARG] : ['regions', 'pates', 'lexique', 'produits', 'epiciers'];

console.log(`Backend : ${BACKEND}${BACKEND === 'cloudflare' ? ' (Flux Schnell, gratuit)' : ' (Replicate, $0.04/image)'}`);
console.log(`Types   : ${TYPES.join(', ')}`);
if (SLUG_ARG) console.log(`Slug    : ${SLUG_ARG}`);
if (FORCE) console.log(`Mode    : --force (re-génère même si image existe)`);
console.log('');

function buildPrompt(type, slug, frontmatter) {
  const common = ', professional food photography, magazine quality, golden hour lighting, italian rustic aesthetic, high detail, photorealistic, 35mm';
  const name = frontmatter.name ?? frontmatter.term ?? slug.replace(/-/g, ' ');
  if (type === 'regions') {
    const dish = frontmatter.specialties?.[0] ?? `traditional ${name} cuisine`;
    return `Authentic regional Italian dish: ${dish} from ${name}, on rustic wooden table with linen napkin, overhead shot${common}`;
  }
  if (type === 'pates') {
    const sauce = frontmatter.sauces?.[0] ?? 'simple traditional sauce';
    return `Bowl of authentic Italian ${name} pasta with ${sauce}, freshly made, steam visible, white ceramic plate, italian kitchen background${common}`;
  }
  if (type === 'lexique') {
    return `Italian cooking technique demonstration: ${name}, hands of an experienced chef, professional kitchen${common}`;
  }
  if (type === 'produits') {
    return `Authentic Italian ${frontmatter.category ?? 'food'} product: ${name}, on rustic wooden surface, italian deli aesthetic${common}`;
  }
  if (type === 'epiciers') {
    return `Italian deli storefront in France: traditional shop window with cured meats and cheeses, charming neighborhood${common}`;
  }
  return `Authentic Italian ${type}: ${name}${common}`;
}

async function generateCloudflare(prompt) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, steps: 4 }),
  });
  if (!res.ok) throw new Error(`CF Workers AI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  if (data.errors?.length) throw new Error(JSON.stringify(data.errors));
  // Réponse : { result: { image: "<base64-encoded-jpeg>" } }
  const b64 = data?.result?.image;
  if (!b64) throw new Error(`Pas de champ 'image' dans la réponse: ${JSON.stringify(data).slice(0, 200)}`);
  return Buffer.from(b64, 'base64');
}

async function generateReplicate(prompt) {
  const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${REPLICATE_TOKEN}`, 'Content-Type': 'application/json', Prefer: 'wait' },
    body: JSON.stringify({
      input: { prompt, aspect_ratio: '16:9', output_format: 'webp', output_quality: 85, safety_tolerance: 2 },
    }),
  });
  if (!res.ok) throw new Error(`Replicate ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  const url = Array.isArray(data.output) ? data.output[0] : data.output;
  if (!url) throw new Error('Pas d\'URL Replicate');
  const r2 = await fetch(url);
  if (!r2.ok) throw new Error(`Download ${r2.status}`);
  return Buffer.from(await r2.arrayBuffer());
}

async function generate(prompt) {
  if (BACKEND === 'replicate') return generateReplicate(prompt);
  return generateCloudflare(prompt);
}

function parseFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { frontmatter: {}, raw: '', body: md };
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    fm[kv[1]] = kv[2].trim().replace(/^["'](.*)["']$/, '$1');
  }
  const specMatch = m[1].match(/^specialties:\n((?:  - .*\n)+)/m);
  if (specMatch) fm.specialties = specMatch[1].split('\n').map((l) => l.replace(/^  - /, '').replace(/^["'](.*)["']$/, '$1').trim()).filter(Boolean);
  const sauceMatch = m[1].match(/^sauces:\n((?:  - .*\n)+)/m);
  if (sauceMatch) fm.sauces = sauceMatch[1].split('\n').map((l) => l.replace(/^  - /, '').replace(/^["'](.*)["']$/, '$1').trim()).filter(Boolean);
  return { frontmatter: fm, raw: m[0], body: md.slice(m[0].length) };
}

function injectImageInFrontmatter(raw, imagePath) {
  if (/^image:/m.test(raw)) {
    return raw.replace(/^image:.*$/m, `image: "${imagePath}"`);
  }
  return raw.replace(/\n---\n?$/, `\nimage: "${imagePath}"\n---\n`);
}

const ext = BACKEND === 'replicate' ? 'webp' : 'jpg';
let totalGenerated = 0;
let totalSkipped = 0;
let totalErrors = 0;

for (const type of TYPES) {
  const dir = join(ROOT, 'src', 'content', type);
  let entries;
  try {
    entries = await readdir(dir);
  } catch {
    console.log(`(skip) Dossier inexistant : ${dir}`);
    continue;
  }
  for (const fname of entries) {
    if (!fname.endsWith('.md')) continue;
    const slug = fname.replace(/\.md$/, '');
    if (SLUG_ARG && slug !== SLUG_ARG) continue;

    const filePath = join(dir, fname);
    const md = await readFile(filePath, 'utf8');
    const { frontmatter, raw, body } = parseFrontmatter(md);

    if (frontmatter.image && !FORCE) {
      console.log(`⏭️  ${type}/${slug} — déjà : ${frontmatter.image}`);
      totalSkipped++;
      continue;
    }

    const outImagePath = `/images/${type}/${slug}.${ext}`;
    const outImageFile = join(ROOT, 'public', 'images', type, `${slug}.${ext}`);

    try {
      console.log(`🎨 ${type}/${slug} …`);
      const prompt = buildPrompt(type, slug, frontmatter);
      const imageBuffer = await generate(prompt);
      await mkdir(dirname(outImageFile), { recursive: true });
      await writeFile(outImageFile, imageBuffer);
      const newRaw = injectImageInFrontmatter(raw, outImagePath);
      await writeFile(filePath, newRaw + body, 'utf8');
      totalGenerated++;
      console.log(`   ✓ → public${outImagePath} (${(imageBuffer.length / 1024).toFixed(0)} KB)`);
    } catch (e) {
      console.error(`   ❌ ${e.message}`);
      totalErrors++;
    }
  }
}

console.log(`\n=== Résumé ===`);
console.log(`Générées : ${totalGenerated}`);
console.log(`Skippées : ${totalSkipped}`);
console.log(`Erreurs  : ${totalErrors}`);
