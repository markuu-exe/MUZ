import { describe, expect, it } from 'vitest';
import { ChordMatcher } from '../../audio/chords/ChordMatcher';
import { parseChord } from '../../audio/chords/vocabulary';
import { ChromaFrameProcessor } from '../../audio/dsp/ChromaFrameProcessor';
import { feed, renderPiano } from '../../audio/__tests__/fixtures';
import { frameMatchesTarget, heardFromFrame, heardKeys, heardLabel } from '../heard';

const chroma = (bins: Record<number, number>) => Array.from({ length: 12 }, (_, i) => bins[i] ?? 0);

describe('heardFromFrame', () => {
  it('hears nothing when the frame is not voiced', () => {
    expect(heardFromFrame({ voiced: false, pitchHz: 440, clarity: 0.99, chroma: chroma({ 9: 1 }) })).toEqual({ midi: null, pitchClasses: [], rawPitchClasses: [] });
  });

  it('names a confident pitch, octave included', () => {
    expect(heardFromFrame({ voiced: true, pitchHz: 220, clarity: 0.95, chroma: chroma({ 9: 1 }) }).midi).toBe(57); // A3
  });

  it('does not name a pitch below the grading clarity floor', () => {
    expect(heardFromFrame({ voiced: true, pitchHz: 440, clarity: 0.84, chroma: chroma({ 9: 1 }) }).midi).toBeNull();
  });

  it('lists the strong pitch classes of a chord, strongest first, ignoring weak bins', () => {
    const h = heardFromFrame({ voiced: true, chroma: chroma({ 0: 1, 4: 0.8, 7: 0.7, 2: 0.2 }) }, undefined, undefined, [0, 4, 7]);
    expect(h.pitchClasses).toEqual([0, 4, 7]);
  });
});

describe('heardLabel and heardKeys', () => {
  it('labels notes with octave and chords by pitch class', () => {
    expect(heardLabel({ midi: 60, pitchClasses: [0], rawPitchClasses: [] }, false)).toBe('C4');
    expect(heardLabel({ midi: null, pitchClasses: [0, 4, 7], rawPitchClasses: [] }, true)).toBe('C · E · G');
    expect(heardLabel({ midi: null, pitchClasses: [], rawPitchClasses: [] }, true)).toBeNull();
  });

  it('lights the exact key for notes and every matching key in range for chords', () => {
    expect(heardKeys({ midi: 62, pitchClasses: [2], rawPitchClasses: [] }, false, 60, 71)).toEqual([62]);
    expect(heardKeys({ midi: 50, pitchClasses: [2], rawPitchClasses: [] }, false, 60, 71)).toEqual([]);
    expect(heardKeys({ midi: null, pitchClasses: [0, 7], rawPitchClasses: [] }, true, 48, 71)).toEqual([48, 55, 60, 67]);
  });
});

// ---------------------------------------------------------------------------
// P7: the Hearing display and grading share one per-frame analysis.
// Frames come from synthetic piano rendered through the real ChromaFrameProcessor.
// ---------------------------------------------------------------------------

const matcher = new ChordMatcher();

interface RenderedFrame {
  voiced: boolean;
  chroma: Float32Array;
  ringing: boolean;
}

/** The analysis frame ~150 ms after a strike at 0.3 s, as the drill would receive it. */
function frameOf(midis: number[], seed: number, snrDb?: number): RenderedFrame {
  const audio = renderPiano(midis.map((midi) => ({ midi, at: 0.3 })), { sampleRate: 48000, durationSec: 0.55, seed, snrDb });
  let out: RenderedFrame | null = null;
  const proc = new ChromaFrameProcessor(48000, (f) => {
    if (!out && f.time >= 0.45) out = { voiced: f.voiced, chroma: f.chroma.slice(), ringing: f.ringing };
  });
  feed(proc, audio, 48000);
  if (!out) throw new Error('no frame');
  return out;
}

const chordTarget = (chord: string) => ({ kind: 'chord' as const, chord });

describe('Hearing display uses the grader’s analysis (P7)', () => {
  it('a full C major triad: listed tones are C, E, G and the frame matches C but not Am or Em', () => {
    for (const seed of [1, 2, 3]) {
      const f = frameOf([60, 64, 67], seed);
      expect(new Set(heardFromFrame(f, undefined, undefined, [0, 4, 7]).pitchClasses)).toEqual(new Set([0, 4, 7]));
      expect(frameMatchesTarget(f, chordTarget('C'), matcher)).toBe(true);
      expect(frameMatchesTarget(f, chordTarget('Am'), matcher)).toBe(false);
      expect(frameMatchesTarget(f, chordTarget('Em'), matcher)).toBe(false);
    }
  });

  it('missing fifth (C + E only): the display does not invent G from C’s overtones, and it does not match C', () => {
    for (const seed of [4, 5, 6]) {
      const f = frameOf([60, 64], seed);
      const h = heardFromFrame(f, undefined, undefined, [0, 4, 7]);
      expect(h.pitchClasses).not.toContain(7);
      expect(frameMatchesTarget(f, chordTarget('C'), matcher)).toBe(false);
    }
  });

  it('extra note (C7 played for C): the extra Bb is listed and the frame does not match C', () => {
    for (const seed of [7, 8, 9]) {
      const f = frameOf([60, 64, 67, 70], seed);
      expect(heardFromFrame(f, undefined, undefined, [0, 4, 7]).pitchClasses).toContain(10);
      expect(frameMatchesTarget(f, chordTarget('C'), matcher)).toBe(false);
    }
  });

  it('noisy input (SNR 20 dB): a correct G major still lists G, B, D and matches G', () => {
    for (const seed of [10, 11, 12]) {
      const f = frameOf([55, 59, 62], seed, 20);
      expect(new Set(heardFromFrame(f, undefined, undefined, [7, 11, 2]).pitchClasses)).toEqual(new Set([7, 11, 2]));
      expect(frameMatchesTarget(f, chordTarget('G'), matcher)).toBe(true);
    }
  });

  it('whenever the grader accepts a frame, every chord tone is shown as heard (green never hides a tone)', () => {
    const cases: Array<[string, number[]]> = [
      ['C', [60, 64, 67]],
      ['F', [53, 57, 60]],
      ['Am', [57, 60, 64]],
      ['G', [55, 59, 62]],
      ['Dm', [62, 65, 69]],
    ];
    let accepted = 0;
    for (const [chord, midis] of cases) {
      for (const seed of [21, 22]) {
        const f = frameOf(midis, seed);
        if (!frameMatchesTarget(f, chordTarget(chord), matcher)) continue;
        accepted++;
        const listed = heardFromFrame(f, undefined, undefined, parseChord(chord).pcs).pitchClasses;
        for (const pc of parseChord(chord).pcs) expect(listed).toContain(pc);
      }
    }
    expect(accepted).toBeGreaterThanOrEqual(8);
  });

  it('a single note is matched only within the grading tolerance (±35 cents), octave included', () => {
    const c4 = 261.6256;
    const at = (cents: number) => ({ voiced: true, pitchHz: c4 * 2 ** (cents / 1200), clarity: 0.95, chroma: chroma({ 0: 1 }) });
    const note = { kind: 'note' as const, note: 60 };
    expect(frameMatchesTarget(at(0), note, matcher)).toBe(true);
    expect(frameMatchesTarget(at(30), note, matcher)).toBe(true);
    // 45 cents sharp still rounds to "C4" on screen, but grading rejects it, so it is not green.
    expect(heardFromFrame(at(45)).midi).toBe(60);
    expect(frameMatchesTarget(at(45), note, matcher)).toBe(false);
    expect(frameMatchesTarget(at(1200), note, matcher)).toBe(false); // C5 for a C4 target
    expect(frameMatchesTarget({ ...at(0), clarity: 0.8 }, note, matcher)).toBe(false); // below the clarity floor
    expect(frameMatchesTarget({ ...at(0), voiced: false }, note, matcher)).toBe(false);
  });

  it('keeps the uncompensated pitch classes for the debug view', () => {
    const h = heardFromFrame({ voiced: true, chroma: chroma({ 0: 1, 7: 0.6 }) });
    // Raw: G at 60 % of C is listed. Compensated: 0.6 − 0.36 = 0.24 < 0.25, so C's overtone is not shown as a G.
    expect(h.rawPitchClasses).toEqual([0, 7]);
    expect(h.pitchClasses).toEqual([0]);
  });
});

// ---------------------------------------------------------------------------
// Owner report 2026-11-27: chord Hearing "hallucinates notes I did not play".
// The display now lists non-chord notes only above the grader's extra-tone bar,
// and reads a 150 ms window instead of single frames.
// ---------------------------------------------------------------------------
import { HearingWindow } from '../heard';

/** Feed a whole rendered clip through a HearingWindow, reading it every 100 ms like the drill view. */
function readsOf(midis: number[], target: string, seed: number, opts: { snrDb?: number } = {}) {
  const audio = renderPiano(midis.map((midi) => ({ midi, at: 0.3 })), { sampleRate: 48000, durationSec: 1.3, seed, snrDb: opts.snrDb });
  const pcs = parseChord(target).pcs;
  const w = new HearingWindow();
  const reads: Array<{ pcs: number[]; matches: boolean }> = [];
  let lastRead = 0;
  const proc = new ChromaFrameProcessor(48000, (f) => {
    const tMs = f.time * 1000;
    w.push({ tMs, voiced: f.voiced, chroma: f.chroma, ringing: f.ringing, pitchHz: f.pitchHz, clarity: f.clarity }, { kind: 'chord', chord: target }, matcher);
    if (tMs >= 450 && tMs - lastRead >= 100) {
      lastRead = tMs;
      const r = w.read(pcs);
      reads.push({ pcs: r.heard.pitchClasses, matches: r.matches });
    }
  });
  feed(proc, audio, 48000);
  return reads;
}

describe('HearingWindow: no invented notes (owner report)', { timeout: 60_000 }, () => {
  const chords: Array<[string, number[]]> = [
    ['C', [60, 64, 67]],
    ['F', [53, 57, 60]],
    ['G', [55, 59, 62]],
    ['Am', [57, 60, 64]],
    ['Dm', [62, 65, 69]],
  ];

  it('a correctly played chord never lists a note outside it, clean or at 20 dB SNR', () => {
    for (const [name, midis] of chords) {
      for (const seed of [1, 2, 3]) {
        for (const snrDb of [30, 20]) {
          const own = new Set(parseChord(name).pcs);
          for (const r of readsOf(midis, name, seed, { snrDb })) for (const pc of r.pcs) expect(own.has(pc), `${name} seed ${seed} SNR ${snrDb}: listed ${pc}`).toBe(true);
        }
      }
    }
  });

  it('a correctly played chord shows all its notes and green on most reads', () => {
    for (const [name, midis] of chords) {
      const reads = readsOf(midis, name, 7);
      const full = reads.filter((r) => parseChord(name).pcs.every((p) => r.pcs.includes(p)) && r.matches).length;
      expect(full / reads.length, name).toBeGreaterThanOrEqual(0.8);
    }
  });

  it('missing fifth (C + E for C): G is never shown and it never turns green', () => {
    for (const seed of [4, 5]) for (const r of readsOf([60, 64], 'C', seed)) {
      expect(r.pcs).not.toContain(7);
      expect(r.matches).toBe(false);
    }
  });

  it('an extra note that the grader rejects (C7 for C) is shown, and it is not green', () => {
    for (const seed of [8, 9]) {
      const reads = readsOf([60, 64, 67, 70], 'C', seed);
      expect(reads.some((r) => r.pcs.includes(10))).toBe(true);
      expect(reads.every((r) => !r.matches)).toBe(true);
    }
  });

  it('a single noisy frame cannot flash a note or green', () => {
    const w = new HearingWindow();
    const target = { kind: 'chord' as const, chord: 'C' };
    for (let t = 0; t < 150; t += 10) w.push({ tMs: t, voiced: false, chroma: chroma({}) }, target, matcher);
    w.push({ tMs: 150, voiced: true, chroma: chroma({ 0: 1, 4: 0.8, 7: 0.7 }) }, target, matcher);
    expect(w.read(parseChord('C').pcs)).toEqual({ heard: { midi: null, pitchClasses: [], rawPitchClasses: [] }, matches: false });
  });
});
