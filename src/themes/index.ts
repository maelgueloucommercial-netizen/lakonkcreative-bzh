/**
 * Sprint 8.2 — Theme system pour les sites legacy migrés.
 *
 * 4 archétypes pour 12 sites :
 *  - village : carces, gardonne, merens, montredon, sognolles, ville-bruyeres
 *  - bricolage : meuleuse-disqueuse, scie-electrique, pompe-a-eau
 *  - tech : videoprojecteur, reussirsaboutiqueenligne
 *  - adulte : requindusexe
 *
 * Le theme injecté dans la config détermine :
 *   - Palette couleurs (CSS variables Tailwind)
 *   - Layout/composition (hero, sections, sidebar)
 *   - Composants spécifiques niche (météo pour village, comparateurs pour
 *     bricolage/tech, age gate pour adulte, etc.)
 *   - Typo (serif élégante pour magazine, sans-serif tech, etc.)
 */

export type Archetype = 'village' | 'bricolage' | 'tech' | 'adulte';

export interface SiteTheme {
  archetype: Archetype;
  // Branding
  siteName: string;
  tagline: string;
  domain: string;
  // Couleurs (CSS HSL pour Tailwind 4)
  colors: {
    primary: string;     // ex: 'hsl(15, 85%, 50%)' — accents/CTA
    secondary: string;   // accents secondaires
    bgBase: string;      // fond page
    bgCard: string;      // fond cards
    text: string;        // texte body
    textMuted: string;   // texte secondaire
    border: string;
    sponsored: string;   // highlight des blocks sponsored (warm muted)
  };
  // Typo
  fontHeading: string;   // 'serif' | 'sans' | 'display' (Tailwind class)
  fontBody: string;
  // Sections custom selon archetype
  sections: {
    hero?: 'magazine' | 'panoramic' | 'product' | 'minimal';
    showWeather?: boolean;     // village uniquement
    showAgeGate?: boolean;     // adulte uniquement
    showComparator?: boolean;  // bricolage/tech
    showLocalMap?: boolean;    // village
    showRelated?: boolean;     // tous
    sponsoredStyle?: 'inline' | 'highlighted' | 'subtle';
  };
  // Footer
  footer: {
    copyrightText?: string;
    legalLinks?: Array<{ label: string; href: string }>;
    socialLinks?: Array<{ name: string; href: string }>;
  };
  // SEO
  defaultOgImage?: string;
}

/**
 * Themes par archetype — base configurable par site.
 */
/**
 * Palettes Lelo-style — cream + accent unique par archétype.
 * Tous les sites partagent la philosophie : light bg, big serif, hairlines.
 */
export const ARCHETYPE_DEFAULTS: Record<Archetype, Partial<SiteTheme>> = {
  village: {
    colors: {
      primary: 'hsl(165, 35%, 28%)',      // vert profond patrimonial
      secondary: 'hsl(35, 30%, 45%)',     // bronze
      bgBase: 'hsl(38, 30%, 94%)',        // crème campagne
      bgCard: 'hsl(0, 0%, 100%)',
      text: 'hsl(20, 25%, 9%)',
      textMuted: 'hsl(20, 8%, 35%)',
      border: 'hsl(38, 18%, 82%)',
      sponsored: 'hsl(38, 30%, 92%)',
    },
    fontHeading: 'serif',
    fontBody: 'sans',
    sections: {
      hero: 'magazine',
      showWeather: true,
      showLocalMap: true,
      showRelated: true,
      sponsoredStyle: 'highlighted',
    },
  },
  bricolage: {
    colors: {
      primary: 'hsl(15, 50%, 30%)',       // terre brûlée artisan
      secondary: 'hsl(220, 25%, 25%)',    // acier
      bgBase: 'hsl(36, 18%, 94%)',        // greige atelier
      bgCard: 'hsl(0, 0%, 100%)',
      text: 'hsl(20, 22%, 11%)',
      textMuted: 'hsl(20, 8%, 35%)',
      border: 'hsl(36, 12%, 82%)',
      sponsored: 'hsl(36, 25%, 92%)',
    },
    fontHeading: 'serif',
    fontBody: 'sans',
    sections: {
      hero: 'magazine',
      showComparator: true,
      showRelated: true,
      sponsoredStyle: 'highlighted',
    },
  },
  tech: {
    colors: {
      primary: 'hsl(218, 50%, 28%)',      // bleu encre
      secondary: 'hsl(20, 30%, 35%)',     // brun cuivre
      bgBase: 'hsl(36, 12%, 95%)',        // off-white tech
      bgCard: 'hsl(0, 0%, 100%)',
      text: 'hsl(218, 30%, 10%)',
      textMuted: 'hsl(218, 10%, 35%)',
      border: 'hsl(218, 12%, 84%)',
      sponsored: 'hsl(218, 25%, 94%)',
    },
    fontHeading: 'serif',
    fontBody: 'sans',
    sections: {
      hero: 'magazine',
      showComparator: true,
      showRelated: true,
      sponsoredStyle: 'highlighted',
    },
  },
  adulte: {
    // Palette inspirée Lelo / Lovehoney : cream + burgundy
    colors: {
      primary: 'hsl(345, 55%, 22%)',      // burgundy profond (accent)
      secondary: 'hsl(35, 30%, 45%)',     // bronze
      bgBase: 'hsl(35, 35%, 94%)',        // cream Lelo
      bgCard: 'hsl(0, 0%, 100%)',
      text: 'hsl(20, 30%, 9%)',
      textMuted: 'hsl(20, 8%, 32%)',
      border: 'hsl(35, 25%, 82%)',
      sponsored: 'hsl(345, 25%, 95%)',
    },
    fontHeading: 'serif',
    fontBody: 'sans',
    sections: {
      hero: 'magazine',
      showAgeGate: true,
      showComparator: true,
      showRelated: true,
      sponsoredStyle: 'highlighted',
    },
  },
};

/**
 * Mapping site → archetype + customizations spécifiques.
 */
export const SITE_THEMES: Record<string, Partial<SiteTheme> & { archetype: Archetype }> = {
  'sognolles-en-montois.fr': {
    archetype: 'village',
    siteName: 'Sognolles-en-Montois',
    tagline: 'Vie locale, tourisme et bien-être en Seine-et-Marne',
    domain: 'sognolles-en-montois.fr',
  },
  'carces.fr': {
    archetype: 'village',
    siteName: 'Carcès',
    tagline: 'Patrimoine, vie locale et tourisme en Provence',
    domain: 'carces.fr',
    colors: undefined, // utilise village defaults mais on peut surcharger
  },
  'gardonne.fr': {
    archetype: 'village',
    siteName: 'Gardonne',
    tagline: 'Village viticole en Dordogne',
    domain: 'gardonne.fr',
  },
  'merenslesvals.fr': {
    archetype: 'village',
    siteName: 'Mérens-les-Vals',
    tagline: 'Village pyrénéen entre nature et patrimoine',
    domain: 'merenslesvals.fr',
  },
  'montredon-labessonnie.fr': {
    archetype: 'village',
    siteName: 'Montredon-Labessonnié',
    tagline: 'Village du Tarn entre traditions et modernité',
    domain: 'montredon-labessonnie.fr',
  },
  'ville-bruyereslechatel.fr': {
    archetype: 'village',
    siteName: 'Bruyères-le-Châtel',
    tagline: 'Commune dynamique en Essonne',
    domain: 'ville-bruyereslechatel.fr',
  },
  'meuleuse-disqueuse.com': {
    archetype: 'bricolage',
    siteName: 'Meuleuse Disqueuse',
    tagline: 'Le guide expert des outils de coupe et de meulage',
    domain: 'meuleuse-disqueuse.com',
  },
  'scie-electrique.fr': {
    archetype: 'bricolage',
    siteName: 'Scie Électrique',
    tagline: 'Comparatifs et tests des meilleures scies électriques',
    domain: 'scie-electrique.fr',
  },
  'pompe-a-eau.info': {
    archetype: 'bricolage',
    siteName: 'Pompe à Eau',
    tagline: 'Guides d\'achat et tutos pour pompes domestiques et industrielles',
    domain: 'pompe-a-eau.info',
  },
  'videoprojecteur.eu': {
    archetype: 'tech',
    siteName: 'Vidéoprojecteur',
    tagline: 'Tests et comparatifs vidéoprojecteurs home cinéma',
    domain: 'videoprojecteur.eu',
  },
  'reussirsaboutiqueenligne.fr': {
    archetype: 'tech',
    siteName: 'Réussir sa boutique en ligne',
    tagline: 'Guides e-commerce et stratégies digitales 2026',
    domain: 'reussirsaboutiqueenligne.fr',
  },
  'requindusexe.com': {
    archetype: 'adulte',
    siteName: 'Requindusexe',
    tagline: 'Avis, tests et guides — communauté adulte responsable',
    domain: 'requindusexe.com',
  },
  'bouilleur.fr': {
    archetype: 'bricolage',
    siteName: 'Bouilleur.fr',
    tagline: 'Chauffage au bois et distillation artisanale',
    domain: 'bouilleur.fr',
  },
  'duvivier.fr': {
    archetype: 'bricolage',
    siteName: 'Duvivier',
    tagline: 'Solutions professionnelles pour artisans et entrepreneurs',
    domain: 'duvivier.fr',
  },
  'fermedetraonbihan.fr': {
    archetype: 'village',
    siteName: 'Ferme de Traonbihan',
    tagline: 'Ferme bretonne, produits locaux et tradition',
    domain: 'fermedetraonbihan.fr',
  },
  'fidusuisse-offshore.com': {
    archetype: 'tech',
    siteName: 'Fidusuisse',
    tagline: 'Fiduciaire suisse : conseil offshore et patrimoine',
    domain: 'fidusuisse-offshore.com',
  },
  'lanvenegen.fr': {
    archetype: 'village',
    siteName: 'Lanvénégen',
    tagline: 'Site officiel de la commune du Morbihan',
    domain: 'lanvenegen.fr',
  },
  'lestoquesdardeche.fr': {
    archetype: 'bricolage',
    siteName: 'Les Toques d\'Ardèche',
    tagline: 'Recettes et gastronomie ardéchoise',
    domain: 'lestoquesdardeche.fr',
  },
  'liquorium.fr': {
    archetype: 'tech',
    siteName: 'Liquorium',
    tagline: 'Cocktails, recettes et conseils culinaires',
    domain: 'liquorium.fr',
  },
  'tout-reparer.fr': {
    archetype: 'bricolage',
    siteName: 'Tout Réparer',
    tagline: 'Guides experts pour réparer vos appareils',
    domain: 'tout-reparer.fr',
  },
  'rsteam.fr': {
    archetype: 'tech',
    siteName: 'RS Team',
    tagline: 'Guides tech, hardware et numérique',
    domain: 'rsteam.fr',
  },
  'android-recovery.fr': {
    archetype: 'tech',
    siteName: 'Android Recovery',
    tagline: 'Récupération de données Android : tutoriels et outils',
    domain: 'android-recovery.fr',
  },
  'twitch-overlay.fr': {
    archetype: 'tech',
    siteName: 'Twitch Overlay',
    tagline: 'Overlays gratuits et guides pour streamers Twitch',
    domain: 'twitch-overlay.fr',
  },
  // Sprint 13.1 — remontage o2switch wave 2 (mai 2026)
  'plot-terrasse.net': {
    archetype: 'bricolage',
    siteName: 'Plot Terrasse',
    tagline: 'Terrasses bois & aménagement extérieur',
    domain: 'plot-terrasse.net',
  },
  'fer-a-lisser.net': {
    archetype: 'tech',
    siteName: 'Fer à lisser',
    tagline: 'Tests et guides fer à lisser, brosse soufflante, lisseur professionnel',
    domain: 'fer-a-lisser.net',
  },
  'transpalette-gerbeur.fr': {
    archetype: 'bricolage',
    siteName: 'Transpalette & Gerbeur',
    tagline: 'Matériel de manutention industriel : transpalettes, gerbeurs, chariots',
    domain: 'transpalette-gerbeur.fr',
  },
  'amiante-avant-travaux.eu': {
    archetype: 'bricolage',
    siteName: 'Amiante avant travaux',
    tagline: 'Diagnostic amiante avant travaux : obligations, prix, sociétés agréées',
    domain: 'amiante-avant-travaux.eu',
  },
  'comment-enlever.fr': {
    archetype: 'bricolage',
    siteName: 'Comment enlever',
    tagline: 'Astuces et solutions pour enlever taches, odeurs, parasites au quotidien',
    domain: 'comment-enlever.fr',
  },
  'disques-durs-externes.fr': {
    archetype: 'tech',
    siteName: 'Disques durs externes',
    tagline: 'Comparatifs et guides disques durs externes, SSD, sauvegarde',
    domain: 'disques-durs-externes.fr',
  },
  'transports-sanitaires.fr': {
    archetype: 'tech',
    siteName: 'Transports sanitaires',
    tagline: 'Ambulance, VSL, taxi conventionné : guide complet du transport médicalisé',
    domain: 'transports-sanitaires.fr',
  },
  'avocat-accident-de-la-route.fr': {
    archetype: 'tech',
    siteName: 'Avocat accident de la route',
    tagline: 'Droit, indemnisation et démarches après un accident de la circulation',
    domain: 'avocat-accident-de-la-route.fr',
  },
  'lesbellesvignes.com': {
    archetype: 'village',
    siteName: 'Les Belles Vignes',
    tagline: 'Vins, vignobles et art de vivre autour du vin',
    domain: 'lesbellesvignes.com',
  },
  'ceres-france.fr': {
    archetype: 'tech',
    siteName: 'Cérès France',
    tagline: 'Maroquinerie et sacs en cuir français',
    domain: 'ceres-france.fr',
  },
  'familycoffee.fr': {
    archetype: 'village',
    siteName: 'Family Coffee',
    tagline: 'Café de spécialité et dégustation',
    domain: 'familycoffee.fr',
  },
  // === Lot domaines expirés 2026-06-07 ===
  'blobstar.fr': {
    archetype: 'tech',
    siteName: 'Blob Star',
    tagline: 'Le média du blob : culture, science et terrarium',
    domain: 'blobstar.fr',
    colors: {
      primary: 'hsl(45, 85%, 42%)',      // jaune blob (Physarum polycephalum)
      secondary: 'hsl(150, 35%, 30%)',   // vert forêt
      bgBase: 'hsl(48, 30%, 95%)',       // crème claire
      bgCard: 'hsl(0, 0%, 100%)',
      text: 'hsl(150, 20%, 10%)',
      textMuted: 'hsl(150, 8%, 35%)',
      border: 'hsl(48, 18%, 84%)',
      sponsored: 'hsl(48, 40%, 92%)',
    },
  },
  'lespierresdagathe.fr': {
    archetype: 'tech',
    siteName: 'Les Pierres d\'Agathe',
    tagline: 'Lithothérapie & pierres naturelles : vertus, conseils et sélection',
    domain: 'lespierresdagathe.fr',
    colors: {
      primary: 'hsl(270, 44%, 50%)',     // améthyste
      secondary: 'hsl(338, 42%, 64%)',   // quartz rose
      bgBase: 'hsl(282, 30%, 97%)',      // lavande très clair
      bgCard: 'hsl(0, 0%, 100%)',
      text: 'hsl(272, 22%, 13%)',
      textMuted: 'hsl(272, 8%, 38%)',
      border: 'hsl(282, 20%, 88%)',
      sponsored: 'hsl(282, 34%, 95%)',
    },
  },
  'valerieparis.fr': {
    archetype: 'tech',
    siteName: 'Valérie Paris',
    tagline: 'Le magazine mode femme : tendances, style et sélections',
    domain: 'valerieparis.fr',
    colors: {
      primary: 'hsl(345, 56%, 44%)',     // framboise/bordeaux chic
      secondary: 'hsl(32, 34%, 54%)',    // camel doré
      bgBase: 'hsl(28, 22%, 97%)',       // crème
      bgCard: 'hsl(0, 0%, 100%)',
      text: 'hsl(345, 18%, 13%)',
      textMuted: 'hsl(345, 6%, 38%)',
      border: 'hsl(28, 16%, 87%)',
      sponsored: 'hsl(345, 30%, 96%)',
    },
  },
  'restaurant-etoile19.fr': {
    archetype: 'village',
    siteName: 'Étoile 19',
    tagline: 'Le guide gourmand du 19e arrondissement de Paris',
    domain: 'restaurant-etoile19.fr',
    colors: {
      primary: 'hsl(12, 64%, 47%)',      // terracotta
      secondary: 'hsl(82, 26%, 36%)',    // olive
      bgBase: 'hsl(40, 30%, 97%)',       // crème chaude
      bgCard: 'hsl(0, 0%, 100%)',
      text: 'hsl(20, 18%, 14%)',
      textMuted: 'hsl(20, 8%, 38%)',
      border: 'hsl(40, 16%, 86%)',
      sponsored: 'hsl(40, 40%, 93%)',
    },
  },
  'veloveloce.fr': {
    archetype: 'village',
    siteName: 'Vélo Véloce',
    tagline: 'Le magazine du vélo : achat, entretien et balades',
    domain: 'veloveloce.fr',
    colors: {
      primary: 'hsl(162, 56%, 37%)',     // vert-teal vélo
      secondary: 'hsl(210, 28%, 44%)',   // bleu ardoise
      bgBase: 'hsl(170, 22%, 97%)',      // menthe très clair
      bgCard: 'hsl(0, 0%, 100%)',
      text: 'hsl(200, 20%, 13%)',
      textMuted: 'hsl(200, 8%, 37%)',
      border: 'hsl(170, 14%, 86%)',
      sponsored: 'hsl(162, 30%, 93%)',
    },
  },
  'kerfanylespins.fr': {
    archetype: 'village',
    siteName: 'Kerfany-les-Pins',
    tagline: 'Le guide de la plage de Kerfany et de Moëlan-sur-Mer',
    domain: 'kerfanylespins.fr',
    colors: {
      primary: 'hsl(200, 58%, 41%)',     // bleu océan
      secondary: 'hsl(40, 46%, 60%)',    // sable doré
      bgBase: 'hsl(196, 28%, 97%)',      // bleu très clair
      bgCard: 'hsl(0, 0%, 100%)',
      text: 'hsl(205, 25%, 14%)',
      textMuted: 'hsl(205, 9%, 37%)',
      border: 'hsl(196, 18%, 85%)',
      sponsored: 'hsl(200, 30%, 93%)',
    },
  },
  'escortparis.fr': {
    archetype: 'adulte',
    siteName: 'OnlyMag',
    tagline: 'Le guide des plateformes de créateurs : OnlyFans, MYM & alternatives',
    domain: 'escortparis.fr',
    colors: {
      primary: 'hsl(330, 68%, 48%)',     // magenta
      secondary: 'hsl(262, 40%, 46%)',   // violet
      bgBase: 'hsl(320, 16%, 97%)',      // rosé très clair
      bgCard: 'hsl(0, 0%, 100%)',
      text: 'hsl(320, 16%, 12%)',
      textMuted: 'hsl(320, 6%, 38%)',
      border: 'hsl(320, 14%, 87%)',
      sponsored: 'hsl(330, 28%, 96%)',
    },
  },
  'friteriechezfred.fr': {
    archetype: 'village',
    siteName: 'Croustillant',
    tagline: 'Le mag de la friterie : plats, sauces et culture du Nord',
    domain: 'friteriechezfred.fr',
    colors: {
      primary: 'hsl(355, 62%, 46%)',     // rouge sauce
      secondary: 'hsl(44, 78%, 52%)',    // jaune frite
      bgBase: 'hsl(44, 30%, 97%)',       // crème
      bgCard: 'hsl(0, 0%, 100%)',
      text: 'hsl(355, 16%, 13%)',
      textMuted: 'hsl(355, 6%, 37%)',
      border: 'hsl(44, 18%, 86%)',
      sponsored: 'hsl(44, 45%, 93%)',
    },
  },
  'lakonkcreative.bzh': {
    archetype: 'village',
    siteName: 'Concarneau',
    tagline: 'Vie locale, patrimoine et tourisme à Concarneau',
    domain: 'lakonkcreative.bzh',
    colors: {
      primary: 'hsl(204, 64%, 38%)',     // bleu Filets Bleus / océan
      secondary: 'hsl(38, 42%, 56%)',    // granit doré Ville Close
      bgBase: 'hsl(202, 30%, 97%)',      // bleu très clair
      bgCard: 'hsl(0, 0%, 100%)',
      text: 'hsl(206, 26%, 13%)',
      textMuted: 'hsl(206, 9%, 37%)',
      border: 'hsl(202, 18%, 85%)',
      sponsored: 'hsl(204, 30%, 93%)',
    },
  },
};

/**
 * Construit le SiteTheme final pour un domaine en mergeant defaults archetype
 * + overrides spécifiques au site.
 */
/** Hash déterministe domaine → entier (choix d'archétype visuel de secours). */
function hashDomain(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function getSiteTheme(domain: string): SiteTheme {
  const site = SITE_THEMES[domain];
  if (!site) {
    // Fallback déterministe (standard réutilisable) : tout NOUVEAU site pas encore
    // listé dans SITE_THEMES obtient un thème visuel sain par hash domaine, plutôt
    // que de casser le build. Le branding réel vient des placeholders de site-config.
    const VISUALS: Archetype[] = ['village', 'bricolage', 'tech', 'adulte'];
    const arch = VISUALS[hashDomain(domain) % VISUALS.length];
    const d = ARCHETYPE_DEFAULTS[arch];
    const niceName = domain.split('.')[0].replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      archetype: arch,
      siteName: niceName,
      tagline: '',
      domain,
      colors: d.colors!,
      fontHeading: d.fontHeading!,
      fontBody: d.fontBody!,
      sections: { ...d.sections },
      footer: d.footer ?? {},
      defaultOgImage: undefined,
    };
  }
  const archetypeDefaults = ARCHETYPE_DEFAULTS[site.archetype];
  return {
    archetype: site.archetype,
    siteName: site.siteName ?? domain,
    tagline: site.tagline ?? '',
    domain: site.domain ?? domain,
    colors: site.colors ?? archetypeDefaults.colors!,
    fontHeading: site.fontHeading ?? archetypeDefaults.fontHeading!,
    fontBody: site.fontBody ?? archetypeDefaults.fontBody!,
    sections: { ...archetypeDefaults.sections, ...site.sections },
    footer: site.footer ?? archetypeDefaults.footer ?? {},
    defaultOgImage: site.defaultOgImage,
  };
}
