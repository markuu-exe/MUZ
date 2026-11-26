import type { GateConfig, Side } from './landmarks';
import type { SmoothingConfig } from './filters/OneEuroFilter';
import type { Vec3 } from './math/vec3';

export type { Side } from './landmarks';

/** Which landmark represents point D ("index finger root") in the wrist chain. */
export type HandPoint = 'index' | 'knuckleMid';

export interface BandThreshold {
  /** Inclusive lower bound of the OK band (degrees). */
  min: number;
  /** Inclusive upper bound of the OK band (degrees). */
  max: number;
}

export interface PostureThresholds {
  /** SRS 3.1.5.4 — 80° ≤ θ_elbow ≤ 110°. */
  elbow: BandThreshold;
  /** SRS 3.1.5.4 as amended by ruling W2: 140° ≤ θ_wrist ≤ 180° (was 150°). */
  wrist: BandThreshold;
  /** Signed wrist flex within ±this is "straight" when choosing droop vs raised wording. */
  wristFlexDeadbandDeg: number;
  /** Forearm slope vs horizontal. Advisory ("arm misalignment"); not in SRS. */
  forearmPitch: BandThreshold;
  /** Sagittal trunk lean (+ = forward). Uncalibrated: absolute. */
  trunkFlexion: BandThreshold;
  /** Sagittal trunk lean change from the calibrated neutral (+ = more forward). */
  trunkFlexionCalibrated: BandThreshold;
  /** Ear-over-shoulder lean (+ = head forward). Uncalibrated: absolute. */
  headForward: BandThreshold;
  headForwardCalibrated: BandThreshold;
  /**
   * Hysteresis on recovery only: entering a violation uses the exact band edge (spec-exact red),
   * returning to OK needs the value to come back inside by this many degrees (prevents flicker).
   */
  hysteresisDeg: number;
  /** Keep the last known state this long when a metric drops out (brief occlusion). */
  unknownGraceMs: number;
  /** A violation must persist this long before its corrective cue is shown. */
  cueDelayMs: number;
}

/** Which metrics decide `compliant` (the FSM's posturePassed). */
export interface GatingConfig {
  elbow: boolean;
  wrist: boolean;
  forearmPitch: boolean;
  trunk: boolean;
  head: boolean;
  /** Minimum number of arms that must be visible and OK. */
  minKnownArms: 1 | 2;
  /**
   * Side view: when the shoulders differ in camera depth by at least this many metres, only the
   * arm nearest the camera is judged. The far arm is behind the body and its guessed joints are
   * unreliable (hardware rehearsal 2026-11-27). Infinity disables it.
   */
  nearArmOnlyDepthM: number;
}

export interface PostureConfig {
  gate: GateConfig;
  smoothing: SmoothingConfig;
  thresholds: PostureThresholds;
  gating: GatingConfig;
  handPoint: HandPoint;
  /** Unit "up" in world space. Default (0,−1,0): MediaPipe y points down, camera assumed roughly level. */
  up: Vec3;
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
export type PostureConfigInput = DeepPartial<PostureConfig>;

export type MetricState = 'ok' | 'low' | 'high' | 'unknown';

export interface MetricReading {
  /** Degrees, or null when the landmarks needed were not usable. */
  value: number | null;
  state: MetricState;
}

export type ArmStatus = 'ok' | 'violation' | 'unknown';

export interface ArmReading {
  side: Side;
  /** θ at elbow for shoulder → elbow → wrist. */
  elbow: MetricReading;
  /** θ at wrist for elbow → wrist → index root (unsigned, spec metric). */
  wrist: MetricReading;
  /** Signed wrist flex in the vertical plane: + = hand raised above the forearm line, − = drooping. */
  wristFlexDeg: number | null;
  /** Forearm slope vs horizontal: + = wrist higher than elbow. */
  forearmPitch: MetricReading;
  /** Status over the gated metrics only. */
  status: ArmStatus;
  /** False when this arm is ignored in a side view (behind the body); see GatingConfig.nearArmOnlyDepthM. */
  judged?: boolean;
  /** Lowest visibility among this arm's landmarks (0 when absent). */
  confidence: number;
}

export interface TrunkReading {
  /** Displayed value: absolute lean, or change from neutral when calibrated. */
  flexion: MetricReading;
  headForward: MetricReading;
  /** Raw absolute values (before calibration offset), for logging/calibration. */
  rawFlexionDeg: number | null;
  rawHeadForwardDeg: number | null;
}

export type PostureCueCode =
  | 'ELBOW_TOO_CLOSED'
  | 'ELBOW_TOO_WIDE'
  | 'WRIST_DROOP'
  | 'WRIST_RAISED'
  | 'WRIST_BENT'
  | 'FOREARM_TOO_LOW'
  | 'FOREARM_TOO_HIGH'
  | 'SLOUCH'
  | 'HEAD_FORWARD';

export interface PostureCue {
  code: PostureCueCode;
  side: Side | null;
  /** Short HUD badge, e.g. "Adjust Elbow: Too Wide". */
  label: string;
  /** One-line corrective instruction. */
  message: string;
  /** True when the metric behind this cue gates compliance. */
  gating: boolean;
  /** Milliseconds the violation has persisted. */
  sinceMs: number;
}

export type CalibrationStatus = 'none' | 'collecting' | 'done' | 'failed';

export interface CalibrationState {
  status: CalibrationStatus;
  /** 0–1 while collecting. */
  progress: number;
  trunkFlexionNeutralDeg: number | null;
  headForwardNeutralDeg: number | null;
}

export interface PostureSnapshot {
  timestampMs: number;
  hasPose: boolean;
  /**
   * The FSM's posturePassed. true = gated metrics OK; false = a gated metric violates;
   * null = not enough of the body is visible to decide (treat as not passed, show a framing hint).
   */
  compliant: boolean | null;
  /**
   * Strict SDD posture_score frame test — exact bands, no hysteresis, no grace.
   * null when not evaluable (excluded from the score denominator).
   */
  inBandStrict: boolean | null;
  arms: Record<Side, ArmReading>;
  trunk: TrunkReading;
  /** Active corrective cues, gating cues first. */
  cues: PostureCue[];
  calibration: CalibrationState;
}
