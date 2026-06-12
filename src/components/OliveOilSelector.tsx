/**
 * Sélecteur d'huile d'olive interactif (item #20 roadmap).
 *
 * L'utilisateur choisit son usage culinaire et son intensité préférée → on
 * lui suggère une région italienne + un cultivar dominant + 2-3 producteurs
 * référencés.
 *
 * Composant React island, monté côté client uniquement (pas de SSR pour
 * éviter les frictions Astro Content + types).
 */
import { useState } from 'react';

type Usage =
  | 'finition_table'
  | 'pasta_robuste'
  | 'poisson_cru'
  | 'pesto'
  | 'bruschetta'
  | 'cuisson_courte';

type Intensity = 'douce' | 'equilibree' | 'piquante' | 'tres_piquante';

interface Recommendation {
  region: string;
  regionSlug: string;
  cultivar: string;
  aopName: string;
  description: string;
  producteurs: string[];
}

const MATRIX: Record<Usage, Record<Intensity, Recommendation>> = {
  finition_table: {
    douce: {
      region: 'Ligurie', regionSlug: 'ligurie', cultivar: 'Taggiasca',
      aopName: 'Olio Riviera Ligure DOP',
      description: "Douce, peu amère, peu piquante. Notes de noisette-amande douce. Idéale en finition discrète.",
      producteurs: ['Roi (Badalucco)', 'Anfosso', 'Olio Carli'],
    },
    equilibree: {
      region: 'Sicile', regionSlug: 'sicile', cultivar: 'Tonda Iblea',
      aopName: 'Olio Monti Iblei DOP',
      description: "Équilibrée, parfum tomate verte + amande. Très polyvalente en finition.",
      producteurs: ['Frantoi Cutrera', 'Olearia Geraci', 'Travaglini'],
    },
    piquante: {
      region: 'Toscane', regionSlug: 'toscane', cultivar: 'Frantoio',
      aopName: 'Olio Toscano IGP',
      description: "Piquante en bouche, amer noble, complexe. Le standard toscan en finition de viande grillée.",
      producteurs: ['Castello di Volpaia', 'Frescobaldi (Laudemio)', 'Antinori'],
    },
    tres_piquante: {
      region: 'Pouilles', regionSlug: 'pouilles', cultivar: 'Coratina',
      aopName: 'Olio Terra di Bari DOP',
      description: "Très piquante, tomate-amande verte intense. Pour amateurs de polyphénols élevés.",
      producteurs: ['Galantino', 'Frantoio Muraglia', 'De Carlo'],
    },
  },
  pasta_robuste: {
    douce: {
      region: 'Ligurie', regionSlug: 'ligurie', cultivar: 'Taggiasca',
      aopName: 'Olio Riviera Ligure DOP',
      description: "Sur pasta légère (sardines, anchois, ail).",
      producteurs: ['Roi', 'Olio Carli', 'Anfosso'],
    },
    equilibree: {
      region: 'Latium', regionSlug: 'latium', cultivar: 'Itrana',
      aopName: 'Olio Sabina DOP',
      description: "Équilibrée, parfaite sur cacio e pepe, carbonara, amatriciana.",
      producteurs: ['De Carlo (Sabina)', 'Aldobrandi'],
    },
    piquante: {
      region: 'Toscane', regionSlug: 'toscane', cultivar: 'Frantoio + Moraiolo',
      aopName: 'Olio Toscano IGP',
      description: "Piquante, sur pasta toscane (pici al ragù, pappardelle al cinghiale).",
      producteurs: ['Frescobaldi', 'Laudemio', 'Castello di Volpaia'],
    },
    tres_piquante: {
      region: 'Pouilles', regionSlug: 'pouilles', cultivar: 'Coratina',
      aopName: 'Olio Terra di Bari DOP',
      description: "Pour orecchiette aux cime di rapa, cavatelli au saucisson.",
      producteurs: ['Galantino', 'Muraglia'],
    },
  },
  poisson_cru: {
    douce: {
      region: 'Ligurie', regionSlug: 'ligurie', cultivar: 'Taggiasca',
      aopName: 'Olio Riviera Ligure DOP',
      description: "Le choix de référence pour carpaccio, tartare, sashimi italien. Ne masque pas le poisson.",
      producteurs: ['Roi', 'Olio Carli', 'Anfosso'],
    },
    equilibree: {
      region: 'Sicile', regionSlug: 'sicile', cultivar: 'Cerasuola',
      aopName: 'Olio Val di Mazara DOP',
      description: "Notes herbacées, parfait sur poisson grillé léger.",
      producteurs: ['Olio Bonajuto', 'Fontanasalsa'],
    },
    piquante: {
      region: 'Toscane', regionSlug: 'toscane', cultivar: 'Frantoio',
      aopName: 'Olio Toscano IGP',
      description: "Pour poissons à chair ferme (thon mi-cuit, espadon).",
      producteurs: ['Castello di Volpaia', 'Antinori'],
    },
    tres_piquante: {
      region: 'Pouilles', regionSlug: 'pouilles', cultivar: 'Coratina',
      aopName: 'Olio Terra di Bari DOP',
      description: "Sur poisson de caractère (rouget grillé, anguille).",
      producteurs: ['Galantino', 'De Carlo'],
    },
  },
  pesto: {
    douce: {
      region: 'Ligurie', regionSlug: 'ligurie', cultivar: 'Taggiasca',
      aopName: 'Olio Riviera Ligure DOP',
      description: "OBLIGATOIRE pour pesto Genovese DOP. Toute autre huile rendrait le pesto amer.",
      producteurs: ['Roi', 'Olio Carli', 'Anfosso', 'Galateo'],
    },
    equilibree: {
      region: 'Ligurie', regionSlug: 'ligurie', cultivar: 'Taggiasca',
      aopName: 'Olio Riviera Ligure DOP',
      description: "Toujours ligurienne pour pesto. La règle est non négociable côté Genovese.",
      producteurs: ['Roi', 'Olio Carli'],
    },
    piquante: {
      region: 'Sicile', regionSlug: 'sicile', cultivar: 'Cerasuola + Biancolilla',
      aopName: 'Olio Val di Mazara DOP',
      description: "Pour pesto rouge sicilien (tomates séchées + amandes + ricotta salata).",
      producteurs: ['Olio Bonajuto'],
    },
    tres_piquante: {
      region: 'Sicile', regionSlug: 'sicile', cultivar: 'Tonda Iblea',
      aopName: 'Olio Monti Iblei DOP',
      description: "Pour pesto trapanese intense.",
      producteurs: ['Frantoi Cutrera'],
    },
  },
  bruschetta: {
    douce: {
      region: 'Ombrie', regionSlug: 'ombrie', cultivar: 'Moraiolo + Frantoio',
      aopName: 'Olio Umbria DOP',
      description: "Pour bruschetta légère (mozzarella + tomate cerise).",
      producteurs: ['Frantoio Decimi', 'Frantoio Centumbrie'],
    },
    equilibree: {
      region: 'Toscane', regionSlug: 'toscane', cultivar: 'Frantoio + Moraiolo',
      aopName: 'Olio Toscano IGP',
      description: "Le bon défaut pour bruschetta classique tomate-basilic.",
      producteurs: ['Castello di Volpaia', 'Frescobaldi'],
    },
    piquante: {
      region: 'Pouilles', regionSlug: 'pouilles', cultivar: 'Coratina',
      aopName: 'Olio Terra di Bari DOP',
      description: "Bruschetta pugliese — l'huile fait le plat. Pain pugliese + tomate + ail + Coratina.",
      producteurs: ['Galantino', 'Muraglia'],
    },
    tres_piquante: {
      region: 'Calabre', regionSlug: 'calabre', cultivar: 'Carolea',
      aopName: 'Olio Lametia DOP',
      description: "Bruschetta calabraise + 'nduja + Carolea piquante. Pour amateurs.",
      producteurs: ['Olio Pugliese (Lametia)'],
    },
  },
  cuisson_courte: {
    douce: {
      region: 'Sicile', regionSlug: 'sicile', cultivar: 'Biancolilla',
      aopName: 'Olio Val di Mazara DOP',
      description: "Saute de légumes, ail-huile en poêle.",
      producteurs: ['Fontanasalsa'],
    },
    equilibree: {
      region: 'Toscane', regionSlug: 'toscane', cultivar: 'Frantoio',
      aopName: 'Olio Toscano IGP',
      description: "Cuisson courte (sauter aubergines, courgettes).",
      producteurs: ['Castello di Volpaia'],
    },
    piquante: {
      region: 'Pouilles', regionSlug: 'pouilles', cultivar: 'Ogliarola',
      aopName: 'Olio Terra di Bari DOP',
      description: "Cuisson courte robuste (orecchiette aux brocoli rave).",
      producteurs: ['Galantino', 'De Carlo'],
    },
    tres_piquante: {
      region: 'Pouilles', regionSlug: 'pouilles', cultivar: 'Coratina',
      aopName: 'Olio Terra di Bari DOP',
      description: "Pour cuissons fortes — l'huile résiste mieux à la chaleur grâce à ses polyphénols.",
      producteurs: ['Galantino', 'Muraglia'],
    },
  },
};

const USAGE_LABELS: Record<Usage, string> = {
  finition_table: '🍽 Finition à table (filet sur le plat servi)',
  pasta_robuste: '🍝 Pasta robuste (carbonara, amatriciana)',
  poisson_cru: '🐟 Poisson cru / carpaccio',
  pesto: '🌿 Pesto / sauces aux herbes',
  bruschetta: '🥖 Bruschetta / antipasto',
  cuisson_courte: '🔥 Cuisson courte (sauté, poêlée)',
};

const INTENSITY_LABELS: Record<Intensity, string> = {
  douce: 'Douce et lactée',
  equilibree: 'Équilibrée',
  piquante: 'Piquante et amère',
  tres_piquante: 'Très piquante (polyphénols élevés)',
};

export default function OliveOilSelector() {
  const [usage, setUsage] = useState<Usage>('finition_table');
  const [intensity, setIntensity] = useState<Intensity>('equilibree');

  const reco = MATRIX[usage]?.[intensity];

  return (
    <div className="not-prose rounded-lg border border-cream-200 bg-cream-50 p-5 sm:p-6 my-8">
      <p className="text-xs uppercase tracking-widest text-olive-700 mb-3">Sélecteur d'huile d'olive</p>
      <h3 className="font-serif text-xl text-ink-900 mb-4">Trouver la bonne huile selon votre usage</h3>

      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        <label className="block">
          <span className="block text-sm text-ink-700 mb-1">Usage culinaire</span>
          <select
            value={usage}
            onChange={(e) => setUsage(e.target.value as Usage)}
            className="w-full rounded-md border border-cream-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-terra-500"
          >
            {(Object.keys(USAGE_LABELS) as Usage[]).map((u) => (
              <option key={u} value={u}>{USAGE_LABELS[u]}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm text-ink-700 mb-1">Intensité préférée</span>
          <select
            value={intensity}
            onChange={(e) => setIntensity(e.target.value as Intensity)}
            className="w-full rounded-md border border-cream-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-terra-500"
          >
            {(Object.keys(INTENSITY_LABELS) as Intensity[]).map((i) => (
              <option key={i} value={i}>{INTENSITY_LABELS[i]}</option>
            ))}
          </select>
        </label>
      </div>

      {reco && (
        <div className="rounded-md border border-terra-200 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline gap-3 mb-2">
            <p className="font-serif text-lg text-ink-900">{reco.aopName}</p>
            <a href={`/regions/${reco.regionSlug}`} className="text-xs text-terra-700 hover:text-terra-900 underline-offset-2 hover:underline">
              voir la région {reco.region} →
            </a>
          </div>
          <p className="text-xs text-olive-700 mb-2">Cultivar : {reco.cultivar}</p>
          <p className="text-sm text-ink-700 leading-relaxed mb-3">{reco.description}</p>
          <p className="text-xs text-ink-700/70">
            <strong>Producteurs de référence :</strong> {reco.producteurs.join(' · ')}
          </p>
        </div>
      )}

      <p className="text-xs text-ink-700/60 mt-3">
        Les recommandations sont indicatives et favorisent les huiles AOP/DOP italiennes vérifiées.
        Pour aller plus loin, consultez notre <a href="/blog/huile-olive-italienne-guide" className="underline">guide complet</a>.
      </p>
    </div>
  );
}
