/**
 * T-07 (SRS 3.1.6.2): single notes are accepted only within ±35 cents of the exact
 * target (octave included), on frames with pitchy clarity ≥ 0.85.
 * Cases from MEMBER_C_EXECUTION_GUIDE.md §T-07, plus null-safety and an
 * end-to-end check through the real ChromaFrameProcessor (pitchy in the hop).
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_PITCH_CONFIG } from '../config';
import { ChromaFrameProcessor } from '../dsp/ChromaFrameProcessor';
import { centsOff, freqToMidi, midiToNoteName } from '../dsp/pitch';
import { PitchVerifier } from '../notes/PitchVerifier';
import type { AcousticFrame, AttemptKind } from '../practice/ChordVerifier';
import { feed, renderPiano } from './fixtures';

const A4 = 69;
const cents = (c: number) => 440 * 2 ** (c / 1200);

interface FrameOpts {
  onsetAt?: number;
  count?: number;
  hopMs?: number;
  voiced?: boolean;
  onset?: boolean;
}

function frames(pitchHz: number | null, clarity: number | undefined, o: FrameOpts = {}): AcousticFrame[] {
  // 40 hops ≈ 428 ms: past the miss decision at onset + 200 ms window + 150 ms roll grace.
  const { onsetAt = 0, count = 40, hopMs = 10.7, voiced = true, onset = true } = o;
  return Array.from({ length: count }, (_, i) => ({
    tMs: onsetAt + i * hopMs,
    chroma: new Float32Array(12),
    voiced,
    onset: onset && i === 0,
    onsetMs: onsetAt,
    pitchHz,
    clarity,
  }));
}

function run(v: PitchVerifier, fs: AcousticFrame[]): AttemptKind | 'none' {
  for (const f of fs) {
    const r = v.push(f);
    if (r) return r.kind;
  }
  return 'none';
}

describe('pitch helpers', () => {
  it('names MIDI notes with their octave', () => {
    expect(midiToNoteName(61)).toBe('C#4');
    expect(midiToNoteName(60)).toBe('C4');
    expect(midiToNoteName(57)).toBe('A3');
  });

  it('converts Hz to MIDI and measures cents', () => {
    expect(Math.round(freqToMidi(261.63))).toBe(60);
    expect(centsOff(440, 69)).toBe(0);
    expect(centsOff(cents(30), 69)).toBeCloseTo(30, 6);
    expect(centsOff(880, 69)).toBeCloseTo(1200, 6);
  });

  it('pins the SPEC values', () => {
    expect(DEFAULT_PITCH_CONFIG).toEqual({ centsTolerance: 35, minClarity: 0.85 });
  });
});

describe('PitchVerifier', () => {
  it('matches a note 30 cents sharp', () => {
    expect(run(new PitchVerifier(A4), frames(cents(30), 0.95))).toBe('match');
  });

  it('misses a note 40 cents sharp', () => {
    expect(run(new PitchVerifier(A4), frames(cents(40), 0.95))).toBe('miss');
  });

  it('misses the right note in the wrong octave', () => {
    const v = new PitchVerifier(A4);
    expect(run(v, frames(880, 0.95))).toBe('miss');
    expect(v.lastHeardMidi).toBe(81);
  });

  it('does not match below clarity 0.85', () => {
    expect(run(new PitchVerifier(A4), frames(440, 0.84))).not.toBe('match');
  });

  it('matches at clarity exactly 0.85', () => {
    expect(run(new PitchVerifier(A4), frames(440, 0.85))).toBe('match');
  });

  it('reports unvoiced when nothing tonal was heard', () => {
    expect(run(new PitchVerifier(A4), frames(440, 0.95, { voiced: false }))).toBe('unvoiced');
  });

  it('ignores frames until an onset opens an attempt', () => {
    const v = new PitchVerifier(A4);
    for (const f of frames(440, 0.95, { onset: false })) expect(v.push(f)).toBeNull();
    expect(v.isOpen).toBe(false);
  });

  it('merges a second onset 100 ms after the first into one attempt', () => {
    const v = new PitchVerifier(A4);
    const first = frames(440, 0.95, { count: 10 });
    const second = frames(440, 0.95, { onsetAt: 100, count: 30 });
    const results = [...first, ...second].map((f) => v.push(f)).filter((r) => r !== null);
    expect(results).toHaveLength(1);
    expect(results[0]!.kind).toBe('match');
    expect(results[0]!.onsetMs).toBe(0);
  });

  it('never passes a frame without a pitch', () => {
    expect(run(new PitchVerifier(A4), frames(null, 0.95))).not.toBe('match');
  });

  it('never passes a frame without a clarity value (chroma-only frames)', () => {
    expect(run(new PitchVerifier(A4), frames(440, undefined))).not.toBe('match');
  });

  it('reports what it heard: the target on a match, the nearest note on a miss, -1 before any attempt', () => {
    const v = new PitchVerifier(A4);
    expect(v.lastHeardMidi).toBe(-1);
    run(v, frames(220, 0.95));
    expect(v.lastHeardMidi).toBe(57);
    run(v, frames(cents(20), 0.95, { onsetAt: 1000 }));
    expect(v.lastHeardMidi).toBe(A4);
  });
});

describe('PitchVerifier on synthetic piano through ChromaFrameProcessor', () => {
  function attempt(played: number, target: number, seed: number): AttemptKind | 'none' {
    const fs = 48000;
    const audio = renderPiano([{ midi: played, at: 0.6 }], { sampleRate: fs, durationSec: 1.2, seed, snrDb: 30 });
    const verifier = new PitchVerifier(target);
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
        pitchHz: f.pitchHz,
        clarity: f.clarity,
      });
      if (r) kind = r.kind;
    });
    feed(proc, audio, fs);
    return kind;
  }

  it('accepts A4 when A4 is the target', () => {
    expect(attempt(A4, A4, 1)).toBe('match');
  });

  it('rejects A3 when A4 is the target (octave error)', () => {
    expect(attempt(57, A4, 2)).toBe('miss');
  });

  it('accepts middle C and rejects C5 for a middle-C target', () => {
    expect(attempt(60, 60, 3)).toBe('match');
    expect(attempt(72, 60, 4)).toBe('miss');
  });
});
