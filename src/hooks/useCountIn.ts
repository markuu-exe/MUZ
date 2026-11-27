/**
 * A one-bar metronome count-in (4/4, the lesson count-in voice) that calls `onDone` on the
 * audio clock when the bar is over. Used to start a drill's graded attempt hands-free after a
 * practice pass (owner request 2026-11-27: no walking to the computer between tries).
 * The visual count uses the same rhythmCue as rhythm lessons, so sound and screen agree.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getPattern } from '../content/patterns';
import { audioTimeAt } from '../lib/rhythm/audioClock';
import { clickVoice } from '../lib/rhythm/clickVoice';
import { buildRhythmPlan, rhythmCue, type RhythmCue, type RhythmPlan } from '../lib/rhythm/plan';

/** Gap between the call and the first click, so the first beat is not clipped. */
const LEAD_SEC = 0.3;
export const COUNT_IN_BEATS = 4;

/** The count-in bar at `bpm` (clamped by buildRhythmPlan to 30–240): 4 clicks in 4/4. */
export function countInPlan(bpm: number): RhythmPlan {
  return buildRhythmPlan(getPattern('quarters'), { mode: 'tap-along', bpm, countInBeats: COUNT_IN_BEATS, repeats: 1 });
}

/** Seconds from plan start until the count-in bar is over (when the attempt should start). */
export function countInEndSec(plan: RhythmPlan): number {
  return plan.segments[0]?.kind === 'count-in' ? plan.segments[0].end : 0;
}

export function useCountIn(bpm: number, onDone: () => void) {
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const [cue, setCue] = useState<RhythmCue | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    const ctx = ctxRef.current;
    ctxRef.current = null;
    if (ctx && ctx.state !== 'closed') void ctx.close();
    setCue(null);
  }, []);
  useEffect(() => stop, [stop]);

  const start = useCallback(async () => {
    stop();
    const plan = countInPlan(bpm);
    const endSec = countInEndSec(plan);
    const ctx = new AudioContext({ latencyHint: 'interactive' });
    ctxRef.current = ctx;
    try {
      await ctx.resume();
    } catch {
      // No sound allowed: the visual count still runs on the context clock below.
    }
    if (ctxRef.current !== ctx) return;
    const t0 = ctx.currentTime + LEAD_SEC;
    for (const c of plan.clicks) {
      if (!c.countIn) continue;
      const v = clickVoice(c.accent, true);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = v.type;
      osc.frequency.value = v.freq;
      gain.gain.setValueAtTime(v.gain, t0 + c.time);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + c.time + v.decaySec);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + c.time);
      osc.stop(t0 + c.time + v.decaySec + 0.01);
    }
    setCue({ kind: 'wait' });
    let last: RhythmCue = { kind: 'wait' };
    const startedAt = performance.now();
    const tick = () => {
      if (ctxRef.current !== ctx) return;
      const now = performance.now();
      // If the context never runs (sound blocked), fall back to the wall clock so the attempt still starts.
      const t = ctx.state === 'running' ? audioTimeAt(ctx, now, now) - t0 : (now - startedAt) / 1000 - LEAD_SEC;
      if (t >= endSec) {
        stop();
        onDoneRef.current();
        return;
      }
      const next = rhythmCue(plan, t);
      if (next.kind !== last.kind || (next.kind === 'count' && last.kind === 'count' && next.beat !== last.beat)) {
        last = next;
        setCue(next);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [bpm, stop]);

  return { cue, counting: cue !== null, start, cancel: stop };
}
