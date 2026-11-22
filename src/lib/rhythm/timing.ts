import type { Verdict } from "../../types/engine.types";
export type HitRating = Verdict;

export const PERFECT_MS = 25;
export const GOOD_MS = 50;

export const POINTS: Record<HitRating, number> = {
  Perfect: 100,
  Good: 70,
  Miss: 0,
};

export function classifyDelta(deltaMs: number): HitRating {
  const gap = Math.abs(deltaMs);
  if (gap <= PERFECT_MS) return "Perfect";
  if (gap <= GOOD_MS) return "Good";
  return "Miss";
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

export function summarize(taps: JudgedTap[], passedBeats: number): RhythmSummary {
  const matched = taps.filter((t) => t.beatIndex !== null);
  const extra = taps.length - matched.length;
  const perfect = matched.filter((t) => t.rating === "Perfect").length;
  const good = matched.filter((t) => t.rating === "Good").length;
  const omitted = Math.max(0, passedBeats - matched.length);
  const miss = extra + omitted;

  const score = perfect * POINTS.Perfect + good * POINTS.Good;
  const maxScore = passedBeats * POINTS.Perfect;
  const accuracy = maxScore > 0 ? Math.min(100, Math.round((score / maxScore) * 100)) : 0;

  const avgDeviation =
    matched.length > 0
      ? matched.reduce((sum, t) => sum + Math.abs(t.deltaMs), 0) / matched.length
      : 0;
  const consistency = passedBeats > 0
    ? Math.round((100 * matched.reduce((sum, t) => sum + Math.max(0, 1 - Math.abs(t.deltaMs) / GOOD_MS), 0)) / passedBeats)
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
