/**
 * Génération heuristique de FAQ à partir des données structurées des fiches.
 *
 * Pour les régions, on construit 4-6 questions canoniques que les utilisateurs
 * tapent réellement dans Google ("quelles spécialités à X ?", "AOP X ?", etc.)
 * en s'appuyant sur les champs `specialties`, `aopDop`, `relatedPasta`,
 * `capital`, `macroArea`.
 *
 * Pour les pâtes, on construit des questions sur la cuisson, l'origine, les
 * sauces compatibles à partir de `cookingTimeMinutes`, `region`, `sauces`,
 * `fresh`.
 *
 * Si la fiche fournit un `faq` explicite, c'est lui qui prime — la fonction
 * n'est jamais appelée dans ce cas (logique côté template).
 */

interface FaqItem {
  question: string;
  answer: string;
}

interface RegionData {
  name: string;
  nameItalian: string;
  capital: string;
  macroArea: string;
  description: string;
  specialties: string[];
  aopDop?: string[];
  relatedPasta?: string[];
}

interface PastaData {
  name: string;
  nameItalian?: string;
  type: string;
  fresh: boolean;
  region?: string;
  cookingTimeMinutes: [number, number];
  sauces: string[];
}

function joinFr(arr: string[]): string {
  if (arr.length === 0) return '';
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} et ${arr[1]}`;
  return `${arr.slice(0, -1).join(', ')} et ${arr[arr.length - 1]}`;
}

export function buildRegionFaq(data: RegionData): FaqItem[] {
  const items: FaqItem[] = [];

  // 1. Spécialités
  if (data.specialties.length > 0) {
    items.push({
      question: `Quelles sont les spécialités culinaires de ${data.name} ?`,
      answer: `Les plats emblématiques de ${data.name} (${data.nameItalian}) sont ${joinFr(
        data.specialties.slice(0, 4),
      )}.${data.specialties.length > 4 ? ' Et bien d\'autres recettes traditionnelles régionales.' : ''}`,
    });
  }

  // 2. AOP / DOP
  if (data.aopDop && data.aopDop.length > 0) {
    items.push({
      question: `Quels sont les produits AOP, DOP ou IGP de ${data.name} ?`,
      answer: `${data.name} compte plusieurs appellations protégées : ${joinFr(
        data.aopDop.slice(0, 5),
      )}. Ces signes officiels garantissent l'origine, le terroir et un savoir-faire traditionnel codifié.`,
    });
  }

  // 3. Capitale / situation
  items.push({
    question: `Où se situe ${data.name} en Italie ?`,
    answer: `${data.name} est une région d'Italie ${
      data.macroArea === 'Îles' ? 'insulaire' : `du ${data.macroArea}`
    }, dont la capitale administrative est ${data.capital}. Son nom italien est ${data.nameItalian}.`,
  });

  // 4. Pâtes liées
  if (data.relatedPasta && data.relatedPasta.length > 0) {
    items.push({
      question: `Quelles pâtes traditionnelles trouve-t-on en ${data.name} ?`,
      answer: `Les formats de pâtes typiques de ${data.name} sont notamment ${joinFr(
        data.relatedPasta.map((s) => s.replace(/-/g, ' ')),
      )}. Chacune se cuisine avec des sauces locales spécifiques (règle d'aderenza).`,
    });
  }

  // 5. Spécialité touristique alimentaire
  items.push({
    question: `Que goûter absolument quand on visite ${data.name} ?`,
    answer:
      data.specialties.length > 0
        ? `Si vous voyagez en ${data.name}, ne manquez surtout pas de goûter ${data.specialties[0]}, ainsi que les produits AOP/DOP/IGP locaux servis dans les trattorie traditionnelles.`
        : `Privilégiez les trattorie de quartier hors zones touristiques, où l'on prépare encore les recettes traditionnelles régionales avec les produits AOP/DOP/IGP locaux.`,
  });

  return items;
}

export function buildPastaFaq(data: PastaData): FaqItem[] {
  const items: FaqItem[] = [];
  const [tMin, tMax] = data.cookingTimeMinutes;
  const cookingDesc = tMin === tMax ? `${tMin} minutes` : `${tMin} à ${tMax} minutes`;

  // 1. Cuisson
  items.push({
    question: `Combien de temps faut-il cuire les ${data.name.toLowerCase()} ?`,
    answer: `Les ${data.name.toLowerCase()} ${
      data.fresh ? 'fraîches' : 'sèches'
    } se cuisent ${cookingDesc} en eau salée bouillante (10 g de sel par litre). Goûter à partir de la borne basse — la pâte doit garder une légère résistance al dente au cœur.`,
  });

  // 2. Origine
  if (data.region) {
    items.push({
      question: `D'où viennent les ${data.name.toLowerCase()} ?`,
      answer: `Les ${data.name.toLowerCase()} sont une pâte ${
        data.fresh ? 'fraîche' : 'sèche'
      } originaire de ${data.region}. Elles font partie du patrimoine pâtier régional italien et se déclinent en versions locales selon la zone.`,
    });
  }

  // 3. Sauces compatibles
  if (data.sauces.length > 0) {
    items.push({
      question: `Avec quelle sauce manger les ${data.name.toLowerCase()} ?`,
      answer: `La règle italienne d'aderenza (adhérence sauce-pâte) recommande les ${data.name.toLowerCase()} avec ${joinFr(
        data.sauces.slice(0, 4).map((s) => s.toLowerCase()),
      )}. Le format de la pâte est conçu pour retenir précisément ces types de sauces.`,
    });
  }

  // 4. Frais ou sec
  items.push({
    question: `Les ${data.name.toLowerCase()} sont-elles fraîches ou sèches ?`,
    answer: `Les ${data.name.toLowerCase()} traditionnelles sont une pâte ${
      data.fresh
        ? 'fraîche aux œufs (ou parfois à l\'eau seule selon la région), à consommer dans les 48 h ou à congeler crues'
        : 'sèche à base de semoule de blé dur et d\'eau, sans œufs, qui se conserve plusieurs mois en sachet'
    }.`,
  });

  return items;
}
