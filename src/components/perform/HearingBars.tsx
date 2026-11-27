/**
 * "What MUZ hears": 12 pitch-class bars, like an equalizer. Faint = raw sound; solid = after the
 * overtone cleanup the chord grader uses. Notes of the current target are outlined; strong
 * extra notes turn red (those are what make a chord fail, e.g. a B-flat overtone under a low C).
 */
import { useEffect, useRef, useState } from 'react';
import { parseChord } from '../../audio/chords/vocabulary';
import { PITCH_CLASS_NAMES } from '../../audio/dsp/pitch';
import { cn } from '../../lib/cn';
import { SILENT_BARS, nextBars, type Bars } from '../../performance/hearingBars';
import type { SongTarget } from '../../performance/songs';
import { usePracticeRig } from '../lesson/practice/PracticeRigContext';

/** Cleaned level at which a pitch class counts as heard (the chord grader's extra-tone bar is 0.35). */
const HEARD = 0.35;

export default function HearingBars({ target }: { target: SongTarget | null }) {
  const { rig } = usePracticeRig();
  const bars = useRef<Bars>(SILENT_BARS);
  const [shown, setShown] = useState<Bars>(SILENT_BARS);

  useEffect(() => {
    const off = rig.on('audio', (f) => {
      bars.current = nextBars(bars.current, f);
    });
    const timer = window.setInterval(() => setShown(bars.current), 100);
    return () => {
      off();
      window.clearInterval(timer);
    };
  }, [rig]);

  const want = !target ? [] : target.kind === 'note' ? [target.note % 12] : [...parseChord(target.chord).pcs];
  const heard = PITCH_CLASS_NAMES.filter((_, i) => shown.clean[i] >= HEARD);
  const extra = PITCH_CLASS_NAMES.filter((_, i) => shown.clean[i] >= HEARD && !want.includes(i));

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3" aria-label="What MUZ hears">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">What MUZ hears</p>
        <p className="text-sm font-semibold text-slate-200" aria-live="polite">
          {heard.length ? heard.join(' · ') : 'Quiet'}
          {extra.length > 0 && <span className="text-rose-300"> · extra: {extra.join(', ')}</span>}
        </p>
      </div>
      <div className="mt-2 flex h-24 items-end gap-1.5" aria-hidden="true">
        {PITCH_CLASS_NAMES.map((name, i) => {
          const isWanted = want.includes(i);
          const isExtra = !isWanted && shown.clean[i] >= HEARD;
          return (
            <div key={name} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <div className={cn('relative w-full flex-1 rounded-md', isWanted ? 'bg-violet-500/10 ring-1 ring-violet-400/60' : 'bg-slate-800/40')}>
                <div className="absolute inset-x-0 bottom-0 rounded-md bg-slate-500/30 transition-[height] duration-100" style={{ height: `${shown.raw[i] * 100}%` }} />
                <div
                  className={cn('absolute inset-x-1 bottom-0 rounded-md transition-[height] duration-100', isWanted ? 'bg-emerald-400' : isExtra ? 'bg-rose-400' : 'bg-violet-400/70')}
                  style={{ height: `${shown.clean[i] * 100}%` }}
                />
              </div>
              <span className={cn('text-[10px] font-bold', isWanted ? 'text-white' : 'text-slate-400')}>{name}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Faint: raw sound. Solid: after overtone cleanup (what the grader checks). Outlined: the notes you should play. Red: extra notes that can make
        a chord fail. A weak root on a low chord means the mic hears little bass; try the chord an octave higher.
      </p>
    </section>
  );
}
