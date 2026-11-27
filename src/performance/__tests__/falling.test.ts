import { describe, expect, it } from 'vitest';
import { isBlack, keyboardLayout, keyboardRange, targetKeys } from '../falling';

describe('falling-notes geometry', () => {
  it('voices chords in root position around middle C', () => {
    expect(targetKeys({ kind: 'note', note: 65 })).toEqual([65]);
    expect(targetKeys({ kind: 'chord', chord: 'C' })).toEqual([60, 64, 67]);
    expect(targetKeys({ kind: 'chord', chord: 'Am' })).toEqual([57, 60, 64]);
    expect(targetKeys({ kind: 'chord', chord: 'G7' })).toEqual([55, 59, 62, 65]);
    expect(targetKeys({ kind: 'chord', chord: 'F#m' })).toEqual([66, 69, 73]);
  });

  it('draws whole octaves around the keys used, at least two', () => {
    expect(keyboardRange([60, 69])).toEqual({ lo: 60, hi: 83 });
    expect(keyboardRange([55, 72])).toEqual({ lo: 48, hi: 83 });
  });

  it('lays out 14 white and 10 black keys for two octaves, black keys between whites', () => {
    const keys = keyboardLayout(60, 83, 700);
    const whites = keys.filter((k) => !k.black);
    const blacks = keys.filter((k) => k.black);
    expect(whites).toHaveLength(14);
    expect(blacks).toHaveLength(10);
    expect(whites[0]).toEqual({ midi: 60, x: 0, w: 50, black: false });
    const cs = blacks.find((k) => k.midi === 61)!;
    expect(cs.x + cs.w / 2).toBeCloseTo(50); // between C and D
    expect(isBlack(61) && !isBlack(64)).toBe(true);
  });
});
