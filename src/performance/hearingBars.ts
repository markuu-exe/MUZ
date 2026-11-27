/**
 * "What MUZ hears" bars (owner request 2026-11-28: see the noise/overtone cleanup like an
 * equalizer; a C major was read as E diminished). Per pitch class: the raw level, and the level
 * after the overtone cleanup the chord grader uses (compensateHarmonics), both smoothed over
 * frames and scaled to the loudest cleaned class. Display only: grading is unchanged.
 */
import { compensateHarmonics } from '../audio/chords/ChordMatcher';
import { DEFAULT_MATCHER_CONFIG } from '../audio/config';

export interface Bars {
  raw: number[];
  clean: number[];
}

export const SILENT_BARS: Bars = { raw: Array(12).fill(0), clean: Array(12).fill(0) };

/** Exponential smoothing: `keep` of the previous bars, the rest from this frame (0 when unvoiced). */
export function nextBars(prev: Bars, frame: { voiced: boolean; chroma: ArrayLike<number> }, keep = 0.75): Bars {
  const raw = new Float64Array(12);
  const clean = new Float64Array(12);
  if (frame.voiced) {
    for (let i = 0; i < 12; i++) raw[i] = frame.chroma[i] ?? 0;
    compensateHarmonics(raw, DEFAULT_MATCHER_CONFIG.harmonicDecay, clean);
  }
  const top = Math.max(1e-9, ...clean, ...raw);
  return {
    raw: prev.raw.map((v, i) => keep * v + (1 - keep) * (raw[i] / top)),
    clean: prev.clean.map((v, i) => keep * v + (1 - keep) * (Math.max(0, clean[i]) / top)),
  };
}
