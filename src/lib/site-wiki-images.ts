// STUB par défaut — sera écrasé par scripts/fetch-wiki-images.mjs en prebuild.
export const WIKI_IMAGES: Record<string, string> = {};
export function getWikiImage(subject: string): string | undefined {
  return WIKI_IMAGES[subject];
}
