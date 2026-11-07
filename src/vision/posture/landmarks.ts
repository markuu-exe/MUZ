/**
 * KAN-255 — Extraction and gating of MediaPipe Pose landmarks for piano posture.
 *
 * Coordinate spaces (MediaPipe PoseLandmarker):
 * - `worldLandmarks`: metres, origin at the hip midpoint, axes follow the camera
 *   (x → image right, y → image down, z → depth; smaller z = closer to the camera).
 *   All angle maths uses this space (SRS 3.1.5.2).
 * - `landmarks`: normalised image coordinates [0, 1]. Used only for gating (in-frame check)
 *   and for drawing the 2D HUD.
 *
 * "left"/"right" are the subject's own left/right. Never feed a mirrored frame to the model:
 * mirror the <video> for display with CSS only.
 */
import type { Vec3 } from './math/vec3';

export const LM = {
  NOSE: 0,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  /** MediaPipe "left_index" — used as the index-finger root (SDD C-05 point D). */
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
} as const;

export const POSE_LANDMARK_COUNT = 33;

/** Landmarks the posture pipeline reads. Everything else is ignored (and not smoothed). */
export const TRACKED_LANDMARKS: readonly number[] = [
  LM.NOSE,
  LM.LEFT_EAR,
  LM.RIGHT_EAR,
  LM.LEFT_SHOULDER,
  LM.RIGHT_SHOULDER,
  LM.LEFT_ELBOW,
  LM.RIGHT_ELBOW,
  LM.LEFT_WRIST,
  LM.RIGHT_WRIST,
  LM.LEFT_PINKY,
  LM.RIGHT_PINKY,
  LM.LEFT_INDEX,
  LM.RIGHT_INDEX,
  LM.LEFT_HIP,
  LM.RIGHT_HIP,
];

export type Side = 'left' | 'right';

export interface ArmIndices {
  shoulder: number;
  elbow: number;
  wrist: number;
  index: number;
  pinky: number;
}

export const ARM: Record<Side, ArmIndices> = {
  left: {
    shoulder: LM.LEFT_SHOULDER,
    elbow: LM.LEFT_ELBOW,
    wrist: LM.LEFT_WRIST,
    index: LM.LEFT_INDEX,
    pinky: LM.LEFT_PINKY,
  },
  right: {
    shoulder: LM.RIGHT_SHOULDER,
    elbow: LM.RIGHT_ELBOW,
    wrist: LM.RIGHT_WRIST,
    index: LM.RIGHT_INDEX,
    pinky: LM.RIGHT_PINKY,
  },
};

/**
 * One inference result in flat typed arrays (no per-landmark objects).
 * Structured-clone friendly, so it can cross the worker boundary unchanged.
 * Absent values are NaN (coordinates) or 0 (visibility) — never 0,0,0 coordinates,
 * because (0,0,0) in world space is the hip midpoint, a real location.
 */
export interface PoseFrame {
  timestampMs: number;
  hasPose: boolean;
  /** x,y,z per landmark, metres. Length 33 * 3. */
  world: Float64Array;
  /** x,y,z per landmark, normalised image coords. Length 33 * 3. */
  image: Float64Array;
  /** Per-landmark visibility in [0, 1]. Length 33. */
  visibility: Float64Array;
}

export interface LandmarkLike {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

/** Structural subset of `PoseLandmarkerResult` — keeps this module free of the MediaPipe import. */
export interface PoseResultLike {
  landmarks?: LandmarkLike[][];
  worldLandmarks?: LandmarkLike[][];
}

export function createPoseFrame(): PoseFrame {
  const frame: PoseFrame = {
    timestampMs: 0,
    hasPose: false,
    world: new Float64Array(POSE_LANDMARK_COUNT * 3),
    image: new Float64Array(POSE_LANDMARK_COUNT * 3),
    visibility: new Float64Array(POSE_LANDMARK_COUNT),
  };
  clearPoseFrame(frame);
  return frame;
}

export function clearPoseFrame(frame: PoseFrame): void {
  frame.hasPose = false;
  frame.world.fill(NaN);
  frame.image.fill(NaN);
  frame.visibility.fill(0);
}

/**
 * Copies the first detected pose out of a PoseLandmarkerResult.
 * Visibility comes from the normalised landmark (always populated by MediaPipe),
 * falling back to the world landmark's.
 */
export function extractPoseFrame(result: PoseResultLike | null | undefined, timestampMs: number, out = createPoseFrame()): PoseFrame {
  clearPoseFrame(out);
  out.timestampMs = timestampMs;

  const world = result?.worldLandmarks?.[0];
  const image = result?.landmarks?.[0];
  if (!world || world.length < POSE_LANDMARK_COUNT) return out;

  out.hasPose = true;
  for (let i = 0; i < POSE_LANDMARK_COUNT; i++) {
    const w = world[i];
    const im = image?.[i];
    const o = i * 3;
    if (w) {
      out.world[o] = w.x;
      out.world[o + 1] = w.y;
      out.world[o + 2] = w.z;
    }
    if (im) {
      out.image[o] = im.x;
      out.image[o + 1] = im.y;
      out.image[o + 2] = im.z;
    }
    const vis = im?.visibility ?? w?.visibility;
    out.visibility[i] = typeof vis === 'number' && Number.isFinite(vis) ? vis : 0;
  }
  return out;
}

export interface GateConfig {
  /** Minimum MediaPipe visibility to trust a landmark. */
  minVisibility: number;
  /**
   * How far outside the [0,1] image rectangle a landmark may sit and still count.
   * MediaPipe extrapolates off-screen joints; those positions are guesses.
   */
  inFrameMargin: number;
}

export const DEFAULT_GATE: GateConfig = {
  minVisibility: 0.5,
  inFrameMargin: 0.02,
};

/** True when landmark `i` is present, visible enough, and inside the camera frame. */
export function isUsable(frame: PoseFrame, i: number, gate: GateConfig): boolean {
  if (!frame.hasPose) return false;
  if (!(frame.visibility[i] >= gate.minVisibility)) return false;
  const o = i * 3;
  const wx = frame.world[o];
  const wy = frame.world[o + 1];
  const wz = frame.world[o + 2];
  if (!Number.isFinite(wx) || !Number.isFinite(wy) || !Number.isFinite(wz)) return false;
  const ix = frame.image[o];
  const iy = frame.image[o + 1];
  // No image coords → cannot check framing; trust visibility alone.
  if (!Number.isFinite(ix) || !Number.isFinite(iy)) return true;
  const lo = -gate.inFrameMargin;
  const hi = 1 + gate.inFrameMargin;
  return ix >= lo && ix <= hi && iy >= lo && iy <= hi;
}

/** Reads world landmark `i` into `out`. Returns false (and writes NaN) if not usable. */
export function readWorld(frame: PoseFrame, i: number, gate: GateConfig, out: Vec3): boolean {
  if (!isUsable(frame, i, gate)) {
    out.x = NaN;
    out.y = NaN;
    out.z = NaN;
    return false;
  }
  const o = i * 3;
  out.x = frame.world[o];
  out.y = frame.world[o + 1];
  out.z = frame.world[o + 2];
  return true;
}
