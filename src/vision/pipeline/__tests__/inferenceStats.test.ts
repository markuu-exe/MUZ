import { describe, expect, it } from 'vitest';
import { InferenceStats } from '../inferenceStats';

describe('InferenceStats (T-09 perf overlay)', () => {
  it('reports nothing before the first result', () => {
    expect(new InferenceStats().summary()).toEqual({
      samples: 0,
      inferenceP50: null,
      inferenceP95: null,
      intervalP50: null,
      intervalP95: null,
      hz: null,
    });
  });

  it('gives nearest-rank p50 / p95 of inference time', () => {
    const s = new InferenceStats();
    for (let i = 1; i <= 100; i++) s.record(i, i * 33);
    const r = s.summary();
    expect(r.inferenceP50).toBe(50);
    expect(r.inferenceP95).toBe(95);
  });

  it('measures the interval between results and the rate it implies', () => {
    const s = new InferenceStats();
    for (const t of [0, 33, 66, 100]) s.record(10, t);
    const r = s.summary();
    expect(r.intervalP50).toBe(33);
    expect(r.intervalP95).toBe(34);
    expect(r.hz).toBeCloseTo(1000 / 33, 5);
  });

  it('keeps only the most recent 120 results', () => {
    const s = new InferenceStats();
    for (let i = 1; i <= 200; i++) s.record(i, i * 33);
    const r = s.summary();
    expect(r.samples).toBe(120);
    expect(r.inferenceP50).toBe(140); // window is 81..200
  });
});

describe('isPerfDebug', () => {
  it('turns the overlay on only when the URL has a debug parameter', async () => {
    const { isPerfDebug } = await import('../../../components/lesson/practice/PerfOverlay');
    expect(isPerfDebug('?debug')).toBe(true);
    expect(isPerfDebug('?debug=perf')).toBe(true);
    expect(isPerfDebug('?lesson=1&debug=1')).toBe(true);
    expect(isPerfDebug('')).toBe(false);
    expect(isPerfDebug('?debugger=1')).toBe(false);
  });
});
