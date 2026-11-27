import { describe, expect, it } from 'vitest';
import { CALIBRATION_COUNT_IN, MAX_LATENCY_MS, calibrationCue, calibrationSchedule, estimateLatencyMs, measuredTaps } from '../calibration';

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

describe('tap-test count-in (owner feedback 2026-11-27)', () => {
  const s = calibrationSchedule(1, 0.6, 8);

  it('puts four count-in clicks before the eight measured clicks, on the same grid', () => {
    expect(s.countIn).toHaveLength(CALIBRATION_COUNT_IN);
    expect(s.countIn[0]).toBeCloseTo(1);
    expect(s.countIn[3]).toBeCloseTo(2.8);
    expect(s.measured).toHaveLength(8);
    expect(s.measured[0]).toBeCloseTo(3.4);
    expect(s.measured[7]).toBeCloseTo(7.6);
  });

  it('ignores taps made along with the count-in, even late ones', () => {
    const countInTaps = s.countIn.map((c) => c + 0.05);
    const lateLastCountIn = s.countIn[3] + 0.29; // 310 ms before the first measured click
    const real = s.measured.map((c) => c + 0.06);
    const kept = measuredTaps([...countInTaps, lateLastCountIn, ...real], s, 0.6);
    expect(kept).toEqual(real);
    expect(estimateLatencyMs(kept, s.measured)).toBe(60);
  });

  it('keeps an early first measured tap (within half a gap)', () => {
    const early = s.measured[0] - 0.2;
    expect(measuredTaps([early], s, 0.6)).toEqual([early]);
  });

  it('counts the beats down on the audio clock, then says tap', () => {
    expect(calibrationCue(0.5, s)).toEqual({ kind: 'wait' });
    expect(calibrationCue(1.0, s)).toEqual({ kind: 'count', beat: 1, of: 4 });
    expect(calibrationCue(1.59, s)).toEqual({ kind: 'count', beat: 1, of: 4 });
    expect(calibrationCue(1.6, s)).toEqual({ kind: 'count', beat: 2, of: 4 });
    expect(calibrationCue(2.85, s)).toEqual({ kind: 'count', beat: 4, of: 4 });
    expect(calibrationCue(3.4, s)).toEqual({ kind: 'tap' });
    expect(calibrationCue(9, s)).toEqual({ kind: 'tap' });
  });
});
