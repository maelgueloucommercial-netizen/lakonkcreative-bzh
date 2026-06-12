import { useMemo, useState } from 'react';

interface Verdict {
  level: 'authentic' | 'suspect' | 'fake' | 'unknown';
  score: number;
  positives: string[];
  negatives: string[];
}

const POSITIVE_PATTERNS: Array<{ regex: RegExp; weight: number; label: string }> = [
  { regex: /\bAOP\b/i, weight: 5, label: 'Sigle AOP détecté' },
  { regex: /\bDOP\b/i, weight: 5, label: 'Sigle DOP détecté' },
  { regex: /\bIGP\b/i, weight: 4, label: 'Sigle IGP détecté' },
  { regex: /\bSTG\b/i, weight: 4, label: 'Sigle STG détecté' },
  { regex: /\bDOC[G]?\b/i, weight: 4, label: 'Appellation DOC/DOCG (vins)' },
  { regex: /origine\s*:?\s*itali[ae]/i, weight: 4, label: '"Origine Italie" affiché' },
  { regex: /(prodotto|fabriqu(é|e))\s+(in|en)\s+itali[ae]/i, weight: 4, label: '"Produit en Italie" mentionné' },
  { regex: /(parmigiano\s+reggiano|grana\s+padano|prosciutto\s+di\s+parma|mozzarella\s+di\s+bufala\s+campana|pomodoro\s+san\s+marzano)/i, weight: 6, label: 'Nom AOP italien complet' },
  { regex: /\b(consorzio|consortium)\b/i, weight: 2, label: 'Consortium d\'appellation mentionné' },
];

const NEGATIVE_PATTERNS: Array<{ regex: RegExp; weight: number; label: string }> = [
  { regex: /\bfaçon\s+(itali[ae]n|italien)/i, weight: -5, label: '"façon italienne" → ce n\'est pas italien' },
  { regex: /\bstyle\s+(itali[ae]n|italien)/i, weight: -5, label: '"style italien" → ce n\'est pas italien' },
  { regex: /\bà\s+l['\s]italien/i, weight: -5, label: '"à l\'italienne" → ce n\'est pas italien' },
  { regex: /(fabriqu(é|e)|produit)\s+(en|dans)\s+(france|allemagne|espagne|belgique|pologne)/i, weight: -6, label: 'Fabriqué hors d\'Italie' },
  { regex: /origine\s*:?\s*UE\b/i, weight: -4, label: '"Origine UE" → pas exclusivement Italie' },
  { regex: /origine\s*:?\s*union\s+europ(é|e)enne/i, weight: -4, label: '"Origine UE" mentionnée' },
  { regex: /\b(pasta|pizza|mozzarella|parmesan)\b(?![^a-z]*\b(AOP|DOP|IGP|STG)\b)/i, weight: -2, label: 'Nom italien évoqué sans label de protection' },
  { regex: /\bromana\b|\bnapoli(tana)?\b|\bsiciliana\b/i, weight: -3, label: 'Toponyme italien sans contexte AOP/DOP' },
  { regex: /reconstitu/i, weight: -4, label: 'Produit "reconstitué" → industriel' },
  { regex: /poudre\s+de\s+lait|lait\s+en\s+poudre/i, weight: -5, label: 'Poudre de lait → fromage industriel' },
];

function analyse(input: string): Verdict {
  const positives: string[] = [];
  const negatives: string[] = [];
  let score = 0;
  for (const p of POSITIVE_PATTERNS) {
    if (p.regex.test(input)) {
      positives.push(p.label);
      score += p.weight;
    }
  }
  for (const n of NEGATIVE_PATTERNS) {
    if (n.regex.test(input)) {
      negatives.push(n.label);
      score += n.weight;
    }
  }
  let level: Verdict['level'] = 'unknown';
  if (score >= 4) level = 'authentic';
  else if (score >= 0) level = 'suspect';
  else level = 'fake';
  if (positives.length === 0 && negatives.length === 0) level = 'unknown';
  return { level, score, positives, negatives };
}

const TONES: Record<Verdict['level'], { tone: string; label: string; emoji: string }> = {
  authentic: { tone: 'border-emerald-200 bg-emerald-50 text-emerald-900', label: 'Probablement authentique', emoji: '✅' },
  suspect: { tone: 'border-amber-200 bg-amber-50 text-amber-900', label: 'Suspect — pas assez de signaux d\'authenticité', emoji: '⚠️' },
  fake: { tone: 'border-red-200 bg-red-50 text-red-900', label: 'Italian sounding probable', emoji: '❌' },
  unknown: { tone: 'border-cream-200 bg-cream-100 text-ink-700', label: 'Pas assez de texte pour juger', emoji: '🤷' },
};

export default function ItalianSoundingDetector() {
  const [input, setInput] = useState('');
  const verdict = useMemo(() => analyse(input), [input]);
  const tone = TONES[verdict.level];

  return (
    <div className="not-prose rounded-lg border border-terra-200 bg-cream-100 p-6 my-10">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-widest text-olive-700 mb-1">Outil — antifraude</p>
        <h3 className="font-serif text-2xl text-ink-900 mb-1">Italian Sounding Detector</h3>
        <p className="text-sm text-ink-700/80">
          Colle l'étiquette d'un produit (front + dos), ou son nom et sa description marketing. On détecte les signaux d'authenticité (sigles AOP/DOP/IGP, origine Italie) et les drapeaux rouges (mentions "façon", "à l'italienne", origine UE, etc.).
        </p>
      </div>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={5}
        placeholder='Exemple : "Pasta Romana - Spaghetti style italien - Origine UE - Fabriqué en France"'
        className="w-full rounded-md border border-cream-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-terra-500 mb-4 font-mono"
      />

      {input.length > 5 && (
        <div className={`rounded-md border ${tone.tone} p-4`}>
          <div className="flex items-center justify-between mb-3">
            <strong className="font-medium">{tone.emoji} {tone.label}</strong>
            <span className="text-xs opacity-70">Score : {verdict.score > 0 ? '+' : ''}{verdict.score}</span>
          </div>
          {verdict.positives.length > 0 && (
            <div className="mb-2">
              <p className="text-xs uppercase tracking-wider opacity-70 mb-1">Signaux d'authenticité</p>
              <ul className="text-sm space-y-0.5">
                {verdict.positives.map((p, i) => <li key={i}>· {p}</li>)}
              </ul>
            </div>
          )}
          {verdict.negatives.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider opacity-70 mb-1">Drapeaux rouges</p>
              <ul className="text-sm space-y-0.5">
                {verdict.negatives.map((n, i) => <li key={i}>· {n}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-ink-700/60 mt-3 italic">
        Heuristique v1 — l'outil cherche des patterns connus mais ne couvre pas tout. Pour une vérification certaine, regarde la <strong>fiche produit AOP</strong> sur le site du <em>Consorzio</em> concerné, et le numéro d'identification du producteur.
      </p>
    </div>
  );
}
