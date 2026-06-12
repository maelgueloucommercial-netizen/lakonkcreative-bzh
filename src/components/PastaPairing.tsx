import { useMemo, useState } from 'react';

interface PastaInfo {
  id: string;
  name: string;
  type: string;
  region?: string;
  fresh: boolean;
  cookingTimeMinutes: [number, number];
  sauces: string[];
}

export default function PastaPairing({ pasta }: { pasta: PastaInfo[] }) {
  // Index inverse sauce → pâtes
  const sauceIndex = useMemo(() => {
    const map = new Map<string, PastaInfo[]>();
    for (const p of pasta) {
      for (const sauce of p.sauces) {
        const key = sauce;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(p);
      }
    }
    return map;
  }, [pasta]);

  // Liste de toutes les sauces, triée par fréquence décroissante puis alpha
  const allSauces = useMemo(() => {
    return Array.from(sauceIndex.entries())
      .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'fr'))
      .map(([s]) => s);
  }, [sauceIndex]);

  const [selected, setSelected] = useState<string | null>(null);
  const matches = selected ? sauceIndex.get(selected) ?? [] : [];

  return (
    <div className="rounded-lg border border-cream-200 bg-white p-6">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-widest text-olive-700 mb-2">Outil — règle de l'aderenza</p>
        <h3 className="font-serif text-2xl text-ink-900 mb-2">Quel format de pâte pour quelle sauce ?</h3>
        <p className="text-sm text-ink-700/80">
          Choisis une sauce : on te propose le format le plus adapté selon la règle italienne de l'<em>aderenza</em> (l'adhérence sauce-pâte). Pas une question de goût personnel — une question technique.
        </p>
      </div>

      <label className="block mb-5">
        <span className="block text-xs uppercase tracking-widest text-ink-700/60 mb-2">Sauce ou plat de référence</span>
        <select
          value={selected ?? ''}
          onChange={(e) => setSelected(e.target.value || null)}
          className="w-full rounded-md border border-cream-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-terra-500"
        >
          <option value="">— Choisir une sauce —</option>
          {allSauces.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      {selected && matches.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-olive-700 mb-3">
            {matches.length} format{matches.length > 1 ? 's' : ''} recommandé{matches.length > 1 ? 's' : ''}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {matches.map((p) => (
              <a
                key={p.id}
                href={`/pates/${p.id}`}
                className="group rounded-md border border-cream-200 hover:border-terra-300 transition p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-serif text-lg text-ink-900 group-hover:text-terra-700 transition">{p.name}</h4>
                  <span className="text-xs px-2 py-0.5 rounded bg-olive-50 text-olive-700 border border-olive-200 whitespace-nowrap">
                    {p.fresh ? 'fraîche' : 'sèche'}
                  </span>
                </div>
                {p.region && <p className="text-xs text-olive-700 mb-2">{p.region}</p>}
                <p className="text-xs text-ink-700/70">
                  Cuisson {p.cookingTimeMinutes[0]}-{p.cookingTimeMinutes[1]} min · type {p.type}
                </p>
              </a>
            ))}
          </div>
        </div>
      )}

      {selected && matches.length === 0 && (
        <p className="text-sm text-ink-700/60 italic">Aucun format documenté pour cette sauce. À venir dans les prochaines fiches.</p>
      )}

      {!selected && (
        <p className="text-xs text-ink-700/50 italic">
          Quelques associations canoniques : <strong>cacio e pepe</strong> avec tonnarelli ou bucatini · <strong>ragù bolognais</strong> avec tagliatelle · <strong>cime di rapa</strong> avec orecchiette · <strong>amatriciana</strong> avec bucatini.
        </p>
      )}
    </div>
  );
}
