/**
 * Sprint 10 — Schema.org niche-adapté.
 *
 * Selon l'archetype du site + l'intent de l'article, on génère des JSON-LD
 * spécifiques pour rich snippets Google :
 *   - village : LocalBusiness, Place, TouristAttraction
 *   - bricolage : HowTo, Product, Review
 *   - tech : Product, Review, SoftwareApplication
 *   - adulte : Article + générique
 *
 * Référence darocco : `lib/niche-schema.ts` côté admin.
 */

import type { SearchIntent } from './intent-classifier';

type Archetype = 'village' | 'bricolage' | 'tech' | 'adulte';

interface AuthorPerson {
  name: string;
  role?: string;
  bio?: string;
  credentials?: string;
  sameAs?: string[];
}

interface CategoryRef {
  slug: string;
  name: string;
}

interface BuildSchemasOpts {
  archetype: Archetype;
  intent: SearchIntent;
  title: string;
  description?: string;
  pubDate: Date;
  modifiedDate?: Date;
  url: string;
  siteName: string;
  siteUrl: string;
  heroImage?: string;
  bodyText?: string; // pour HowTo step extraction
  faq?: Array<{ q: string; a: string }>;
  domain: string; // pour Place / LocalBusiness areaServed
  author?: AuthorPerson; // E-E-A-T : Person plutôt que Organization si fourni
  category?: CategoryRef; // BreadcrumbList enrichi
  sources?: Array<{ name: string; url: string }>; // citations externes (E-E-A-T)
}

/**
 * Construit les schemas JSON-LD pertinents pour la combinaison
 * (archetype × intent). Toujours append Article + BreadcrumbList.
 */
export function buildNicheSchemas(opts: BuildSchemasOpts): Record<string, unknown>[] {
  const schemas: Record<string, unknown>[] = [];

  // Auteur Person (E-E-A-T) si profile.author fourni, sinon fallback Organization
  const authorId = `${opts.siteUrl}#author-${(opts.author?.name ?? opts.siteName).toLowerCase().replace(/\s+/g, '-')}`;
  const authorNode: Record<string, unknown> = opts.author
    ? {
        '@type': 'Person',
        '@id': authorId,
        name: opts.author.name,
        ...(opts.author.role && { jobTitle: opts.author.role }),
        ...(opts.author.bio && { description: opts.author.bio }),
        ...(opts.author.credentials && { award: opts.author.credentials }),
        url: `${opts.siteUrl}/equipe-editoriale/`,
        ...(opts.author.sameAs?.length && { sameAs: opts.author.sameAs }),
        worksFor: { '@type': 'Organization', name: opts.siteName, url: opts.siteUrl },
      }
    : {
        '@type': 'Organization',
        name: opts.siteName,
        url: opts.siteUrl,
      };

  // 1. Article toujours présent
  const wordCount = (opts.bodyText ?? '').split(/\s+/).filter(Boolean).length;
  const article: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.title,
    description: opts.description ?? '',
    datePublished: opts.pubDate.toISOString(),
    dateModified: (opts.modifiedDate ?? opts.pubDate).toISOString(),
    author: authorNode,
    publisher: {
      '@type': 'Organization',
      name: opts.siteName,
      url: opts.siteUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${opts.siteUrl}/favicon.svg`,
      },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': opts.url },
    inLanguage: 'fr-FR',
    ...(wordCount > 0 && { wordCount }),
    ...(opts.bodyText && opts.bodyText.length > 100 && { articleBody: opts.bodyText.slice(0, 5000) }),
  };
  if (opts.heroImage) {
    // ImageObject complet pour rich results Google
    article.image = {
      '@type': 'ImageObject',
      url: opts.heroImage,
      contentUrl: opts.heroImage,
      width: 1200,
      height: 630,
    };
  }
  // E-E-A-T : citations externes (mentions Schema.org `citation`)
  if (opts.sources && opts.sources.length > 0) {
    article.citation = opts.sources.map((s) => ({
      '@type': 'CreativeWork',
      name: s.name,
      url: s.url,
    }));
  }
  // #30 Speakable schema — Google Assistant lecture vocale.
  // Cible TL;DR + first paragraph (sélecteurs CSS conventionnels du template).
  article.speakable = {
    '@type': 'SpeakableSpecification',
    cssSelector: ['h1', '.article-summary', '[data-tldr]', 'article > p:first-of-type'],
  };
  schemas.push(article);

  // #51 VideoObject — auto-détecte les embeds YouTube/Vimeo dans le body
  if (opts.bodyText) {
    const videoSchemas = extractVideoSchemas(opts.bodyText, opts.title, opts.pubDate);
    for (const vs of videoSchemas) schemas.push(vs);
  }

  // 2. BreadcrumbList enrichi : Accueil → (Catégorie) → Article
  const crumbs: Array<Record<string, unknown>> = [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: opts.siteUrl },
  ];
  if (opts.category) {
    crumbs.push({
      '@type': 'ListItem',
      position: 2,
      name: opts.category.name,
      item: `${opts.siteUrl}/categorie/${opts.category.slug}/`,
    });
    crumbs.push({ '@type': 'ListItem', position: 3, name: opts.title.slice(0, 80) });
  } else {
    crumbs.push({ '@type': 'ListItem', position: 2, name: opts.title.slice(0, 80) });
  }
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs,
  });

  // 3. FAQPage si on a des questions
  if (opts.faq && opts.faq.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: opts.faq.map((qa) => ({
        '@type': 'Question',
        name: qa.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: qa.a,
        },
      })),
    });
  }

  // 4. HowTo pour intent how_to (toutes archetype)
  if (opts.intent === 'how_to' && opts.bodyText) {
    const steps = extractStepsFromBody(opts.bodyText);
    if (steps.length >= 2) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: opts.title,
        description: opts.description ?? '',
        totalTime: 'PT30M', // fallback raisonnable
        inLanguage: 'fr-FR',
        ...(opts.heroImage && { image: opts.heroImage }),
        step: steps.slice(0, 12).map((s, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: s.title,
          text: s.text,
        })),
      });
    }
  }

  // 5. Recipe pour intent recipe
  if (opts.intent === 'recipe' && opts.bodyText) {
    const ingredients = extractIngredients(opts.bodyText);
    const steps = extractStepsFromBody(opts.bodyText);
    if (ingredients.length > 0 || steps.length >= 2) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'Recipe',
        name: opts.title,
        description: opts.description ?? '',
        author: authorNode,
        datePublished: opts.pubDate.toISOString(),
        ...(opts.heroImage && { image: opts.heroImage }),
        inLanguage: 'fr-FR',
        recipeIngredient: ingredients,
        recipeInstructions: steps.map((s) => ({
          '@type': 'HowToStep',
          name: s.title,
          text: s.text,
        })),
      });
    }
  }

  // 6. Product + Review pour intent product_review (bricolage/tech/adulte)
  if (
    ['product_review', 'comparator', 'buying_guide'].includes(opts.intent) &&
    ['bricolage', 'tech', 'adulte'].includes(opts.archetype)
  ) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: opts.title,
      description: opts.description ?? '',
      ...(opts.heroImage && { image: opts.heroImage }),
      review: {
        '@type': 'Review',
        author: authorNode,
        datePublished: opts.pubDate.toISOString(),
        reviewBody: opts.description ?? '',
      },
    });
  }

  // 7. Place (générique, plus inclusif que LocalBusiness)
  // Pour archetype village + intent local
  if (opts.archetype === 'village' && ['local_info', 'local_listing'].includes(opts.intent)) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'Place',
      name: opts.title,
      description: opts.description ?? '',
      url: opts.url,
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'FR',
      },
    });
  }

  return schemas;
}

/**
 * #51 VideoObject — auto-détecte YouTube/Vimeo embeds dans le body et
 * génère un schema VideoObject par vidéo. Best-effort, n'extrait pas
 * la durée (nécessiterait YouTube Data API).
 */
function extractVideoSchemas(body: string, articleTitle: string, pubDate: Date): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();
  // YouTube : iframe, lien, watch?v=, youtu.be/
  const ytPatterns = [
    /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/g,
    /https?:\/\/(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/g,
    /https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/g,
  ];
  for (const re of ytPatterns) {
    for (const m of body.matchAll(re)) {
      const id = m[1];
      if (seen.has(`yt:${id}`)) continue;
      seen.add(`yt:${id}`);
      out.push({
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: `Vidéo associée — ${articleTitle.slice(0, 70)}`,
        description: `Vidéo intégrée dans l'article "${articleTitle.slice(0, 100)}"`,
        thumbnailUrl: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
        contentUrl: `https://www.youtube.com/watch?v=${id}`,
        embedUrl: `https://www.youtube.com/embed/${id}`,
        uploadDate: pubDate.toISOString(),
        inLanguage: 'fr-FR',
      });
      if (out.length >= 3) return out; // cap 3 vidéos / article
    }
  }
  // Vimeo
  const vimRe = /https?:\/\/(?:www\.|player\.)?vimeo\.com\/(?:video\/)?(\d+)/g;
  for (const m of body.matchAll(vimRe)) {
    const id = m[1];
    if (seen.has(`vim:${id}`)) continue;
    seen.add(`vim:${id}`);
    out.push({
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: `Vidéo associée — ${articleTitle.slice(0, 70)}`,
      description: `Vidéo intégrée dans l'article "${articleTitle.slice(0, 100)}"`,
      thumbnailUrl: `https://vumbnail.com/${id}.jpg`,
      contentUrl: `https://vimeo.com/${id}`,
      embedUrl: `https://player.vimeo.com/video/${id}`,
      uploadDate: pubDate.toISOString(),
      inLanguage: 'fr-FR',
    });
    if (out.length >= 3) return out;
  }
  return out;
}

/**
 * Extrait des étapes depuis un body markdown rendu (cherche des H2/H3
 * suivis d'un paragraphe).
 */
function extractStepsFromBody(body: string): Array<{ title: string; text: string }> {
  const steps: Array<{ title: string; text: string }> = [];
  const lines = body.split('\n');
  let currentTitle = '';
  let currentText: string[] = [];

  for (const line of lines) {
    const h = /^#{2,3}\s+(.+)$/.exec(line.trim());
    if (h) {
      if (currentTitle && currentText.length > 0) {
        steps.push({ title: currentTitle, text: currentText.join(' ').slice(0, 400) });
      }
      currentTitle = h[1].trim();
      currentText = [];
    } else if (currentTitle && line.trim().length > 20) {
      currentText.push(line.trim());
      if (currentText.length >= 3) {
        steps.push({ title: currentTitle, text: currentText.join(' ').slice(0, 400) });
        currentTitle = '';
        currentText = [];
      }
    }
  }
  if (currentTitle && currentText.length > 0) {
    steps.push({ title: currentTitle, text: currentText.join(' ').slice(0, 400) });
  }
  return steps;
}

/**
 * Extrait des ingrédients depuis un body markdown : liste à puces sous H2/H3
 * "Ingrédients" ou similaire.
 */
function extractIngredients(body: string): string[] {
  const out: string[] = [];
  const lines = body.split('\n');
  let inSection = false;

  for (const line of lines) {
    if (/^#{2,3}\s+(ingr[ée]dients?|liste\s+des\s+ingr)/i.test(line.trim())) {
      inSection = true;
      continue;
    }
    if (inSection && /^#{2,3}\s+/.test(line.trim())) {
      inSection = false;
      continue;
    }
    if (inSection) {
      const m = /^[-*+]\s+(.+)$/.exec(line.trim());
      if (m) out.push(m[1].trim().slice(0, 80));
    }
  }
  return out.slice(0, 30);
}
