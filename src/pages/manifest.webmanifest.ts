import { SITE_CONFIG } from '../lib/site-config';

export async function GET() {
  const manifest = {
    name: SITE_CONFIG.siteName,
    short_name: SITE_CONFIG.siteName.slice(0, 12),
    description: SITE_CONFIG.tagline,
    start_url: '/',
    display: 'minimal-ui',
    background_color: '#ffffff',
    theme_color: SITE_CONFIG.theme.colors.primary,
    icons: [
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
    lang: 'fr-FR',
  };
  return new Response(JSON.stringify(manifest, null, 2), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  });
}
