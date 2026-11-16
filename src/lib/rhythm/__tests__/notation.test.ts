import { describe, expect, it } from 'vitest';
import { parseRhythm, RhythmNotationError } from '../notation';

describe('parseRhythm', () => {
  it('turns quarters into one hit per beat', () => {
    const r = parseRhythm('q q q q');
    expect(r.hits).toEqual([0, 1, 2, 3]);
    expect(r.lengthBeats).toBe(4);
  });

  it('skips rests and ties', () => {
    expect(parseRhythm('q q rq q').hits).toEqual([0, 1, 3]);
    expect(parseRhythm('h ~q q').hits).toEqual([0, 3]);
  });

  it('handles dotted values and bar lines', () => {
    expect(parseRhythm('dq e | q q').hits).toEqual([0, 1.5, 2, 3]);
  });

  it('keeps triplets exact enough to fill a measure', () => {
    const r = parseRhythm('t t t t t t q q');
    expect(r.lengthBeats).toBe(4);
    expect(r.hits[3]).toBe(1);
  });

  it('doubles durations for eighth-note meters', () => {
    const r = parseRhythm('q e q e', 'eighth');
    expect(r.hits).toEqual([0, 2, 3, 5]);
    expect(r.lengthBeats).toBe(6);
  });

  it('rejects unknown tokens and leading ties', () => {
    expect(() => parseRhythm('q x')).toThrow(RhythmNotationError);
    expect(() => parseRhythm('~q q')).toThrow(RhythmNotationError);
  });
});
