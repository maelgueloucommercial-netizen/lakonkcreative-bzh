import { getCollection } from 'astro:content';
import { articleUrl } from '../lib/article-url';
import { SITE_CONFIG } from '../lib/site-config';

/**
 * llms.txt — standard émergent (similar à robots.txt mais pour LLMs).
 * Permet aux crawlers IA (GPTBot, ClaudeBot, PerplexityBot, etc.) de
 * trouver un index propre des contenus avec contexte éditorial.
 *
 * Spec : https://llmstxt.org/
 */
export async function GET() {
  const profile = SITE_CONFIG.profile;
  const articles = await getCollection('articles');
  articles.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());

  function getArticleUrl(entry: typeof articles[number]): string {
    const d = entry.data;
        return articleUrl(d);
  }

  const top = articles.slice(0, 50);

  const lines: string[] = [];
  lines.push(`# ${SITE_CONFIG.siteName}`);
  lines.push('');
  lines.push(`> ${profile?.positioning ?? SITE_CONFIG.tagline}`);
  lines.push('');
  if (profile?.mission) {
    lines.push(profile.mission);
    lines.push('');
  }
  if (profile?.author?.name) {
    lines.push(`Auteur principal : ${profile.author.name}${profile.author.role ? ` — ${profile.author.role}` : ''}`);
    if (profile.author.credentials) lines.push(`Crédibilité : ${profile.author.credentials}`);
    lines.push('');
  }

  lines.push('## Articles récents');
  lines.push('');
  for (const a of top) {
    const url = `${SITE_CONFIG.siteUrl}${getArticleUrl(a)}`;
    const desc = (a.data.description ?? '').replace(/\s+/g, ' ').slice(0, 160);
    lines.push(`- [${a.data.title}](${url})${desc ? `: ${desc}` : ''}`);
  }
  lines.push('');

  if (profile?.categories && profile.categories.length > 0) {
    lines.push('## Catégories');
    lines.push('');
    for (const c of profile.categories) {
      lines.push(`- [${c.name}](${SITE_CONFIG.siteUrl}/categorie/${c.slug}/): ${c.description}`);
    }
    lines.push('');
  }

  lines.push('## Pages clés');
  lines.push('');
  lines.push(`- [À propos](${SITE_CONFIG.siteUrl}/a-propos/)`);
  lines.push(`- [Équipe éditoriale](${SITE_CONFIG.siteUrl}/equipe-editoriale/)`);
  lines.push(`- [Charte éditoriale](${SITE_CONFIG.siteUrl}/charte-editoriale/)`);
  lines.push(`- [Contact](${SITE_CONFIG.siteUrl}/contact/)`);
  lines.push('');

  lines.push('## Licence');
  lines.push('');
  lines.push(`Contenu original. Citation autorisée avec lien actif vers la source. © ${new Date().getFullYear()} ${SITE_CONFIG.siteName}.`);

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
