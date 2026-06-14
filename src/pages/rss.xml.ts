import { getCollection } from 'astro:content';
import { SITE_CONFIG } from '../lib/site-config';
import { articleUrl } from '../lib/article-url';
import { getArticleImage } from '../lib/article-wiki-images';
import { WIKI_IMAGES } from '../lib/site-wiki-images';

// pageType-aware (hub/faq/lexique → /dossier//faq//glossaire/). Source unique : article-url.ts
const getArticleUrl = (d: Record<string, any>): string => articleUrl(d as any);

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

// Cascade hero IDENTIQUE au layout Article.astro (heroImage frontmatter → Wikipedia par
// slug → fallback site-level rotatif). Sert l'auto-publish Pinterest (RSS → Épingles) :
// chaque item DOIT porter une image, sinon Pinterest saute l'item.
function pickSiteHeroFallback(slug: string): string | undefined {
  const subjects = SITE_CONFIG.profile?.wikiImageSubjects ?? [];
  if (subjects.length === 0) return undefined;
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) & 0xffffff;
  for (let i = 0; i < subjects.length; i++) {
    const img = WIKI_IMAGES[subjects[(hash + i) % subjects.length]];
    if (img) return img;
  }
  return undefined;
}

function resolveHero(data: Record<string, any>): string | undefined {
  const raw = data.heroImage ?? getArticleImage(data.slug) ?? pickSiteHeroFallback(data.slug);
  if (!raw) return undefined;
  // Pinterest n'accepte pas le SVG comme visuel d'Épingle → on saute (pas d'image plutôt qu'une cassée).
  if (/\.svg($|\?)/i.test(raw)) return undefined;
  return raw.startsWith('http') ? raw : `${SITE_CONFIG.siteUrl}${raw.startsWith('/') ? '' : '/'}${raw}`;
}

function mimeFor(url: string): string {
  if (/\.png($|\?)/i.test(url)) return 'image/png';
  if (/\.webp($|\?)/i.test(url)) return 'image/webp';
  if (/\.gif($|\?)/i.test(url)) return 'image/gif';
  return 'image/jpeg';
}

export async function GET() {
  const articles = await getCollection('articles');
  articles.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
  const items = articles.slice(0, 50);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(SITE_CONFIG.siteName)}</title>
    <link>${SITE_CONFIG.siteUrl}</link>
    <description>${escapeXml(SITE_CONFIG.tagline)}</description>
    <language>fr-FR</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_CONFIG.siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
${items.map((a) => {
  const img = resolveHero(a.data as Record<string, any>);
  const imgTags = img
    ? `\n      <enclosure url="${escapeXml(img)}" type="${mimeFor(img)}" length="0" />\n      <media:content url="${escapeXml(img)}" medium="image" />`
    : '';
  return `    <item>
      <title>${escapeXml(a.data.title)}</title>
      <link>${SITE_CONFIG.siteUrl}${getArticleUrl(a.data)}</link>
      <guid isPermaLink="true">${SITE_CONFIG.siteUrl}${getArticleUrl(a.data)}</guid>
      <pubDate>${a.data.pubDate.toUTCString()}</pubDate>
      <description>${escapeXml(a.data.description ?? '')}</description>${imgTags}
    </item>`;
}).join('\n')}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
