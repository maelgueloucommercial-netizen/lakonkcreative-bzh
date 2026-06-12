import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/** Sprint 3.3 + 4.2 — frontmatter SEO auto-généré : schemas + intent-aware CTA + A/B testing. */
const autoSeoExtras = {
  schemas: z.array(z.record(z.unknown())).optional(),
  intent: z.enum(['informational', 'commercial', 'transactional', 'navigational', 'local']).optional(),
  cta: z.object({
    component: z.string().optional(),
    props: z.record(z.string()).optional(),
  }).optional(),
  /** Sprint 4.2 — A/B testing : si présent, template pick la variante active selon abStartDate. */
  abVariants: z.object({
    variantA: z.object({ title: z.string(), description: z.string() }),
    variantB: z.object({ title: z.string(), description: z.string() }),
    rationale: z.string().optional(),
  }).optional(),
  abStartDate: z.coerce.date().optional(),
};

/**
 * Régions d'Italie — les 20 régions administratives.
 * Une fiche régionale = page indexable + nœud de la carte interactive.
 */
const regions = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/regions' }),
  schema: z.object({
    name: z.string(), // ex: "Sicile"
    nameItalian: z.string(), // ex: "Sicilia"
    capital: z.string(), // ex: "Palerme"
    macroArea: z.enum(['Nord', 'Centre', 'Sud', 'Îles']),
    coords: z.object({ lat: z.number(), lng: z.number() }),
    population: z.number().optional(),
    description: z.string(), // 2-3 phrases pour la fiche
    specialties: z.array(z.string()), // plats emblématiques
    aopDop: z.array(z.string()).optional(), // AOP/DOP régionales
    relatedPasta: z.array(z.string()).optional(), // slugs de pâtes liées
    image: z.string().optional(),
    publishedAt: z.coerce.date().default(() => new Date()),
    updatedAt: z.coerce.date().default(() => new Date()),
    /** FAQ optionnelle — override la génération heuristique automatique. Item #38. */
    faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
    ...autoSeoExtras,
  }),
});

/**
 * Formats de pâtes — base de données complète.
 */
const pates = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pates' }),
  schema: z.object({
    name: z.string(), // ex: "Tagliatelle"
    nameItalian: z.string().optional(),
    type: z.enum(['longue', 'courte', 'farcie', 'plate', 'à soupe', 'à four', 'irrégulière']),
    fresh: z.boolean(), // pâtes fraîches vs sèches
    region: z.string().optional(), // région d'origine
    cookingTimeMinutes: z.tuple([z.number(), z.number()]), // [min, max]
    sauces: z.array(z.string()), // sauces compatibles (règle d'aderenza)
    description: z.string(),
    history: z.string().optional(),
    image: z.string().optional(),
    publishedAt: z.coerce.date().default(() => new Date()),
    updatedAt: z.coerce.date().default(() => new Date()),
    /** FAQ optionnelle — override la génération heuristique automatique. Item #38. */
    faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
    ...autoSeoExtras,
  }),
});

/**
 * Termes du lexique culinaire italien.
 */
const lexique = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/lexique' }),
  schema: z.object({
    term: z.string(), // ex: "Al dente"
    pronunciation: z.string().optional(), // ex: "al ˈdɛn.te"
    definition: z.string(),
    category: z.enum(['cuisson', 'technique', 'ingrédient', 'ustensile', 'service', 'autre']),
    example: z.string().optional(),
    relatedTerms: z.array(z.string()).optional(), // slugs liés
    publishedAt: z.coerce.date().default(() => new Date()),
    updatedAt: z.coerce.date().default(() => new Date()),
    ...autoSeoExtras,
  }),
});

/**
 * Annuaire des épiciers italiens en France.
 */
const epiciers = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/epiciers' }),
  schema: z.object({
    name: z.string(),
    city: z.string(),
    postalCode: z.string(),
    address: z.string(),
    coords: z.object({ lat: z.number(), lng: z.number() }).optional(),
    website: z.string().url().optional(),
    phone: z.string().optional(),
    description: z.string(),
    specialties: z.array(z.string()),
    image: z.string().optional(),
    publishedAt: z.coerce.date().default(() => new Date()),
    updatedAt: z.coerce.date().default(() => new Date()),
    ...autoSeoExtras,
  }),
});

/**
 * Catalogue B2B — fiches produits avec bouton "Demander un devis" (pas de prix).
 */
const produits = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/produits' }),
  schema: z.object({
    name: z.string(),
    category: z.enum(['huile', 'pâte', 'fromage', 'charcuterie', 'vin', 'antipasti', 'dolci', 'épicerie']),
    region: z.string().optional(),
    aopDop: z.string().optional(), // ex: "AOP", "DOP", "IGP"
    description: z.string(),
    conditioningOptions: z.array(z.string()), // ex: ["bouteille 750ml", "bidon 5L"]
    minOrderQuantity: z.string().optional(), // ex: "12 bouteilles"
    targetCustomer: z.array(z.enum(['restaurant', 'épicerie', 'traiteur', 'hôtel', 'caviste'])),
    image: z.string().optional(),
    publishedAt: z.coerce.date().default(() => new Date()),
    updatedAt: z.coerce.date().default(() => new Date()),
    ...autoSeoExtras,
  }),
});

/**
 * Articles éditoriaux du blog (recettes, antifraude, tests produits).
 */
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(), // date affichée — peut être backdatée
    updatedAt: z.coerce.date().optional(),
    author: z.string().default('Lorenzo Da Rocco'),
    category: z.enum(['recette', 'guide', 'antifraude', 'test', 'reportage', 'lexique']),
    tags: z.array(z.string()).default([]),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    draft: z.boolean().default(false),
    sponsored: z.boolean().default(false),
    sponsorPlatform: z.string().optional(),
    /** FAQ optionnelle — bloc rendu en fin d'article + schema FAQPage. Item #38. */
    faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
    ...autoSeoExtras,
  }),
});

export const collections = { regions, pates, lexique, epiciers, produits, blog };
