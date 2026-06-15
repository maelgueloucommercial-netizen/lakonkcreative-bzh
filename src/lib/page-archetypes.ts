/**
 * SYSTÈME D'ARCHÉTYPES & CATALOGUE DE TYPES DE PAGE (2026-05-28).
 *
 * Problème résolu : 35 sites = des cas de figure très différents (média info,
 * commune locale, e-commerce, prestataire local lead-gen, comparateur affilié,
 * site-outil). On veut un MAXIMUM de types de page, MAIS chaque site doit garder
 * une ARBORESCENCE COHÉRENTE — on ne mélange pas tous les types sur un même site
 * (avant : toutes les routes existaient partout, ex. /outils/quiz-sextoy sur un
 * site de disques durs).
 *
 * Principe : chaque site adopte UN archétype. L'archétype déclare :
 *   - les types de page autorisés (allowedTypes)
 *   - l'arbre d'URL cohérent (urlTree)
 *   - l'ordre de nav (nav)
 *   - les sections de la home (homeSections)
 * Le détecteur `/serp-intent` (worker) route ensuite chaque mot-clé vers le bon
 * type de page À L'INTÉRIEUR de l'archétype (leçon maison-en-container : matcher
 * le type de page que Google récompense, pas imposer de l'éditorial partout).
 *
 * Lu par : Header.astro (nav), les routes (gate d'affichage), et l'auto-publish
 * worker (quel type générer + où committer).
 */

// =============================================================================
// 1. CATALOGUE EXHAUSTIF DES TYPES DE PAGE
// =============================================================================

export type PageIntent = 'informationnel' | 'commercial' | 'transactionnel' | 'local' | 'navigationnel';

export interface PageType {
  id: string;
  label: string;
  intent: PageIntent;
  /** Collection de contenu source (dossier src/content/<collection>) ou 'static'. */
  collection: string;
  /** Patron d'URL (placeholders {slug} {cat} {ville} {a} {b} {produit}). */
  urlPattern: string;
  /** Schemas JSON-LD principaux à émettre. */
  schema: string[];
  /** Quand l'utiliser (intention SERP). */
  usage: string;
}

export const PAGE_TYPES: Record<string, PageType> = {
  // --- Éditorial / informationnel ---
  article:      { id: 'article',      label: 'Article / guide',        intent: 'informationnel', collection: 'articles',  urlPattern: '/{slug}/',                 schema: ['Article', 'BreadcrumbList'],            usage: 'SERP éditoriale : "comment", "pourquoi", guides pratiques.' },
  hub:          { id: 'hub',          label: 'Page pilier (hub)',      intent: 'informationnel', collection: 'articles',  urlPattern: '/{slug}/',                 schema: ['Article', 'BreadcrumbList', 'FAQPage'], usage: 'Tête de cluster : 3000+ mots, maille vers les articles enfants.' },
  comparatif:   { id: 'comparatif',   label: 'Comparatif X vs Y',      intent: 'commercial',     collection: 'articles',  urlPattern: '/comparatif/{a}-vs-{b}/',  schema: ['Article', 'BreadcrumbList', 'Product'], usage: '"X vs Y", "X ou Y" : tableau de critères + verdict.' },
  guideAchat:   { id: 'guideAchat',   label: "Guide d'achat",          intent: 'commercial',     collection: 'articles',  urlPattern: '/guide/{slug}/',           schema: ['Article', 'BreadcrumbList', 'ItemList'], usage: '"meilleur X", "comment choisir X" : sélection + critères + CTA.' },
  lexique:      { id: 'lexique',      label: 'Entrée de glossaire',    intent: 'informationnel', collection: 'lexique',   urlPattern: '/glossaire/{slug}/',       schema: ['DefinedTerm', 'BreadcrumbList'],        usage: 'Définitions, "qu\'est-ce que X" : réponse courte + featured snippet.' },
  faq:          { id: 'faq',          label: 'Page FAQ thématique',    intent: 'informationnel', collection: 'articles',  urlPattern: '/faq/{slug}/',             schema: ['FAQPage', 'BreadcrumbList'],            usage: 'Grappes de questions PAA autour d\'un sujet.' },
  actualite:    { id: 'actualite',    label: 'Actualité',              intent: 'informationnel', collection: 'articles',  urlPattern: '/actu/{slug}/',            schema: ['NewsArticle', 'BreadcrumbList'],        usage: 'Sujets datés/chauds, SERP avec Top Stories.' },

  // --- Commercial / transactionnel ---
  categorieCatalogue: { id: 'categorieCatalogue', label: 'Catégorie catalogue', intent: 'commercial',     collection: 'produits',  urlPattern: '/categorie-produit/{cat}/', schema: ['CollectionPage', 'BreadcrumbList', 'ItemList'], usage: 'Listing de modèles/produits : SERP "catalogue/gamme".' },
  ficheProduit:       { id: 'ficheProduit',       label: 'Fiche produit/modèle',intent: 'transactionnel', collection: 'produits',  urlPattern: '/produit/{slug}/',          schema: ['Product', 'Offer', 'BreadcrumbList'],           usage: 'Page produit/modèle : specs + prix + CTA (Product/Offer).' },
  comparateur:        { id: 'comparateur',        label: 'Comparateur (top X)', intent: 'commercial',     collection: 'comparateurs', urlPattern: '/comparateur/{cat}/',    schema: ['ItemList', 'BreadcrumbList', 'Product'],        usage: '"X meilleurs", agrégateur : tableau + CTA devis/affilié.' },
  avisMarque:         { id: 'avisMarque',         label: 'Avis marque / entité', intent: 'navigationnel', collection: 'avis',      urlPattern: '/avis/{slug}/',             schema: ['Review', 'Brand', 'AggregateRating', 'ItemList', 'BreadcrumbList', 'FAQPage'], usage: '"{marque} avis", "{marque} arnaque/fiable" : review de marque/boutique + produits affiliés. LEVIER : 1er gisement de trafic réseau (marque/entité).' },
  pageLocale:         { id: 'pageLocale',         label: 'Page locale (service+ville)', intent: 'local',  collection: 'locales',   urlPattern: '/{service}-{ville}/',       schema: ['LocalBusiness', 'BreadcrumbList', 'FAQPage'],   usage: '"{service} {ville}" : prestataire local, NAP + CTA. LEVIER maison.' },
  landingDevis:       { id: 'landingDevis',       label: 'Landing devis',       intent: 'transactionnel', collection: 'static',    urlPattern: '/devis/',                   schema: ['WebPage'],                                      usage: 'Capture de lead (formulaire devis/financement).' },
  etudePrix:          { id: 'etudePrix',          label: 'Étude de prix',       intent: 'commercial',     collection: 'articles',  urlPattern: '/prix/{slug}/',             schema: ['Article', 'BreadcrumbList', 'Table'],           usage: '"prix X", "combien coûte X" : fourchettes + tableau + CTA.' },

  // --- Utilitaire ---
  outil:        { id: 'outil',        label: 'Outil interactif',       intent: 'informationnel', collection: 'static',    urlPattern: '/outils/{slug}/',          schema: ['WebApplication', 'BreadcrumbList'],     usage: 'Calculateur, quiz, carte, convertisseur, météo, timer.' },
  annuaire:     { id: 'annuaire',     label: 'Annuaire / répertoire',  intent: 'navigationnel',  collection: 'annuaire',  urlPattern: '/annuaire/{slug}/',        schema: ['ItemList', 'LocalBusiness'],            usage: 'Répertoire de commerces/prestataires locaux.' },

  // --- Statique (toujours présent) ---
  categorieIndex: { id: 'categorieIndex', label: 'Index de catégorie', intent: 'navigationnel', collection: 'static', urlPattern: '/categorie/{cat}/', schema: ['CollectionPage', 'BreadcrumbList'], usage: 'Listing des articles d\'une catégorie éditoriale.' },
  statique:     { id: 'statique',     label: 'Page statique',          intent: 'navigationnel',  collection: 'static',    urlPattern: '/{slug}/',                 schema: ['WebPage'],                              usage: 'À propos, contact, mentions légales, CGV, charte.' },
};

// =============================================================================
// 2. ARCHÉTYPES DE SITE (combinaisons COHÉRENTES)
// =============================================================================

export type ArchetypeId =
  | 'editorial_magazine'    // média info (tech, guides, sujets)
  | 'local_place'           // commune / village / lieu
  | 'product_catalogue'     // e-commerce (vrai ou "fake" type maison)
  | 'local_service_leadgen' // prestataire local + géo (archétype maison-en-container)
  | 'comparator_affiliate'  // tests & comparatifs (affiliation)
  | 'tool_utility';         // site-outil (un outil central + support)

export interface Archetype {
  id: ArchetypeId;
  label: string;
  primaryIntent: PageIntent;
  /** Types de page AUTORISÉS (les seuls générés/affichés → cohérence). */
  allowedTypes: string[];
  /** Type de page "cœur" sur lequel le site doit ranker. */
  coreType: string;
  /** Ordre de la navigation principale. */
  nav: string[];
  /** Arbre d'URL canonique (pour doc + cohérence). */
  urlTree: string[];
  description: string;
}

export const ARCHETYPES: Record<ArchetypeId, Archetype> = {
  editorial_magazine: {
    id: 'editorial_magazine', label: 'Magazine éditorial', primaryIntent: 'informationnel',
    coreType: 'article',
    allowedTypes: ['hub', 'article', 'comparatif', 'guideAchat', 'avisMarque', 'lexique', 'faq', 'categorieIndex', 'outil', 'statique'],
    nav: ['/', '/categorie/', '/comparatifs/', '/glossaire/', '/outils/', '/a-propos/'],
    urlTree: ['/', '/categorie/{cat}/', '/{slug}/', '/comparatif/{a}-vs-{b}/', '/glossaire/{slug}/', '/outils/{slug}/'],
    description: 'Sujets info/guides. Force = profondeur éditoriale + maillage hub→articles. PAS de fiches produit.',
  },
  local_place: {
    id: 'local_place', label: 'Portail local (commune/lieu)', primaryIntent: 'local',
    coreType: 'article',
    allowedTypes: ['article', 'categorieIndex', 'annuaire', 'faq', 'outil', 'statique'],
    nav: ['/', '/categorie/', '/annuaire/', '/outils/', '/a-propos/'],
    urlTree: ['/', '/categorie/{cat}/', '/{slug}/', '/annuaire/{slug}/', '/outils/{slug}/'],
    description: 'Village/commune : vie locale, patrimoine, tourisme, annuaire commerces, météo/carte. Geo + LocalBusiness.',
  },
  product_catalogue: {
    id: 'product_catalogue', label: 'Catalogue / e-commerce', primaryIntent: 'transactionnel',
    coreType: 'ficheProduit',
    allowedTypes: ['categorieCatalogue', 'ficheProduit', 'guideAchat', 'comparatif', 'avisMarque', 'faq', 'statique'],
    nav: ['/', '/categorie-produit/', '/guide/', '/avis/', '/a-propos/'],
    urlTree: ['/', '/categorie-produit/{cat}/', '/produit/{slug}/', '/guide/{slug}/'],
    description: 'Catalogue de modèles/produits (Product/Offer) + guides d\'achat support. Ex : twitch-overlay.',
  },
  local_service_leadgen: {
    id: 'local_service_leadgen', label: 'Prestataire local / lead-gen', primaryIntent: 'transactionnel',
    coreType: 'pageLocale',
    allowedTypes: ['pageLocale', 'categorieCatalogue', 'comparateur', 'landingDevis', 'guideAchat', 'etudePrix', 'faq', 'statique'],
    nav: ['/', '/services/', '/villes/', '/guide/', '/devis/'],
    urlTree: ['/', '/{service}/', '/{service}-{ville}/', '/comparateur/{cat}/', '/prix/{slug}/', '/devis/', '/guide/{slug}/'],
    description: 'ARCHÉTYPE MAISON-EN-CONTAINER : pages géolocalisées (service×ville), catalogue de modèles, comparateur, devis. SERP commerciale/locale → PAS d\'articles de blog en cœur.',
  },
  comparator_affiliate: {
    id: 'comparator_affiliate', label: 'Comparateur / affiliation', primaryIntent: 'commercial',
    coreType: 'comparateur',
    allowedTypes: ['comparateur', 'comparatif', 'guideAchat', 'ficheProduit', 'avisMarque', 'etudePrix', 'faq', 'outil', 'statique'],
    nav: ['/', '/comparateur/', '/guide/', '/avis/', '/comparatifs/', '/outils/'],
    urlTree: ['/', '/comparateur/{cat}/', '/produit/{slug}/', '/comparatif/{a}-vs-{b}/', '/guide/{slug}/'],
    description: 'Tests & comparatifs (meuleuse, disques durs, fer à lisser…). Tableaux "top X" + tests + guides + CTA affilié/marchand.',
  },
  tool_utility: {
    id: 'tool_utility', label: 'Site-outil', primaryIntent: 'informationnel',
    coreType: 'outil',
    allowedTypes: ['outil', 'article', 'faq', 'guideAchat', 'statique'],
    nav: ['/', '/outils/', '/guide/', '/a-propos/'],
    urlTree: ['/', '/outils/{slug}/', '/{slug}/', '/guide/{slug}/'],
    description: 'Un outil central (récupération, conversion…) + contenu de support. Ex : android-recovery.',
  },
};

// =============================================================================
// 3. ATTRIBUTION D'ARCHÉTYPE (heuristique, par défaut éditorial)
// =============================================================================

interface ProfileLike {
  geo?: unknown;
  matchups?: unknown[];
  layoutVariant?: string;
  categories?: Array<{ slug: string }>;
  domain?: string;
}

/**
 * Devine l'archétype d'un site depuis son profil. À overrider explicitement via
 * `SiteProfile.archetype` quand c'est connu (recommandé).
 */
export function inferArchetype(p: ProfileLike): ArchetypeId {
  const d = (p.domain ?? '').toLowerCase();
  // Overrides connus du réseau
  if (/twitch-overlay/.test(d)) return 'product_catalogue';
  if (/android-recovery|recovery|convert/.test(d)) return 'tool_utility';
  // Heuristiques
  if (p.geo) return 'local_place';                                   // a une fiche géo → commune
  if (p.matchups && p.matchups.length > 0) return 'comparator_affiliate'; // a des matchups → comparateur
  if (p.layoutVariant === 'tech') return 'comparator_affiliate';     // layout tech → tests produits
  return 'editorial_magazine';                                       // défaut sûr
}

/** Un type de page est-il autorisé pour l'archétype d'un site ? (cohérence) */
export function isTypeAllowed(archetype: ArchetypeId, pageTypeId: string): boolean {
  return ARCHETYPES[archetype]?.allowedTypes.includes(pageTypeId) ?? false;
}

// =============================================================================
// 3b. GATING DES OUTILS (corrige l'incohérence : 11 outils génériques sur CHAQUE
//     site, ex. /outils/quiz-sextoy sur un site de disques durs).
//     Mappe chaque outil legacy vers les archétypes où il est pertinent.
//     Wiring : Header.astro (nav) + chaque page /outils/*.astro doivent appeler
//     isToolAllowed(archetype, slug) → sinon noindex + retrait du nav (404 idéal).
// =============================================================================
export const OUTIL_RELEVANCE: Record<string, ArchetypeId[]> = {
  // Outils transverses (utiles presque partout)
  meteo:        ['local_place'],
  carte:        ['local_place', 'local_service_leadgen'],
  timer:        ['tool_utility'],
  convertisseur:['tool_utility', 'comparator_affiliate'],
  calculateur:  ['comparator_affiliate', 'local_service_leadgen', 'tool_utility'],
  comparateur:  ['comparator_affiliate', 'product_catalogue'],   // mini-outil "comparer 4"
  'kit-debutant':            ['comparator_affiliate', 'editorial_magazine'],
  'compatibilite-lubrifiant':['comparator_affiliate'],            // niche outillage
  quiz:         ['editorial_magazine', 'tool_utility'],
  'quiz-sextoy':[],   // ⚠️ pertinent NULLE PART par défaut (réservé requindusexe via override)
};

/** Un outil legacy est-il cohérent avec l'archétype du site ? (gating arborescence) */
export function isToolAllowed(archetype: ArchetypeId, toolSlug: string): boolean {
  const rel = OUTIL_RELEVANCE[toolSlug];
  if (!rel) return false;          // outil inconnu → masqué (sûr)
  return rel.includes(archetype);
}

/** Map intent SERP (sortie de /serp-intent) → type de page de l'archétype. */
export function pageTypeForIntent(archetype: ArchetypeId, serpRecommendation: string): string {
  const a = ARCHETYPES[archetype];
  const want: Record<string, string[]> = {
    article: ['article', 'hub', 'guideAchat'],
    page_locale: ['pageLocale', 'categorieCatalogue', 'article'],
    catalogue: ['categorieCatalogue', 'ficheProduit', 'comparateur', 'guideAchat'],
    comparateur: ['comparateur', 'comparatif', 'guideAchat'],
    hybride: ['guideAchat', 'comparatif', 'article'],
    eviter_ou_produit: ['ficheProduit', 'guideAchat'],
    marque_entite: ['avisMarque', 'ficheProduit', 'guideAchat', 'article'],
    navigationnel: ['avisMarque', 'article'],
  };
  for (const candidate of (want[serpRecommendation] ?? ['article'])) {
    if (a.allowedTypes.includes(candidate)) return candidate;
  }
  return a.coreType; // fallback : le type cœur de l'archétype
}

// =============================================================================
// 4. SECTIONS DE HOME PAR ARCHÉTYPE — quelles sections, dans quel ordre.
//    Lu par index.astro (`HOME_SECTIONS[structuralArchetype]`). Chaque section
//    reste AUTO-GARDÉE par ses données dans index.astro (donnée absente → fragment
//    masqué) ; ce record décide seulement l'inclusion + l'ordre canonique. Les ids
//    `shop/blog/discover/editorial/duel/author/newsletter` réutilisent les fragments
//    existants ; les autres sont de nouvelles sections sur-mesure.
// =============================================================================

export type SectionId =
  // sections existantes (fragments déjà dans index.astro)
  | 'editorial' | 'blog' | 'discover' | 'duel' | 'author' | 'newsletter' | 'shop'
  // local_place
  | 'localMap' | 'weather' | 'agenda' | 'annuaireTeaser'
  // local_service_leadgen
  | 'devisCta' | 'servicesVilles' | 'comparateurTop' | 'etudePrix' | 'zonesIntervention' | 'avisClients'
  // commerce / comparateur / outil
  | 'guidesAchat' | 'avisMarques' | 'toolEmbed' | 'faqHome';

export const HOME_SECTIONS: Record<ArchetypeId, SectionId[]> = {
  // Portail local : carte + météo + agenda + vie locale par rubrique + annuaire.
  local_place: ['localMap', 'weather', 'agenda', 'blog', 'annuaireTeaser', 'author', 'newsletter'],
  // Prestataire local (maison-en-container) : devis en tête, service×ville, comparateur, prix, zones, avis.
  local_service_leadgen: ['devisCta', 'servicesVilles', 'comparateurTop', 'etudePrix', 'zonesIntervention', 'avisClients', 'newsletter'],
  // E-commerce : rayons + bons plans (shop), guides d'achat, avis marques.
  product_catalogue: ['shop', 'guidesAchat', 'avisMarques', 'blog', 'newsletter'],
  // Comparateur affilié : duels/matchups, top comparateurs, guides, tests, outils.
  comparator_affiliate: ['duel', 'comparateurTop', 'guidesAchat', 'avisMarques', 'discover', 'blog', 'newsletter'],
  // Magazine éditorial (défaut) : featured + blog riche + outils + signature.
  editorial_magazine: ['editorial', 'blog', 'discover', 'author', 'newsletter'],
  // Site-outil : outil central en tête + outils + guides support + FAQ.
  tool_utility: ['toolEmbed', 'discover', 'guidesAchat', 'faqHome', 'blog', 'newsletter'],
};

/** Mapping de secours archétype VISUEL (4) → STRUCTUREL (6), utilisé seulement
 *  en dernier recours quand on n'a ni profil ni données pour `inferArchetype`. */
export const VISUAL_TO_STRUCTURAL: Record<string, ArchetypeId> = {
  village: 'local_place',
  bricolage: 'comparator_affiliate',
  tech: 'comparator_affiliate',
  adulte: 'editorial_magazine',
};
