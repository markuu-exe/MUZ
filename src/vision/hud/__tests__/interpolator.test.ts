import { describe, expect, it } from 'vitest';
import { LM } from '../../posture/landmarks';
import { LandmarkInterpolator } from '../interpolator';
import { BASE_POSE, makePoints, makeSnapshot } from './fixtures';

const LW = LM.LEFT_WRIST;
const x0 = BASE_POSE[LW][0];

describe('render-delay interpolation (KAN-258, SRS 3.4)', () => {
  it('lerps between the two samples around renderTime', () => {
    const it2 = new LandmarkInterpolator();
    it2.push(makePoints(0), null, 1000, 1030);
    it2.push(makePoints(0.1), null, 1040, 1070);
    it2.sample(1020);
    expect(it2.x[LW]).toBeCloseTo(x0 + 0.05, 5);
    it2.sample(1030);
    expect(it2.x[LW]).toBeCloseTo(x0 + 0.075, 5);
  });

  it('never extrapolates past the newest sample (holds it)', () => {
    const it2 = new LandmarkInterpolator();
    it2.push(makePoints(0), null, 1000, 1030);
    it2.push(makePoints(0.1), null, 1040, 1070);
    it2.sample(5000);
    expect(it2.x[LW]).toBeCloseTo(x0 + 0.1, 5);
  });

  it('returns the snapshot of the sample nearest renderTime (colours stay in step with the pose)', () => {
    const it2 = new LandmarkInterpolator();
    const a = makeSnapshot({}, 1);
    const b = makeSnapshot({}, 2);
    it2.push(makePoints(0), a, 1000, 1030);
    it2.push(makePoints(0), b, 1040, 1070);
    expect(it2.sample(1010)).toBe(a);
    expect(it2.sample(1030)).toBe(b);
  });

  it('snaps on teleports instead of sweeping across the frame', () => {
    const it2 = new LandmarkInterpolator();
    it2.push(makePoints(0), null, 1000, 1030);
    it2.push(makePoints(0.3), null, 1040, 1070);
    it2.sample(1015);
    expect(it2.x[LW]).toBeCloseTo(x0, 5);
    it2.sample(1025);
    expect(it2.x[LW]).toBeCloseTo(x0 + 0.3, 5);
  });

  it('never lerps from an unusable point: reappearing points snap and fade in', () => {
    const it2 = new LandmarkInterpolator({ visibilityFadeMs: 100 });
    it2.push(makePoints(0, [LW]), null, 1000, 1030);
    it2.push(makePoints(0.1), null, 1040, 1070);
    it2.sample(1030); // nearest = b (usable)
    expect(it2.x[LW]).toBeCloseTo(x0 + 0.1, 5);
    it2.stepVisibility(50);
    expect(it2.alpha[LW]).toBeCloseTo(0.5, 5);
    it2.stepVisibility(60);
    expect(it2.alpha[LW]).toBe(1);
  });

  it('keeps the last position while a dropped point fades out', () => {
    const it2 = new LandmarkInterpolator({ visibilityFadeMs: 100 });
    it2.push(makePoints(0), null, 1000, 1030);
    it2.sample(1000);
    it2.stepVisibility(200);
    it2.push(makePoints(0.05, [LW]), null, 1040, 1070);
    it2.sample(1040);
    expect(it2.x[LW]).toBeCloseTo(x0, 5);
    expect(it2.stepVisibility(40)).toBe(true);
    expect(it2.alpha[LW]).toBeCloseTo(0.6, 5);
  });

  it('adapts the render delay to measured latency + interval', () => {
    const it2 = new LandmarkInterpolator();
    for (let k = 0; k < 200; k++) {
      const capture = 1000 + k * 33.3;
      it2.push(makePoints(0), null, capture, capture + 25);
    }
    expect(it2.intervalMs).toBeCloseTo(33.3, 1);
    expect(it2.latencyMs).toBeCloseTo(25, 1);
    expect(it2.delayMs).toBeCloseTo(33.3 + 25 + 4, 0);
  });

  it('clamps the delay and drops out-of-order samples', () => {
    const it2 = new LandmarkInterpolator({ initialIntervalMs: 500, initialLatencyMs: 500 });
    expect(it2.delayMs).toBe(150);
    expect(it2.push(makePoints(0), null, 1000, 1010)).toBe(true);
    expect(it2.push(makePoints(0), null, 990, 1020)).toBe(false);
    expect(it2.push(makePoints(0), null, 1000, 1020)).toBe(false);
    expect(it2.size).toBe(1);
  });

  it('keeps a bounded ring (oldest evicted)', () => {
    const it2 = new LandmarkInterpolator({ capacity: 4 });
    for (let k = 0; k < 10; k++) it2.push(makePoints(k * 0.01), null, 1000 + k * 40, 1030 + k * 40);
    expect(it2.size).toBe(4);
    it2.sample(0); // before the oldest kept sample (k = 6)
    expect(it2.x[LW]).toBeCloseTo(x0 + 0.06, 5);
  });
});
