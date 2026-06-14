import { SITE_CONFIG } from '../lib/site-config';

/**
 * robots.txt fine-tuné (item #41 SEO master plan) :
 * - Block paramètres de recherche (`?q=`) : pages dynamiques sans valeur SEO
 * - Block ressources techniques (admin, api) si jamais elles apparaissent
 * - Block crawlers IA agressifs sauf GPTBot/ClaudeBot/PerplexityBot (managés via llms.txt)
 * - Préserve crawl pour bots Google/Bing standards
 */
export async function GET() {
  const txt = `# robots.txt — ${SITE_CONFIG.siteName}
# Sitemap principal :
Sitemap: ${SITE_CONFIG.siteUrl}/sitemap-index.xml

# Outils SEO / métriques (Ahrefs, Semrush, Majestic, Moz…) — explicitement BIENVENUS :
# les clients consultent les métriques de nos sites sur ces outils, on ne les bride pas.
User-agent: AhrefsBot
Allow: /
User-agent: SemrushBot
Allow: /
User-agent: MJ12bot
Allow: /
User-agent: DotBot
Allow: /
User-agent: rogerbot
Allow: /

# Bots IA — accepter mais respecter llms.txt
User-agent: GPTBot
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: anthropic-ai
Allow: /
User-agent: Google-Extended
Allow: /

# Tous les autres bots
User-agent: *
Allow: /

# Block paramètres de recherche (pas de valeur SEO, génère duplicate content)
Disallow: /*?q=
Disallow: /*&q=
Disallow: /recherche
Disallow: /search
Disallow: /*?s=

# Block pages techniques éventuelles
Disallow: /api/
Disallow: /admin/
Disallow: /_/
`;
  return new Response(txt, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
