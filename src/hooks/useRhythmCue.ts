/**
 * The current count-in / listen / play cue of a running rhythm plan, read from the same
 * audible clock as the highway and the taps (`now`). Re-renders only when the cue changes
 * (once per count-in click and at segment changes), not every frame.
 */
import { useEffect, useState } from 'react';
import { rhythmCue, type RhythmCue, type RhythmPlan } from '../lib/rhythm/plan';

const WAIT: RhythmCue = { kind: 'wait' };

function same(a: RhythmCue, b: RhythmCue): boolean {
  return a.kind === b.kind && (a.kind !== 'count' || (b.kind === 'count' && a.beat === b.beat));
}

export function useRhythmCue(plan: RhythmPlan, now: () => number | null, active: boolean): RhythmCue {
  const [cue, setCue] = useState<RhythmCue>(WAIT);
  useEffect(() => {
    if (!active) {
      setCue(WAIT);
      return;
    }
    let raf = 0;
    const tick = () => {
      const t = now();
      if (t !== null) {
        const next = rhythmCue(plan, t);
        setCue((prev) => (same(prev, next) ? prev : next));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [plan, now, active]);
  return cue;
}
