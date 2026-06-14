/**
 * Sprint 11 — Génération OG images dynamiques (SVG → rendu rasterisé côté
 * crawler). Chaque article reçoit son OG-image personnalisée avec son titre
 * affiché en grand sur le thème du site.
 *
 * Endpoint : /og/<slug>.svg
 * Static, donc pré-rendue au build pour chaque article.
 */
import { getCollection } from 'astro:content';
import { SITE_CONFIG } from '../../lib/site-config';

export async function getStaticPaths() {
  const articles = await getCollection('articles');
  return articles.map((entry) => ({
    params: { slug: entry.data.slug },
    props: { entry },
  }));
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string));
}

function wrapText(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxCharsPerLine) {
      if (cur) lines.push(cur);
      cur = w;
      if (lines.length >= maxLines) break;
    } else {
      cur = cur ? cur + ' ' + w : w;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = lines[maxLines - 1].slice(0, maxCharsPerLine - 1) + '…';
  }
  return lines;
}

export async function GET({ props }: { props: { entry: { data: { title: string; description?: string; sponsored?: boolean } } } }) {
  const { entry } = props;
  const title = entry.data.title;
  const lines = wrapText(title, 32, 4);

  const primary = SITE_CONFIG.theme.colors.primary;
  const bgBase = SITE_CONFIG.theme.colors.bgBase;
  const text = SITE_CONFIG.theme.colors.text;
  const textMuted = SITE_CONFIG.theme.colors.textMuted;

  const sponsoredBadge = entry.data.sponsored
    ? `<rect x="40" y="40" width="200" height="40" rx="6" fill="${primary}" opacity="0.9"/>
       <text x="140" y="68" font-family="ui-sans-serif,sans-serif" font-size="18" font-weight="700" fill="white" text-anchor="middle" letter-spacing="2">SPONSORISÉ</text>`
    : '';

  const titleY = 200;
  const lineHeight = 70;
  const titleSvg = lines.map((l, i) => `<text x="60" y="${titleY + i * lineHeight}" font-family="ui-serif,Georgia,serif" font-size="54" font-weight="800" fill="${text}">${escapeXml(l)}</text>`).join('');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgBase}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${bgBase}" stop-opacity="0.95"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="20" height="630" fill="${primary}"/>
  <rect x="0" y="610" width="1200" height="20" fill="${primary}"/>
  ${sponsoredBadge}
  ${titleSvg}
  <text x="60" y="560" font-family="ui-sans-serif,sans-serif" font-size="22" font-weight="600" fill="${textMuted}">${escapeXml(SITE_CONFIG.siteName)}</text>
  <text x="60" y="590" font-family="ui-sans-serif,sans-serif" font-size="18" fill="${textMuted}">${escapeXml(SITE_CONFIG.siteUrl.replace(/^https?:\/\//, ''))}</text>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
