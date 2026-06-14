/**
 * Sprint 8.2 + Sprint 12 — Site config injecté par migrate-legacy-site.ts
 *
 * Les valeurs entre __TRIPLE_UNDERSCORE__ sont remplacées par la lib de
 * migration au moment du build du repo cible (find-replace simple).
 *
 * Le SITE_PROFILE complet (palette enrichie, outils activés, catégories,
 * persona, hero, target keywords, trust badges) est chargé depuis
 * site-profile.ts si le domaine y est défini.
 */

import type { SiteTheme } from '../themes';
import { getSiteTheme } from '../themes';
import { getSiteProfile, type SiteProfile } from './site-profile';

const DOMAIN = 'lakonkcreative.bzh';
const SITE_URL = 'https://lakonkcreative.bzh/';

const profile = getSiteProfile(DOMAIN);

export const SITE_CONFIG: {
  domain: string;
  siteUrl: string;
  siteName: string;
  tagline: string;
  defaultOgImage?: string;
  theme: SiteTheme;
  profile: SiteProfile | null;
} = {
  domain: DOMAIN,
  siteUrl: SITE_URL,
  siteName: 'Concarneau',
  tagline: 'Vie locale, patrimoine et tourisme à Concarneau',
  defaultOgImage: undefined,
  theme: getSiteTheme(DOMAIN),
  profile,
};
