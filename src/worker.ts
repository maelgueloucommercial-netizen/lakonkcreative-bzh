/**
 * Worker entrypoint pour darocco.fr.
 *
 * Architecture : **Workers Static Assets** — le binding `ASSETS` sert tout
 * le site Astro static depuis `./dist`. Ce worker n'intercepte qu'une petite
 * liste de routes dynamiques (formulaires B2B essentiellement).
 *
 * Routes interceptées :
 *   POST /api/devis  → formulaire B2B (forward vers email)
 *
 * Tout le reste est délégué à `env.ASSETS.fetch(request)` qui sert le HTML
 * statique généré par Astro.
 */

import { handleDevis } from './worker/devis';
import { handleNewsletter } from './worker/newsletter';
import { applySecurityHeaders } from './worker/security-headers';

export interface Env {
  ASSETS: Fetcher;
  /** Adresse email destinataire des leads B2B (défaut mael.guelou.commercial@gmail.com) */
  DEVIS_FORWARD_EMAIL?: string;
  /** Adresse email destinataire des inscriptions newsletter. */
  NEWSLETTER_FORWARD_EMAIL?: string;
  /** Clé API Resend (optionnel). Si absente, on log + redirect sans envoyer le mail. */
  RESEND_API_KEY?: string;
  /** Adresse expéditrice (doit être sur un domaine vérifié dans Resend). Défaut : devis@darocco.fr */
  RESEND_FROM_EMAIL?: string;
  APP_ENV?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Sitemap fix : Astro génère sitemap-index.xml, /sitemap.xml → 301 vers index
    // Beaucoup d'outils SEO (Google, Bing, Yandex) cherchent /sitemap.xml par défaut.
    if (url.pathname === '/sitemap.xml') {
      return Response.redirect(new URL('/sitemap-index.xml', url).toString(), 301);
    }

    if (url.pathname === '/api/devis' && request.method === 'POST') {
      return handleDevis(request, env);
    }
    if (url.pathname === '/api/newsletter' && request.method === 'POST') {
      return handleNewsletter(request, env);
    }

    // Méthode non autorisée sur les routes d'API → 405
    if (url.pathname === '/api/devis' || url.pathname === '/api/newsletter') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { Allow: 'POST' },
      });
    }

    // Toutes les autres requêtes → static assets, avec headers de sécurité
    // appliqués sur les réponses HTML (item #86 roadmap).
    const response = await env.ASSETS.fetch(request);
    return applySecurityHeaders(response, request);
  },
};
