import { describe, expect, it } from 'vitest';
import { MAX_LATENCY_MS, estimateLatencyMs } from '../calibration';

const clicks = Array.from({ length: 8 }, (_, i) => i * 0.6);

describe('estimateLatencyMs', () => {
  it('returns the median click-to-tap delay', () => {
    const taps = clicks.map((c, i) => c + (i === 3 ? 0.2 : 0.08)); // one wobbly tap
    expect(estimateLatencyMs(taps, clicks)).toBe(80);
  });

  it('ignores stray taps far from every click', () => {
    const taps = [...clicks.map((c) => c + 0.05), 0.31, 2.1];
    expect(estimateLatencyMs(taps, clicks)).toBe(50);
  });

  it('needs at least five usable taps', () => {
    expect(estimateLatencyMs(clicks.slice(0, 4).map((c) => c + 0.05), clicks)).toBeNull();
  });

  it('never stores a negative or excessive delay', () => {
    expect(estimateLatencyMs(clicks.map((c) => c - 0.04), clicks)).toBe(0);
    expect(estimateLatencyMs(clicks.map((c) => c + 0.29), clicks)).toBe(MAX_LATENCY_MS);
  });
});
