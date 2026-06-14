import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import remarkAutolink from './src/lib/remark-autolink.mjs';
import remarkImgAttrs from './src/lib/remark-img-attrs.mjs';

// SITE CONFIG — sera customisé par le script de migration
// (variables remplacées par la lib migrate-legacy-site.ts)
const SITE_URL = 'https://lakonkcreative.bzh/';

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  trailingSlash: 'always',
  // #29 i18n — multilangue activable par site via env. Pour les sites
  // multilangue (videoprojecteur, tout-reparer), set ENABLE_EN=1 au build.
  // Routes : /fr/... (default, sans préfixe via prefixDefaultLocale:false) + /en/...
  i18n: process.env.ENABLE_EN === '1' ? {
    defaultLocale: 'fr',
    locales: ['fr', 'en'],
    routing: { prefixDefaultLocale: false, redirectToDefaultLocale: false },
  } : undefined,
  build: {
    format: 'directory',
    inlineStylesheets: 'always',
  },
  integrations: [
    sitemap({
      changefreq: 'weekly',
      lastmod: new Date(),
      i18n: process.env.ENABLE_EN === '1' ? {
        defaultLocale: 'fr',
        locales: { fr: 'fr-FR', en: 'en-US' },
      } : undefined,
    }),
  ],
  markdown: {
    remarkPlugins: [remarkAutolink, remarkImgAttrs],
  },
  vite: {
    plugins: [tailwindcss()],
  },
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
});
