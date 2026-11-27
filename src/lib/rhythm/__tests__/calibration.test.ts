import { describe, expect, it } from 'vitest';
import {
  CALIBRATION_BPM,
  CALIBRATION_CLICKS,
  CALIBRATION_COUNT_IN,
  MAX_LATENCY_MS,
  calibrationMarks,
  calibrationPlan,
  calibrationSchedule,
  estimateLatencyMs,
  measuredTaps,
} from '../calibration';

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

describe('tap-test plan (owner feedback 2026-11-27)', () => {
  const plan = calibrationPlan();
  const s = calibrationSchedule(plan, 1);
  const gap = 60 / CALIBRATION_BPM;

  it('is a 4/4 lesson plan: one bar of count-in, then the measured clicks on the same grid', () => {
    expect(plan.beatsPerMeasure).toBe(4);
    expect(s.countIn).toHaveLength(CALIBRATION_COUNT_IN);
    expect(s.countIn[0]).toBeCloseTo(1);
    expect(s.countIn[3]).toBeCloseTo(1 + 3 * gap);
    expect(s.measured).toHaveLength(CALIBRATION_CLICKS);
    expect(s.measured[0]).toBeCloseTo(1 + 4 * gap);
    expect(s.measured[7]).toBeCloseTo(1 + 11 * gap);
  });

  it('ignores taps made along with the count-in, even late ones', () => {
    const countInTaps = s.countIn.map((c) => c + 0.05);
    const lateLastCountIn = s.countIn[3] + gap / 2 - 0.01; // just before half a gap ahead of the first measured click
    const real = s.measured.map((c) => c + 0.06);
    const kept = measuredTaps([...countInTaps, lateLastCountIn, ...real], s, gap);
    expect(kept).toEqual(real);
    expect(estimateLatencyMs(kept, s.measured)).toBe(60);
  });

  it('keeps an early first measured tap (within half a gap)', () => {
    const early = s.measured[0] - gap / 2 + 0.01;
    expect(measuredTaps([early], s, gap)).toEqual([early]);
  });

  it('marks on the highway only the clicks that got a tap', () => {
    const taps = [s.measured[0] + 0.04, s.measured[2] - 0.02, s.measured[7] + 0.5]; // the last one is a stray press after the test
    expect(calibrationMarks(taps, s)).toEqual([
      { rating: 'Perfect', deltaMs: 40, beatIndex: 0 },
      { rating: 'Perfect', deltaMs: -20, beatIndex: 2 },
    ]);
  });
});
