/**
 * Métadonnées centrales du site DaRocco.
 * Persona, branding, claims SEO. Modifier ici impacte tout le site.
 */

export const SITE = {
  name: 'DaRocco',
  fullName: 'DaRocco — l\'encyclopédie de la cuisine italienne authentique',
  url: 'https://darocco.fr',
  locale: 'fr-FR',
  language: 'fr',
  description:
    'L\'encyclopédie francophone de la cuisine italienne authentique : carte interactive des 20 régions, base de données des pâtes, annuaire des épiciers italiens en France, lexique culinaire et boutique de produits AOP/DOP/IGP pour les pros.',
  shortDescription: 'L\'encyclopédie francophone de la cuisine italienne authentique.',
  keywords: [
    'cuisine italienne',
    'pâtes italiennes',
    'épicerie italienne',
    'spécialités italiennes',
    'AOP DOP IGP',
    'authentique',
    'régions italiennes',
    'lexique cuisine italienne',
  ],
  // Contact (Cloudflare Email Routing → forward Gmail)
  email: 'contact@darocco.fr',
  // Pas d'adresse physique — c'est un média en ligne, jamais un commerce local
  // (cf cas juridique : restaurant Da Rocco actif au 119 rue Grenelle, on ne risque
  // aucune confusion identité)
} as const;

/**
 * Persona fondateur — fictif mais cohérent.
 *
 * Stratégie : crédibilité E-E-A-T sans collision avec le restaurant Da Rocco
 * du 7e (qui est encore actif). On ne se présente PAS comme un restaurant ni
 * un commerce, mais comme un média éditorial tenu par un consultant.
 */
export const PERSONA = {
  firstName: 'Lorenzo',
  lastName: 'Da Rocco',
  fullName: 'Lorenzo Da Rocco',
  role: 'Consultant en cuisine italienne authentique',
  bio: `Né en Calabre en 1962, Lorenzo Da Rocco a grandi entre la cuisine populaire \
de Cosenza et les marchés de Paris où sa famille s'est installée en 1972. \
Formé en restauration à l'École Ferrandi, il a travaillé pendant dix ans en \
cuisine avant de se tourner vers le conseil et l'édition culinaire. Il anime \
DaRocco depuis 2014, qu'il a relancé en 2024 avec l'ambition d'en faire \
l'encyclopédie francophone de référence sur la cuisine italienne authentique.`,
  shortBio: 'Calabrais d\'origine, parisien d\'adoption, consultant en cuisine italienne depuis trente ans.',
  expertise: [
    'cuisine régionale italienne',
    'AOP/DOP/IGP italiennes',
    'pâtes artisanales',
    'sourcing produits italiens',
  ],
  socialLinks: {
    // Pas de LinkedIn / Instagram pour l'instant — peuvent être ajoutés plus tard
  },
} as const;

/**
 * Configuration de l'organisation pour les schemas SEO (Organization, Person).
 */
export const ORGANIZATION = {
  '@type': 'Organization' as const,
  name: SITE.name,
  legalName: 'DaRocco Media',
  url: SITE.url,
  logo: `${SITE.url}/images/logo.svg`,
  founder: {
    '@type': 'Person' as const,
    name: PERSONA.fullName,
    jobTitle: PERSONA.role,
    description: PERSONA.shortBio,
  },
  foundingDate: '2014',
  description: SITE.description,
  contactPoint: [
    {
      '@type': 'ContactPoint' as const,
      email: SITE.email,
      contactType: 'editorial',
      availableLanguage: ['French', 'Italian'],
      areaServed: 'FR',
    },
    {
      '@type': 'ContactPoint' as const,
      email: SITE.email,
      contactType: 'sales',
      availableLanguage: ['French', 'Italian', 'English'],
      areaServed: 'FR',
    },
  ],
} as const;

/**
 * Les 5 piliers du site (cf doc projet §3 : encyclopédie + outils + annuaire + lexique + B2B).
 */
export const PILLARS = [
  {
    slug: 'regions',
    label: 'Régions',
    title: 'Carte des 20 régions italiennes',
    description: 'Spécialités, AOP/DOP, plats emblématiques et marques artisanales par région.',
    href: '/regions',
    icon: '🗺️',
  },
  {
    slug: 'pates',
    label: 'Base de pâtes',
    title: 'Base de données des pâtes',
    description: 'Plus de 300 formats, leurs sauces compatibles et le temps de cuisson exact.',
    href: '/pates',
    icon: '🍝',
  },
  {
    slug: 'lexique',
    label: 'Lexique',
    title: 'Lexique culinaire italien',
    description: 'Tous les termes techniques de la cuisine italienne expliqués en français.',
    href: '/lexique',
    icon: '📖',
  },
  {
    slug: 'annuaire',
    label: 'Annuaire',
    title: 'Annuaire des épiciers italiens en France',
    description: 'Les vraies épiceries italiennes par ville, avec leurs spécialités.',
    href: '/annuaire',
    icon: '📍',
  },
  {
    slug: 'boutique',
    label: 'Boutique B2B',
    title: 'Sourcing professionnel',
    description: 'Produits italiens AOP/DOP/IGP pour restaurateurs, traiteurs et épiciers.',
    href: '/boutique',
    icon: '🛒',
  },
] as const;

export type PillarSlug = (typeof PILLARS)[number]['slug'];
