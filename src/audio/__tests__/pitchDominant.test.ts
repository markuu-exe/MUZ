/**
 * Owner hardware report 2026-11-28: "That was F4. Try F4 again." The miss rule (80 % of frames
 * within ±35 cents + chroma check) and the "sounded like" label (most frequent confident pitch,
 * nearest semitone, ±50 cents) disagreed. The grading rules are the spec (SRS 3.1.6.2: ±35
 * cents; a dyad containing the target is not the note); the label now uses the same tolerance.
 */
import { describe, expect, it } from 'vitest';
import { midiToFreq } from '../dsp/pitch';
import { PitchVerifier } from '../notes/PitchVerifier';
import type { AcousticFrame, AttemptResult } from '../practice/ChordVerifier';

const F4 = 65;
/** One strike at 100 ms, then 10 ms frames reading `pitch(i)` (cents off F4 → frequency). */
function attempt(readings: (i: number) => { midi: number; cents?: number; clarity?: number }): { kind: AttemptResult['kind']; heard: number } {
  const v = new PitchVerifier(F4);
  for (let i = 0; i < 60; i++) {
    const r = readings(i);
    const chroma = new Float64Array(12);
    chroma[r.midi % 12] = 1;
    const frame: AcousticFrame = {
      tMs: 100 + i * 10,
      onset: i === 0,
      onsetMs: 100,
      voiced: true,
      chroma,
      ringing: false,
      pitchHz: midiToFreq(r.midi) * 2 ** ((r.cents ?? 0) / 1200),
      clarity: r.clarity ?? 0.95,
    };
    const res = v.push(frame);
    if (res) return { kind: res.kind, heard: v.lastHeardMidi };
  }
  return { kind: 'unvoiced', heard: -1 };
}

describe('the "sounded like" label agrees with the grader', () => {
  it('in tune: match', () => {
    expect(attempt(() => ({ midi: F4 })).kind).toBe('match');
  });

  it('40 cents sharp is a miss (SRS ±35 cents) and is not called F4', () => {
    expect(attempt(() => ({ midi: F4, cents: 40 }))).toEqual({ kind: 'miss', heard: -1 });
  });

  it('a wrong note is a miss, named', () => {
    expect(attempt(() => ({ midi: 64 }))).toEqual({ kind: 'miss', heard: 64 });
  });

  it('F4 with other notes (two keys at once) is a miss; the clearest pitch was F4', () => {
    // The UI must not say "That was F4. Try F4 again." for this (wait.ts heardTarget).
    expect(attempt((i) => ({ midi: i % 2 ? F4 : 64 }))).toMatchObject({ kind: 'miss' });
  });
});
