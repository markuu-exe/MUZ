import { describe, expect, it } from 'vitest';
import { classifyDelta, summarize, type JudgedTap } from '../timing';

describe('rhythm timing', () => {
  it('classifies the perfect and good boundaries exactly', () => {
    expect(classifyDelta(25)).toBe('Perfect');
    expect(classifyDelta(25.01)).toBe('Good');
    expect(classifyDelta(50)).toBe('Good');
    expect(classifyDelta(50.01)).toBe('Miss');
  });

  it('classifies negative deltas by absolute timing error', () => {
    expect(classifyDelta(-25)).toBe('Perfect');
    expect(classifyDelta(-50.01)).toBe('Miss');
  });

  it('counts omitted beats as misses', () => {
    expect(summarize([], 4).miss).toBe(4);
  });

  it('counts omitted beats in consistency', () => {
    const tap: JudgedTap = { rating: 'Perfect', deltaMs: 0, beatIndex: 0 };
    expect(summarize([tap], 10).consistency).toBe(10);
  });

  it('gives four exact hits consistency 100', () => {
    const taps: JudgedTap[] = [0, 1, 2, 3].map((beatIndex) => ({
      rating: 'Perfect',
      deltaMs: 0,
      beatIndex,
    }));
    expect(summarize(taps, 4).consistency).toBe(100);
  });

  it('scores two taps at 25 ms as consistency 50', () => {
    const taps: JudgedTap[] = [0, 1].map((beatIndex) => ({
      rating: 'Good',
      deltaMs: 25,
      beatIndex,
    }));
    expect(summarize(taps, 2).consistency).toBe(50);
  });
});
