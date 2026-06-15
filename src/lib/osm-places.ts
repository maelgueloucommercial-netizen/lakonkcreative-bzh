/**
 * osm-places — annuaire local RÉEL depuis OpenStreetMap (Overpass API, gratuit,
 * sans clé). Fetch au build (SSR, mis en cache par build comme WeatherWidget).
 * Données réelles : noms + adresses des commerces/services autour d'une commune.
 *
 * Dégradation propre : si Overpass échoue/timeout, renvoie [] (l'annuaire bascule
 * sur son fallback). Pas de données fabriquées — uniquement du réel OSM.
 */

export interface OsmPlace {
  name: string;
  group: string;        // groupe d'annuaire (ex 'Restaurants & bars')
  category: string;     // sous-catégorie OSM lisible (ex 'Restaurant')
  address?: string;
  lat: number;
  lng: number;
  phone?: string;
  website?: string;
  osmType: string;      // node|way
  osmId: number;
}

const UA = 'felleries-annuaire/1.0 (annuaire local OpenStreetMap)';
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

// tag OSM → { group, label }. Groupe = section d'annuaire ; label = sous-catégorie.
const TAGMAP: Record<string, { group: string; label: string }> = {
  // amenity
  restaurant: { group: 'Restaurants & bars', label: 'Restaurant' },
  cafe: { group: 'Restaurants & bars', label: 'Café' },
  bar: { group: 'Restaurants & bars', label: 'Bar' },
  pub: { group: 'Restaurants & bars', label: 'Pub' },
  fast_food: { group: 'Restaurants & bars', label: 'Restauration rapide' },
  pharmacy: { group: 'Santé', label: 'Pharmacie' },
  doctors: { group: 'Santé', label: 'Médecin' },
  dentist: { group: 'Santé', label: 'Dentiste' },
  hospital: { group: 'Santé', label: 'Hôpital' },
  bank: { group: 'Services & banques', label: 'Banque' },
  post_office: { group: 'Services & banques', label: 'Poste' },
  fuel: { group: 'Services & banques', label: 'Station-service' },
  townhall: { group: 'Services publics', label: 'Mairie' },
  school: { group: 'Services publics', label: 'École' },
  // shop
  bakery: { group: 'Commerces', label: 'Boulangerie' },
  supermarket: { group: 'Commerces', label: 'Supermarché' },
  butcher: { group: 'Commerces', label: 'Boucherie' },
  seafood: { group: 'Commerces', label: 'Poissonnerie' },
  greengrocer: { group: 'Commerces', label: 'Primeur' },
  convenience: { group: 'Commerces', label: 'Épicerie' },
  // tourism
  hotel: { group: 'Hébergements', label: 'Hôtel' },
  guest_house: { group: 'Hébergements', label: "Chambre d'hôtes" },
  camp_site: { group: 'Hébergements', label: 'Camping' },
  museum: { group: 'Tourisme & culture', label: 'Musée' },
  attraction: { group: 'Tourisme & culture', label: 'Site touristique' },
  information: { group: 'Tourisme & culture', label: 'Point info' },
  artwork: { group: 'Tourisme & culture', label: 'Œuvre / patrimoine' },
};

/** Construit la requête Overpass (around radius sur les coords). */
function buildQuery(lat: number, lng: number, radius: number): string {
  const am = 'restaurant|cafe|bar|pub|fast_food|pharmacy|doctors|dentist|bank|post_office|fuel|townhall|school';
  const sh = 'bakery|supermarket|butcher|seafood|greengrocer|convenience';
  const to = 'hotel|guest_house|camp_site|museum|attraction|information|artwork';
  const a = `(around:${radius},${lat},${lng})`;
  return `[out:json][timeout:25];(`
    + `node${a}["amenity"~"^(${am})$"]["name"];`
    + `node${a}["shop"~"^(${sh})$"]["name"];`
    + `node${a}["tourism"~"^(${to})$"]["name"];`
    + `way${a}["tourism"~"^(hotel|museum|attraction)$"]["name"];`
    + `);out center 120;`;
}

/**
 * Récupère les lieux réels OSM autour d'une commune. Renvoie [] en cas d'échec.
 */
export async function fetchLocalPlaces(lat: number, lng: number, radius = 2500): Promise<OsmPlace[]> {
  const body = new URLSearchParams({ data: buildQuery(lat, lng, radius) }).toString();
  for (const ep of ENDPOINTS) {
    try {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 30000);
      const res = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA, Accept: 'application/json' },
        body,
        signal: ctl.signal,
      });
      clearTimeout(to);
      if (!res.ok) continue;
      const data = (await res.json()) as { elements?: Array<Record<string, any>> };
      const out: OsmPlace[] = [];
      for (const el of data.elements ?? []) {
        const t = el.tags ?? {};
        const key = t.amenity ?? t.shop ?? t.tourism;
        const map = key ? TAGMAP[key] : undefined;
        if (!map || !t.name) continue;
        const addr = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ');
        out.push({
          name: String(t.name).trim(),
          group: map.group,
          category: map.label,
          address: addr || undefined,
          lat: el.lat ?? el.center?.lat ?? lat,
          lng: el.lon ?? el.center?.lon ?? lng,
          phone: t.phone ?? t['contact:phone'] ?? undefined,
          website: t.website ?? t['contact:website'] ?? undefined,
          osmType: el.type ?? 'node',
          osmId: el.id ?? 0,
        });
      }
      // dédup par nom+catégorie, tri alpha
      const seen = new Set<string>();
      return out
        .filter((p) => { const k = `${p.name}|${p.category}`; if (seen.has(k)) return false; seen.add(k); return true; })
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    } catch {
      /* endpoint suivant */
    }
  }
  return [];
}

/** Groupe les lieux par `group`, trié par taille de groupe décroissante. */
export function groupPlaces(places: OsmPlace[]): Array<{ group: string; items: OsmPlace[] }> {
  const m = new Map<string, OsmPlace[]>();
  for (const p of places) {
    if (!m.has(p.group)) m.set(p.group, []);
    m.get(p.group)!.push(p);
  }
  return [...m.entries()]
    .map(([group, items]) => ({ group, items }))
    .sort((a, b) => b.items.length - a.items.length);
}
