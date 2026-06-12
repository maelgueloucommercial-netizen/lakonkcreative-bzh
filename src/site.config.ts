// Auto-généré par felleries-admin lors de la création du site.
// Ne pas éditer à la main — re-générer via /api/sites/generate-config.

export const SITE_CONFIG = {
  "domain": "lakonkcreative.bzh",
  "thematique": "Concarneau",
  "persona": {
    "firstName": "Auteur",
    "lastName": "Lakonkcreative",
    "fullName": "Auteur Lakonkcreative",
    "role": "Spécialiste Concarneau",
    "bio": "Auteur Lakonkcreative est spécialiste concarneau, basé en France."
  },
  "palette": {
    "primary": "#c4543a",
    "primaryDark": "#7e2e1f",
    "primaryLight": "#e09075",
    "accent": "#586733",
    "cream": "#faf6ef",
    "ink": "#1a1411"
  },
  "fonts": {
    "serif": "\"Libre Baskerville\", \"EB Garamond\", Georgia, serif",
    "sans": "\"IBM Plex Sans\", system-ui, sans-serif"
  },
  "layout": {
    "headerVariant": "split",
    "footerColumns": 5,
    "heroHeight": "short",
    "cardStyle": "shadowed",
    "accentRadius": "pill"
  }
} as const;

export type SiteConfig = typeof SITE_CONFIG;
