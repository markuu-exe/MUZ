import { describe, expect, it } from 'vitest';
import { CueScheduler } from '../cues';
import { LandmarkInterpolator } from '../interpolator';
import { SkeletonRenderer } from '../skeleton';
import { computeViewport } from '../viewport';
import { NullContext } from './contexts';
import { makePoints, makeSnapshot } from './fixtures';

/**
 * JS cost of one HUD frame (sample + animate + schedule + build draw calls), excluding the
 * browser's rasterisation. The Chromium benchmark (bench/) measures the real total.
 */
describe('frame budget (SRS 3.4: 16.6 ms at 60 FPS)', () => {
  it('HUD JS work per frame is far below 1 ms', () => {
    const vp = computeViewport({ cssWidth: 1280, cssHeight: 720, videoWidth: 1280, videoHeight: 720, fit: 'cover', mirrored: true, devicePixelRatio: 2, maxDpr: 2 });
    const lm = new LandmarkInterpolator();
    const sk = new SkeletonRenderer();
    const cues = new CueScheduler();
    const ctx = new NullContext();
    const snaps = [makeSnapshot(), makeSnapshot({ left: { elbow: 'high' }, compliant: false, cues: [{ code: 'ELBOW_TOO_WIDE', side: 'left' }] })];
    const pts = [makePoints(0), makePoints(0.01)];
    const frames = 20000;
    let capture = 0;
    const t0 = performance.now();
    for (let f = 0; f < frames; f++) {
      const now = f * 16.67;
      if (f % 2 === 0) {
        capture = now - 25;
        lm.push(pts[(f >> 1) & 1], snaps[(f >> 6) & 1], capture, now);
      }
      const snap = lm.sample(now - lm.delayMs);
      lm.stepVisibility(16.67);
      sk.update(snap, 16.67);
      cues.update(snap, now);
      sk.draw(ctx, vp, lm, 1, now, false);
    }
    const perFrame = (performance.now() - t0) / frames;
    console.log(`    HUD JS cost: ${(perFrame * 1000).toFixed(1)} µs/frame`);
    expect(perFrame).toBeLessThan(1);
  });
});
