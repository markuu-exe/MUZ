/**
 * Device latency calibration for rhythm exercises (ruling R1). The learner taps along
 * with a few clicks; the median delay between each click and its tap is the device's
 * extra output latency (speakers, Bluetooth) that the browser does not report. It is
 * stored per device and subtracted from every rhythm tap. Only the device delay is
 * measured: a learner who plays late in a lesson is still judged late.
 */
import { getPattern } from '../../content/patterns';
import { buildRhythmPlan, type RhythmPlan } from './plan';
import type { JudgedTap } from './timing';

export const TAP_LATENCY_KEY = 'muz-tap-latency-ms';
/** Ignore taps farther than this from every click (stray presses). */
export const CALIBRATION_MATCH_MS = 300;
export const MIN_CALIBRATION_TAPS = 5;
export const MAX_LATENCY_MS = 250;

/** Median click→tap delay in ms, clamped to [0, MAX_LATENCY_MS]; null when too few usable taps. */
export function estimateLatencyMs(tapTimesSec: readonly number[], clickTimesSec: readonly number[]): number | null {
  const deltas: number[] = [];
  for (const tap of tapTimesSec) {
    let best = Infinity;
    for (const click of clickTimesSec) {
      const d = (tap - click) * 1000;
      if (Math.abs(d) < Math.abs(best)) best = d;
    }
    if (Math.abs(best) <= CALIBRATION_MATCH_MS) deltas.push(best);
  }
  if (deltas.length < MIN_CALIBRATION_TAPS) return null;
  deltas.sort((a, b) => a - b);
  const mid = deltas.length >> 1;
  const median = deltas.length % 2 ? deltas[mid] : (deltas[mid - 1] + deltas[mid]) / 2;
  return Math.round(Math.max(0, Math.min(MAX_LATENCY_MS, median)));
}

/** Stored latency in ms (0 when never calibrated or storage is unavailable). */
export function readTapLatencyMs(): number {
  try {
    const raw = window.localStorage.getItem(TAP_LATENCY_KEY);
    if (raw === null) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(0, Math.min(MAX_LATENCY_MS, n)) : 0;
  } catch {
    return 0;
  }
}

export function hasTapCalibration(): boolean {
  try {
    return window.localStorage.getItem(TAP_LATENCY_KEY) !== null;
  } catch {
    return false;
  }
}

export function saveTapLatencyMs(ms: number): void {
  try {
    window.localStorage.setItem(TAP_LATENCY_KEY, String(Math.max(0, Math.min(MAX_LATENCY_MS, Math.round(ms)))));
  } catch {
    // Storage unavailable (private mode): the measurement simply is not kept.
  }
}

/**
 * The tap test is a 4/4 rhythm plan built exactly like a lesson's (buildRhythmPlan), so it gets
 * the lesson count-in (countInBeats 4, rounded up to whole measures: one bar of 4 in 4/4), the
 * same click voices and the same beat highway. Owner feedback 2026-11-27: the first click used
 * to be measured at once, with no count-in and nothing to watch.
 */
export const CALIBRATION_COUNT_IN = 4;
export const CALIBRATION_BPM = 100;
export const CALIBRATION_CLICKS = 8;

export function calibrationPlan(): RhythmPlan {
  const quarters = getPattern('quarters');
  return buildRhythmPlan(quarters, {
    mode: 'tap-along',
    bpm: CALIBRATION_BPM,
    countInBeats: CALIBRATION_COUNT_IN,
    repeats: Math.ceil(CALIBRATION_CLICKS / quarters.hits.length),
  });
}

export interface CalibrationSchedule {
  /** AudioContext times of the count-in clicks (not measured). */
  countIn: number[];
  /** AudioContext times of the measured clicks. */
  measured: number[];
}

/** Absolute AudioContext times for a plan whose t = 0 is at context time `t0`. */
export function calibrationSchedule(plan: RhythmPlan, t0: number): CalibrationSchedule {
  return {
    countIn: plan.clicks.filter((c) => c.countIn).map((c) => t0 + c.time),
    measured: plan.targets.map((t) => t0 + t),
  };
}

/** Taps made during the count-in are practice: only taps from half a gap before the first measured click count. */
export function measuredTaps(tapTimesSec: readonly number[], schedule: CalibrationSchedule, gapSec: number): number[] {
  const first = schedule.measured[0];
  if (first === undefined) return [];
  return tapTimesSec.filter((t) => t >= first - gapSec / 2);
}

/**
 * Highway marks for the tap test: a measured click with a tap within CALIBRATION_MATCH_MS turns
 * green ("your tap was heard"); the others fade once passed. Nothing is graded here.
 */
export function calibrationMarks(tapTimesSec: readonly number[], schedule: CalibrationSchedule): JudgedTap[] {
  const marks: JudgedTap[] = [];
  schedule.measured.forEach((click, i) => {
    let best = Infinity;
    for (const tap of tapTimesSec) if (Math.abs(tap - click) < Math.abs(best)) best = tap - click;
    if (Math.abs(best) * 1000 <= CALIBRATION_MATCH_MS) marks.push({ rating: 'Perfect', deltaMs: Math.round(best * 1000), beatIndex: i });
  });
  return marks;
}
