/**
 * Headers de sécurité appliqués sur les réponses HTML (item #86 roadmap).
 *
 * Les headers sont injectés via le Worker plutôt que dans `<meta>` :
 *   - CSP plus restrictif (les meta-CSP ne couvrent pas tout)
 *   - X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
 *     Permissions-Policy, Strict-Transport-Security
 *   - Cache-Control léger pour les pages HTML (le CDN Cloudflare gère
 *     le reste via les règles par défaut)
 *
 * Ne touche pas aux réponses non-HTML (assets statiques) pour ne pas
 * casser CSS/JS/images.
 */

const CSP = [
  "default-src 'self'",
  // Polices Google (déjà preconnect dans le head)
  "font-src 'self' https://fonts.gstatic.com data:",
  // Stylesheets : 'self' + Google Fonts + 'unsafe-inline' pour les styles Astro inline
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Scripts : 'self' + Cloudflare Insights (Web Analytics) + 'unsafe-inline' pour scripts Astro
  "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
  // Images : 'self' + data: pour LQIP/inline + https: pour OG ailleurs
  "img-src 'self' data: https:",
  // Connexions : 'self' + Cloudflare Insights beacon
  "connect-src 'self' https://cloudflareinsights.com https://*.cloudflareinsights.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join('; ');

const PERMISSIONS_POLICY = [
  'camera=()',
  'microphone=()',
  'geolocation=()',
  'payment=()',
  'usb=()',
  'magnetometer=()',
  'gyroscope=()',
  'accelerometer=()',
].join(', ');

export function applySecurityHeaders(response: Response, request: Request): Response {
  const contentType = response.headers.get('content-type') ?? '';
  // On ne touche que les réponses HTML
  if (!contentType.includes('text/html')) {
    return response;
  }

  // On clone la réponse pour pouvoir modifier les headers
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Content-Security-Policy', CSP);
  newHeaders.set('X-Frame-Options', 'DENY');
  newHeaders.set('X-Content-Type-Options', 'nosniff');
  newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  newHeaders.set('Permissions-Policy', PERMISSIONS_POLICY);

  // HSTS uniquement en HTTPS prod (sur localhost on évite)
  const url = new URL(request.url);
  if (url.protocol === 'https:') {
    newHeaders.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
