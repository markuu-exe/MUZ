import { describe, expect, it } from 'vitest';
import { audioTimeAt } from '../audioClock';

describe('audioTimeAt', () => {
  it('maps a key press onto the audible clock with getOutputTimestamp', () => {
    const ctx = { currentTime: 10.2, getOutputTimestamp: () => ({ contextTime: 10, performanceTime: 5000 }) };
    expect(audioTimeAt(ctx, 5100, 5150)).toBeCloseTo(10.1);
  });

  it('does not throw when getOutputTimestamp is missing (Safari) and stays on the same clock', () => {
    const ctx = { currentTime: 10, outputLatency: 0.02 };
    // Event 50 ms ago, 20 ms output latency.
    expect(audioTimeAt(ctx, 4950, 5000)).toBeCloseTo(10 - 0.05 - 0.02);
  });

  it('ignores a zero performanceTime (output not started yet) instead of stamping seconds off', () => {
    const ctx = { currentTime: 3, getOutputTimestamp: () => ({ contextTime: 0, performanceTime: 0 }) };
    const t = audioTimeAt(ctx, 99_990, 100_000);
    expect(t).toBeCloseTo(2.99);
  });

  it('treats a missing or invalid outputLatency as 0', () => {
    expect(audioTimeAt({ currentTime: 1, outputLatency: Number.NaN }, 1000, 1000)).toBeCloseTo(1);
  });
});
