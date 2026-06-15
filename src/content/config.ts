import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string().default(''),
    pubDate: z.coerce.date(),
    modifiedDate: z.coerce.date().optional(),
    slug: z.string(),
    wpPostId: z.number().optional(),
    legacyUrl: z.string().optional(),
    sponsored: z.boolean().default(false),
    seoScore: z.number().optional(),
    // URL routing : date-based ou category-based
    dateUrlFormat: z.boolean().default(true),
    urlYear: z.string().or(z.number()).optional(),
    urlMonth: z.string().or(z.number()).optional(),
    urlDay: z.string().or(z.number()).optional(),
    urlPath: z.string().optional(), // pour category-based
    // Hero image
    heroImage: z.string().optional(),
    heroImageAlt: z.string().optional(),
    // Tags
    tags: z.array(z.string()).default([]),
    category: z.string().optional(),
    // E-E-A-T : citations externes appuyant le contenu (Schema.org `citation`)
    sources: z.array(z.object({ name: z.string(), url: z.string().url() })).optional(),
    // Schema LocalBusiness optionnel (fiches commerces locaux)
    localBusiness: z.record(z.any()).optional(),
    // Helpful Content : thin/duplicate articles → robots noindex,follow
    noindex: z.boolean().optional(),
    // FAQ réelle (PAA Brave) groundée sur le contenu → rendu + FAQPage schema.
    // Prend le dessus sur la FAQ auto-générée si présente.
    faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
    // --- Discriminateur de type éditorial (hub/faq/lexique) — optionnel, défaut article. ---
    pageType: z.enum(['article', 'hub', 'faq', 'lexique']).optional(),
    glossaryTerm: z.string().optional(),                 // lexique : le terme défini (DefinedTerm)
    clusterSlugs: z.array(z.string()).default([]),       // hub : slugs des articles enfants (maillage pilier)
    relatedTerms: z.array(z.string()).default([]),       // lexique : termes liés (slugs)
    // --- Agenda local (archétype local_place) — tous optionnels, zéro impact existant. ---
    // Un article avec `eventDate` est éligible à l'agenda (home + /agenda/) + schema Event.
    eventDate: z.coerce.date().optional(),
    eventEndDate: z.coerce.date().optional(),
    eventType: z.string().optional(),                    // festival|marche|concert|sport|expo…
    eventLocation: z.string().optional(),
  }),
});

// pageLocale (archétype local_service_leadgen) — pages service×ville.
// URL : /{serviceSlug}/{villeSlug}/. AutoBodyShop/LocalBusiness schema.
// Contenu validé Haloscan (volume) + Thot (≥ cible) en amont. Collection vide
// sur les sites non-leadgen → getStaticPaths ne génère rien (gating naturel).
const locales = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/locales' }),
  schema: z.object({
    title: z.string(),
    description: z.string().default(''),
    service: z.string(), serviceSlug: z.string(),
    ville: z.string(), villeSlug: z.string(),
    region: z.string().optional(), departement: z.string().optional(),
    codePostal: z.string().optional(),
    lat: z.number().optional(), lng: z.number().optional(),
    pubDate: z.coerce.date(), modifiedDate: z.coerce.date().optional(),
    seoScore: z.number().optional(), keywordVolume: z.number().optional(),
    heroImage: z.string().optional(), heroImageAlt: z.string().optional(),
    priceFrom: z.string().optional(), phone: z.string().optional(),
    ctaLabel: z.string().default('Demander un devis gratuit'),
    ctaHref: z.string().default('/devis/'),
    faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
    sources: z.array(z.object({ name: z.string(), url: z.string().url() })).optional(),
    noindex: z.boolean().optional(),
    usps: z.array(z.string()).default([]),
    horaires: z.string().optional(), delaiInter: z.string().optional(),
    services: z.array(z.object({ nom: z.string(), desc: z.string().optional(), icon: z.string().optional() })).default([]),
    etapes: z.array(z.object({ titre: z.string(), desc: z.string() })).default([]),
    tarifs: z.array(z.object({ prestation: z.string(), prix: z.string(), note: z.string().optional() })).default([]),
    zones: z.array(z.string()).default([]),
    agrements: z.array(z.string()).default([]),
    avis: z.array(z.object({ auteur: z.string(), note: z.number().min(1).max(5), texte: z.string(), date: z.string().optional() })).optional(),
    note: z.number().min(1).max(5).optional(), nbAvis: z.number().optional(),
    villesProches: z.array(z.object({ ville: z.string(), slug: z.string() })).default([]),
  }),
});

// Item produit partagé (guideAchat + comparateur : sélection notée).
const selectionItem = z.object({
  rank: z.number().optional(),
  name: z.string(),
  brand: z.string().optional(),
  image: z.string().optional(),
  badge: z.string().optional(),          // "Meilleur choix", "Rapport qualité-prix"…
  bestFor: z.string().optional(),        // "Idéal pour les pros"
  note: z.number().min(0).max(10).optional(),   // /10 (comparateur) ou /5 (guide) — affiché tel quel
  noteMax: z.number().default(10),
  reviewCount: z.number().optional(),
  price: z.string().optional(),
  specs: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
  pros: z.array(z.string()).default([]),
  cons: z.array(z.string()).default([]),
  verdict: z.string().optional(),
  ctaUrl: z.string().optional(),
  ctaLabel: z.string().default("Voir le prix"),
  merchants: z.array(z.object({ name: z.string(), url: z.string(), price: z.string().optional() })).default([]), // multi-marchand
  priceLow: z.number().optional(),        // fourchette prix (AggregateOffer lowPrice)
  priceHigh: z.number().optional(),       // AggregateOffer highPrice
  currency: z.string().default('EUR'),
  reviewUrl: z.string().optional(),       // lien vers le test complet ("lire le test")
  imageAlt: z.string().optional(),
});

// comparateur (archétype comparator_affiliate / leadgen) — agrégateur top-N.
// URL : /comparateur/{cat}/. ItemList + Product + AggregateRating + FAQPage.
const comparateurs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/comparateurs' }),
  schema: z.object({
    title: z.string(), description: z.string().default(''),
    category: z.string(),                // slug = nom de fichier
    pubDate: z.coerce.date(), modifiedDate: z.coerce.date().optional(),
    seoScore: z.number().optional(), keywordVolume: z.number().optional(), noindex: z.boolean().optional(),
    heroImage: z.string().optional(), heroImageAlt: z.string().optional(),
    affiliateDisclosure: z.boolean().default(true),
    specColumns: z.array(z.string()).default([]),   // colonnes du tableau (specs montrées)
    items: z.array(selectionItem).default([]),
    topPicks: z.array(z.object({ label: z.string(), itemRank: z.number() })).default([]), // tier pas cher/milieu/haut
    usagePicks: z.array(z.object({ usage: z.string(), itemRank: z.number() })).default([]), // "pour quel usage"
    verdict: z.string().optional(),        // "notre choix en bref" (résumé en tête)
    methodology: z.string().optional(),    // "comment nous comparons" (E-E-A-T)
    author: z.string().optional(),
    takeaways: z.array(z.string()).default([]),   // "à retenir" (points clés)
    relatedGuides: z.array(z.object({ title: z.string(), url: z.string() })).default([]),
    criteria: z.array(z.object({ titre: z.string(), desc: z.string() })).default([]),
    faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
    sources: z.array(z.object({ name: z.string(), url: z.string().url() })).optional(),
  }),
});

// guideAchat (éditorial commercial "meilleur X") — Article + Product/Review + FAQPage + E-E-A-T.
// URL : /guide/{slug}/.
const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(), description: z.string().default(''),
    slug: z.string(),
    pubDate: z.coerce.date(), modifiedDate: z.coerce.date().optional(),
    author: z.string().optional(), authorBio: z.string().optional(),
    seoScore: z.number().optional(), keywordVolume: z.number().optional(), noindex: z.boolean().optional(),
    heroImage: z.string().optional(), heroImageAlt: z.string().optional(),
    affiliateDisclosure: z.boolean().default(true),
    products: z.array(selectionItem).default([]),
    verdict: z.string().optional(),               // "notre sélection en bref"
    usagePicks: z.array(z.object({ usage: z.string(), itemRank: z.number() })).default([]),
    takeaways: z.array(z.string()).default([]),   // "à retenir / les essentiels"
    warnings: z.array(z.string()).default([]),    // "ce qu'il faut éviter"
    relatedGuides: z.array(z.object({ title: z.string(), url: z.string() })).default([]),
    criteria: z.array(z.object({ titre: z.string(), desc: z.string() })).default([]),
    methodology: z.string().optional(),
    faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
    sources: z.array(z.object({ name: z.string(), url: z.string().url() })).optional(),
  }),
});

// ficheProduit + categorieCatalogue (archétype product_catalogue). Product/Offer/AggregateRating.
// URL produit : /produit/{slug}/ ; URL catégorie : /categorie-produit/{cat}/ (dérivée).
const produits = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/produits' }),
  schema: z.object({
    title: z.string(), description: z.string().default(''),
    slug: z.string(), category: z.string(), categoryLabel: z.string().optional(),
    pubDate: z.coerce.date(), modifiedDate: z.coerce.date().optional(),
    seoScore: z.number().optional(), keywordVolume: z.number().optional(), noindex: z.boolean().optional(),
    brand: z.string().optional(), sku: z.string().optional(),
    price: z.number().optional(), priceText: z.string().optional(), oldPrice: z.number().optional(),
    priceLow: z.number().optional(), priceHigh: z.number().optional(),   // multi-marchand (AggregateOffer)
    currency: z.string().default('EUR'), availability: z.string().default('https://schema.org/InStock'),
    merchants: z.array(z.object({ name: z.string(), url: z.string(), price: z.string().optional() })).default([]),
    images: z.array(z.string()).default([]),
    rating: z.number().min(0).max(5).optional(), reviewCount: z.number().optional(),
    ratingBars: z.array(z.number()).default([]),  // distribution avis [5★,4★,3★,2★,1★] en %
    avis: z.array(z.object({ auteur: z.string(), note: z.number().min(1).max(5), texte: z.string(), date: z.string().optional() })).optional(),
    usps: z.array(z.string()).default([]),
    // --- Style ionomat (verdict / notes / pros-cons) — préférence Mael 2026-06-04 ---
    verdict: z.string().optional(),                       // "notre avis en bref" above-fold
    recommendation: z.enum(['recommande', 'reserves', 'eviter']).optional(),
    badge: z.string().optional(),                         // "Meilleur choix", "Rapport qualité-prix"…
    bestFor: z.string().optional(),                       // "Idéal pour le home-cinéma"
    scoreGlobal: z.number().min(0).max(5).optional(),     // note rédaction /5 (≠ rating clients)
    pros: z.array(z.string()).default([]),
    cons: z.array(z.string()).default([]),
    criteria: z.array(z.object({ label: z.string(), note: z.number().min(0).max(5), comment: z.string().optional() })).default([]),
    // Attributs structurés pour filtres à facettes (résolution, techno, luminosité, usages) — niveau visunext/Darty.
    attributes: z.object({
      resolution: z.string().optional(),     // "4K", "Full HD", "HD"
      techno: z.string().optional(),         // "DLP", "3LCD", "Laser", "Tri-laser", "LED", "Cadre fixe"…
      lumens: z.number().optional(),         // valeur ANSI pour bucket/slider
      usages: z.array(z.string()).default([]), // ["Home-cinéma","Gaming","Portable","Plein jour","Petit budget"]
    }).optional(),
    variants: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
    specs: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
    ctaUrl: z.string().optional(), ctaLabel: z.string().default("Voir l'offre"),
    relatedSlugs: z.array(z.string()).default([]),
    faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
  }),
});

// etudePrix ("prix / combien coûte X") — Article + BreadcrumbList + FAQPage.
// URL : /prix/{slug}/. Pas de markup Offer (fourchette via texte + FAQ). CTA devis.
const etudesPrix = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/prix' }),
  schema: z.object({
    title: z.string(), description: z.string().default(''),
    slug: z.string(), pubDate: z.coerce.date(), modifiedDate: z.coerce.date().optional(),
    author: z.string().optional(), seoScore: z.number().optional(), keywordVolume: z.number().optional(), noindex: z.boolean().optional(),
    heroImage: z.string().optional(), heroImageAlt: z.string().optional(),
    priceFrom: z.string().optional(),         // "à partir de 90 €"
    priceRange: z.string().optional(),        // "250 € à 700 €" (réponse fourchette above-fold)
    ctaLabel: z.string().default('Obtenir des devis gratuits'), ctaHref: z.string().default('/devis/'),
    phone: z.string().optional(),
    priceTables: z.array(z.object({
      titre: z.string(),
      cols: z.array(z.string()).default([]),
      rows: z.array(z.array(z.string())).default([]),
    })).default([]),
    facteurs: z.array(z.object({ titre: z.string(), desc: z.string() })).default([]),
    faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
    sources: z.array(z.object({ name: z.string(), url: z.string().url() })).optional(),
  }),
});

// comparatif (X vs Y) — face-à-face. Design 2 colonnes (templates.css).
// URL : /comparatif/{slug}/. Schemas Product×2 (Offer/AggregateRating) + FAQPage + BreadcrumbList.
const contender = z.object({
  name: z.string(), brand: z.string().optional(),
  image: z.string().optional(), imageAlt: z.string().optional(),
  tagline: z.string().optional(),
  score: z.number().min(0).max(10).optional(), scoreMax: z.number().default(10),
  priceLow: z.number().optional(), priceHigh: z.number().optional(), currency: z.string().default('EUR'),
  pros: z.array(z.string()).default([]), cons: z.array(z.string()).default([]),
  bestFor: z.string().optional(),
  merchants: z.array(z.object({ name: z.string(), url: z.string(), price: z.string().optional() })).default([]),
  ctaUrl: z.string().optional(), ctaLabel: z.string().default('Voir le prix'),
});
const comparatifs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/comparatifs' }),
  schema: z.object({
    title: z.string(), description: z.string().default(''),
    slug: z.string(), pubDate: z.coerce.date(), modifiedDate: z.coerce.date().optional(),
    author: z.string().optional(), noindex: z.boolean().optional(), seoScore: z.number().optional(), keywordVolume: z.number().optional(),
    heroImage: z.string().optional(),
    a: contender, b: contender,
    criteria: z.array(z.object({ label: z.string(), a: z.string(), b: z.string(), winner: z.enum(['a', 'b', 'tie']).default('tie') })).default([]),
    sections: z.array(z.object({ titre: z.string(), desc: z.string(), winner: z.enum(['a', 'b', 'tie']).optional() })).default([]),
    verdict: z.string().optional(), winner: z.enum(['a', 'b']).optional(),
    faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
    relatedGuides: z.array(z.object({ title: z.string(), url: z.string() })).default([]),
  }),
});

// catalogues — contenu SEO par catégorie (rendu sur /categorie-produit/{cat}/).
// Corps markdown = texte SEO long (≥2000 mots) + FAQ. `category` = slug produits.
const catalogues = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/catalogues' }),
  schema: z.object({
    category: z.string(),
    title: z.string().optional(), intro: z.string().optional(),
    pubDate: z.coerce.date().optional(), modifiedDate: z.coerce.date().optional(),
    seoScore: z.number().optional(), keywordVolume: z.number().optional(), noindex: z.boolean().optional(),
    faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
  }),
});

// avisMarque ("Avis {marque}") — review d'une marque / boutique / entité.
// Le plus gros gisement de trafic du réseau = intention "navigationnel (marque/entité)"
// (ex. page n°1 réseau "tiviob"). Reproduit le money-format concurrent (type ionomat
// "{Marque} Avis 2026") EN SUPÉRIEUR : schema riche + critères notés + produits affiliés.
// URL : /avis/{slug}/. Schemas Organization/Brand(+AggregateRating) + Review + ItemList + FAQPage.
// Corps markdown = avis long (≥2000 mots) validé Thot. `topProducts` = mécanique de monétisation.
const avis = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/avis' }),
  schema: z.object({
    title: z.string(), description: z.string().default(''),
    slug: z.string(),
    pubDate: z.coerce.date(), modifiedDate: z.coerce.date().optional(),
    author: z.string().optional(), authorBio: z.string().optional(),
    seoScore: z.number().optional(), keywordVolume: z.number().optional(), noindex: z.boolean().optional(),
    heroImage: z.string().optional(), heroImageAlt: z.string().optional(),
    affiliateDisclosure: z.boolean().default(true),
    // Entité évaluée
    brand: z.string(),
    brandType: z.enum(['marque', 'fabricant', 'boutique', 'laboratoire', 'service', 'logiciel']).default('marque'),
    logo: z.string().optional(),
    officialUrl: z.string().optional(),       // site officiel (sameAs)
    founded: z.string().optional(), origin: z.string().optional(),
    // Verdict
    rating: z.number().min(0).max(5).optional(),    // note globale /5 (AggregateRating)
    reviewCount: z.number().optional(),
    ratingBars: z.array(z.number()).default([]),    // distribution [5★..1★] en %
    verdict: z.string().optional(),                 // "notre avis en bref" above-fold
    recommendation: z.enum(['recommande', 'reserves', 'eviter']).optional(),
    pros: z.array(z.string()).default([]),
    cons: z.array(z.string()).default([]),
    // Notes par critère (tableau multi-critères — pattern ionomat)
    criteria: z.array(z.object({ label: z.string(), note: z.number().min(0).max(5), comment: z.string().optional() })).default([]),
    // "Arnaque ou fiable ?" (réassurance E-E-A-T)
    trustVerdict: z.string().optional(),
    trustSignals: z.array(z.string()).default([]),  // SIREN, ISO, garantie, ancienneté…
    // Produits/offres phares (money mechanism → affilié) — réutilise selectionItem
    topProducts: z.array(selectionItem).default([]),
    // Avis clients agrégés
    reviewSources: z.array(z.object({ name: z.string(), note: z.string(), count: z.string().optional() })).default([]), // Trustpilot 4,0/5…
    customerReviews: z.array(z.object({ auteur: z.string(), note: z.number().min(1).max(5), texte: z.string(), date: z.string().optional(), source: z.string().optional() })).default([]),
    // Alternatives (placement concurrent — pattern ionomat)
    alternatives: z.array(z.object({ name: z.string(), url: z.string().optional(), why: z.string().optional() })).default([]),
    faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
    sources: z.array(z.object({ name: z.string(), url: z.string().url() })).optional(),
  }),
});

export const collections = { articles, locales, comparateurs, guides, produits, etudesPrix, comparatifs, catalogues, avis };
