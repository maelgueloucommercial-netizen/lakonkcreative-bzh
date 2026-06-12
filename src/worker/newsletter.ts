/**
 * Handler newsletter — POST /api/newsletter (item #55 roadmap).
 *
 * Workflow ultra-léger :
 *   1. Parse `email` du form
 *   2. Valide format
 *   3. Forward via Resend (si RESEND_API_KEY) à `NEWSLETTER_FORWARD_EMAIL`
 *      ou par défaut `mael.guelou.commercial@gmail.com` — Mael ajoutera
 *      manuellement à sa liste, ou plus tard branchera Buttondown / Resend
 *      Audiences.
 *   4. Redirect 303 vers /merci-newsletter (page de confirmation)
 *
 * Volontairement pas de vraie liste de diffusion ici (item à scoper plus tard
 * quand les volumes le justifieront — Buttondown 9 $/mo simple, Resend 0$
 * jusqu'à 3000/mo).
 */

import type { Env } from '../worker';

export async function handleNewsletter(request: Request, env: Env): Promise<Response> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response('Body invalide', { status: 400 });
  }

  const email = String(formData.get('email') ?? '').trim();
  const honeypot = String(formData.get('website') ?? ''); // anti-bot

  if (honeypot) {
    // Bot détecté — on accepte silencieusement (200) sans rien faire
    return Response.redirect(new URL('/merci-newsletter', request.url).toString(), 303);
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    return new Response('Email invalide', { status: 400 });
  }

  let sentVia: 'resend' | 'log' = 'log';
  if (env.RESEND_API_KEY) {
    try {
      const to = (env as Env & { NEWSLETTER_FORWARD_EMAIL?: string }).NEWSLETTER_FORWARD_EMAIL
        ?? env.DEVIS_FORWARD_EMAIL
        ?? 'mael.guelou.commercial@gmail.com';
      const from = env.RESEND_FROM_EMAIL ?? 'DaRocco Newsletter <newsletter@darocco.fr>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: `Nouvelle inscription newsletter DaRocco`,
          text: `Email : ${email}\nDate : ${new Date().toISOString()}\nIP : ${request.headers.get('cf-connecting-ip') ?? '?'}`,
        }),
      });
      if (res.ok) sentVia = 'resend';
      else console.warn('[newsletter] Resend', res.status);
    } catch (e) {
      console.warn('[newsletter] Resend fetch failed:', (e as Error).message);
    }
  }

  console.log('[newsletter]', JSON.stringify({ email, _sentVia: sentVia }));

  return Response.redirect(new URL('/merci-newsletter', request.url).toString(), 303);
}
