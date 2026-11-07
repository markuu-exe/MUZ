/**
 * KAN-254 — Per-frame joint-angle metrics from 3D world landmarks.
 * Pure and allocation-free after construction: one PostureMetricsComputer per pipeline.
 * All outputs are degrees; NaN means "not measurable this frame".
 */
import { ARM, LM, readWorld, type GateConfig, type PoseFrame, type Side } from './landmarks';
import {
  copy,
  cross,
  dot,
  elevationDeg,
  jointAngleDeg,
  midpoint,
  normalize,
  planarLeanDeg,
  rejectFrom,
  signedAngleAboutAxisDeg,
  sub,
  vec3,
  type Vec3,
} from './math/vec3';
import type { HandPoint } from './types';

export interface RawArmMetrics {
  elbowDeg: number;
  wristDeg: number;
  wristFlexDeg: number;
  forearmPitchDeg: number;
  confidence: number;
}

export interface RawTrunkMetrics {
  flexionDeg: number;
  headForwardDeg: number;
  lateralLeanDeg: number;
}

export interface RawPostureMetrics {
  timestampMs: number;
  hasPose: boolean;
  bodyFrameValid: boolean;
  arms: Record<Side, RawArmMetrics>;
  trunk: RawTrunkMetrics;
}

function emptyArm(): RawArmMetrics {
  return { elbowDeg: NaN, wristDeg: NaN, wristFlexDeg: NaN, forearmPitchDeg: NaN, confidence: 0 };
}

export function createRawMetrics(): RawPostureMetrics {
  return {
    timestampMs: 0,
    hasPose: false,
    bodyFrameValid: false,
    arms: { left: emptyArm(), right: emptyArm() },
    trunk: { flexionDeg: NaN, headForwardDeg: NaN, lateralLeanDeg: NaN },
  };
}

export class PostureMetricsComputer {
  // Landmark scratch
  private readonly lShoulder = vec3();
  private readonly rShoulder = vec3();
  private readonly lHip = vec3();
  private readonly rHip = vec3();
  private readonly lEar = vec3();
  private readonly rEar = vec3();
  private readonly nose = vec3();
  private readonly shoulder = vec3();
  private readonly elbow = vec3();
  private readonly wrist = vec3();
  private readonly hand = vec3();
  private readonly pinky = vec3();
  // Derived scratch
  private readonly shoulderMid = vec3();
  private readonly hipMid = vec3();
  private readonly earMid = vec3();
  private readonly tmp = vec3();
  private readonly tmp2 = vec3();
  private readonly forearm = vec3();
  private readonly handVec = vec3();
  private readonly flexAxis = vec3();
  // Body frame (unit vectors)
  private readonly up = vec3();
  private readonly lateral = vec3();
  private readonly forward = vec3();

  constructor(
    private gate: GateConfig,
    up: Vec3,
    private handPoint: HandPoint,
  ) {
    copy(this.up, up);
  }

  compute(frame: PoseFrame, out: RawPostureMetrics): RawPostureMetrics {
    out.timestampMs = frame.timestampMs;
    out.hasPose = frame.hasPose;
    out.bodyFrameValid = this.computeBodyFrame(frame);
    this.computeArm(frame, 'left', out.arms.left);
    this.computeArm(frame, 'right', out.arms.right);
    this.computeTrunk(frame, out.trunk);
    return out;
  }

  /**
   * Builds lateral (subject left → right) and forward axes perpendicular to `up`.
   * Lateral comes from the shoulders, else the hips. forward = up × lateral, then its sign is
   * confirmed against the nose (always anterior to the shoulders), which makes the frame
   * immune to axis-handedness assumptions.
   */
  private computeBodyFrame(frame: PoseFrame): boolean {
    const g = this.gate;
    const haveShoulders = readWorld(frame, LM.LEFT_SHOULDER, g, this.lShoulder) && readWorld(frame, LM.RIGHT_SHOULDER, g, this.rShoulder);
    const haveHips = readWorld(frame, LM.LEFT_HIP, g, this.lHip) && readWorld(frame, LM.RIGHT_HIP, g, this.rHip);

    if (haveShoulders) sub(this.tmp, this.rShoulder, this.lShoulder);
    else if (haveHips) sub(this.tmp, this.rHip, this.lHip);
    else return this.invalidateFrame();

    rejectFrom(this.tmp, this.tmp, this.up);
    if (Number.isNaN(normalize(this.lateral, this.tmp, 0.02))) return this.invalidateFrame();
    cross(this.forward, this.up, this.lateral);
    normalize(this.forward, this.forward);

    if (readWorld(frame, LM.NOSE, g, this.nose)) {
      const ref = haveShoulders ? midpoint(this.tmp2, this.lShoulder, this.rShoulder) : midpoint(this.tmp2, this.lHip, this.rHip);
      sub(this.tmp, this.nose, ref);
      if (dot(this.tmp, this.forward) < 0) {
        this.forward.x = -this.forward.x;
        this.forward.y = -this.forward.y;
        this.forward.z = -this.forward.z;
      }
    }
    return true;
  }

  private invalidateFrame(): false {
    this.lateral.x = this.lateral.y = this.lateral.z = NaN;
    this.forward.x = this.forward.y = this.forward.z = NaN;
    return false;
  }

  private computeArm(frame: PoseFrame, side: Side, out: RawArmMetrics): void {
    const idx = ARM[side];
    const g = this.gate;
    const hasShoulder = readWorld(frame, idx.shoulder, g, this.shoulder);
    const hasElbow = readWorld(frame, idx.elbow, g, this.elbow);
    const hasWrist = readWorld(frame, idx.wrist, g, this.wrist);
    let hasHand = readWorld(frame, idx.index, g, this.hand);
    if (this.handPoint === 'knuckleMid') {
      const hasPinky = readWorld(frame, idx.pinky, g, this.pinky);
      if (hasHand && hasPinky) midpoint(this.hand, this.hand, this.pinky);
      else hasHand = false;
    }

    const v = frame.visibility;
    out.confidence = frame.hasPose ? Math.min(v[idx.shoulder], v[idx.elbow], v[idx.wrist], v[idx.index]) : 0;

    // SRS 3.1.5.2 chains
    out.elbowDeg = hasShoulder && hasElbow && hasWrist ? jointAngleDeg(this.shoulder, this.elbow, this.wrist) : NaN;
    out.wristDeg = hasElbow && hasWrist && hasHand ? jointAngleDeg(this.elbow, this.wrist, this.hand) : NaN;

    // Forearm slope vs horizontal (+ = wrist above elbow)
    if (hasElbow && hasWrist) {
      sub(this.forearm, this.wrist, this.elbow);
      out.forearmPitchDeg = elevationDeg(this.forearm, this.up);
    } else {
      out.forearmPitchDeg = NaN;
    }

    // Signed wrist flex in the vertical plane through the forearm:
    // axis = forearm × up (horizontal, perpendicular to the forearm). + = hand rotated toward up.
    out.wristFlexDeg = NaN;
    if (hasElbow && hasWrist && hasHand) {
      cross(this.flexAxis, this.forearm, this.up);
      if (!Number.isNaN(normalize(this.flexAxis, this.flexAxis, 1e-3))) {
        sub(this.handVec, this.hand, this.wrist);
        out.wristFlexDeg = signedAngleAboutAxisDeg(this.forearm, this.handVec, this.flexAxis);
      }
    }
  }

  private computeTrunk(frame: PoseFrame, out: RawTrunkMetrics): void {
    out.flexionDeg = NaN;
    out.headForwardDeg = NaN;
    out.lateralLeanDeg = NaN;
    if (!Number.isFinite(this.forward.x)) return;

    const top = this.averageOf(frame, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, this.lShoulder, this.rShoulder, this.shoulderMid);
    const bottom = this.averageOf(frame, LM.LEFT_HIP, LM.RIGHT_HIP, this.lHip, this.rHip, this.hipMid);

    if (top && bottom) {
      sub(this.tmp, this.shoulderMid, this.hipMid);
      // Projection onto (up, forward) drops any lateral offset, so a single visible hip/shoulder still works.
      out.flexionDeg = planarLeanDeg(this.tmp, this.up, this.forward, 0.1);
      out.lateralLeanDeg = planarLeanDeg(this.tmp, this.up, this.lateral, 0.1);
    }

    if (top) {
      const hasEar = this.averageOf(frame, LM.LEFT_EAR, LM.RIGHT_EAR, this.lEar, this.rEar, this.earMid);
      if (hasEar) {
        sub(this.tmp, this.earMid, this.shoulderMid);
        out.headForwardDeg = planarLeanDeg(this.tmp, this.up, this.forward, 0.05);
      }
    }
  }

  /** Midpoint of two landmarks, or the single usable one. Lateral offset is irrelevant to sagittal metrics. */
  private averageOf(frame: PoseFrame, a: number, b: number, sa: Vec3, sb: Vec3, out: Vec3): boolean {
    const ha = readWorld(frame, a, this.gate, sa);
    const hb = readWorld(frame, b, this.gate, sb);
    if (ha && hb) midpoint(out, sa, sb);
    else if (ha) copy(out, sa);
    else if (hb) copy(out, sb);
    else return false;
    return true;
  }
}
