import { useEffect, useRef, useState } from 'react';

/**
 * Timer interactif pour la mantecatura (étape finale du risotto, hors-feu).
 *
 * Mantecatura = on ajoute beurre froid + parmigiano à un risotto à peine cuit
 * à l'al dente, hors du feu, et on agite vivement (sgranatura) pendant 60-90 s
 * pour faire émulsionner. Résultat : crémeux sans crème, texture all'onda.
 *
 * Étapes :
 *   1. Setup (durée par défaut 90s, modifiable 60/90/120s)
 *   2. Compte à rebours visuel (cercle SVG + secondes)
 *   3. Notification audio + visuelle à la fin
 */

const DURATIONS_S = [60, 90, 120] as const;
type Duration = typeof DURATIONS_S[number];

export default function MantecaturaTimer() {
  const [duration, setDuration] = useState<Duration>(90);
  const [remaining, setRemaining] = useState<number>(90);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    timerRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          setRunning(false);
          setDone(true);
          beep();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [running]);

  const start = () => {
    setRemaining(duration);
    setDone(false);
    setRunning(true);
  };

  const reset = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setRemaining(duration);
    setRunning(false);
    setDone(false);
  };

  const setDurationAndReset = (d: Duration) => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setDuration(d);
    setRemaining(d);
    setRunning(false);
    setDone(false);
  };

  const progress = (duration - remaining) / duration;
  const circumference = 2 * Math.PI * 80;
  const strokeOffset = circumference * (1 - progress);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <div className="rounded-xl border border-cream-200 bg-white p-8">
      <div className="flex justify-center gap-2 mb-8">
        {DURATIONS_S.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDurationAndReset(d)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              duration === d
                ? 'bg-terra-600 text-cream-50'
                : 'bg-cream-100 text-ink-700 hover:bg-cream-200'
            }`}
            disabled={running}
          >
            {d}s
          </button>
        ))}
      </div>

      <div className="relative flex items-center justify-center mb-8">
        <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="#e8dcc4"
            strokeWidth="12"
          />
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke={done ? '#586733' : '#c4543a'}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute text-center">
          <div className="font-serif text-5xl text-ink-900 tabular-nums">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
          {done && (
            <div className="text-sm font-medium text-olive-700 mt-2">All'onda ✓</div>
          )}
        </div>
      </div>

      <div className="flex justify-center gap-3">
        {!running && !done && (
          <button
            type="button"
            onClick={start}
            className="px-6 py-3 rounded-lg bg-terra-600 text-cream-50 font-medium hover:bg-terra-700 transition"
          >
            ▶ Démarrer la mantecatura
          </button>
        )}
        {running && (
          <button
            type="button"
            onClick={reset}
            className="px-6 py-3 rounded-lg bg-cream-200 text-ink-900 font-medium hover:bg-cream-100 transition"
          >
            Stop
          </button>
        )}
        {done && (
          <button
            type="button"
            onClick={reset}
            className="px-6 py-3 rounded-lg bg-olive-600 text-cream-50 font-medium hover:bg-olive-700 transition"
          >
            ↻ Recommencer
          </button>
        )}
      </div>

      <div className="mt-6 text-center text-sm text-ink-700/70">
        Pendant ce temps, agitez vivement la casserole en mouvements circulaires (sgranatura).
        Pas de cuillère qui mélange — c'est le mouvement de la casserole qui émulsionne.
      </div>
    </div>
  );
}

function beep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    /* fallback : navigator.vibrate maybe */
    if ('vibrate' in navigator) navigator.vibrate([200, 50, 200]);
  }
}
