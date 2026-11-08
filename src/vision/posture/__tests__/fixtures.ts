/**
 * Synthetic skeleton generator for tests. Builds a seated pianist with exact, known joint
 * angles in body coordinates, then places it in MediaPipe camera space (y down, z = depth,
 * subject facing the camera) and applies an arbitrary camera yaw/pitch.
 */
import { LM, createPoseFrame, type PoseFrame } from '../landmarks';
import type { Vec3 } from '../math/vec3';

export interface SkeletonSpec {
  elbowDeg?: number;
  forearmPitchDeg?: number;
  /** + = hand raised above the forearm line, − = drooping. */
  wristFlexDeg?: number;
  trunkFlexDeg?: number;
  headForwardDeg?: number;
  /** Camera rotation about the vertical axis (degrees). */
  yawDeg?: number;
  /** Camera tilt about the horizontal camera axis (degrees). */
  pitchDeg?: number;
  timestampMs?: number;
}

const D = Math.PI / 180;
// Body basis expressed in MediaPipe camera coordinates (subject facing the camera).
const UP: Vec3 = { x: 0, y: -1, z: 0 };
const FWD: Vec3 = { x: 0, y: 0, z: -1 };
const RIGHT: Vec3 = { x: -1, y: 0, z: 0 }; // subject's right appears on image left

function comb(...terms: Array<[number, Vec3]>): Vec3 {
  const o = { x: 0, y: 0, z: 0 };
  for (const [s, v] of terms) {
    o.x += s * v.x;
    o.y += s * v.y;
    o.z += s * v.z;
  }
  return o;
}

function rotY(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: c * p.x + s * p.z, y: p.y, z: -s * p.x + c * p.z };
}

function rotX(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x, y: c * p.y - s * p.z, z: s * p.y + c * p.z };
}

export function makeSkeleton(spec: SkeletonSpec = {}): PoseFrame {
  const elbow = (spec.elbowDeg ?? 95) * D;
  const pitch = (spec.forearmPitchDeg ?? 0) * D;
  const flex = (spec.wristFlexDeg ?? 0) * D;
  const trunk = (spec.trunkFlexDeg ?? 8) * D;
  const head = (spec.headForwardDeg ?? 10) * D;

  const pts = new Map<number, Vec3>();
  const zero: Vec3 = { x: 0, y: 0, z: 0 };
  pts.set(LM.LEFT_HIP, comb([-0.15, RIGHT]));
  pts.set(LM.RIGHT_HIP, comb([0.15, RIGHT]));

  const trunkDir = comb([Math.cos(trunk), UP], [Math.sin(trunk), FWD]);
  const shoulderMid = comb([0.5, trunkDir]);
  pts.set(LM.LEFT_SHOULDER, comb([1, shoulderMid], [-0.18, RIGHT]));
  pts.set(LM.RIGHT_SHOULDER, comb([1, shoulderMid], [0.18, RIGHT]));

  const neck = comb([Math.cos(head), UP], [Math.sin(head), FWD]);
  const earMid = comb([1, shoulderMid], [0.2, neck]);
  pts.set(LM.LEFT_EAR, comb([1, earMid], [-0.07, RIGHT]));
  pts.set(LM.RIGHT_EAR, comb([1, earMid], [0.07, RIGHT]));
  pts.set(LM.NOSE, comb([1, earMid], [0.1, FWD]));

  // Forearm points toward the keys; n = in-plane perpendicular pointing up.
  const f = comb([Math.cos(pitch), FWD], [Math.sin(pitch), UP]);
  const n = comb([-Math.sin(pitch), FWD], [Math.cos(pitch), UP]);
  const upperArm = comb([Math.cos(elbow), f], [Math.sin(elbow), n]); // elbow → shoulder
  const hand = comb([Math.cos(flex), f], [Math.sin(flex), n]);

  for (const side of ['left', 'right'] as const) {
    const s = side === 'left' ? -1 : 1;
    const shoulder = pts.get(side === 'left' ? LM.LEFT_SHOULDER : LM.RIGHT_SHOULDER) ?? zero;
    const e = comb([1, shoulder], [-0.3, upperArm]);
    const w = comb([1, e], [0.25, f]);
    pts.set(side === 'left' ? LM.LEFT_ELBOW : LM.RIGHT_ELBOW, e);
    pts.set(side === 'left' ? LM.LEFT_WRIST : LM.RIGHT_WRIST, w);
    pts.set(side === 'left' ? LM.LEFT_INDEX : LM.RIGHT_INDEX, comb([1, w], [0.09, hand]));
    pts.set(side === 'left' ? LM.LEFT_PINKY : LM.RIGHT_PINKY, comb([1, w], [0.08, hand], [0.03 * s, RIGHT]));
  }

  const yaw = (spec.yawDeg ?? 0) * D;
  const camPitch = (spec.pitchDeg ?? 0) * D;
  const frame = createPoseFrame();
  frame.timestampMs = spec.timestampMs ?? 0;
  frame.hasPose = true;
  for (const [i, p] of pts) {
    const r = rotX(rotY(p, yaw), camPitch);
    frame.world.set([r.x, r.y, r.z], i * 3);
    frame.image.set([0.5, 0.5, 0], i * 3);
    frame.visibility[i] = 0.99;
  }
  return frame;
}

/** Hide a landmark the way MediaPipe reports an occluded joint. */
export function occlude(frame: PoseFrame, i: number): PoseFrame {
  frame.visibility[i] = 0.1;
  return frame;
}
