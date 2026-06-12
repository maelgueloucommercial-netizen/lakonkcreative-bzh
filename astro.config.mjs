import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { remarkAutolink } from './src/lib/remark-autolink.mjs';

export default defineConfig({
  site: 'https://darocco.fr',
  output: 'static',
  // Pas d'adapter Cloudflare ici : le site est 100 % static.
  // L'endpoint /api/devis est implémenté via une Cloudflare Pages Function
  // (fichier `functions/api/devis.ts` à la racine du projet) qui se déploie
  // automatiquement en même temps que le HTML statique.
  integrations: [
    react(),
    sitemap({
      changefreq: 'weekly',
      lastmod: new Date(),
      i18n: { defaultLocale: 'fr', locales: { fr: 'fr-FR' } },
    }),
  ],
  markdown: {
    // Maillage interne automatique : chaque fiche/article reçoit jusqu'à 3
    // liens contextuels vers d'autres entités du site (régions, pâtes, lexique).
    remarkPlugins: [[remarkAutolink, { maxLinksPerFile: 3 }]],
  },
  vite: {
    plugins: [tailwindcss()],
  },
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  // Sprint canonical-fix : 'always' aligne canonical (Astro.url.pathname avec /)
  // sur l'URL réelle servie par Cloudflare Pages (qui 307-redirect /page → /page/).
  // Avant : 'never' → canonical sans / mais URL avec / → duplicate content.
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // Item #49 : inline systématique du CSS critique pour gagner sur le LCP.
    // Tailwind v4 + Astro tree-shake ; le bundle est petit, l'inline est viable.
    inlineStylesheets: 'always',
  },
});
