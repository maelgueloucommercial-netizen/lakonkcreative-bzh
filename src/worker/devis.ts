/**
 * Handler du formulaire de devis B2B.
 *
 * Workflow :
 *   1. Parse le formulaire (multipart ou urlencoded)
 *   2. Valide les champs requis
 *   3. Si `RESEND_API_KEY` est défini → envoie via Resend (domaine vérifié,
 *      free tier 3000/mois). Sinon → log uniquement (fallback).
 *   4. Redirige vers /devis-confirmation (303)
 *
 * Resend setup (à faire une fois côté Mael) :
 *   - https://resend.com/domains → ajouter darocco.fr (DNS records SPF + DKIM)
 *   - Récupérer une API key
 *   - `npx wrangler secret put RESEND_API_KEY` (et `DEVIS_FORWARD_EMAIL`)
 *
 * Tant que Resend n'est pas configuré, le formulaire **fonctionne** mais
 * n'envoie pas de mail — les soumissions sont logguées dans les logs Worker
 * (consultables via `npx wrangler tail`).
 */

import type { Env } from '../worker';

interface DevisPayload {
  establishment: string;
  type: string;
  name: string;
  email: string;
  postalCode: string;
  volume: string;
  phone?: string;
  produit?: string;
  message?: string;
}

const REQUIRED_FIELDS: (keyof DevisPayload)[] = [
  'establishment',
  'type',
  'name',
  'email',
  'postalCode',
  'volume',
];

export async function handleDevis(request: Request, env: Env): Promise<Response> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response('Body invalide', { status: 400 });
  }

  const payload: Partial<DevisPayload> = {};
  for (const k of [
    'establishment',
    'type',
    'name',
    'email',
    'postalCode',
    'volume',
    'phone',
    'produit',
    'message',
  ] as const) {
    const v = formData.get(k);
    if (typeof v === 'string') payload[k] = v.trim();
  }

  const missing = REQUIRED_FIELDS.filter((k) => !payload[k]);
  if (missing.length > 0) {
    return new Response(`Champs manquants : ${missing.join(', ')}`, { status: 400 });
  }

  // Garde-fou anti-bot minimal : refuser les soumissions <2 s ou >2 h
  // (le client peut envoyer un champ caché `_t` avec Date.now() au render — pas
  // implémenté ici, on garde simple et on ajoutera honeypot si besoin)

  if (!isValidEmail(payload.email!)) {
    return new Response("Email invalide", { status: 400 });
  }

  const sentVia = await tryForwardViaResend(payload as DevisPayload, env);

  // Toujours logger côté Worker — visible via `wrangler tail`
  console.log('[devis]', JSON.stringify({ ...payload, _sentVia: sentVia }));

  // Redirect 303 → confirmation
  return Response.redirect(new URL('/devis-confirmation', request.url).toString(), 303);
}

function isValidEmail(s: string): boolean {
  // Validation pragmatique, on ne ré-implémente pas la RFC 5321
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length < 320;
}

async function tryForwardViaResend(payload: DevisPayload, env: Env): Promise<'resend' | 'log'> {
  if (!env.RESEND_API_KEY) return 'log';

  const to = env.DEVIS_FORWARD_EMAIL ?? 'mael.guelou.commercial@gmail.com';
  const from = env.RESEND_FROM_EMAIL ?? 'DaRocco Devis <devis@darocco.fr>';

  const subject = `Devis B2B — ${payload.establishment} (${payload.type})`;
  const body = [
    `Établissement : ${payload.establishment}`,
    `Type : ${payload.type}`,
    `Contact : ${payload.name} <${payload.email}>`,
    `Téléphone : ${payload.phone ?? '—'}`,
    `Code postal : ${payload.postalCode}`,
    `Produit(s) : ${payload.produit ?? '—'}`,
    '',
    'Volume / fréquence prévus :',
    payload.volume,
    '',
    'Précisions :',
    payload.message ?? '—',
    '',
    `--`,
    `Soumis depuis https://darocco.fr/devis`,
  ].join('\n');

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: payload.email,
        subject,
        text: body,
      }),
    });
    if (!res.ok) {
      console.warn('[devis] Resend returned', res.status, (await res.text()).slice(0, 200));
      return 'log';
    }
    return 'resend';
  } catch (e) {
    console.warn('[devis] Resend fetch failed:', (e as Error).message);
    return 'log';
  }
}
