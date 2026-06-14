/**
 * #29 master plan — i18n minimal helpers.
 *
 * Activé par site via `ENABLE_EN=1` au build (videoprojecteur, tout-reparer).
 * Sinon, locale FR uniquement.
 *
 * Stratégie de traduction des articles : le worker `felleries-cron` traduit
 * les articles via Workers AI / LLM et publie `/en/<slug>` en parallèle.
 * Ce module fournit juste les chaînes UI + helpers Astro.
 */
export type Locale = 'fr' | 'en';

const I18N_STRINGS: Record<string, Record<Locale, string>> = {
  'nav.home': { fr: 'Accueil', en: 'Home' },
  'nav.articles': { fr: 'Articles', en: 'Articles' },
  'nav.categories': { fr: 'Catégories', en: 'Categories' },
  'nav.about': { fr: 'À propos', en: 'About' },
  'nav.contact': { fr: 'Contact', en: 'Contact' },
  'article.readingTime': { fr: 'min de lecture', en: 'min read' },
  'article.updatedOn': { fr: 'Mis à jour le', en: 'Updated on' },
  'article.publishedOn': { fr: 'Publié le', en: 'Published on' },
  'article.faq': { fr: 'Questions fréquentes', en: 'Frequently asked questions' },
  'article.related': { fr: 'À lire aussi', en: 'Related reading' },
  'article.tldr': { fr: 'À retenir', en: 'TL;DR' },
  'feedback.question': { fr: 'Cet article vous a-t-il aidé ?', en: 'Was this article helpful?' },
  'feedback.yes': { fr: 'Oui', en: 'Yes' },
  'feedback.no': { fr: 'Non', en: 'No' },
  'feedback.thanks': { fr: 'Merci pour votre retour !', en: 'Thanks for your feedback!' },
  'comments.title': { fr: 'Commentaires', en: 'Comments' },
  'comments.submit': { fr: 'Publier', en: 'Post' },
  'comments.author': { fr: 'Votre prénom ou pseudo', en: 'Your name' },
  'comments.email': { fr: 'Email (privé)', en: 'Email (private)' },
  'comments.body': { fr: 'Votre commentaire…', en: 'Your comment…' },
  'newsletter.cta': { fr: 'Je m\'inscris', en: 'Subscribe' },
};

export function t(key: string, locale: Locale = 'fr'): string {
  return I18N_STRINGS[key]?.[locale] ?? I18N_STRINGS[key]?.fr ?? key;
}

export function detectLocale(pathname: string): Locale {
  return pathname.startsWith('/en/') || pathname === '/en' ? 'en' : 'fr';
}

export function localizedPath(path: string, locale: Locale): string {
  const clean = path.replace(/^\/en\//, '/').replace(/^\/$/, '/');
  if (locale === 'fr') return clean;
  return clean === '/' ? '/en/' : `/en${clean}`;
}

export function hreflangAlternates(siteUrl: string, pathname: string): Array<{ hreflang: string; href: string }> {
  const frPath = pathname.replace(/^\/en\//, '/').replace(/^\/en$/, '/');
  const enPath = pathname.startsWith('/en/') || pathname === '/en' ? pathname : (frPath === '/' ? '/en/' : `/en${frPath}`);
  return [
    { hreflang: 'fr', href: `${siteUrl}${frPath}` },
    { hreflang: 'en', href: `${siteUrl}${enPath}` },
    { hreflang: 'x-default', href: `${siteUrl}${frPath}` },
  ];
}
