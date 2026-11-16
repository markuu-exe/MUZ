/**
 * Attempt-level acceptance matrix: synthetic audio → ChromaFrameProcessor →
 * ChordVerifier, exactly the path the worklet + hook run. These rates decide
 * whether a learner passes or loses a heart, so the thresholds below are the
 * branch's acceptance criteria (measured values in COPILOT_PLAN §3).
 */
import { describe, expect, it } from 'vitest';
import { ChordMatcher } from '../chords/ChordMatcher';
import { parseChord } from '../chords/vocabulary';
import { ChromaFrameProcessor } from '../dsp/ChromaFrameProcessor';
import { ChordVerifier, type AttemptKind } from '../practice/ChordVerifier';
import { feed, renderPiano, voicing } from './fixtures';

const matcher = new ChordMatcher();
const P = (name: string) => parseChord(name).pcs;
const LESSONS = ['C', 'G', 'Am', 'F'];

interface AttemptOpts {
  fs?: number;
  prev?: number[];
  rollSec?: number;
  snrDb?: number;
}

function attempt(notes: number[], target: string, seed: number, o: AttemptOpts = {}): AttemptKind | 'none' {
  const fs = o.fs ?? 48000;
  const events = [
    ...notes.map((midi, i) => ({ midi, at: 0.6 + (o.rollSec ?? 0) * i })),
    ...(o.prev ?? []).map((midi) => ({ midi, at: 0.25, gainDb: -10 })),
  ];
  const audio = renderPiano(events, { sampleRate: fs, durationSec: 1.2, seed, snrDb: o.snrDb ?? 30 });
  const verifier = new ChordVerifier(matcher, target);
  let kind: AttemptKind | 'none' = 'none';
  const proc = new ChromaFrameProcessor(fs, (f) => {
    if (f.time < 0.55 || kind !== 'none') return;
    const r = verifier.push({
      tMs: f.time * 1000,
      chroma: f.chroma,
      voiced: f.voiced,
      ringing: f.ringing,
      onset: f.onset,
      onsetMs: f.onsetTime * 1000,
    });
    if (r) kind = r.kind;
  });
  feed(proc, audio, fs);
  return kind;
}

function rate(cases: Array<() => AttemptKind | 'none'>, want: AttemptKind): number {
  return cases.filter((c) => c() === want).length / cases.length;
}

// These render and analyse hundreds of synthetic chords; single cases take 2–9 s
// on a team laptop, so the 5 s default timeout fails them under full-suite load.
describe('Attempt-level acceptance (KAN-266 + KAN-267)', { timeout: 60_000 }, () => {
  it('correct chord, every inversion, octaves 3–4, 48 and 44.1 kHz: ≥ 95 % pass', () => {
    const cases: Array<() => AttemptKind | 'none'> = [];
    for (const t of LESSONS)
      for (const oct of [3, 4])
        for (const inv of [0, 1, 2, 'open'] as const)
          for (const fs of [48000, 44100]) cases.push(() => attempt(voicing(P(t), oct, inv), t, 101 + oct + fs, { fs }));
    expect(rate(cases, 'match')).toBeGreaterThanOrEqual(0.95);
  }, 30_000);

  it('correct chord at SNR 20 dB: ≥ 90 % pass', () => {
    const cases = LESSONS.flatMap((t) => [1, 2].map((s) => () => attempt(voicing(P(t), 4, 0), t, s * 7, { snrDb: 20 })));
    expect(rate(cases, 'match')).toBeGreaterThanOrEqual(0.9);
  });

  it('rolled chord, 30–70 ms between notes: ≥ 90 % pass', () => {
    const cases = LESSONS.flatMap((t) =>
      [0.03, 0.05, 0.07].map((roll, i) => () => attempt(voicing(P(t), 4, 0), t, 9 + i, { rollSec: roll })),
    );
    expect(rate(cases, 'match')).toBeGreaterThanOrEqual(0.9);
  });

  it('correct chord over a different chord still ringing (pedal): ≥ 85 % pass', () => {
    const cases = LESSONS.flatMap((t) =>
      [1, 2, 3].map((s) => () => {
        const v = voicing(P(t), 4, 0);
        return attempt(v, t, s * 17, { prev: v.map((n) => n + 2) });
      }),
    );
    expect(rate(cases, 'match')).toBeGreaterThanOrEqual(0.85);
  });

  it('correct chord over a ringing chord that shares two tones (C→Am, Am→F…): ≥ 70 % pass', () => {
    // Known hardest case: the shared tones are partly removed with the residue.
    // 3 consecutive misses (heart loss) from this alone ≈ 0.3³ ≈ 3 %.
    const pairs: Array<[string, string]> = [['C', 'Am'], ['Am', 'F'], ['F', 'C'], ['G', 'C'], ['Am', 'C'], ['C', 'G']];
    const cases = pairs.flatMap(([prev, t]) =>
      [1, 2, 3].map((s) => () => attempt(voicing(P(t), 3, 0), t, s * 29, { prev: voicing(P(prev), 3, 0) })),
    );
    expect(rate(cases, 'match')).toBeGreaterThanOrEqual(0.7);
  });

  it('wrong chord (shares two tones), with or without the target ringing: 100 % rejected', () => {
    const pairs: Array<[string, string]> = [['F', 'Am'], ['Am', 'C'], ['Em', 'C'], ['C', 'Am'], ['Am', 'F'], ['Cm', 'C'], ['G', 'Em']];
    const cases = pairs.flatMap(([played, t]) => [
      () => attempt(voicing(P(played), 4, 0), t, 31),
      () => attempt(voicing(P(played), 3, 0), t, 37, { prev: voicing(P(t), 3, 0) }),
    ]);
    expect(rate(cases, 'miss')).toBe(1);
  });

  it('root alone / missing fifth / missing third: ≥ 85 % rejected', () => {
    const cases = LESSONS.flatMap((t) => {
      const pc = P(t);
      const r = 48 + pc[0];
      const third = r + ((pc[1] - pc[0] + 12) % 12);
      const fifth = r + ((pc[2] - pc[0] + 12) % 12);
      return [[r], [r, third], [r, fifth]].flatMap((ns) => [1, 2].map((s) => () => attempt(ns, t, s * 41)));
    });
    expect(rate(cases, 'miss')).toBeGreaterThanOrEqual(0.85);
  });

  it('added note (7th, maj7, neighbour key): ≥ 80 % rejected', () => {
    const cases: Array<[number[], string]> = [
      [[60, 64, 67, 70], 'C'], [[60, 64, 67, 71], 'C'], [[57, 60, 64, 67], 'C'], [[55, 59, 62, 65], 'G'],
      [[53, 57, 60, 64], 'F'], [[60, 62, 64, 67], 'C'], [[57, 60, 62, 64], 'Am'],
    ];
    const runs = cases.flatMap(([ns, t]) => [1, 2].map((s) => () => attempt(ns, t, s * 43)));
    expect(rate(runs, 'miss')).toBeGreaterThanOrEqual(0.8);
  });
});
