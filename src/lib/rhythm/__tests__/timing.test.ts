import { describe, expect, it } from 'vitest';
import { SRS_WINDOWS, captureWindowMs, classifyDelta, meanSignedOffsetMs, summarize, type JudgedTap } from '../timing';

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

  it('returns zero consistency when no beats passed', () => {
    expect(summarize([], 0).consistency).toBe(0);
  });

  it('never reports consistency above 100', () => {
    const taps: JudgedTap[] = [
      { rating: 'Perfect', deltaMs: 0, beatIndex: 0 },
      { rating: 'Perfect', deltaMs: 0, beatIndex: 1 },
    ];
    expect(summarize(taps, 1).consistency).toBe(100);
  });
});

describe('tier windows and near misses (ruling R1)', () => {
  const NOVICE = { perfectMs: 40, goodMs: 90 };

  it('classifies with the tier windows when given', () => {
    expect(classifyDelta(40, NOVICE)).toBe('Perfect');
    expect(classifyDelta(40.01, NOVICE)).toBe('Good');
    expect(classifyDelta(90, NOVICE)).toBe('Good');
    expect(classifyDelta(90.01, NOVICE)).toBe('Miss');
  });

  it('scores consistency against the tier Good window', () => {
    const taps: JudgedTap[] = [{ rating: 'Good', deltaMs: 45, beatIndex: 0 }];
    expect(summarize(taps, 1, NOVICE).consistency).toBe(50);
  });

  it('counts a near-miss tap on a beat as one miss, not as an extra tap plus an omitted beat', () => {
    const taps: JudgedTap[] = [
      { rating: 'Perfect', deltaMs: 0, beatIndex: 0 },
      { rating: 'Miss', deltaMs: 120, beatIndex: 1 },
    ];
    const s = summarize(taps, 2);
    expect(s.miss).toBe(1);
    expect(s.perfect).toBe(1);
  });

  it('captures near misses up to 150 ms, never beyond ~half the gap between beats', () => {
    expect(captureWindowMs([0, 0.5, 1.0], SRS_WINDOWS)).toBe(150);
    expect(captureWindowMs([0, 0.2, 0.4], SRS_WINDOWS)).toBe(90);
    expect(captureWindowMs([0, 0.1], SRS_WINDOWS)).toBe(50); // never below the Good window
  });
});

describe('meanSignedOffsetMs', () => {
  it('averages signed error over taps on a beat and ignores extra taps', () => {
    expect(
      meanSignedOffsetMs([
        { rating: 'Good', deltaMs: 40, beatIndex: 0 },
        { rating: 'Perfect', deltaMs: 20, beatIndex: 1 },
        { rating: 'Miss', deltaMs: -300, beatIndex: null },
      ]),
    ).toBe(30);
    expect(meanSignedOffsetMs([])).toBeNull();
  });
});
