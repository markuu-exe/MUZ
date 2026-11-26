import { describe, expect, it } from 'vitest';
import { heardFromFrame, heardKeys, heardLabel } from '../heard';

const chroma = (bins: Record<number, number>) => Array.from({ length: 12 }, (_, i) => bins[i] ?? 0);

describe('heardFromFrame', () => {
  it('hears nothing when the frame is not voiced', () => {
    expect(heardFromFrame({ voiced: false, pitchHz: 440, clarity: 0.99, chroma: chroma({ 9: 1 }) })).toEqual({ midi: null, pitchClasses: [] });
  });

  it('names a confident pitch, octave included', () => {
    expect(heardFromFrame({ voiced: true, pitchHz: 220, clarity: 0.95, chroma: chroma({ 9: 1 }) }).midi).toBe(57); // A3
  });

  it('does not name a pitch below the grading clarity floor', () => {
    expect(heardFromFrame({ voiced: true, pitchHz: 440, clarity: 0.84, chroma: chroma({ 9: 1 }) }).midi).toBeNull();
  });

  it('lists the strong pitch classes of a chord, strongest first, ignoring weak bins', () => {
    const h = heardFromFrame({ voiced: true, chroma: chroma({ 0: 1, 4: 0.8, 7: 0.7, 2: 0.2 }) });
    expect(h.pitchClasses).toEqual([0, 4, 7]);
  });
});

describe('heardLabel and heardKeys', () => {
  it('labels notes with octave and chords by pitch class', () => {
    expect(heardLabel({ midi: 60, pitchClasses: [0] }, false)).toBe('C4');
    expect(heardLabel({ midi: null, pitchClasses: [0, 4, 7] }, true)).toBe('C · E · G');
    expect(heardLabel({ midi: null, pitchClasses: [] }, true)).toBeNull();
  });

  it('lights the exact key for notes and every matching key in range for chords', () => {
    expect(heardKeys({ midi: 62, pitchClasses: [2] }, false, 60, 71)).toEqual([62]);
    expect(heardKeys({ midi: 50, pitchClasses: [2] }, false, 60, 71)).toEqual([]);
    expect(heardKeys({ midi: null, pitchClasses: [0, 7] }, true, 48, 71)).toEqual([48, 55, 60, 67]);
  });
});
