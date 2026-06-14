// STUB par défaut — sera écrasé par scripts/fetch-article-images.mjs en prebuild.
// Ne pas modifier manuellement, ce fichier est régénéré à chaque build.
export const ARTICLE_WIKI_IMAGES: Record<string, string> = {};
export const ARTICLE_PHRASES: Record<string, string> = {};
export function getArticleImage(slug: string): string | undefined {
  return ARTICLE_WIKI_IMAGES[slug];
}
