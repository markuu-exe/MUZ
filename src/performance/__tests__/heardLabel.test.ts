import { describe, expect, it } from 'vitest';
import { midiToFreq } from '../../audio/dsp/pitch';
import { describeHeard } from '../heardLabel';

const tone = (midi: number, clarity = 0.95) => ({ voiced: true, pitchHz: midiToFreq(midi), clarity, chroma: new Float64Array(12) });

describe('describeHeard (In time "you played X")', () => {
  it('names the most frequent confident note near the target', () => {
    expect(describeHeard([tone(64), tone(64), tone(65), tone(64)], { kind: 'note', note: 65 })).toBe('E4');
  });

  it('says nothing for unclear or far-off readings (subharmonics, noise)', () => {
    expect(describeHeard([tone(64, 0.5), tone(64, 0.6)], { kind: 'note', note: 65 })).toBeNull();
    expect(describeHeard([tone(30), tone(30)], { kind: 'note', note: 65 })).toBeNull();
    expect(describeHeard([], { kind: 'note', note: 65 })).toBeNull();
  });

  it('names the closest chord for a chord target', () => {
    const chroma = new Float64Array(12);
    for (const pc of [2, 5, 9]) chroma[pc] = 1; // D F A
    expect(describeHeard([{ voiced: true, chroma }, { voiced: true, chroma }], { kind: 'chord', chord: 'C' })).toMatch(/^D ?m/);
  });
});
