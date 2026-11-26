import type { Verdict } from "../../types/engine.types";
export type HitRating = Verdict;

export const PERFECT_MS = 25;
export const GOOD_MS = 50;

export const POINTS: Record<HitRating, number> = {
  Perfect: 100,
  Good: 70,
  Miss: 0,
};

/** Timing windows in ms (|Δt|). SRS 3.1.4.3 values are the default; ruling R1 widens them per tier. */
export interface RhythmWindows {
  perfectMs: number;
  goodMs: number;
}

export const SRS_WINDOWS: Readonly<RhythmWindows> = Object.freeze({ perfectMs: PERFECT_MS, goodMs: GOOD_MS });

/** Largest distance (ms) at which a tap still belongs to a beat as a Miss rather than an extra tap. */
export const MAX_CAPTURE_MS = 150;

export function classifyDelta(deltaMs: number, windows: RhythmWindows = SRS_WINDOWS): HitRating {
  const gap = Math.abs(deltaMs);
  if (gap <= windows.perfectMs) return "Perfect";
  if (gap <= windows.goodMs) return "Good";
  return "Miss";
}

/**
 * A tap just outside the Good window is a late or early attempt at that beat (a Miss on it),
 * not a stray tap: it must not also cost the extra-tap penalty. Capped at MAX_CAPTURE_MS and
 * at 45 % of the shortest gap between beats so it never grabs the neighbouring beat.
 */
export function captureWindowMs(beatTimesSec: readonly number[], windows: RhythmWindows = SRS_WINDOWS): number {
  let minGapMs = Infinity;
  for (let i = 1; i < beatTimesSec.length; i++) minGapMs = Math.min(minGapMs, (beatTimesSec[i] - beatTimesSec[i - 1]) * 1000);
  const byGap = Number.isFinite(minGapMs) ? 0.45 * minGapMs : MAX_CAPTURE_MS;
  return Math.max(windows.goodMs, Math.round(Math.min(MAX_CAPTURE_MS, byGap)));
}

export interface JudgedTap {
  rating: HitRating;
  deltaMs: number;
  beatIndex: number | null; 
}

export interface RhythmSummary {
  perfect: number;
  good: number;
  miss: number;
  passedBeats: number;
  score: number;
  accuracy: number;    
  avgDeviation: number; 
  consistency: number;  
}

export function summarize(taps: JudgedTap[], passedBeats: number, windows: RhythmWindows = SRS_WINDOWS): RhythmSummary {
  const matched = taps.filter((t) => t.beatIndex !== null);
  const extra = taps.length - matched.length;
  const perfect = matched.filter((t) => t.rating === "Perfect").length;
  const good = matched.filter((t) => t.rating === "Good").length;
  const omitted = Math.max(0, passedBeats - matched.length);
  // Near misses claim their beat (rating Miss, beatIndex set): one miss each, never also "omitted".
  const nearMisses = matched.length - perfect - good;
  const miss = extra + nearMisses + omitted;

  const score = perfect * POINTS.Perfect + good * POINTS.Good;
  const maxScore = passedBeats * POINTS.Perfect;
  const accuracy = maxScore > 0 ? Math.min(100, Math.round((score / maxScore) * 100)) : 0;

  const avgDeviation =
    matched.length > 0
      ? matched.reduce((sum, t) => sum + Math.abs(t.deltaMs), 0) / matched.length
      : 0;
  const consistency = passedBeats > 0
    ? Math.min(
        100,
        Math.round((100 * matched.reduce((sum, t) => sum + Math.max(0, 1 - Math.abs(t.deltaMs) / windows.goodMs), 0)) / passedBeats),
      )
    : 0;

  return {
    perfect,
    good,
    miss,
    passedBeats,
    score,
    accuracy,
    avgDeviation: Math.round(avgDeviation * 10) / 10,
    consistency,
  };
}

/** Average signed timing error of the taps that landed on a beat (+ = late, − = early), or null. */
export function meanSignedOffsetMs(taps: readonly JudgedTap[]): number | null {
  const onBeat = taps.filter((t) => t.beatIndex !== null);
  if (onBeat.length === 0) return null;
  return Math.round(onBeat.reduce((sum, t) => sum + t.deltaMs, 0) / onBeat.length);
}
