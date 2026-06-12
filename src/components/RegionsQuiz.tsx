import { useState } from 'react';

/**
 * Quiz régions italiennes — 10 questions à choix multiple sur les associations
 * région ↔ plat / produit / spécialité. À la fin, score + commentaire pédagogique.
 */

interface Question {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  regionLink?: { slug: string; label: string };
}

const QUESTIONS: Question[] = [
  {
    id: 'q1',
    question: "Le ragù alla bolognese (vrai, pas la sauce 'spag bol' anglaise) est originaire de quelle région ?",
    options: ['Lombardie', 'Émilie-Romagne', 'Toscane', 'Vénétie'],
    correctIndex: 1,
    explanation: "Bologne est la capitale de l'Émilie-Romagne. Le vrai ragù s'y mange avec des tagliatelle (jamais des spaghetti), et sa recette est déposée à la Camera di Commercio de Bologne depuis 1982.",
    regionLink: { slug: 'emilie-romagne', label: 'Émilie-Romagne' },
  },
  {
    id: 'q2',
    question: "Le pesto alla genovese authentique vient évidemment de Gênes, donc de quelle région ?",
    options: ['Toscane', 'Piémont', 'Ligurie', 'Lombardie'],
    correctIndex: 2,
    explanation: "La Ligurie est une région côtière du nord-ouest. Le pesto alla genovese DOP impose le basilic AOP de Prà, le pecorino sardo, le parmigiano, l'huile de Ligurie et le pilon en marbre.",
    regionLink: { slug: 'ligurie', label: 'Ligurie' },
  },
  {
    id: 'q3',
    question: "Les arancini (boules de riz frites farcies au ragù ou à la mozzarella) sont une spécialité de :",
    options: ['Sardaigne', 'Sicile', 'Calabre', 'Pouilles'],
    correctIndex: 1,
    explanation: "Les arancini siciliens (arancina à Palerme, en féminin) sont apparus pendant la période arabe. Forme : pointue à Catane (volcan Etna), ronde à Palerme.",
    regionLink: { slug: 'sicile', label: 'Sicile' },
  },
  {
    id: 'q4',
    question: "Quelle région produit le Parmigiano Reggiano DOP ?",
    options: ['Émilie-Romagne uniquement', 'Émilie-Romagne et Lombardie (zone DOP partagée)', 'Toute la plaine du Pô', 'Émilie-Romagne et Vénétie'],
    correctIndex: 1,
    explanation: "La zone DOP couvre 5 provinces : Parme, Reggio Emilia, Modène, Bologne (rive gauche du Reno) en Émilie, plus Mantoue (rive droite du Pô) en Lombardie. Tout autre fromage 'parmigiano' est un italian sounding.",
  },
  {
    id: 'q5',
    question: "Le Chianti est produit en :",
    options: ['Vénétie', 'Toscane', 'Ombrie', 'Lazio'],
    correctIndex: 1,
    explanation: "Le Chianti DOCG est emblématique de la Toscane, à base de Sangiovese. Le 'Chianti Classico' (gallo nero) provient de la zone historique entre Florence et Sienne, à ne pas confondre avec le Chianti générique.",
    regionLink: { slug: 'toscane', label: 'Toscane' },
  },
  {
    id: 'q6',
    question: "Quelle pâte est traditionnellement associée au ragù alla bolognese ?",
    options: ['Spaghetti', 'Tagliatelle', 'Penne rigate', 'Linguine'],
    correctIndex: 1,
    explanation: "Tagliatelle. La règle d'aderenza : les pâtes plates et larges retiennent mieux le ragù que les pâtes longues fines. 'Spaghetti bolognese' est une invention anglo-saxonne, jamais servie en Émilie.",
  },
  {
    id: 'q7',
    question: "La 'nduja (charcuterie tartinable épicée) est une spécialité de :",
    options: ['Calabre', 'Pouilles', 'Basilicate', 'Sicile'],
    correctIndex: 0,
    explanation: "La 'nduja vient de Spilinga, en Calabre. C'est une saucisse étalable au piment de Calabre fermenté, généralement accompagnée de pain ou en condiment de pâtes.",
    regionLink: { slug: 'calabre', label: 'Calabre' },
  },
  {
    id: 'q8',
    question: "Quel risotto est typique de la Lombardie (Milan) ?",
    options: ['Risotto al nero di seppia', 'Risotto alla milanese (au safran)', 'Risotto agli asparagi', 'Risotto al barolo'],
    correctIndex: 1,
    explanation: "Risotto alla milanese, doré au safran. Selon la légende, il aurait été inventé en 1574 lors des travaux du Duomo de Milan, par un peintre verrier qui mit du safran dans son riz.",
    regionLink: { slug: 'lombardie', label: 'Lombardie' },
  },
  {
    id: 'q9',
    question: "L'amatriciana, sauce tomate au guanciale, vient du village d'Amatrice, en :",
    options: ['Lazio', 'Abruzzes', 'Ombrie', 'Marches'],
    correctIndex: 0,
    explanation: "Amatrice est dans le Lazio (province de Rieti). L'amatriciana DOP impose le guanciale (joue de porc), du pecorino romano, du piment, et tradition : aux bucatini ou aux spaghetti, jamais aux penne.",
    regionLink: { slug: 'lazio', label: 'Lazio' },
  },
  {
    id: 'q10',
    question: "Le tiramisù, dans sa recette historique, vient de :",
    options: ['Toscane (Florence)', 'Vénétie (Trévise)', 'Lombardie (Milan)', 'Émilie-Romagne (Bologne)'],
    correctIndex: 1,
    explanation: "Tiramisù vient de Trévise en Vénétie, à la fin des années 1960 (restaurant 'Le Beccherie'). Recette stricte : œufs, sucre, mascarpone, café espresso, savoiardi, cacao. Pas d'alcool, pas de crème fouettée dans la version originale.",
    regionLink: { slug: 'venetie', label: 'Vénétie' },
  },
];

export default function RegionsQuiz() {
  const [step, setStep] = useState<number>(0); // 0..QUESTIONS.length-1, ou QUESTIONS.length = score
  const [answers, setAnswers] = useState<number[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);

  const q = QUESTIONS[step];
  const isResults = step >= QUESTIONS.length;

  if (isResults) {
    const score = answers.filter((a, i) => a === QUESTIONS[i].correctIndex).length;
    const message =
      score === 10
        ? '👨‍🍳 Vous êtes prêt à ouvrir une trattoria à Bologne. Sérieusement.'
        : score >= 8
        ? '🍝 Très bonne maîtrise. Vous êtes au-dessus du touriste lambda.'
        : score >= 5
        ? '🇮🇹 Honnête. Quelques fiches région à relire pour passer la barre.'
        : '🇫🇷 Italian-sounding détecté. Direction la fiche région.';

    return (
      <div className="rounded-xl border border-cream-200 bg-white p-8">
        <div className="text-center mb-8">
          <p className="text-sm uppercase tracking-widest text-olive-700">Résultat</p>
          <div className="font-serif text-6xl text-ink-900 my-4">{score} <span className="text-3xl text-ink-700/60">/ 10</span></div>
          <p className="text-lg text-ink-700">{message}</p>
        </div>
        <div className="space-y-2 mb-8">
          {QUESTIONS.map((qu, i) => {
            const userAnswer = answers[i];
            const ok = userAnswer === qu.correctIndex;
            return (
              <details key={qu.id} className="rounded border border-cream-200 px-4 py-3">
                <summary className="cursor-pointer flex items-center gap-2">
                  <span className={ok ? 'text-olive-600' : 'text-terra-600'}>{ok ? '✓' : '✗'}</span>
                  <span className="text-sm">{qu.question}</span>
                </summary>
                <div className="mt-3 text-sm text-ink-700 leading-relaxed">
                  <div className="mb-2">Bonne réponse : <strong>{qu.options[qu.correctIndex]}</strong>{!ok && <> · Vous avez répondu : {qu.options[userAnswer ?? 0]}</>}</div>
                  <div className="text-ink-700/80">{qu.explanation}</div>
                  {qu.regionLink && (
                    <a href={`/regions/${qu.regionLink.slug}`} className="inline-block mt-2 text-terra-700 underline-offset-2 underline">Lire la fiche {qu.regionLink.label} →</a>
                  )}
                </div>
              </details>
            );
          })}
        </div>
        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setStep(0);
              setAnswers([]);
              setShowAnswer(false);
            }}
            className="px-6 py-3 rounded-lg bg-terra-600 text-cream-50 font-medium hover:bg-terra-700 transition"
          >
            ↻ Recommencer
          </button>
        </div>
      </div>
    );
  }

  const handlePick = (index: number) => {
    if (showAnswer) return;
    setAnswers([...answers, index]);
    setShowAnswer(true);
  };

  const next = () => {
    setShowAnswer(false);
    setStep(step + 1);
  };

  const userAnswer = answers[step];
  const isCorrect = userAnswer === q.correctIndex;

  return (
    <div className="rounded-xl border border-cream-200 bg-white p-8">
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs uppercase tracking-widest text-olive-700">Question {step + 1} / {QUESTIONS.length}</span>
        <div className="flex gap-1">
          {QUESTIONS.map((_, i) => {
            let cls = 'bg-cream-200';
            if (i < step) cls = answers[i] === QUESTIONS[i].correctIndex ? 'bg-olive-500' : 'bg-terra-500';
            else if (i === step) cls = 'bg-ink-700';
            return <span key={i} className={`w-2 h-2 rounded-full ${cls}`} />;
          })}
        </div>
      </div>

      <h2 className="font-serif text-2xl text-ink-900 mb-6 leading-snug">{q.question}</h2>

      <div className="space-y-2">
        {q.options.map((opt, i) => {
          let cls = 'border-cream-200 hover:border-terra-300 hover:bg-cream-50';
          if (showAnswer) {
            if (i === q.correctIndex) cls = 'border-olive-500 bg-olive-50 text-olive-900';
            else if (i === userAnswer) cls = 'border-terra-500 bg-terra-50 text-terra-900';
            else cls = 'border-cream-200 opacity-50';
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => handlePick(i)}
              disabled={showAnswer}
              className={`w-full text-left px-4 py-3 rounded-lg border-2 transition ${cls}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {showAnswer && (
        <div className="mt-6 p-4 rounded-lg bg-cream-50 border border-cream-200">
          <p className={`font-medium mb-2 ${isCorrect ? 'text-olive-700' : 'text-terra-700'}`}>
            {isCorrect ? '✓ Correct' : '✗ Pas tout à fait'}
          </p>
          <p className="text-sm text-ink-700 leading-relaxed">{q.explanation}</p>
          <button
            type="button"
            onClick={next}
            className="mt-4 px-5 py-2 rounded-lg bg-terra-600 text-cream-50 text-sm font-medium hover:bg-terra-700 transition"
          >
            {step + 1 === QUESTIONS.length ? 'Voir le score' : 'Question suivante →'}
          </button>
        </div>
      )}
    </div>
  );
}
