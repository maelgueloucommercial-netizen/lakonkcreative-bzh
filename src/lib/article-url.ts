/**
 * Résolveur d'URL canonique pour une entrée `articles`.
 *
 * IMPORTANT (pré-publication) : les types éditoriaux hub/faq/lexique ont des
 * routes dédiées (/dossier/, /faq/, /glossaire/) ; le reste est date-based ou
 * flat. Toute surface qui construit un lien vers un article (sitemap, RSS,
 * feed.json, llms.txt, SeeAlso, RecentlyRead, maillage hub) DOIT passer par
 * cette fonction — sinon les pages hub/faq/lexique seraient liées en URL flat
 * (404). Source unique de vérité pour éviter la duplication de logique.
 */
export interface ArticleLikeData {
  slug: string;
  dateUrlFormat?: boolean;
  urlYear?: string | number;
  urlMonth?: string | number;
  urlDay?: string | number;
  urlPath?: string;
  pageType?: 'article' | 'hub' | 'faq' | 'lexique';
}

export function articleUrl(d: ArticleLikeData): string {
  const pt = d.pageType ?? 'article';
  if (pt === 'faq') return `/faq/${d.slug}/`;
  if (pt === 'lexique') return `/glossaire/${d.slug}/`;
  if (pt === 'hub') return `/dossier/${d.slug}/`;
  if (d.dateUrlFormat) {
    return `/${d.urlYear}/${String(d.urlMonth).padStart(2, '0')}/${String(d.urlDay).padStart(2, '0')}/${d.slug}/`;
  }
  return d.urlPath ? `/${d.urlPath}/${d.slug}/` : `/${d.slug}/`;
}
