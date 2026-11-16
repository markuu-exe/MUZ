/**
 * COURSE-5 acceptance for single-note drills: synthetic piano → ChromaFrameProcessor →
 * NoteVerifier, the same path the worklet and usePracticeDrill run.
 */
import { describe, expect, it } from 'vitest';
import { ChromaFrameProcessor } from '../dsp/ChromaFrameProcessor';
import { NoteMatcher } from '../notes/NoteMatcher';
import { NoteVerifier } from '../practice/NoteVerifier';
import type { AttemptKind } from '../practice/ChordVerifier';
import { WaitStateMachine } from '../practice/WaitStateMachine';
import { feed, renderPiano, type NoteEvent } from './fixtures';

const matcher = new NoteMatcher();

interface Opts {
  fs?: number;
  snrDb?: number;
  /** Notes struck at 0.25 s and left ringing (−10 dB), like the previous step of a sequence. */
  prev?: number[];
}

function attempt(played: number[], target: number, seed: number, o: Opts = {}): AttemptKind | 'none' {
  const fs = o.fs ?? 48000;
  const events: NoteEvent[] = [
    ...played.map((midi) => ({ midi, at: 0.6 })),
    ...(o.prev ?? []).map((midi) => ({ midi, at: 0.25, gainDb: -10 })),
  ];
  const audio = renderPiano(events, { sampleRate: fs, durationSec: 1.2, seed, snrDb: o.snrDb ?? 30 });
  const verifier = new NoteVerifier(matcher, target);
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
  const r = cases.filter((c) => c() === want).length / cases.length;
  console.log(`    ${want}: ${(r * 100).toFixed(1)} % of ${cases.length}`);
  return r;
}

/** Every note the course asks for in play-note / play-sequence lives in C3–C5. */
const COURSE_RANGE = Array.from({ length: 25 }, (_, i) => 48 + i);

describe('NoteMatcher', () => {
  it('accepts a clean single-note chroma and names what it heard', () => {
    const chroma = new Float32Array(12);
    chroma[0] = 1; // C with a little of its fifth and third (harmonics)
    chroma[7] = 0.35;
    chroma[4] = 0.12;
    expect(matcher.match(chroma, 60)).toMatchObject({ heardPc: 0, passes: true });
    expect(matcher.match(chroma, 67)).toMatchObject({ heardPc: 0, passes: false });
  });

  it('rejects silence', () => {
    expect(matcher.match(new Float32Array(12), 60).passes).toBe(false);
  });
});

describe('Single-note attempts (COURSE-5)', () => {
  it('correct note, C3–C5, 48 and 44.1 kHz: ≥ 95 % match', () => {
    const cases = COURSE_RANGE.flatMap((m) => [48000, 44100].map((fs) => () => attempt([m], m, 200 + m + fs, { fs })));
    expect(rate(cases, 'match')).toBeGreaterThanOrEqual(0.95);
  }, 30_000);

  it('any octave of the target passes (pitch class only, by design)', () => {
    const cases = [36, 48, 60, 72, 84].map((m) => () => attempt([m], 60, 300 + m));
    expect(rate(cases, 'match')).toBeGreaterThanOrEqual(0.8);
  });

  it('correct note at SNR 20 dB: ≥ 90 % match', () => {
    const cases = COURSE_RANGE.map((m) => () => attempt([m], m, 400 + m, { snrDb: 20 }));
    expect(rate(cases, 'match')).toBeGreaterThanOrEqual(0.9);
  });

  it('correct note while the previous note of a scale is still ringing: ≥ 85 % match', () => {
    const cases = COURSE_RANGE.flatMap((m) => [-2, -1, 1, 2].map((d) => () => attempt([m], m, 500 + m + d, { prev: [m + d] })));
    expect(rate(cases, 'match')).toBeGreaterThanOrEqual(0.85);
  }, 60_000);

  it('wrong note (semitone, whole tone, third, fourth, fifth away): 100 % rejected as a miss', () => {
    const cases = COURSE_RANGE.filter((_, i) => i % 2 === 0).flatMap((m) =>
      [-7, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 7].map((d) => () => attempt([m + d], m, 600 + m + d)),
    );
    expect(rate(cases, 'miss')).toBe(1);
  }, 60_000);

  it('a chord or dyad that contains the target is not the note: ≥ 90 % rejected', () => {
    const cases = COURSE_RANGE.slice(0, 13).flatMap((m) => [
      () => attempt([m, m + 4, m + 7], m, 700 + m), // major triad on the note
      () => attempt([m, m + 3, m + 7], m, 710 + m), // minor triad on the note
      () => attempt([m, m + 2], m, 720 + m), // neighbour key pressed too
      () => attempt([m - 1, m], m, 730 + m),
    ]);
    expect(rate(cases, 'miss')).toBeGreaterThanOrEqual(0.9);
  }, 30_000);

  it('reports the pitch class that was played instead', () => {
    const verifier = new NoteVerifier(matcher, 60);
    const audio = renderPiano([{ midi: 62, at: 0.6 }], { sampleRate: 48000, durationSec: 1.2, seed: 9 });
    const proc = new ChromaFrameProcessor(48000, (f) => {
      verifier.push({ tMs: f.time * 1000, chroma: f.chroma, voiced: f.voiced, ringing: f.ringing, onset: f.onset, onsetMs: f.onsetTime * 1000 });
    });
    feed(proc, audio, 48000);
    expect(verifier.lastHeardPc).toBe(2); // D
  });
});

describe('NoteVerifier + WaitStateMachine', () => {
  function drive(played: number[], target: number, posture: boolean | null) {
    const machine = new WaitStateMachine(new NoteVerifier(matcher, target));
    const events: string[] = [];
    machine.on('success', () => events.push('success'));
    machine.on('heartLost', (e) => events.push(`heartLost:${e.reason}`));
    machine.on('postureBlocked', () => events.push('postureBlocked'));
    machine.start(0, 3);
    const audio = renderPiano(played.map((midi, i) => ({ midi, at: 0.5 + i * 1.2 })), {
      sampleRate: 48000,
      durationSec: 0.6 + played.length * 1.2,
      seed: 5,
    });
    const proc = new ChromaFrameProcessor(48000, (f) => {
      const tMs = f.time * 1000;
      machine.pushPosture(tMs, posture);
      machine.pushFrame({ tMs, chroma: f.chroma, voiced: f.voiced, ringing: f.ringing, onset: f.onset, onsetMs: f.onsetTime * 1000 });
    });
    feed(proc, audio, 48000);
    return { machine, events };
  }

  it('right note + compliant posture → success, no hearts lost', () => {
    const { machine, events } = drive([64], 64, true);
    expect(events).toEqual(['success']);
    expect(machine.state).toBe('success');
    expect(machine.hearts).toBe(3);
  });

  it('right note but posture not compliant → blocked, stays armed, no heart lost', () => {
    const { machine, events } = drive([64], 64, false);
    expect(events).toEqual(['postureBlocked']);
    expect(machine.state).toBe('armed');
    expect(machine.hearts).toBe(3);
  });

  it('three wrong notes in a row cost one heart (SRS 3.1.2.4)', () => {
    const { machine, events } = drive([62, 65, 67], 64, true);
    expect(events).toEqual(['heartLost:misses']);
    expect(machine.hearts).toBe(2);
  });
});
