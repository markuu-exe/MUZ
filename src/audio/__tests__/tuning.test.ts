/**
 * Owner hardware report 2026-11-28: F4 rejected again and again ("That was F4", 18 retries, then
 * only an octave worked). The label then named pitches within ±50 cents and the grader needs ±35,
 * so F4 was landing 35-50 cents off: a piano out of tune. The tuning check measures the piano
 * and every pitch check follows it.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { midiToFreq } from '../dsp/pitch';
import { PitchVerifier } from '../notes/PitchVerifier';
import type { AcousticFrame } from '../practice/ChordVerifier';
import { frameMatchesTarget } from '../../practice/heard';
import { chordMatcher } from '../../practice/PracticeDrill';
import { MAX_TUNING_CENTS, median, nearestTunedMidi, setTuningOffsetCents, tunedCentsOff, tuningOffsetCents } from '../tuning';

const F4 = 65;
const hz = (midi: number, cents: number) => midiToFreq(midi) * 2 ** (cents / 1200);

function play(cents: number): string {
  const v = new PitchVerifier(F4);
  for (let i = 0; i < 60; i++) {
    const chroma = new Float64Array(12);
    chroma[F4 % 12] = 1;
    const f: AcousticFrame = { tMs: 100 + i * 10, onset: i === 0, onsetMs: 100, voiced: true, chroma, ringing: false, pitchHz: hz(F4, cents), clarity: 0.95 };
    const r = v.push(f);
    if (r) return r.kind;
  }
  return 'none';
}

describe('tuning to the learner’s piano', () => {
  afterEach(() => setTuningOffsetCents(0));

  it('a piano 42 cents flat: F4 misses at standard tuning, matches once tuned', () => {
    expect(play(-42)).toBe('miss');
    setTuningOffsetCents(-42);
    expect(play(-42)).toBe('match');
    expect(play(0)).toBe('miss'); // the tolerance stays ±35 cents around the piano's F4
  });

  it('In-time checks and note names follow the tuning too', () => {
    setTuningOffsetCents(-42);
    const frame = { voiced: true, pitchHz: hz(F4, -42), clarity: 0.95, chroma: new Float64Array(12) };
    expect(frameMatchesTarget(frame, { kind: 'note', note: F4 }, chordMatcher)).toBe(true);
    expect(nearestTunedMidi(hz(F4, -42))).toBe(F4);
    expect(tunedCentsOff(hz(F4, -42), F4)).toBeCloseTo(0, 5);
  });

  it('is capped at ±50 cents (further off is a different note, or a piano that needs a tuner)', () => {
    setTuningOffsetCents(-80);
    expect(tuningOffsetCents()).toBe(-MAX_TUNING_CENTS);
  });

  it('median of readings ignores a stray value', () => {
    expect(median([-40, -42, -41, 30, -43])).toBe(-41);
    expect(median([])).toBeNull();
  });
});
