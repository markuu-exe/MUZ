/**
 * COURSE-4: turns a rhythm pattern into a timeline (pure, no audio, no React).
 * All times are seconds from the start of the session (t = 0 is the first count-in click).
 *
 * Modes
 *  - tap-along: the pattern is sounded and shown; the learner taps with it.
 *  - tap-echo : the pattern is sounded once (listen), then the learner taps it back
 *               from memory. Repeats alternate listen / answer.
 *  - tap-read : nothing is sounded and no notes scroll; the learner reads the notation.
 */
import type { CompiledPattern } from '../../content/patterns';
import type { TapExerciseType } from '../../types/lesson.types';
import { GOOD_MS, POINTS, type JudgedTap, type RhythmSummary } from './timing';

export interface RhythmClick {
  time: number;
  /** First click of a measure. */
  accent: boolean;
  countIn: boolean;
}

export interface RhythmSegment {
  kind: 'count-in' | 'listen' | 'play';
  start: number;
  end: number;
}

export interface RhythmPlan {
  mode: TapExerciseType;
  bpm: number;
  /** Seconds per metronome click. */
  beatSec: number;
  beatsPerMeasure: number;
  clicks: RhythmClick[];
  /** Pattern notes the app sounds (tap-along: all; tap-echo: the listen passes; tap-read: none). */
  tones: number[];
  /** When a tap is expected. */
  targets: number[];
  segments: RhythmSegment[];
  /** Total length, including the count-in. */
  endSec: number;
}

export interface RhythmPlanOptions {
  mode: TapExerciseType;
  bpm: number;
  countInBeats: number;
  repeats: number;
}

/** Taps this long before a play segment are still judged (an early first tap is a miss, not ignored). */
export const INPUT_LEAD_SEC = 0.25;

function round(t: number): number {
  return Math.round(t * 1e6) / 1e6;
}

export function buildRhythmPlan(pattern: CompiledPattern, opts: RhythmPlanOptions): RhythmPlan {
  const bpm = Math.max(30, Math.min(240, opts.bpm));
  const beatSec = 60 / bpm;
  const perMeasure = pattern.beatsPerMeasure;
  // Count-in: at least `countInBeats` clicks, rounded up to whole measures (3/4 counts 6, 6/8 counts 6).
  const countInClicks = Math.max(1, Math.ceil(Math.max(1, opts.countInBeats) / perMeasure)) * perMeasure;
  const repeats = Math.max(1, Math.floor(opts.repeats));
  const patternSec = pattern.lengthBeats * beatSec;

  const segments: RhythmSegment[] = [{ kind: 'count-in', start: 0, end: round(countInClicks * beatSec) }];
  const tones: number[] = [];
  const targets: number[] = [];
  let cursor = countInClicks * beatSec;

  const addPass = (kind: 'listen' | 'play') => {
    const start = cursor;
    for (const hit of pattern.hits) {
      const t = round(start + hit * beatSec);
      if (kind === 'play') targets.push(t);
      if (kind === 'listen' || opts.mode === 'tap-along') tones.push(t);
    }
    cursor += patternSec;
    const last = segments[segments.length - 1];
    if (last.kind === kind) last.end = round(cursor);
    else segments.push({ kind, start: round(start), end: round(cursor) });
  };

  for (let r = 0; r < repeats; r++) {
    if (opts.mode === 'tap-echo') addPass('listen');
    addPass('play');
  }

  const totalClicks = Math.round(cursor / beatSec);
  const clicks: RhythmClick[] = [];
  for (let i = 0; i < totalClicks; i++) {
    const inCount = i < countInClicks;
    const indexInMeasure = (inCount ? i : i - countInClicks) % perMeasure;
    clicks.push({ time: round(i * beatSec), accent: indexInMeasure === 0, countIn: inCount });
  }

  return { mode: opts.mode, bpm, beatSec, beatsPerMeasure: perMeasure, clicks, tones, targets, segments, endSec: round(cursor) };
}

export function segmentAt(plan: RhythmPlan, t: number): RhythmSegment | null {
  for (const s of plan.segments) if (t >= s.start && t < s.end) return s;
  return null;
}

/** Whether a tap at time `t` should be judged (taps during count-in and listen passes are ignored). */
export function acceptsTap(plan: RhythmPlan, t: number, lateMs: number = GOOD_MS): boolean {
  for (const s of plan.segments) {
    if (s.kind === 'play' && t >= s.start - INPUT_LEAD_SEC && t < s.end + lateMs / 1000) return true;
  }
  return false;
}

/** Hearts-free penalty for taps that match no note, so mashing the spacebar cannot pass. */
export const EXTRA_TAP_PENALTY = 35;

export interface RhythmScore {
  /** 0–1, compared with settings.passMark. */
  score: number;
  passed: boolean;
  /** Taps that matched no note. */
  extraTaps: number;
}

/**
 * Pass decision for one rhythm exercise.
 * score = (Perfect × 100 + Good × 70 − extra taps × 35) / (notes × 100), floored at 0.
 * Perfect/Good/Miss and the two point values are SDD C-04; the extra-tap penalty is COURSE-4.
 */
export function scoreRhythm(summary: RhythmSummary, taps: readonly JudgedTap[], targetCount: number, passMark: number): RhythmScore {
  const extraTaps = taps.filter((t) => t.beatIndex === null).length;
  const max = targetCount * POINTS.Perfect;
  const raw = summary.perfect * POINTS.Perfect + summary.good * POINTS.Good - extraTaps * EXTRA_TAP_PENALTY;
  const score = max > 0 ? Math.max(0, Math.min(1, raw / max)) : 0;
  return { score, passed: score >= passMark, extraTaps };
}

export type RhythmCue =
  /** Before the first count-in click. */
  | { kind: 'wait' }
  /** Count-in click `beat` (1-based) of `of`; `measureBeat` is the beat inside its measure (1-based). */
  | { kind: 'count'; beat: number; of: number; measureBeat: number; beatsPerMeasure: number }
  | { kind: 'listen' }
  | { kind: 'play' }
  | { kind: 'done' };

/**
 * What the learner should be doing at plan time `t` (seconds; the same audible clock the
 * highway and the taps use). The count-in follows the meter: buildRhythmPlan rounds it up to
 * whole measures, so 4/4 counts 4, 3/4 counts 6 (two bars) and 6/8 counts 6 (one bar).
 * Used for the on-screen and screen-reader count-in, so it changes as each click is heard.
 */
export function rhythmCue(plan: RhythmPlan, t: number): RhythmCue {
  const countIn = plan.clicks.filter((c) => c.countIn);
  if (countIn.length > 0 && t < countIn[0].time) return { kind: 'wait' };
  if (t >= plan.endSec) return { kind: 'done' };
  const seg = segmentAt(plan, t);
  if (seg?.kind === 'count-in') {
    let beat = 0;
    for (let i = 0; i < countIn.length; i++) if (t >= countIn[i].time - 1e-9) beat = i + 1;
    beat = Math.max(1, beat);
    return {
      kind: 'count',
      beat,
      of: countIn.length,
      measureBeat: ((beat - 1) % plan.beatsPerMeasure) + 1,
      beatsPerMeasure: plan.beatsPerMeasure,
    };
  }
  return seg?.kind === 'listen' ? { kind: 'listen' } : { kind: 'play' };
}

/** Screen-reader / status text for a cue. */
export function rhythmCueText(cue: RhythmCue, mode: TapExerciseType = 'tap-along'): string {
  switch (cue.kind) {
    case 'wait':
      return 'Get ready: listen for the count-in.';
    case 'count':
      return `Count-in ${cue.measureBeat} of ${cue.beatsPerMeasure}${cue.of > cue.beatsPerMeasure ? ` (bar ${Math.ceil(cue.beat / cue.beatsPerMeasure)} of ${cue.of / cue.beatsPerMeasure})` : ''}. Listen, don't tap yet.`;
    case 'listen':
      return 'Listen to the rhythm.';
    case 'play':
      return mode === 'tap-echo' ? 'Your turn: tap it back.' : 'Tap now.';
    case 'done':
      return 'Done.';
  }
}
