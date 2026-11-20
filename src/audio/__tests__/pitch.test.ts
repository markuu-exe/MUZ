import { describe, expect, it } from 'vitest';
import { centsOff, freqToMidi, midiToNoteName } from '../dsp/pitch';
import { PitchVerifier } from '../notes/PitchVerifier';
import type { AcousticFrame, AttemptKind } from '../practice/ChordVerifier';

// Until A's T-08 adds pitchHz and clarity to AcousticFrame, extend the type locally.
type F = AcousticFrame & { pitchHz?: number | null; clarity?: number };

const A4 = 69; // 440 Hz
const withCents = (cents: number) => 440 * 2 ** (cents / 1200);

interface Opts {
  onsetAt?: number;
  count?: number;
  hopMs?: number;
  voiced?: boolean;
}

function frames(pitchHz: number, clarity: number, o: Opts = {}): F[] {
  const { onsetAt = 0, count = 40, hopMs = 10.7, voiced = true } = o;
  return Array.from({ length: count }, (_, i) => ({
    tMs: onsetAt + i * hopMs,
    chroma: new Float32Array(12),
    voiced,
    onset: i === 0,
    onsetMs: onsetAt,
    pitchHz,
    clarity,
  }));
}

/** Pushes every frame and returns the first decision the verifier makes. */
function attempt(fs: F[], target = A4): AttemptKind | 'none' {
  const verifier = new PitchVerifier(target);
  for (const f of fs) {
    const r = verifier.push(f);
    if (r) return r.kind;
  }
  return 'none';
}

describe('PitchVerifier (target A4)', () => {
  it('accepts +30 cents', () => {
    expect(attempt(frames(withCents(30), 0.95))).toBe('match');
  });

  it('rejects +40 cents', () => {
    expect(attempt(frames(withCents(40), 0.95))).toBe('miss');
  });

  it('rejects the wrong octave (A5)', () => {
    expect(attempt(frames(880, 0.95))).toBe('miss');
  });

  it('rejects clarity 0.84', () => {
    expect(attempt(frames(440, 0.84))).not.toBe('match');
  });

  it('accepts clarity exactly 0.85', () => {
    expect(attempt(frames(440, 0.85))).toBe('match');
  });

  it('reports unvoiced when no frame is voiced', () => {
    expect(attempt(frames(440, 0.95, { voiced: false }))).toBe('unvoiced');
  });

  it('returns null from push when there is no onset', () => {
    const verifier = new PitchVerifier(A4);
    const results = frames(440, 0.95).map((f) => verifier.push({ ...f, onset: false }));
    expect(results.every((r) => r === null)).toBe(true);
  });

  it('merges a second onset 100 ms later into the same attempt', () => {
    const first = frames(440, 0.95, { onsetAt: 0, count: 5 });
    const second = frames(440, 0.95, { onsetAt: 100, count: 25 });
    expect(attempt([...first, ...second])).toBe('match');
  });

  it('reports the closest note that was heard', () => {
    const verifier = new PitchVerifier(A4);
    for (const f of frames(493.88, 0.95)) verifier.push(f); // B4
    expect(verifier.lastHeardMidi).toBe(71);
  });
});

describe('pitch helpers', () => {
  it('names notes with their octave', () => {
    expect(midiToNoteName(61)).toBe('C#4');
    expect(midiToNoteName(60)).toBe('C4');
  });

  it('converts Hz to MIDI', () => {
    expect(Math.round(freqToMidi(261.63))).toBe(60);
  });

  it('measures cents off a target', () => {
    expect(centsOff(440, 69)).toBe(0);
  });
});
