/**
 * Classification CANONIQUE des articles en rubriques de blog.
 *
 * UNE SEULE source de vérité, partagée par :
 *  - /pages/categorie/[cat].astro  (pages de rubrique)
 *  - /pages/articles/index.astro   (sidebar des rubriques)
 *  - /pages/index.astro            (homepage : blog par rubrique)
 *  - /components/Header.astro       (méga-menu Rubriques)
 *
 * → garantit que les compteurs et les listes d'articles concordent PARTOUT.
 *
 * 3 passes (identiques à l'ancien getStaticPaths de [cat].astro) :
 *   1. keywords du titre   → profile.categories (premier match gagne)
 *   2. frontmatter category → crée la rubrique si absente
 *   3. fallback hash stable → répartit les orphelins (couverture 100 %, URLs inchangées)
 */
import type { CollectionEntry } from 'astro:content';
import { articleUrl as canonicalArticleUrl } from './article-url';

export type Article = CollectionEntry<'articles'>;

export interface ProfileCategory {
  slug: string;
  name: string;
  description: string;
  keywords: string[];
  emoji?: string;
}

export interface BlogCategory {
  slug: string;
  name: string;
  description: string;
  emoji?: string;
  articles: Article[];
}

/** URL canonique d'un article — délègue à la source unique pageType-aware
 *  (hub/faq/lexique → /dossier//faq//glossaire/, cf. lib/article-url.ts). */
export function articleUrl(entry: Article): string {
  const d = entry.data as any;
  return canonicalArticleUrl(d);
}

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

function slugify(s: string): string {
  return norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Hash déterministe d'une chaîne → 0..(n-1). Stable entre builds → cat fixe. */
function hashToIndex(s: string, n: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff;
  return h % Math.max(1, n);
}

/**
 * Construit la liste des rubriques avec leurs articles (triés du + récent au + ancien).
 * Ne renvoie que les rubriques NON vides. Logique strictement identique à l'ancien
 * getStaticPaths de categorie/[cat].astro (mêmes pages, mêmes compteurs).
 */
export function buildBlogCategories(
  articles: Article[],
  profileCategories?: ProfileCategory[],
): BlogCategory[] {
  const sorted = [...articles].sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
  const allCats = new Map<string, BlogCategory>();
  const matched = new Set<string>();

  // Pass 1 : keywords du titre → profile.categories (premier match gagne)
  if (profileCategories) {
    for (const cat of profileCategories) {
      allCats.set(cat.slug, { slug: cat.slug, name: cat.name, description: cat.description, emoji: cat.emoji, articles: [] });
    }
    for (const a of sorted) {
      const t = norm(a.data.title);
      let found: string | null = null;
      for (const cat of profileCategories) {
        for (const kw of cat.keywords) {
          if (t.includes(norm(kw))) { found = cat.slug; break; }
        }
        if (found) break;
      }
      if (found && allCats.has(found)) {
        allCats.get(found)!.articles.push(a);
        matched.add(a.data.slug);
      }
    }
  }

  // Pass 2 : frontmatter `category` (créées si absentes)
  for (const a of sorted) {
    if (!a.data.category) continue;
    const s = slugify(a.data.category);
    if (!s || allCats.has(s)) continue;
    allCats.set(s, { slug: s, name: a.data.category, description: '', articles: [] });
  }
  for (const a of sorted) {
    if (!a.data.category) continue;
    const s = slugify(a.data.category);
    const e = allCats.get(s);
    if (e && !e.articles.includes(a)) {
      e.articles.push(a);
      matched.add(a.data.slug);
    }
  }

  // Pass 3 : fallback hash stable pour les orphelins (couverture 100 %)
  if (profileCategories && profileCategories.length > 0) {
    const slugs = profileCategories.map((c) => c.slug);
    for (const a of sorted) {
      if (matched.has(a.data.slug)) continue;
      const idx = hashToIndex(a.data.slug, slugs.length);
      const e = allCats.get(slugs[idx]);
      if (e && !e.articles.includes(a)) {
        e.articles.push(a);
        matched.add(a.data.slug);
      }
    }
  }

  return [...allCats.values()].filter((c) => c.articles.length > 0);
}
