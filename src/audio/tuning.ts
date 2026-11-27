/**
 * The learner's piano tuning (owner report 2026-11-28: a right F4 rejected 18 times; it was
 * landing 35-50 cents off). Pianos drift, usually flat, and the graders compare against equal
 * temperament at A4 = 440 Hz with a ±35-cent tolerance (SRS 3.1.6.2). The tuning check in
 * Performance mode measures the piano and stores an offset here; every pitch check (lessons and
 * Performance) then measures "how far from this piano's F4", with the same ±35-cent tolerance.
 * One key far from the rest is not fixed by this (it needs a piano tuner); the check shows that.
 */
import { centsOff, freqToMidi } from './dsp/pitch';

export const TUNING_KEY = 'muz-piano-tuning-cents';
/** Beyond half a semitone it is a different note (or a piano that needs a tuner). */
export const MAX_TUNING_CENTS = 50;

function load(): number {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return 0;
    const v = Number(window.localStorage.getItem(TUNING_KEY));
    return Number.isFinite(v) ? Math.max(-MAX_TUNING_CENTS, Math.min(MAX_TUNING_CENTS, v)) : 0;
  } catch {
    return 0;
  }
}

let offsetCents = load();

/** Cents the learner's piano sits from A4 = 440 Hz equal temperament (negative = flat). */
export function tuningOffsetCents(): number {
  return offsetCents;
}

export function setTuningOffsetCents(cents: number): void {
  offsetCents = Math.round(Math.max(-MAX_TUNING_CENTS, Math.min(MAX_TUNING_CENTS, cents)));
  try {
    if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem(TUNING_KEY, String(offsetCents));
  } catch {
    // Storage unavailable: the tuning lasts for this page only.
  }
}

/** Cents from this piano's version of `midi`. */
export function tunedCentsOff(hz: number, midi: number): number {
  return centsOff(hz, midi) - offsetCents;
}

/** The note this piano most likely played for a reading. */
export function nearestTunedMidi(hz: number): number {
  return Math.round(freqToMidi(hz) - offsetCents / 100);
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
