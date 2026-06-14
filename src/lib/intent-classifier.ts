/**
 * Sprint 9.4 — Intent classifier pour articles legacy.
 *
 * À partir du title/slug d'un article, devine l'intention de recherche
 * principale. Chaque intent active un LAYOUT spécifique avec des composants
 * adaptés (comparateur, recette, carte, etc.).
 *
 * Source : analyse SERP de Google sur les patterns de query types.
 * Référence : https://moz.com/blog/search-intent-major-types
 */

export type SearchIntent =
  | 'comparator'      // "meilleur X", "comparatif", "top X", "X vs Y"
  | 'how_to'          // "comment", "guide", "tutoriel", "étapes"
  | 'recipe'          // "recette de X"
  | 'local_info'      // "météo X", "horaires", "adresse", "à X"
  | 'local_listing'   // "restaurants X", "hôtels Y", "où manger"
  | 'product_review'  // "avis X", "test X", "X review"
  | 'buying_guide'    // "où acheter", "X pas cher", "X promo"
  | 'news'            // "actualité", "récent", "2026"
  | 'definition'      // "qu'est-ce que X", "définition"
  | 'sponsored'       // article frontmatter sponsored=true (override partiel)
  | 'general';        // fallback informationnel standard

export interface IntentResult {
  primary: SearchIntent;
  confidence: number; // 0-1
  signals: string[];  // mots-clés qui ont matched
}

/**
 * Classifie un article en analysant title + slug + frontmatter.
 */
export function classifyIntent(opts: {
  title: string;
  slug?: string;
  sponsored?: boolean;
  archetype?: 'village' | 'bricolage' | 'tech' | 'adulte';
}): IntentResult {
  const text = `${opts.title} ${opts.slug ?? ''}`.toLowerCase();
  const signals: string[] = [];
  const scores: Record<SearchIntent, number> = {
    comparator: 0, how_to: 0, recipe: 0, local_info: 0, local_listing: 0,
    product_review: 0, buying_guide: 0, news: 0, definition: 0, sponsored: 0, general: 0,
  };

  const matchAndScore = (intent: SearchIntent, patterns: RegExp[], weight = 1) => {
    for (const p of patterns) {
      if (p.test(text)) {
        scores[intent] += weight;
        signals.push(p.toString().slice(1, -3)); // /pattern/i → "pattern"
      }
    }
  };

  // Comparator (high signal)
  matchAndScore('comparator', [
    /\bcomparatif\b/i, /\bcomparaison\b/i, /\btop\s*\d+\b/i, /\bmeilleurs?\b/i,
    /\bversus\b/i, /\bvs\b/i, /\bclassement\b/i, /\bselection\b/i, /\bs[eé]lection\b/i,
    /\bquel\s+est\s+le\b/i, /\bquelle?\s+est\s+la\s+meilleure?\b/i,
  ], 2);

  // How-to / Guide
  matchAndScore('how_to', [
    /\bcomment\s+/i, /\bguide\s+/i, /\btutoriel\b/i, /\b[ée]tapes?\b/i,
    /\btutos?\b/i, /\bm[ée]thode\b/i, /\binstall(?:er|ation)\b/i, /\bmonter\b/i,
    /\butiliser\b/i, /\bchoisir\b/i, /\breussir\b/i, /\br[ée]ussir\b/i,
    /\bsavoir\s+(?:comment|si)\b/i,
  ], 2);

  // Recipe (italian food, etc.)
  matchAndScore('recipe', [
    /\brecette\s+/i, /\bingredients\b/i, /\bingr[ée]dients\b/i,
    /\bcuisson\b/i, /\bpr[ée]parer\b/i, /\bla\s+recette\s+(?:de|du|des)/i,
  ], 3);

  // Local info (weather, hours, contact)
  matchAndScore('local_info', [
    /\bm[ée]t[ée]o\s+(?:à|de|chez|pour)/i, /\bhoraires?\b/i, /\badresse\s+(?:de|du)/i,
    /\bcontact\s+/i, /\binfos?\s+pratiques\b/i, /\bcoordonn[ée]es?\b/i,
    /\bvilla\s+/i, /\bplan\s+(?:de|d')\b/i, /\bouvert(?:ure|s)?\b/i,
  ], 2);

  // Local listing (restaurants, hotels, services)
  matchAndScore('local_listing', [
    /\brestaurants?\b/i, /\bh[ôo]tels?\b/i, /\bm[ée]decins?\b/i,
    /\bdentistes?\b/i, /\bv[ée]t[ée]rinaires?\b/i, /\bcommerces?\b/i,
    /\bassociations?\b/i, /\b[ée]coles?\b/i, /\bcoll[èe]ges?\b/i,
    /\bo[uù]\s+(?:manger|dormir|trouver|acheter|aller)\b/i,
    /\b(?:les?|des?)\s+meilleurs?\s+(?:restaurants?|h[ôo]tels?|m[ée]decins?)/i,
  ], 2);

  // Product review
  matchAndScore('product_review', [
    /\bavis\s+(?:sur|de|du)/i, /\btest\s+(?:de|du)/i, /\breview\b/i,
    /\bexp[ée]rience\s+avec\b/i, /\bnotre\s+avis\b/i, /\bje\s+(?:vous\s+)?recommande\b/i,
  ], 2);

  // Buying guide
  matchAndScore('buying_guide', [
    /\bo[uù]\s+acheter\b/i, /\bpas\s+cher\b/i, /\bpromo\b/i, /\bsoldes?\b/i,
    /\bdiscount\b/i, /\bbon\s+plan\b/i, /\b\d+\s*€\b/i, /\bprix\b/i,
  ], 1.5);

  // News (recent + dates)
  matchAndScore('news', [
    /\bactualit[ée]s?\b/i, /\b(?:r[ée]cent|nouveau|nouvelle)\b/i,
    /\b\d{2,4}\s*$/i, // ends with year/date
    /\b(?:en|pour|de)\s+202[5-9]\b/i,
    /\bd[ée]couvert(?:e|es)?\b/i,
  ], 1);

  // Definition
  matchAndScore('definition', [
    /\bqu'?est[\s-]ce\s+(?:que|qu')/i, /\bd[ée]finition\b/i, /\bsignification\b/i,
    /\bd'origine\b/i, /\bhistoire\s+(?:de|du|des)/i,
  ], 2);

  // Sponsored override (priority high if frontmatter says so)
  if (opts.sponsored) {
    scores.sponsored = 5;
    signals.push('frontmatter:sponsored');
  }

  // Pick winner
  let winner: SearchIntent = 'general';
  let topScore = 0;
  for (const [k, v] of Object.entries(scores)) {
    if (v > topScore) {
      topScore = v;
      winner = k as SearchIntent;
    }
  }

  // sponsored est un OVERRIDE PARTIEL : on garde l'intent base (comparator, etc.)
  // si > 1 sinon on bascule sur 'sponsored'.
  let primary = winner;
  if (opts.sponsored && winner === 'sponsored') {
    // Cherche le 2nd meilleur pour avoir un intent "réel" en plus
    const sorted = Object.entries(scores)
      .filter(([k]) => k !== 'sponsored')
      .sort(([, a], [, b]) => b - a);
    if (sorted.length && sorted[0][1] >= 2) {
      primary = sorted[0][0] as SearchIntent;
      signals.push(`sponsored+${primary}`);
    }
  }

  return {
    primary,
    confidence: Math.min(1, topScore / 4),
    signals,
  };
}
