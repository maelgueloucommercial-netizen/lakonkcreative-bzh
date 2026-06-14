import { getCollection } from 'astro:content';
import { articleUrl } from '../lib/article-url';
import { SITE_CONFIG } from '../lib/site-config';

function getArticleUrl(d: Record<string, any>): string {
    return articleUrl(d);
}

export async function GET() {
  const articles = await getCollection('articles');
  articles.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
  const items = articles.slice(0, 50);

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: SITE_CONFIG.siteName,
    home_page_url: SITE_CONFIG.siteUrl,
    feed_url: `${SITE_CONFIG.siteUrl}/feed.json`,
    description: SITE_CONFIG.tagline,
    language: 'fr-FR',
    favicon: `${SITE_CONFIG.siteUrl}/favicon.svg`,
    icon: `${SITE_CONFIG.siteUrl}/favicon.svg`,
    items: items.map((a) => ({
      id: `${SITE_CONFIG.siteUrl}${getArticleUrl(a.data)}`,
      url: `${SITE_CONFIG.siteUrl}${getArticleUrl(a.data)}`,
      title: a.data.title,
      summary: a.data.description ?? '',
      date_published: a.data.pubDate.toISOString(),
      date_modified: (a.data.modifiedDate ?? a.data.pubDate).toISOString(),
      tags: a.data.tags ?? [],
      ...(a.data.heroImage && { image: a.data.heroImage }),
    })),
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: { 'Content-Type': 'application/feed+json; charset=utf-8' },
  });
}
