/**
 * COURSE-4: runs one rhythm exercise.
 * Schedules the clicks and pattern notes on the Web Audio clock, listens for the
 * spacebar, and judges taps with the existing useRhythmJudge against the plan's
 * targets (SRS 3.1.4.2–3.1.4.4). All timing uses AudioContext time, never setTimeout.
 */
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
const LATENCY_KEY = 'muz-tap-latency-ms';

/** Per-device tap latency compensation in ms (0 unless set in localStorage). */
export function readTapLatencyMs(): number {
  try {
    const raw = Number(window.localStorage.getItem(LATENCY_KEY));
    return Number.isFinite(raw) ? Math.max(0, Math.min(200, raw)) : 0;
  } catch {
    return 0;
  }
}

function scheduleClick(ctx: AudioContext, time: number, accent: boolean): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = accent ? 1000 : 800;
  gain.gain.setValueAtTime(0.3, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
  osc.connect(gain).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.06);
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

export function useRhythmSession(plan: RhythmPlan, onDone: (result: RhythmSessionResult) => void) {
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
  const [latencyMs] = useState(readTapLatencyMs);
  const { judgeTap, getSummary, reset, taps } = useRhythmJudge(ctxRef, targetTimesRef, latencyMs);
  const tapsRef = useRef<JudgedTap[]>(taps);
  tapsRef.current = taps;

  const handleTap = useCallback(
    (tap: TapEvent) => {
      const t0 = startTimeRef.current;
      if (t0 === null) return;
      if (!acceptsTap(planRef.current, tap.audioTime - latencyMs / 1000 - t0)) return;
      judgeTap(tap);
    },
    [judgeTap, latencyMs],
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
    const ctx = new AudioContext({ latencyHint: 'interactive' });
    ctxRef.current = ctx;
    await ctx.resume();
    if (ctxRef.current !== ctx) return; // stopped while resuming

    const p = planRef.current;
    const t0 = ctx.currentTime + START_DELAY_SEC;
    startTimeRef.current = t0;
    targetTimesRef.current = p.targets.map((t) => t0 + t);
    for (const c of p.clicks) scheduleClick(ctx, t0 + c.time, c.accent);
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
    const ts = ctx.getOutputTimestamp();
    if (ts.contextTime !== undefined && ts.performanceTime !== undefined && ts.performanceTime > 0) {
      return ts.contextTime + (performance.now() - ts.performanceTime) / 1000 - t0;
    }
    return ctx.currentTime - t0;
  }, []);

  return { phase, start, stop, now, taps };
}
