/**
 * KAN-253 — Threshold rules for wrist droop, arm misalignment and slouching.
 *
 * Two outputs with different jobs:
 * - `compliant` (live): hysteresis + short occlusion grace, no dwell. Feeds the 400 ms latch
 *   window of the practice FSM (SRS 3.1.6.5), so it must react within one or two frames.
 * - `cues` (HUD text): only after a violation persists `cueDelayMs`, so brief dips during fast
 *   passages don't flash corrective text.
 * - `inBandStrict`: exact SDD bands, no smoothing of state — used for posture_score.
 */
import type { RawArmMetrics, RawPostureMetrics } from './metrics';
import type {
  ArmReading,
  ArmStatus,
  BandThreshold,
  CalibrationState,
  GatingConfig,
  MetricReading,
  MetricState,
  PostureCue,
  PostureCueCode,
  PostureThresholds,
  Side,
  TrunkReading,
} from './types';

export function classifyBand(value: number, band: BandThreshold): MetricState {
  if (!Number.isFinite(value)) return 'unknown';
  if (value < band.min) return 'low';
  if (value > band.max) return 'high';
  return 'ok';
}

/** Per-metric state with recovery hysteresis, occlusion grace and violation timing. */
export class BandTracker {
  state: MetricState = 'unknown';
  value = NaN;
  /** Timestamp the current violation started (NaN when not violating). */
  violationSince = NaN;
  private lastValidAt = NaN;

  reset(): void {
    this.state = 'unknown';
    this.value = NaN;
    this.violationSince = NaN;
    this.lastValidAt = NaN;
  }

  update(value: number, band: BandThreshold, hysteresisDeg: number, graceMs: number, tMs: number): MetricState {
    if (!Number.isFinite(value)) {
      // Brief dropout (occlusion, low visibility): hold the last state.
      if (this.state !== 'unknown' && tMs - this.lastValidAt <= graceMs) return this.state;
      this.state = 'unknown';
      this.value = NaN;
      this.violationSince = NaN;
      return this.state;
    }
    this.lastValidAt = tMs;
    this.value = value;

    const prev = this.state;
    let next = classifyBand(value, band);
    if (next === 'ok') {
      if (prev === 'low' && value < band.min + hysteresisDeg) next = 'low';
      else if (prev === 'high' && value > band.max - hysteresisDeg) next = 'high';
    }
    if (next === 'ok') this.violationSince = NaN;
    else if (next !== prev || !Number.isFinite(this.violationSince)) this.violationSince = tMs;
    this.state = next;
    return next;
  }

  violationMs(tMs: number): number {
    return Number.isFinite(this.violationSince) ? tMs - this.violationSince : 0;
  }
}

const CUE_TEXT: Record<PostureCueCode, { label: string; message: string }> = {
  ELBOW_TOO_CLOSED: { label: 'Adjust Elbow: Too Tight', message: 'Open your elbow a little: sit slightly further back from the keys.' },
  ELBOW_TOO_WIDE: { label: 'Adjust Elbow: Too Wide', message: 'Lower your forearm to keyboard level to reduce strain.' },
  WRIST_DROOP: { label: 'Wrist Drooping', message: 'Lift your wrist so it is level with your forearm.' },
  WRIST_RAISED: { label: 'Wrist Too High', message: 'Relax your wrist down until it lines up with your forearm.' },
  WRIST_BENT: { label: 'Wrist Bent', message: 'Keep your wrist straight, in line with your forearm.' },
  FOREARM_TOO_LOW: { label: 'Forearm Sloping Down', message: 'Your elbows are above the keys: lower the bench or relax your shoulders.' },
  FOREARM_TOO_HIGH: { label: 'Forearm Sloping Up', message: 'Your wrists are above your elbows: raise the bench or sit taller.' },
  SLOUCH: { label: 'Slouching', message: 'Sit tall: lengthen your back and lean from the hips, not the shoulders.' },
  HEAD_FORWARD: { label: 'Head Forward', message: 'Bring your head back so your ears sit over your shoulders.' },
};

export function cueText(code: PostureCueCode): { label: string; message: string } {
  return CUE_TEXT[code];
}

interface ArmTrackers {
  elbow: BandTracker;
  wrist: BandTracker;
  forearm: BandTracker;
  /** Last known signed wrist flex, held through the same grace window for cue wording. */
  lastFlex: number;
}

function armTrackers(): ArmTrackers {
  return { elbow: new BandTracker(), wrist: new BandTracker(), forearm: new BandTracker(), lastFlex: NaN };
}

/**
 * `value` is this frame's measurement only (null if not measured), while `state` may be held
 * through the occlusion grace window. Keeping them separate stops held values being counted
 * twice in session statistics.
 */
function reading(t: BandTracker, measured: number): MetricReading {
  return { value: Number.isFinite(measured) ? measured : null, state: t.state };
}

function finiteOrNull(v: number): number | null {
  return Number.isFinite(v) ? v : null;
}

export interface RuleEvaluation {
  compliant: boolean | null;
  inBandStrict: boolean | null;
  arms: Record<Side, ArmReading>;
  trunk: TrunkReading;
  cues: PostureCue[];
}

export class PostureRules {
  private readonly arms: Record<Side, ArmTrackers> = { left: armTrackers(), right: armTrackers() };
  /** Arm ignored this frame because it is behind the body in a side view (see nearArmOnlyDepthM). */
  private farSide: Side | null = null;
  private readonly trunk = new BandTracker();
  private readonly head = new BandTracker();

  constructor(
    private thresholds: PostureThresholds,
    private gating: GatingConfig,
  ) {}

  reset(): void {
    for (const side of ['left', 'right'] as const) {
      const a = this.arms[side];
      a.elbow.reset();
      a.wrist.reset();
      a.forearm.reset();
      a.lastFlex = NaN;
    }
    this.trunk.reset();
    this.head.reset();
  }

  evaluate(m: RawPostureMetrics, calibration: CalibrationState): RuleEvaluation {
    const t = m.timestampMs;
    const th = this.thresholds;
    const h = th.hysteresisDeg;
    const grace = th.unknownGraceMs;
    const cues: PostureCue[] = [];

    this.farSide = farArm(m, this.gating.nearArmOnlyDepthM);
    const arms = {} as Record<Side, ArmReading>;
    for (const side of ['left', 'right'] as const) {
      const raw = m.arms[side];
      const tr = this.arms[side];
      tr.elbow.update(raw.elbowDeg, th.elbow, h, grace, t);
      tr.wrist.update(raw.wristDeg, th.wrist, h, grace, t);
      tr.forearm.update(raw.forearmPitchDeg, th.forearmPitch, h, grace, t);
      if (Number.isFinite(raw.wristFlexDeg)) tr.lastFlex = raw.wristFlexDeg;
      else if (tr.wrist.state === 'unknown') tr.lastFlex = NaN;

      arms[side] = {
        side,
        elbow: reading(tr.elbow, raw.elbowDeg),
        wrist: reading(tr.wrist, raw.wristDeg),
        wristFlexDeg: finiteOrNull(raw.wristFlexDeg),
        forearmPitch: reading(tr.forearm, raw.forearmPitchDeg),
        status: this.armStatus(tr),
        confidence: raw.confidence,
      };

    }
    // Prefer the near arm, but only when it can be judged; otherwise fall back to whichever arm is visible.
    if (this.farSide !== null && arms[this.farSide === 'left' ? 'right' : 'left'].status === 'unknown') this.farSide = null;
    if (this.farSide !== null) arms[this.farSide].judged = false;
    for (const side of ['left', 'right'] as const) {
      if (side !== this.farSide) this.collectArmCues(side, this.arms[side], t, cues);
    }

    // Trunk & head: compare change-from-neutral when calibrated, absolute otherwise.
    const calibrated = calibration.status === 'done';
    const flexBase = calibrated && calibration.trunkFlexionNeutralDeg !== null ? calibration.trunkFlexionNeutralDeg : 0;
    const headBase = calibrated && calibration.headForwardNeutralDeg !== null ? calibration.headForwardNeutralDeg : 0;
    const flexBand = calibrated ? th.trunkFlexionCalibrated : th.trunkFlexion;
    const headBand = calibrated ? th.headForwardCalibrated : th.headForward;
    const flexValue = m.trunk.flexionDeg - flexBase;
    const headValue = m.trunk.headForwardDeg - headBase;
    this.trunk.update(flexValue, flexBand, h, grace, t);
    this.head.update(headValue, headBand, h, grace, t);

    this.maybeCue(cues, this.trunk.state === 'high', 'SLOUCH', null, this.gating.trunk, this.trunk.violationMs(t));
    this.maybeCue(cues, this.head.state === 'high', 'HEAD_FORWARD', null, this.gating.head, this.head.violationMs(t));

    cues.sort((a, b) => Number(b.gating) - Number(a.gating) || b.sinceMs - a.sinceMs);

    return {
      compliant: this.compliance(arms),
      inBandStrict: this.strictBand(m),
      arms,
      trunk: {
        flexion: reading(this.trunk, flexValue),
        headForward: reading(this.head, headValue),
        rawFlexionDeg: finiteOrNull(m.trunk.flexionDeg),
        rawHeadForwardDeg: finiteOrNull(m.trunk.headForwardDeg),
      },
      cues,
    };
  }

  private armStatus(tr: ArmTrackers): ArmStatus {
    const gated: BandTracker[] = [];
    if (this.gating.elbow) gated.push(tr.elbow);
    if (this.gating.wrist) gated.push(tr.wrist);
    if (this.gating.forearmPitch) gated.push(tr.forearm);
    if (gated.length === 0) return 'unknown';
    if (gated.some((g) => g.state === 'low' || g.state === 'high')) return 'violation';
    if (gated.some((g) => g.state === 'unknown')) return 'unknown';
    return 'ok';
  }

  private compliance(arms: Record<Side, ArmReading>): boolean | null {
    const statuses = (['left', 'right'] as const).filter((s) => s !== this.farSide).map((s) => arms[s].status);
    if (statuses.includes('violation')) return false;
    for (const [enabled, tracker] of [
      [this.gating.trunk, this.trunk],
      [this.gating.head, this.head],
    ] as const) {
      if (!enabled) continue;
      if (tracker.state === 'high' || tracker.state === 'low') return false;
    }
    const okArms = statuses.filter((s) => s === 'ok').length;
    if (okArms < this.gating.minKnownArms) return null;
    for (const [enabled, tracker] of [
      [this.gating.trunk, this.trunk],
      [this.gating.head, this.head],
    ] as const) {
      if (enabled && tracker.state === 'unknown') return null;
    }
    return true;
  }

  /** SDD posture_score frame test: exact bands, gated arm metrics, no hysteresis or grace. */
  private strictBand(m: RawPostureMetrics): boolean | null {
    let known = 0;
    for (const side of ['left', 'right'] as const) {
      if (side === this.farSide) continue;
      const r = m.arms[side];
      const verdict = this.strictArm(r);
      if (verdict === false) return false;
      if (verdict === true) known++;
    }
    return known >= this.gating.minKnownArms ? true : null;
  }

  private strictArm(r: RawArmMetrics): boolean | null {
    const checks: MetricState[] = [];
    if (this.gating.elbow) checks.push(classifyBand(r.elbowDeg, this.thresholds.elbow));
    if (this.gating.wrist) checks.push(classifyBand(r.wristDeg, this.thresholds.wrist));
    if (this.gating.forearmPitch) checks.push(classifyBand(r.forearmPitchDeg, this.thresholds.forearmPitch));
    if (checks.length === 0) return null;
    if (checks.some((s) => s === 'low' || s === 'high')) return false;
    if (checks.includes('unknown')) return null;
    return true;
  }

  private collectArmCues(side: Side, tr: ArmTrackers, t: number, cues: PostureCue[]): void {
    const g = this.gating;
    this.maybeCue(cues, tr.elbow.state === 'low', 'ELBOW_TOO_CLOSED', side, g.elbow, tr.elbow.violationMs(t));
    this.maybeCue(cues, tr.elbow.state === 'high', 'ELBOW_TOO_WIDE', side, g.elbow, tr.elbow.violationMs(t));

    if (tr.wrist.state === 'low') {
      const flex = tr.lastFlex;
      const dead = this.thresholds.wristFlexDeadbandDeg;
      const code: PostureCueCode = !Number.isFinite(flex) || Math.abs(flex) <= dead ? 'WRIST_BENT' : flex < 0 ? 'WRIST_DROOP' : 'WRIST_RAISED';
      this.maybeCue(cues, true, code, side, g.wrist, tr.wrist.violationMs(t));
    }

    this.maybeCue(cues, tr.forearm.state === 'low', 'FOREARM_TOO_LOW', side, g.forearmPitch, tr.forearm.violationMs(t));
    this.maybeCue(cues, tr.forearm.state === 'high', 'FOREARM_TOO_HIGH', side, g.forearmPitch, tr.forearm.violationMs(t));
  }

  private maybeCue(cues: PostureCue[], active: boolean, code: PostureCueCode, side: Side | null, gating: boolean, sinceMs: number): void {
    if (!active || sinceMs < this.thresholds.cueDelayMs) return;
    const text = CUE_TEXT[code];
    cues.push({ code, side, label: text.label, message: text.message, gating, sinceMs });
  }
}

/** The arm to ignore in a side view: the one whose shoulder is farther from the camera, or null. */
export function farArm(m: RawPostureMetrics, minDepthM: number): Side | null {
  const zl = m.arms.left.shoulderZ;
  const zr = m.arms.right.shoulderZ;
  if (!Number.isFinite(zl) || !Number.isFinite(zr) || !Number.isFinite(minDepthM)) return null;
  if (Math.abs(zl - zr) < minDepthM) return null;
  return zl > zr ? 'left' : 'right';
}
