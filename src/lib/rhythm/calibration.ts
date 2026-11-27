/**
 * Device latency calibration for rhythm exercises (ruling R1). The learner taps along
 * with a few clicks; the median delay between each click and its tap is the device's
 * extra output latency (speakers, Bluetooth) that the browser does not report. It is
 * stored per device and subtracted from every rhythm tap. Only the device delay is
 * measured: a learner who plays late in a lesson is still judged late.
 */

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
 * Count-in before the measured clicks (owner feedback 2026-11-27: without it the first click
 * was already being measured and took the learner by surprise). Same length and voice as the
 * rhythm-lesson count-in (tiers.ts countInBeats: 4; clickVoice countIn).
 */
export const CALIBRATION_COUNT_IN = 4;

export interface CalibrationSchedule {
  /** AudioContext times of the count-in clicks (not measured). */
  countIn: number[];
  /** AudioContext times of the measured clicks. */
  measured: number[];
}

export function calibrationSchedule(startSec: number, gapSec: number, measuredClicks: number, countIn = CALIBRATION_COUNT_IN): CalibrationSchedule {
  return {
    countIn: Array.from({ length: countIn }, (_, i) => startSec + i * gapSec),
    measured: Array.from({ length: measuredClicks }, (_, i) => startSec + (countIn + i) * gapSec),
  };
}

/** Taps made during the count-in are practice: only taps from half a gap before the first measured click count. */
export function measuredTaps(tapTimesSec: readonly number[], schedule: CalibrationSchedule, gapSec: number): number[] {
  const first = schedule.measured[0];
  if (first === undefined) return [];
  return tapTimesSec.filter((t) => t >= first - gapSec / 2);
}

export type CalibrationCue =
  | { kind: 'wait' }
  /** `beat` is 1-based; `of` is the count-in length. Shown as "4 3 2 1" counting down. */
  | { kind: 'count'; beat: number; of: number }
  | { kind: 'tap' };

/** What to show at audible time `nowSec`: wait before the first click, count down during the count-in, then tap. */
export function calibrationCue(nowSec: number, schedule: CalibrationSchedule): CalibrationCue {
  const { countIn, measured } = schedule;
  if (measured.length > 0 && nowSec >= measured[0]) return { kind: 'tap' };
  if (countIn.length === 0 || nowSec < countIn[0]) return { kind: 'wait' };
  let beat = 0;
  for (let i = 0; i < countIn.length; i++) if (nowSec >= countIn[i]) beat = i + 1;
  return { kind: 'count', beat, of: countIn.length };
}
