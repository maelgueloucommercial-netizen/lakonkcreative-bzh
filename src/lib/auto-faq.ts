/**
 * Sprint 10 — Génération auto de FAQ pour chaque article.
 *
 * À partir du title + intent + archetype, génère 4-5 questions canoniques
 * avec des réponses dérivées du body si possible. Sinon questions
 * "génériques typées" qui couvrent les intents Google PAA classiques.
 *
 * Source d'inspiration : darocco lib/faq-heuristics.ts
 */

import type { SearchIntent } from './intent-classifier';

interface BuildFaqOpts {
  title: string;
  intent: SearchIntent;
  archetype: 'village' | 'bricolage' | 'tech' | 'adulte';
  description?: string;
  bodyText?: string;
}

export interface FaqEntry { q: string; a: string; }

/**
 * Génère un set de questions PAA-style adaptées à l'intent + archetype.
 * Ces questions sont les patterns les plus communs sur Google PAA pour
 * le type de contenu (cf. analyse SERP manuelle 2026).
 */
export function buildAutoFaq(opts: BuildFaqOpts): FaqEntry[] {
  const cleanTitle = opts.title.replace(/[«»"']/g, '').trim();
  const subject = extractSubject(cleanTitle);
  const faq: FaqEntry[] = [];

  // Questions selon intent
  switch (opts.intent) {
    case 'how_to':
      faq.push(
        {
          q: `Comment réussir ${subject} ?`,
          a: opts.description || `Suivez les étapes décrites dans ce guide pour réussir ${subject} sans erreur. Les points clés sont expliqués progressivement avec les outils et précautions à prendre.`,
        },
        {
          q: `Quel est le matériel nécessaire pour ${subject} ?`,
          a: `Le matériel dépend du contexte précis. Reportez-vous à la section dédiée dans cet article pour la liste détaillée et nos recommandations.`,
        },
        {
          q: `Combien de temps faut-il prévoir pour ${subject} ?`,
          a: `Selon votre niveau et le contexte, comptez généralement entre 30 minutes et plusieurs heures. Les détails de durée sont précisés dans le guide.`,
        },
        {
          q: `Quelles sont les erreurs à éviter ?`,
          a: `Les erreurs les plus fréquentes sont détaillées dans cet article, avec les bonnes pratiques pour les éviter et obtenir un résultat satisfaisant.`,
        },
      );
      break;

    case 'comparator':
    case 'buying_guide':
      faq.push(
        {
          q: `Quel est le meilleur choix pour ${subject} ?`,
          a: opts.description || `Le meilleur choix dépend de votre usage, de votre budget et de vos critères. Notre comparatif détaille chaque option pour vous aider à décider.`,
        },
        {
          q: `Quels sont les critères importants à comparer ?`,
          a: `Les critères principaux sont la qualité, le prix, la durabilité et la pertinence pour votre besoin. Le comparatif les passe en revue point par point.`,
        },
        {
          q: `Quel budget prévoir ?`,
          a: `Le budget varie selon la gamme retenue. Les prix indicatifs sont précisés dans chaque section du comparatif.`,
        },
        {
          q: `Où acheter au meilleur prix ?`,
          a: `Vous trouverez des liens recommandés dans cet article. Comparez aussi les avis utilisateurs pour confirmer votre choix.`,
        },
      );
      break;

    case 'product_review':
      faq.push(
        {
          q: `${subject} en vaut-il la peine ?`,
          a: opts.description || `Selon notre test détaillé, ${subject} présente des avantages clairs, mais aussi quelques limites. Lisez l'article pour notre verdict complet.`,
        },
        {
          q: `Quels sont les avantages et inconvénients ?`,
          a: `Les points forts et points faibles sont listés dans la section dédiée du test. Nous insistons sur les usages pour lesquels c'est le mieux adapté.`,
        },
        {
          q: `Y a-t-il des alternatives moins chères ?`,
          a: `Oui, plusieurs alternatives existent à différents budgets. Nous mentionnons les principales en fin d'article.`,
        },
      );
      break;

    case 'recipe':
      faq.push(
        {
          q: `Quels sont les ingrédients nécessaires pour ${subject} ?`,
          a: opts.description || `La liste complète des ingrédients est précisée dans la recette. Pensez à vérifier les quantités selon le nombre de personnes.`,
        },
        {
          q: `Combien de temps de préparation et cuisson ?`,
          a: `Les temps précis sont indiqués au début de la recette. Comptez en général 15 à 60 minutes selon la complexité.`,
        },
        {
          q: `Quelles variantes peut-on faire ?`,
          a: `Plusieurs variantes sont possibles selon vos préférences. La recette mentionne les substitutions courantes.`,
        },
      );
      break;

    case 'local_info':
    case 'local_listing':
      faq.push(
        {
          q: `Que faire à ${subject} ?`,
          a: opts.description || `Plusieurs activités et points d'intérêt sont à découvrir. Cet article les recense avec leurs informations pratiques.`,
        },
        {
          q: `Comment se rendre à ${subject} ?`,
          a: `Les modalités d'accès (en voiture, en transports en commun) sont précisées dans cet article ainsi que les coordonnées GPS si disponibles.`,
        },
        {
          q: `Quels sont les horaires d'ouverture ?`,
          a: `Les horaires précis sont indiqués dans la fiche correspondante. Vérifiez toujours auprès de la source officielle avant votre visite.`,
        },
      );
      break;

    case 'definition':
      faq.push(
        {
          q: `Qu'est-ce que ${subject} ?`,
          a: opts.description || `${subject.charAt(0).toUpperCase() + subject.slice(1)} est défini en détail dans cet article, avec son origine, son contexte et ses caractéristiques principales.`,
        },
        {
          q: `Quelle est l'origine de ${subject} ?`,
          a: `L'origine et l'histoire sont retracées dans la section dédiée de cet article.`,
        },
        {
          q: `À quoi cela sert ?`,
          a: `Les usages courants et les applications pratiques sont expliqués dans le contenu.`,
        },
      );
      break;

    case 'news':
      faq.push(
        {
          q: `Quelle est l'actualité concernant ${subject} ?`,
          a: opts.description || `Les dernières informations sont détaillées dans cet article, avec les sources et le contexte nécessaire pour comprendre.`,
        },
        {
          q: `Quels sont les enjeux ?`,
          a: `Les enjeux et les implications sont analysés dans le contenu de l'article.`,
        },
      );
      break;

    default:
      // general / sponsored / autre
      faq.push(
        {
          q: `Pourquoi ${subject} est-il important ?`,
          a: opts.description || `Cet article explique en détail les enjeux, le contexte et les éléments clés pour comprendre ${subject} correctement.`,
        },
        {
          q: `Comment en savoir plus ?`,
          a: `Consultez les sections de cet article pour approfondir, et explorez les liens internes vers les sujets connexes.`,
        },
      );
  }

  // On limite à 5 maximum (sweet spot Google PAA)
  return faq.slice(0, 5);
}

/**
 * Tente d'extraire le "sujet" principal du titre, en enlevant les mots
 * outils typiques (comment, quel, est, le, la, etc.)
 */
function extractSubject(title: string): string {
  let s = title.toLowerCase().trim();
  s = s.replace(/^(comment|pourquoi|quel(?:le)?(?:s)?(?:\s+(?:est|sont))?|où|quand|qu'est[\s-]ce\s+que|qu'est[\s-]ce\s+qu')\s+/i, '');
  s = s.replace(/^(le|la|les|un|une|des|du|de\s+la|d[''])\s+/i, '');
  s = s.replace(/[?!.…]+$/g, '').trim();
  if (s.length < 3) return title;
  return s;
}
