/**
 * Judges a performance: for every song event, did the learner start the right note or chord
 * close to its beat?
 *
 * - Each event owns a time window around its beat: from EARLY_SEC before it to LATE_SEC after
 *   it, cut short so windows of neighbouring events never overlap.
 * - A hit needs an onset (a new strike) inside the window, followed by the grader's own
 *   per-frame test passing on at least MIN_PASS of the next PASS_FRAMES voiced frames. The
 *   onset requirement stops a ringing note from scoring the next identical note (C C in
 *   Twinkle). The grader test is injected (notes: ±35 cents; chords: ChordMatcher), the same
 *   checks the lessons use.
 * - The hit's time is the onset; |onset − beat| ≤ PERFECT_SEC is Perfect, otherwise Good.
 *   No hit is a Miss: "wrong" when something was played but did not match, "missed" otherwise.
 * Pure and deterministic: frames carry their own time (seconds on the song's plan clock).
 */
import type { SongTarget } from './songs';

export const EARLY_SEC = 0.2;
export const LATE_SEC = 0.45;
export const PERFECT_SEC = 0.12;
export const PASS_FRAMES = 5;
export const MIN_PASS = 3;

export interface PerfFrame {
  /** Seconds on the plan clock (0 = first count-in click). */
  t: number;
  voiced: boolean;
  onset: boolean;
  /** When the strike began (plan seconds), if the analyser reports it separately from the frame time. */
  onsetT?: number;
}

export type Rating = 'Perfect' | 'Good' | 'Miss';

export interface EventResult {
  index: number;
  rating: Rating;
  /** Onset minus beat, ms (negative = early). Null for a miss. */
  offsetMs: number | null;
  /** For a miss: a wrong note/chord was played, or nothing was. */
  missReason: 'wrong' | 'missed' | null;
}

export interface PerformanceSummary {
  results: EventResult[];
  perfect: number;
  good: number;
  miss: number;
  /** (Perfect × 100 + Good × 70) / (events × 100), 0–100. Same point values as rhythm lessons. */
  score: number;
  /** Mean offset of hits in ms (negative = early), or null with no hits. */
  meanOffsetMs: number | null;
}

interface Window {
  start: number;
  end: number;
}

export function eventWindows(times: readonly number[]): Window[] {
  return times.map((t, i) => {
    const prev = times[i - 1];
    const next = times[i + 1];
    const start = prev === undefined ? t - EARLY_SEC : Math.max(t - EARLY_SEC, (prev + t) / 2, prev + 0.05);
    const end = next === undefined ? t + LATE_SEC : Math.min(t + LATE_SEC, Math.max(t + 0.05, next - Math.min(EARLY_SEC, (next - t) / 2)));
    return { start, end };
  });
}

interface Pending {
  onsetT: number | null;
  recent: boolean[];
  played: boolean;
  hitT: number | null;
}

export class PerformanceJudge<F extends PerfFrame> {
  private readonly windows: Window[];
  private readonly state: Pending[];

  constructor(
    private readonly times: readonly number[],
    private readonly targets: readonly SongTarget[],
    private readonly matches: (frame: F, target: SongTarget) => boolean,
  ) {
    if (times.length !== targets.length) throw new Error('times and targets must match');
    this.windows = eventWindows(times);
    this.state = times.map(() => ({ onsetT: null, recent: [], played: false, hitT: null }));
  }

  /** Feed one analysis frame. Frames must arrive in time order. */
  push(frame: F): void {
    const i = this.windows.findIndex((w) => frame.t >= w.start && frame.t < w.end);
    if (i < 0) return;
    const s = this.state[i];
    if (s.hitT !== null) return;
    if (frame.onset) {
      s.onsetT = frame.onsetT ?? frame.t;
      s.recent = [];
      s.played = true;
    }
    if (s.onsetT === null || !frame.voiced) return;
    s.recent.push(this.matches(frame, this.targets[i]));
    if (s.recent.length > PASS_FRAMES) s.recent.shift();
    if (s.recent.filter(Boolean).length >= MIN_PASS) s.hitT = s.onsetT;
  }

  /** Results known so far at plan time `nowT`: hits, and misses whose window has closed. */
  snapshot(nowT: number): EventResult[] {
    const out: EventResult[] = [];
    this.state.forEach((s, index) => {
      if (s.hitT !== null) {
        const offset = s.hitT - this.times[index];
        out.push({ index, rating: Math.abs(offset) <= PERFECT_SEC ? 'Perfect' : 'Good', offsetMs: Math.round(offset * 1000), missReason: null });
      } else if (nowT >= this.windows[index].end) {
        out.push({ index, rating: 'Miss', offsetMs: null, missReason: s.played ? 'wrong' : 'missed' });
      }
    });
    return out;
  }

  summary(): PerformanceSummary {
    const results: EventResult[] = this.state.map((s, index) => {
      if (s.hitT === null) return { index, rating: 'Miss', offsetMs: null, missReason: s.played ? 'wrong' : 'missed' };
      const offset = s.hitT - this.times[index];
      return { index, rating: Math.abs(offset) <= PERFECT_SEC ? 'Perfect' : 'Good', offsetMs: Math.round(offset * 1000), missReason: null };
    });
    const perfect = results.filter((r) => r.rating === 'Perfect').length;
    const good = results.filter((r) => r.rating === 'Good').length;
    const hits = results.filter((r) => r.offsetMs !== null);
    return {
      results,
      perfect,
      good,
      miss: results.length - perfect - good,
      score: results.length === 0 ? 0 : Math.round(((perfect * 100 + good * 70) / (results.length * 100)) * 100),
      meanOffsetMs: hits.length ? Math.round(hits.reduce((a, r) => a + (r.offsetMs ?? 0), 0) / hits.length) : null,
    };
  }
}
