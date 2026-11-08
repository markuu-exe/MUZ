import { describe, expect, it } from 'vitest';
import { DEFAULT_POSTURE_CONFIG } from '../config';
import { LM, extractPoseFrame } from '../landmarks';
import { createRawMetrics, PostureMetricsComputer } from '../metrics';
import { makeSkeleton, occlude } from './fixtures';

const cfg = DEFAULT_POSTURE_CONFIG;
const computer = () => new PostureMetricsComputer(cfg.gate, cfg.up, 'index');

describe('extractPoseFrame (KAN-255)', () => {
  it('marks absent poses and never invents zero coordinates', () => {
    const f = extractPoseFrame({ landmarks: [], worldLandmarks: [] }, 10);
    expect(f.hasPose).toBe(false);
    expect(f.world[LM.LEFT_WRIST * 3]).toBeNaN();
    expect(f.visibility[LM.LEFT_WRIST]).toBe(0);
  });

  it('copies world coords and takes visibility from the image landmarks', () => {
    const world = Array.from({ length: 33 }, (_, i) => ({ x: i, y: -i, z: i / 10 }));
    const image = Array.from({ length: 33 }, (_, i) => ({ x: 0.5, y: 0.5, z: 0, visibility: i === 19 ? 0.9 : 0.4 }));
    const f = extractPoseFrame({ worldLandmarks: [world], landmarks: [image] }, 5);
    expect(f.hasPose).toBe(true);
    expect(f.world[19 * 3]).toBe(19);
    expect(f.visibility[LM.LEFT_INDEX]).toBe(0.9);
    expect(f.visibility[LM.LEFT_PINKY]).toBe(0.4);
  });
});

describe('PostureMetricsComputer (KAN-254)', () => {
  const cases = [
    { elbowDeg: 95, forearmPitchDeg: 0, wristFlexDeg: 0 },
    { elbowDeg: 70, forearmPitchDeg: 10, wristFlexDeg: -25 },
    { elbowDeg: 125, forearmPitchDeg: -12, wristFlexDeg: 20 },
    { elbowDeg: 160, forearmPitchDeg: 5, wristFlexDeg: -40 },
  ];

  it('recovers exact joint angles under any camera yaw/pitch (rotation invariance)', () => {
    const c = computer();
    const out = createRawMetrics();
    for (const spec of cases) {
      for (const yawDeg of [-60, -30, 0, 45]) {
        for (const pitchDeg of [-15, 0, 12]) {
          c.compute(makeSkeleton({ ...spec, yawDeg, pitchDeg }), out);
          for (const side of ['left', 'right'] as const) {
            expect(out.arms[side].elbowDeg).toBeCloseTo(spec.elbowDeg, 6);
            expect(out.arms[side].wristDeg).toBeCloseTo(180 - Math.abs(spec.wristFlexDeg), 6);
          }
        }
      }
    }
  });

  it('signs wrist flex (+ raised, − droop) and measures forearm pitch with a level camera', () => {
    const c = computer();
    const out = createRawMetrics();
    for (const spec of cases) {
      for (const yawDeg of [-50, 0, 40]) {
        c.compute(makeSkeleton({ ...spec, yawDeg }), out);
        expect(out.arms.right.wristFlexDeg).toBeCloseTo(spec.wristFlexDeg, 6);
        expect(out.arms.left.forearmPitchDeg).toBeCloseTo(spec.forearmPitchDeg, 6);
      }
    }
  });

  it('measures trunk lean and head-forward in the sagittal plane, independent of yaw', () => {
    const c = computer();
    const out = createRawMetrics();
    for (const yawDeg of [-45, 0, 45]) {
      c.compute(makeSkeleton({ trunkFlexDeg: 25, headForwardDeg: 30, yawDeg }), out);
      expect(out.bodyFrameValid).toBe(true);
      expect(out.trunk.flexionDeg).toBeCloseTo(25, 6);
      expect(out.trunk.headForwardDeg).toBeCloseTo(30, 6);
      expect(out.trunk.lateralLeanDeg).toBeCloseTo(0, 6);
    }
    c.compute(makeSkeleton({ trunkFlexDeg: -10 }), out);
    expect(out.trunk.flexionDeg).toBeCloseTo(-10, 6);
  });

  it('a pitched camera biases trunk lean by exactly the pitch (what calibration removes)', () => {
    const c = computer();
    const out = createRawMetrics();
    c.compute(makeSkeleton({ trunkFlexDeg: 10, pitchDeg: 8 }), out);
    expect(Math.abs(out.trunk.flexionDeg - 10)).toBeCloseTo(8, 6);
  });

  it('gates occluded landmarks to NaN — no fallback values', () => {
    const c = computer();
    const out = createRawMetrics();
    c.compute(occlude(makeSkeleton(), LM.LEFT_WRIST), out);
    expect(out.arms.left.elbowDeg).toBeNaN();
    expect(out.arms.left.wristDeg).toBeNaN();
    expect(out.arms.left.forearmPitchDeg).toBeNaN();
    expect(out.arms.right.elbowDeg).toBeCloseTo(95, 6);
  });

  it('rejects landmarks outside the camera frame', () => {
    const c = computer();
    const out = createRawMetrics();
    const f = makeSkeleton();
    f.image[LM.RIGHT_WRIST * 3] = 1.2; // extrapolated off-screen
    c.compute(f, out);
    expect(out.arms.right.elbowDeg).toBeNaN();
  });

  it('keeps trunk metrics when one hip is hidden (e.g. behind the piano)', () => {
    const c = computer();
    const out = createRawMetrics();
    const f = makeSkeleton({ trunkFlexDeg: 18, yawDeg: 45 });
    occlude(f, LM.RIGHT_HIP);
    c.compute(f, out);
    expect(out.trunk.flexionDeg).toBeCloseTo(18, 6);
  });

  it('reports unknown trunk when no left-right pair exists to define the body axis', () => {
    const c = computer();
    const out = createRawMetrics();
    const f = makeSkeleton({ trunkFlexDeg: 18 });
    occlude(f, LM.LEFT_SHOULDER);
    occlude(f, LM.RIGHT_HIP);
    c.compute(f, out);
    expect(out.bodyFrameValid).toBe(false);
    expect(out.trunk.flexionDeg).toBeNaN();
    expect(out.arms.right.elbowDeg).toBeCloseTo(95, 6); // arms unaffected
  });
});
