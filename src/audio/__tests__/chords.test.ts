import { describe, expect, it } from 'vitest';
import { ChordMatcher, harmonicTemplate, partialVoicings } from '../chords/ChordMatcher';
import { ChordParseError, fullVocabulary, parseChord } from '../chords/vocabulary';
import { ChromaFrameProcessor } from '../dsp/ChromaFrameProcessor';
import { feed, renderPiano, voicing } from './fixtures';

const matcher = new ChordMatcher();

/**
 * Chroma 150 ms after a strike at 0.3 s (after the onset detector's warm-up, so
 * the real onset → residue-subtraction path runs). `prev` is a chord struck at
 * 0 s, 10 dB softer, still ringing (≈ −12 dB) when the target is played.
 */
let lastRinging = false;
/** Match the frame chromaOf() last returned, passing its `ringing` flag like ChordVerifier does. */
function matchLast(ch: Float32Array, target: string) {
  return matcher.match(ch, target, lastRinging);
}

function chromaOf(midis: number[], seed: number, fs = 48000, extra: { prev?: number[] } = {}): Float32Array | null {
  const notes = midis.map((midi) => ({ midi, at: 0.3, gainDb: 0 }));
  if (extra.prev) notes.push(...extra.prev.map((midi) => ({ midi, at: 0, gainDb: -10 })));
  const audio = renderPiano(notes, { sampleRate: fs, durationSec: 0.55, seed });
  let out: Float32Array | null = null;
  const proc = new ChromaFrameProcessor(fs, (f) => {
    if (!out && f.time >= 0.45) {
      out = f.voiced ? f.chroma.slice() : new Float32Array(12);
      lastRinging = f.ringing;
    }
  });
  feed(proc, audio, fs);
  return out;
}

describe('parseChord (KAN-266)', () => {
  it.each<[string, string, number[]]>([
    ['C', 'C', [0, 4, 7]],
    ['Am', 'Am', [9, 0, 4]],
    ['G', 'G', [7, 11, 2]],
    ['F', 'F', [5, 9, 0]],
    ['G_Maj', 'G', [7, 11, 2]],
    ['A_Min', 'Am', [9, 0, 4]],
    ['Bb7', 'A#7', [10, 2, 5, 8]],
    ['F#m7', 'F#m7', [6, 9, 1, 4]],
    ['CM7', 'Cmaj7', [0, 4, 7, 11]],
    ['Bdim', 'Bdim', [11, 2, 5]],
    ['Eaug', 'Eaug', [4, 8, 0]],
  ])('%s → %s', (input, label, pcs) => {
    const c = parseChord(input);
    expect(c.label).toBe(label);
    expect([...c.pcs]).toEqual(pcs);
  });

  it('rejects garbage', () => {
    expect(() => parseChord('H')).toThrow(ChordParseError);
    expect(() => parseChord('Cxyz')).toThrow(ChordParseError);
  });

  it('vocabulary has 84 chords', () => {
    expect(fullVocabulary()).toHaveLength(84);
  });

  it('partial voicings of a triad are R, R3, R5, 35', () => {
    expect(partialVoicings([0, 4, 7])).toEqual([[0], [0, 4], [0, 7], [4, 7]]);
  });

  it('templates are unit length', () => {
    const t = harmonicTemplate([0, 4, 7], 6, 0.6);
    expect(Math.hypot(...t)).toBeCloseTo(1, 12);
  });
});

describe('ChordMatcher on synthetic piano (KAN-266)', () => {
  const SEED_LESSONS = ['C', 'G', 'Am', 'F'];

  for (const fs of [48000, 44100]) {
    it(`accepts the seeded lesson chords in every inversion, octaves 3–4 @ ${fs} Hz`, () => {
      let ok = 0;
      let total = 0;
      const fails: string[] = [];
      for (const target of SEED_LESSONS) {
        const pcs = parseChord(target).pcs;
        for (const octave of [3, 4]) {
          for (const inv of [0, 1, 2, 'open'] as const) {
            for (let seed = 1; seed <= 3; seed++) {
              const ch = chromaOf(voicing(pcs, octave, inv), seed * 101 + octave, fs);
              const m = matcher.match(ch!, target);
              total++;
              if (m.passes) ok++;
              else fails.push(`${target} oct${octave} inv${inv} s${seed}: sim ${m.similarity.toFixed(2)} cov ${m.toneCoverage.toFixed(2)} full ${m.fullChordMargin.toFixed(3)} part ${m.partialMargin.toFixed(3)}`);
            }
          }
        }
      }
      if (ok / total < 0.9) console.log(fails.join('\n'));
      expect(ok / total).toBeGreaterThanOrEqual(0.9);
    }, 60_000);
  }

  it('rejects the root alone and every two-note subset', () => {
    let accepted = 0;
    let total = 0;
    for (const target of SEED_LESSONS) {
      const pcs = parseChord(target).pcs;
      const root = 48 + pcs[0];
      const third = root + ((pcs[1] - pcs[0] + 12) % 12);
      const fifth = root + ((pcs[2] - pcs[0] + 12) % 12);
      const partials = [[root], [root, third], [third, root + 12], [root, fifth], [third, fifth]];
      for (const p of partials) {
        for (let seed = 1; seed <= 3; seed++) {
          total++;
          if (matcher.match(chromaOf(p, seed * 7)!, target).passes) accepted++;
        }
      }
    }
    expect(accepted / total).toBeLessThanOrEqual(0.08);
  });

  it('rejects neighbouring chords that share two tones (Am↔F, C↔Am, C↔Em, G↔Em)', () => {
    const cases: Array<[played: string, target: string]> = [
      ['F', 'Am'], ['Am', 'F'], ['Am', 'C'], ['C', 'Am'], ['C', 'Em'], ['Em', 'C'], ['G', 'Em'], ['Em', 'G'],
      ['C', 'Cm'], ['Cm', 'C'], ['C', 'C7'], ['G', 'G7'],
    ];
    for (const [played, target] of cases) {
      for (let seed = 1; seed <= 3; seed++) {
        const ch = chromaOf(voicing(parseChord(played).pcs.slice(0, 3), 4, 0), seed * 13);
        expect({ played, target, passes: matcher.match(ch!, target).passes }).toEqual({ played, target, passes: false });
      }
    }
  });

  it('accepts a correct chord over the previous chord still ringing (sustain pedal, ≈ −12 dB)', () => {
    let ok = 0;
    let total = 0;
    for (const target of SEED_LESSONS) {
      const pcs = parseChord(target).pcs;
      const notes = voicing(pcs, 4, 0);
      for (let seed = 1; seed <= 3; seed++) {
        total++;
        if (matchLast(chromaOf(notes, seed * 17, 48000, { prev: notes.map((n) => n + 2) })!, target).passes) ok++;
      }
    }
    expect(ok / total).toBeGreaterThanOrEqual(0.85);
  });

  it('rejects a triad with an added note (7th, maj7, fat-fingered neighbour key)', () => {
    const cases: Array<[notes: number[], target: string]> = [
      [[60, 64, 67, 70], 'C'], // C7
      [[60, 64, 67, 71], 'C'], // Cmaj7
      [[57, 60, 64, 67], 'C'], // Am7 (contains C major)
      [[55, 59, 62, 65], 'G'], // G7
      [[53, 57, 60, 64], 'F'], // Fmaj7
      [[60, 62, 64, 67], 'C'], // C + D (neighbour key)
      [[57, 60, 62, 64], 'Am'], // Am + D
    ];
    let accepted = 0;
    let total = 0;
    for (const [notes, target] of cases) {
      for (let seed = 1; seed <= 3; seed++) {
        total++;
        if (matcher.match(chromaOf(notes, seed * 23)!, target).passes) accepted++;
      }
    }
    expect(accepted / total).toBeLessThanOrEqual(0.1);
  });

  it('never accepts silence', () => {
    expect(matcher.match(new Float32Array(12), 'C').passes).toBe(false);
  });

  it('reports the closest rival and weakest tone for cue text', () => {
    const ch = chromaOf([60, 63, 67], 3)!; // C minor played, C major expected
    const m = matcher.match(ch, 'C');
    expect(m.passes).toBe(false);
    expect(m.closest.label).toBe('Cm');
  });

  it('matches in well under 50 µs', () => {
    const ch = chromaOf([60, 64, 67], 1)!;
    for (let i = 0; i < 200; i++) matcher.match(ch, 'C');
    const t0 = performance.now();
    const n = 5000;
    for (let i = 0; i < n; i++) matcher.match(ch, 'C');
    const us = ((performance.now() - t0) / n) * 1000;
    console.log(`    match cost: ${us.toFixed(1)} µs (84-chord vocabulary)`);
    expect(us).toBeLessThan(50);
  });
});
