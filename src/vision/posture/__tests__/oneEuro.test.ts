import { describe, expect, it } from 'vitest';
import { OneEuroFilter } from '../filters/OneEuroFilter';
import { PostureAnalyzer } from '../PostureAnalyzer';
import { makeSkeleton } from './fixtures';

/** Deterministic pseudo-random noise (mulberry32) so the test is stable. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function std(xs: number[]) {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
}

describe('OneEuroFilter', () => {
  it('passes a constant through unchanged and ignores bad timestamps', () => {
    const f = new OneEuroFilter({ minCutoff: 1, beta: 0, dCutoff: 1 });
    for (let t = 0; t < 1000; t += 33) expect(f.filter(0.42, t)).toBeCloseTo(0.42, 12);
    expect(f.filter(9, 500)).toBeCloseTo(0.42, 12); // out-of-order sample ignored
  });

  it('reduces resting jitter substantially', () => {
    const r = rng(7);
    const f = new OneEuroFilter({ minCutoff: 1.2, beta: 4, dCutoff: 1 });
    const raw: number[] = [];
    const out: number[] = [];
    for (let t = 0; t < 5000; t += 33) {
      const x = 0.3 + (r() - 0.5) * 0.01; // ±5 mm
      raw.push(x);
      out.push(f.filter(x, t));
    }
    expect(std(out.slice(30))).toBeLessThan(std(raw) * 0.5);
  });

  it('follows a fast movement quickly thanks to beta', () => {
    const slow = new OneEuroFilter({ minCutoff: 1.2, beta: 0, dCutoff: 1 });
    const fast = new OneEuroFilter({ minCutoff: 1.2, beta: 4, dCutoff: 1 });
    let ys = 0;
    let yf = 0;
    for (let t = 0; t <= 300; t += 33) {
      const x = t < 100 ? 0 : 0.2; // 20 cm jump
      ys = slow.filter(x, t);
      yf = fast.filter(x, t);
    }
    expect(Math.abs(0.2 - yf)).toBeLessThan(Math.abs(0.2 - ys));
  });
});

describe('PostureAnalyzer with smoothing', () => {
  it('cuts angle jitter on a still pose with landmark noise', () => {
    const r = rng(42);
    const noisy = (smooth: boolean) => {
      const a = new PostureAnalyzer({ smoothing: { enabled: smooth } });
      const elbows: number[] = [];
      for (let t = 0; t < 4000; t += 33) {
        const f = makeSkeleton({ elbowDeg: 95, timestampMs: t });
        for (let i = 0; i < f.world.length; i++) if (Number.isFinite(f.world[i])) f.world[i] += (r() - 0.5) * 0.02;
        const s = a.process(f);
        if (s.arms.left.elbow.value !== null) elbows.push(s.arms.left.elbow.value);
      }
      return std(elbows.slice(30));
    };
    expect(noisy(true)).toBeLessThan(noisy(false) * 0.6);
  });
});
