import { describe, expect, it } from 'vitest';
import { SILENT_BARS, nextBars } from '../hearingBars';

describe('"What MUZ hears" bars', () => {
  it('a pure C with overtone leakage into G: cleaned G is lower than raw G', () => {
    const chroma = new Float64Array(12);
    chroma[0] = 1;
    chroma[7] = 0.4; // 3rd-harmonic leakage of C
    let b = SILENT_BARS;
    for (let i = 0; i < 30; i++) b = nextBars(b, { voiced: true, chroma });
    expect(b.clean[0]).toBeGreaterThan(0.9);
    expect(b.clean[7]).toBeLessThan(b.raw[7]);
  });

  it('silence fades the bars out', () => {
    const chroma = new Float64Array(12).fill(0);
    chroma[4] = 1;
    let b = SILENT_BARS;
    for (let i = 0; i < 20; i++) b = nextBars(b, { voiced: true, chroma });
    for (let i = 0; i < 30; i++) b = nextBars(b, { voiced: false, chroma });
    expect(Math.max(...b.raw, ...b.clean)).toBeLessThan(0.01);
  });
});
