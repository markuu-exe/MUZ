import { describe, expect, it } from 'vitest';
import { rhythmCue } from '../../lib/rhythm/plan';
import { COUNT_IN_BEATS, countInEndSec, countInPlan } from '../useCountIn';

describe('graded-attempt count-in (hands-free start)', () => {
  it('is one bar of 4 count-in clicks at the lesson tempo, then the attempt starts', () => {
    const p = countInPlan(60);
    const countIn = p.clicks.filter((c) => c.countIn);
    expect(countIn).toHaveLength(COUNT_IN_BEATS);
    expect(countIn.map((c) => c.time)).toEqual([0, 1, 2, 3]);
    expect(countIn[0].accent).toBe(true);
    expect(countInEndSec(p)).toBe(4);
  });

  it('scales with tempo (66 BPM lesson default ≈ 3.6 s)', () => {
    expect(countInEndSec(countInPlan(66))).toBeCloseTo((4 * 60) / 66, 5);
    expect(countInEndSec(countInPlan(120))).toBeCloseTo(2, 5);
  });

  it('counts 1-2-3-4 on screen in step with the clicks', () => {
    const p = countInPlan(60);
    const beats = [0, 1.5, 2, 3.99].map((t) => rhythmCue(p, t)).map((c) => (c.kind === 'count' ? c.measureBeat : null));
    expect(beats).toEqual([1, 2, 3, 4]);
    expect(rhythmCue(p, -0.1)).toEqual({ kind: 'wait' });
  });

  it('keeps an absurd tempo usable (clamped to 30–240 BPM)', () => {
    expect(countInEndSec(countInPlan(5))).toBeCloseTo(8, 5);
    expect(countInEndSec(countInPlan(1000))).toBeCloseTo(1, 5);
  });
});
