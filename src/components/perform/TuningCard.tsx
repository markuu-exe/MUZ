/**
 * "Tune to my piano": hold a key and see how far it is from standard tuning; use the measured
 * offset for every pitch check (src/audio/tuning.ts). The list of keys tried shows whether the
 * whole piano is off (use the offset) or one key is (that key needs a piano tuner).
 */
import { useEffect, useRef, useState } from 'react';
import { Gauge } from 'lucide-react';
import { DEFAULT_PITCH_CONFIG } from '../../audio/config';
import { centsOff, freqToMidi, midiToNoteName } from '../../audio/dsp/pitch';
import { MAX_TUNING_CENTS, median, setTuningOffsetCents, tuningOffsetCents } from '../../audio/tuning';
import { cn } from '../../lib/cn';
import { usePracticeRig } from '../lesson/practice/PracticeRigContext';

/** Confident readings of one held key needed before it is reported (~0.3 s). */
const MIN_READINGS = 25;
const FOCUS = 'focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300';

const signed = (c: number) => `${c > 0 ? '+' : ''}${Math.round(c)}`;
const describe = (c: number) => (Math.abs(c) < 5 ? 'in tune' : `${Math.abs(Math.round(c))} cents ${c < 0 ? 'flat' : 'sharp'}`);

export default function TuningCard() {
  const { rig } = usePracticeRig();
  const [offset, setOffset] = useState(tuningOffsetCents);
  const [keys, setKeys] = useState<Array<{ midi: number; cents: number }>>([]);
  const [holding, setHolding] = useState<{ midi: number; cents: number } | null>(null);
  const buf = useRef<{ midi: number; cents: number[] }>({ midi: -1, cents: [] });

  useEffect(() => {
    const off = rig.on('audio', (f) => {
      if (!f.voiced || f.pitchHz == null || !(f.pitchHz > 0) || (f.clarity ?? 0) < DEFAULT_PITCH_CONFIG.minClarity) return;
      // Measured against standard tuning (A4 = 440 Hz), not the stored offset.
      const midi = Math.round(freqToMidi(f.pitchHz));
      if (midi < 36 || midi > 96) return;
      const b = buf.current;
      if (midi !== b.midi || f.onset) buf.current = { midi, cents: [] };
      buf.current.cents.push(centsOff(f.pitchHz, midi));
      if (buf.current.cents.length >= MIN_READINGS && buf.current.cents.length % 5 === 0) {
        const c = median(buf.current.cents.slice(-60))!;
        setHolding({ midi, cents: c });
        setKeys((ks) => [...ks.filter((k) => k.midi !== midi), { midi, cents: c }].slice(-8));
      }
    });
    return off;
  }, [rig]);

  const overall = median(keys.map((k) => k.cents));
  const oddOnes = overall === null ? [] : keys.filter((k) => Math.abs(k.cents - overall) > 25);
  const apply = (c: number) => {
    setTuningOffsetCents(c);
    setOffset(tuningOffsetCents());
  };

  return (
    <details className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
      <summary className="flex cursor-pointer items-center gap-2 font-bold text-white">
        <Gauge className="h-4 w-4 text-violet-300" aria-hidden="true" /> Tune to my piano
        <span className="ml-auto text-xs font-semibold text-slate-400">{offset === 0 ? 'Standard tuning (A4 = 440 Hz)' : `Using ${signed(offset)} cents`}</span>
      </summary>
      <div className="mt-3 space-y-3">
        <p>
          A right note can be rejected if the piano is out of tune. Hold a few keys one at a time (for example C4, E4, G4, and any key that
          keeps failing) for about a second each.
        </p>
        <p className="text-base font-black text-white" aria-live="polite">
          {holding ? `${midiToNoteName(holding.midi)} is ${describe(holding.cents)}` : 'Listening… hold a key.'}
        </p>
        {keys.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Keys measured">
            {keys.map((k) => (
              <li
                key={k.midi}
                className={cn(
                  'rounded-lg border px-2 py-1 text-xs font-bold',
                  oddOnes.includes(k) ? 'border-amber-500/60 text-amber-200' : 'border-slate-700 text-slate-200',
                )}
              >
                {midiToNoteName(k.midi)} {signed(k.cents)}
              </li>
            ))}
          </ul>
        )}
        {oddOnes.length > 0 && (
          <p className="text-amber-200">
            {oddOnes.map((k) => midiToNoteName(k.midi)).join(', ')} {oddOnes.length === 1 ? 'is' : 'are'} far from the other keys. Tuning to the
            piano will not fix {oddOnes.length === 1 ? 'that key' : 'those keys'}; a piano tuner can.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={overall === null || keys.length < 2 || Math.abs(overall) > MAX_TUNING_CENTS}
            onClick={() => overall !== null && apply(overall)}
            className={`rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50 ${FOCUS}`}
          >
            {overall === null || keys.length < 2 ? 'Measure 2+ keys to tune' : `Use my piano's tuning (${signed(overall)} cents)`}
          </button>
          {offset !== 0 && (
            <button
              type="button"
              onClick={() => apply(0)}
              className={`rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-200 ${FOCUS}`}
            >
              Back to standard
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400">Saved on this device; lessons use it too. The ±35-cent tolerance stays the same.</p>
      </div>
    </details>
  );
}
