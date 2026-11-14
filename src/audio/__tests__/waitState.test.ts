import { describe, expect, it } from 'vitest';
import { ChordMatcher } from '../chords/ChordMatcher';
import { parseChord } from '../chords/vocabulary';
import { ChromaFrameProcessor } from '../dsp/ChromaFrameProcessor';
import { ChordVerifier, type AcousticFrame } from '../practice/ChordVerifier';
import { WaitStateMachine, type WaitStateEvents } from '../practice/WaitStateMachine';
import { feed, renderPiano, voicing, type NoteEvent } from './fixtures';

const matcher = new ChordMatcher();
const C_MAJOR = harmonicChroma([0, 4, 7]);
const A_MINOR = harmonicChroma([9, 0, 4]);
const ZERO = new Float32Array(12);

function harmonicChroma(pcs: number[]): Float32Array {
  // Synthetic "perfect" chroma: pitch classes plus 3rd-harmonic leakage.
  const v = new Float32Array(12);
  for (const p of pcs) {
    v[p] += 1;
    v[(p + 7) % 12] += 0.3;
  }
  const n = Math.hypot(...v);
  return v.map((x) => x / n);
}

/**
 * Frames every 10 ms; onset at `onsetMs`, chord `chroma` from the onset for `holdMs`.
 * A match is decided at onset + 200 ms; a miss at onset + 350 ms (200 + roll grace).
 */
function strike(onsetMs: number, chroma: Float32Array, holdMs = 400): AcousticFrame[] {
  const frames: AcousticFrame[] = [];
  for (let t = onsetMs; t <= onsetMs + holdMs; t += 10) {
    frames.push({ tMs: t, chroma, voiced: true, onset: t === onsetMs, onsetMs });
  }
  return frames;
}

function record(m: WaitStateMachine) {
  const log: Array<{ e: keyof WaitStateEvents; p: unknown }> = [];
  (['state', 'attempt', 'heartLost', 'postureBlocked', 'success'] as const).forEach((e) =>
    m.on(e, (p) => log.push({ e, p })),
  );
  return log;
}

function machine(target = 'C', cfg = {}) {
  const m = new WaitStateMachine(new ChordVerifier(matcher, target), cfg);
  return { m, log: record(m) };
}

describe('ChordVerifier (KAN-266/267)', () => {
  it('decides 200 ms after the onset (SRS 3.1.6.4)', () => {
    const v = new ChordVerifier(matcher, 'C');
    const results = strike(1000, C_MAJOR).map((f) => v.push(f)).filter(Boolean);
    expect(results).toHaveLength(1);
    expect(results[0]!.kind).toBe('match');
    expect(results[0]!.decidedMs).toBe(1200);
  });

  it('ignores sustained sound without an onset', () => {
    const v = new ChordVerifier(matcher, 'C');
    const frames = strike(0, C_MAJOR).map((f) => ({ ...f, onset: false }));
    expect(frames.map((f) => v.push(f)).filter(Boolean)).toHaveLength(0);
  });

  it('treats a rolled chord (onsets 60 ms apart) as ONE attempt', () => {
    const v = new ChordVerifier(matcher, 'C');
    const frames = [...strike(0, C_MAJOR, 50), ...strike(60, C_MAJOR, 50), ...strike(120, C_MAJOR, 300)];
    const results = frames.map((f) => v.push(f)).filter(Boolean);
    expect(results).toHaveLength(1);
    expect(results[0]!.kind).toBe('match');
    expect(results[0]!.onsetMs).toBe(0); // reported from the first note of the roll
  });

  it('classifies an onset with no tonal energy as unvoiced (no penalty)', () => {
    const v = new ChordVerifier(matcher, 'C');
    const frames = strike(0, ZERO).map((f) => ({ ...f, voiced: false }));
    const r = frames.map((f) => v.push(f)).filter(Boolean);
    expect(r[0]!.kind).toBe('unvoiced');
  });

  it('a wrong chord is a miss and reports the closest rival', () => {
    const v = new ChordVerifier(matcher, 'C');
    const r = strike(0, A_MINOR).map((f) => v.push(f)).filter(Boolean);
    expect(r[0]!.kind).toBe('miss');
    expect(r[0]!.detail!.closest.label).toBe('Am');
  });

  it('a late note in a roll whose onset was missed is still accepted (sliding window)', () => {
    const v = new ChordVerifier(matcher, 'C');
    // Onset at 0; for the first 120 ms only C+E sound (fifth arrives late, no onset reported).
    const dyad = harmonicChroma([0, 4]);
    const frames: AcousticFrame[] = [];
    for (let t = 0; t <= 450; t += 10) {
      frames.push({ tMs: t, chroma: t < 120 ? dyad : C_MAJOR, voiced: true, onset: t === 0, onsetMs: 0 });
    }
    const r = frames.map((f) => v.push(f)).filter(Boolean);
    expect(r[0]!.kind).toBe('match');
    expect(r[0]!.decidedMs).toBeGreaterThan(200);
    expect(r[0]!.decidedMs).toBeLessThanOrEqual(350);
  });
});

describe('WaitStateMachine (KAN-267, SRS 3.1.6.5)', () => {
  it('succeeds when compliant posture precedes the chord within 400 ms', () => {
    const { m, log } = machine();
    m.start(0, 5);
    m.pushPosture(900, true);
    strike(1000, C_MAJOR).forEach((f) => m.pushFrame(f));
    expect(m.state).toBe('success');
    expect(log.find((l) => l.e === 'success')!.p).toMatchObject({ audioMs: 1200, postureMs: 900 });
  });

  it('latches: compliant posture arriving ≤ 400 ms AFTER the chord still succeeds', () => {
    const { m } = machine();
    m.start(0, 5);
    m.pushPosture(1000, false);
    strike(1000, C_MAJOR, 210).forEach((f) => m.pushFrame(f));
    expect(m.state).toBe('latching');
    m.pushPosture(1550, true);
    expect(m.state).toBe('success');
  });

  it('posture compliant only 500 ms before the chord does not count; latch expires', () => {
    const { m, log } = machine();
    m.start(0, 5);
    m.pushPosture(700, true);
    m.pushPosture(750, false);
    strike(1000, C_MAJOR, 210).forEach((f) => m.pushFrame(f));
    expect(m.state).toBe('latching');
    m.tick(1601);
    expect(m.state).toBe('armed');
    expect(log.some((l) => l.e === 'postureBlocked')).toBe(true);
    expect(m.hearts).toBe(5); // posture failure alone costs no heart
  });

  it('null posture (arm not evaluable) is not compliant', () => {
    const { m } = machine();
    m.start(0, 5);
    m.pushPosture(1100, null);
    strike(1000, C_MAJOR, 210).forEach((f) => m.pushFrame(f));
    expect(m.state).toBe('latching');
  });

  it('three consecutive wrong chords cost one heart and reset the timer', () => {
    const { m, log } = machine();
    m.start(0, 5);
    [1000, 2000, 3000].forEach((t) => strike(t, A_MINOR).forEach((f) => m.pushFrame(f)));
    expect(log.filter((l) => l.e === 'heartLost')).toHaveLength(1);
    expect(log.find((l) => l.e === 'heartLost')!.p).toMatchObject({ reason: 'misses', hearts: 4, atMs: 3350 });
    expect(m.consecutiveMisses).toBe(0);
    expect(m.remainingMs(3350)).toBe(15_000);
  });

  it('a miss is decided at onset + 350 ms (200 ms window + 150 ms roll grace)', () => {
    const v = new ChordVerifier(matcher, 'C');
    const r = strike(1000, A_MINOR).map((f) => v.push(f)).filter(Boolean);
    expect(r[0]!.decidedMs).toBe(1350);
  });

  it('a correct chord breaks the consecutive-miss streak', () => {
    const { m, log } = machine();
    m.start(0, 5);
    strike(1000, A_MINOR).forEach((f) => m.pushFrame(f));
    strike(2000, A_MINOR).forEach((f) => m.pushFrame(f));
    strike(3000, C_MAJOR).forEach((f) => m.pushFrame(f)); // right chord, bad posture
    m.tick(3700);
    strike(4000, A_MINOR).forEach((f) => m.pushFrame(f));
    expect(log.filter((l) => l.e === 'heartLost')).toHaveLength(0);
    expect(m.consecutiveMisses).toBe(1);
  });

  it('15 s without a valid attempt costs a heart and re-arms (SDD 6.3)', () => {
    const { m, log } = machine();
    m.start(0, 2);
    m.tick(14_999);
    expect(m.hearts).toBe(2);
    m.tick(15_000);
    expect(m.hearts).toBe(1);
    expect(m.state).toBe('armed');
    expect(log.find((l) => l.e === 'heartLost')!.p).toMatchObject({ reason: 'timeout' });
    m.tick(30_000);
    expect(m.hearts).toBe(0);
    expect(m.state).toBe('locked');
  });

  it('starts locked when hearts are already 0', () => {
    const { m } = machine();
    m.start(0, 0);
    expect(m.state).toBe('locked');
  });

  it('pause freezes the timer (hidden tab)', () => {
    const { m } = machine();
    m.start(0, 5);
    m.pause(10_000);
    m.tick(60_000);
    expect(m.hearts).toBe(5);
    m.resume(60_000);
    expect(m.remainingMs(60_000)).toBe(5_000);
    m.tick(65_000);
    expect(m.hearts).toBe(4);
  });

  it('is deterministic: the same timeline gives the same event log', () => {
    const run = () => {
      const { m, log } = machine();
      m.start(0, 5);
      [1000, 2000].forEach((t) => strike(t, A_MINOR).forEach((f) => m.pushFrame(f)));
      m.pushPosture(2900, true);
      strike(3000, C_MAJOR).forEach((f) => m.pushFrame(f));
      return JSON.stringify(log);
    };
    expect(run()).toBe(run());
  });
});

describe('End-to-end: audio → worklet DSP → verifier → wait-state', () => {
  function runAudio(notes: NoteEvent[], target: string, posture: boolean, seconds = 2.5) {
    const fs = 48000;
    const audio = renderPiano(notes, { sampleRate: fs, durationSec: seconds, seed: 21 });
    const { m, log } = machine(target);
    m.start(0, 5);
    const proc = new ChromaFrameProcessor(fs, (f) => {
      const tMs = f.time * 1000;
      m.pushPosture(tMs, posture);
      m.pushFrame({ tMs, chroma: f.chroma.slice(), voiced: f.voiced, ringing: f.ringing, onset: f.onset, onsetMs: f.onsetTime * 1000 });
    });
    feed(proc, audio, fs);
    return { m, log };
  }

  it('a C major strike at 0.8 s passes ~200 ms later', () => {
    const { m, log } = runAudio(voicing(parseChord('C').pcs, 4, 0).map((midi) => ({ midi, at: 0.8 })), 'C', true);
    expect(m.state).toBe('success');
    const s = log.find((l) => l.e === 'success')!.p as { audioMs: number };
    expect(s.audioMs).toBeGreaterThan(990);
    expect(s.audioMs).toBeLessThan(1060);
  });

  it('a rolled Am (40 ms between notes) passes as one attempt', () => {
    const notes = voicing(parseChord('Am').pcs, 3, 0).map((midi, i) => ({ midi, at: 0.8 + 0.04 * i }));
    const { m, log } = runAudio(notes, 'Am', true);
    expect(m.state).toBe('success');
    expect(log.filter((l) => l.e === 'attempt')).toHaveLength(1);
  });

  it('F played when Am is required does not pass', () => {
    const { m, log } = runAudio(voicing(parseChord('F').pcs, 3, 0).map((midi) => ({ midi, at: 0.8 })), 'Am', true);
    expect(m.state).not.toBe('success');
    expect(log.filter((l) => l.e === 'attempt').map((l) => (l.p as { kind: string }).kind)).toEqual(['miss']);
  });

  it('correct chord but posture never compliant → latch expires, no success', () => {
    const { m, log } = runAudio(voicing(parseChord('G').pcs, 3, 1).map((midi) => ({ midi, at: 0.8 })), 'G', false);
    expect(m.state).toBe('armed');
    expect(log.some((l) => l.e === 'postureBlocked')).toBe(true);
  });
});
