/**
 * COURSE-4: runs one rhythm exercise.
 * Schedules the clicks and pattern notes on the Web Audio clock, listens for the
 * spacebar, and judges taps with the existing useRhythmJudge against the plan's
 * targets (SRS 3.1.4.2–3.1.4.4). All timing uses AudioContext time, never setTimeout.
 */
import { audioTimeAt } from '../lib/rhythm/audioClock';
import { clickVoice } from '../lib/rhythm/clickVoice';
import { readTapLatencyMs } from '../lib/rhythm/calibration';
import { SRS_WINDOWS, captureWindowMs, type RhythmWindows } from '../lib/rhythm/timing';
import { useCallback, useEffect, useRef, useState } from 'react';
import { acceptsTap, type RhythmPlan } from '../lib/rhythm/plan';
import type { JudgedTap, RhythmSummary } from '../lib/rhythm/timing';
import { useRhythmJudge } from './useRhythmJudge';
import { useSpacebarTap, type TapEvent } from './useSpacebarTap';

export type RhythmPhase = 'idle' | 'running' | 'done';

/** Delay between pressing Start and the first count-in click. */
const START_DELAY_SEC = 0.3;
/** Keep listening this long after the last note so a late final tap is still judged. */
const TAIL_SEC = 0.35;
/** Per-device tap latency (ms) from the tap test; see src/lib/rhythm/calibration.ts. */
export { readTapLatencyMs } from '../lib/rhythm/calibration';

function scheduleClick(ctx: AudioContext, time: number, accent: boolean, countIn: boolean): void {
  const v = clickVoice(accent, countIn);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = v.type;
  osc.frequency.value = v.freq;
  gain.gain.setValueAtTime(v.gain, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + v.decaySec);
  osc.connect(gain).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + v.decaySec + 0.01);
}

function scheduleTone(ctx: AudioContext, time: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = 523.25; // C5
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(0.35, time + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
  osc.connect(gain).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.18);
}

export interface RhythmSessionResult {
  summary: RhythmSummary;
  taps: JudgedTap[];
}

export function useRhythmSession(
  plan: RhythmPlan,
  onDone: (result: RhythmSessionResult) => void,
  windows: RhythmWindows = SRS_WINDOWS,
) {
  const ctxRef = useRef<AudioContext | null>(null);
  const targetTimesRef = useRef<number[]>([]);
  /** AudioContext time of plan t = 0. */
  const startTimeRef = useRef<number | null>(null);
  const pollRef = useRef<number | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const planRef = useRef(plan);
  planRef.current = plan;

  const [phase, setPhase] = useState<RhythmPhase>('idle');
  // Re-read at every start so a tap test done just before the exercise applies at once.
  const [latencyMs, setLatencyMs] = useState(readTapLatencyMs);
  const { judgeTap, getSummary, reset, taps } = useRhythmJudge(ctxRef, targetTimesRef, latencyMs, windows);
  const tapsRef = useRef<JudgedTap[]>(taps);
  tapsRef.current = taps;

  const handleTap = useCallback(
    (tap: TapEvent) => {
      const t0 = startTimeRef.current;
      if (t0 === null) return;
      const lateMs = captureWindowMs(targetTimesRef.current, windows);
      if (!acceptsTap(planRef.current, tap.audioTime - latencyMs / 1000 - t0, lateMs)) return;
      judgeTap(tap);
    },
    [judgeTap, latencyMs, windows],
  );
  useSpacebarTap(ctxRef, handleTap, phase === 'running');

  const teardown = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    const ctx = ctxRef.current;
    ctxRef.current = null;
    startTimeRef.current = null;
    if (ctx && ctx.state !== 'closed') void ctx.close();
  }, []);

  /** Call from a click or key press (AudioContext autoplay policy). */
  const start = useCallback(async () => {
    if (ctxRef.current) return;
    setLatencyMs(readTapLatencyMs());
    const ctx = new AudioContext({ latencyHint: 'interactive' });
    ctxRef.current = ctx;
    await ctx.resume();
    if (ctxRef.current !== ctx) return; // stopped while resuming

    const p = planRef.current;
    const t0 = ctx.currentTime + START_DELAY_SEC;
    startTimeRef.current = t0;
    targetTimesRef.current = p.targets.map((t) => t0 + t);
    for (const c of p.clicks) scheduleClick(ctx, t0 + c.time, c.accent, c.countIn);
    for (const t of p.tones) scheduleTone(ctx, t0 + t);
    reset();
    setPhase('running');

    pollRef.current = window.setInterval(() => {
      if (ctxRef.current !== ctx) return;
      if (ctx.currentTime < t0 + p.endSec + TAIL_SEC) return;
      const summary = getSummary();
      const judged = tapsRef.current;
      teardown();
      setPhase('done');
      onDoneRef.current({ summary, taps: judged });
    }, 50);
  }, [getSummary, reset, teardown]);

  const stop = useCallback(() => {
    teardown();
    setPhase('idle');
  }, [teardown]);

  useEffect(() => teardown, [teardown]);

  /**
   * Seconds since plan t = 0, or null when not running. Uses the output timestamp
   * (what is leaving the speakers now), the same clock useSpacebarTap stamps taps with,
   * so the highway, the sound and the judging agree.
   */
  const now = useCallback((): number | null => {
    const ctx = ctxRef.current;
    const t0 = startTimeRef.current;
    if (!ctx || t0 === null) return null;
    const now = performance.now();
    return audioTimeAt(ctx, now, now) - t0;
  }, []);

  return { phase, start, stop, now, taps };
}
