import { describe, expect, it } from 'vitest';
import type { ChordMatch } from '../../audio/chords/ChordMatcher';
import { chordCheckReasons } from '../chordReport';

function match(over: Partial<ChordMatch> = {}): ChordMatch {
  return {
    similarity: 0.9,
    toneCoverage: 0.6,
    fullChordMargin: 0.2,
    extraTone: 0.1,
    partialMargin: 0.1,
    closest: { label: 'A minor', similarity: 0.6 },
    weakestTone: 2,
    ...over,
  } as ChordMatch;
}

const C_MAJOR = [0, 4, 7];

describe('chordCheckReasons', () => {
  it('reports nothing when every check passes', () => {
    expect(chordCheckReasons({ detail: match(), passRatio: 1 }, C_MAJOR)).toEqual([]);
  });

  it('names the quiet chord tone', () => {
    const r = chordCheckReasons({ detail: match({ toneCoverage: 0.18 }), passRatio: 1 }, C_MAJOR);
    expect(r[0]).toMatch(/^G was too quiet \(18%/);
  });

  it('flags an extra ringing note, a low match, a closer chord and a short hold', () => {
    const r = chordCheckReasons(
      { detail: match({ extraTone: 0.41, similarity: 0.65, fullChordMargin: 0, closest: { label: 'E minor', similarity: 0.7 } }), passRatio: 0.4 },
      C_MAJOR,
    );
    expect(r.join(' ')).toMatch(/extra note was ringing \(41%/);
    expect(r.join(' ')).toMatch(/Overall match 0.65/);
    expect(r.join(' ')).toMatch(/closer to E minor/);
    expect(r.join(' ')).toMatch(/held for 40%/);
  });

  it('asks for a clearer chord when no detail was recorded', () => {
    expect(chordCheckReasons({ detail: null, passRatio: 0 }, C_MAJOR)[0]).toMatch(/No clear chord/);
  });
});
