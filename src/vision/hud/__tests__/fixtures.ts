/** Test helpers for the HUD: synthetic snapshots and HUD point buffers (DOM-free). */
import { LM, POSE_LANDMARK_COUNT } from '../../posture/landmarks';
import type { ArmReading, MetricState, PostureCue, PostureCueCode, PostureSnapshot, Side } from '../../posture/types';
import { HUD_STRIDE } from '../../posture/workerProtocol';

export interface ArmSpec {
  elbow?: MetricState;
  wrist?: MetricState;
  forearm?: MetricState;
}

export interface SnapshotSpec {
  left?: ArmSpec;
  right?: ArmSpec;
  trunk?: MetricState;
  head?: MetricState;
  hasPose?: boolean;
  compliant?: boolean | null;
  cues?: Array<{ code: PostureCueCode; side?: Side | null; gating?: boolean; sinceMs?: number }>;
}

function metric(state: MetricState = 'ok') {
  return { value: state === 'unknown' ? null : 90, state };
}

function arm(side: Side, s: ArmSpec = {}): ArmReading {
  const elbow = metric(s.elbow);
  const wrist = metric(s.wrist);
  const bad = elbow.state === 'low' || elbow.state === 'high' || wrist.state === 'low' || wrist.state === 'high';
  return {
    side,
    elbow,
    wrist,
    wristFlexDeg: 0,
    forearmPitch: metric(s.forearm),
    status: bad ? 'violation' : elbow.state === 'unknown' ? 'unknown' : 'ok',
    confidence: 0.9,
  };
}

export function makeSnapshot(spec: SnapshotSpec = {}, timestampMs = 0): PostureSnapshot {
  const cues: PostureCue[] = (spec.cues ?? []).map((c) => ({
    code: c.code,
    side: c.side ?? null,
    label: `L:${c.code}`,
    message: `M:${c.code}`,
    gating: c.gating ?? true,
    sinceMs: c.sinceMs ?? 600,
  }));
  return {
    timestampMs,
    hasPose: spec.hasPose ?? true,
    compliant: spec.compliant === undefined ? true : spec.compliant,
    inBandStrict: true,
    arms: { left: arm('left', spec.left), right: arm('right', spec.right) },
    trunk: {
      flexion: metric(spec.trunk),
      headForward: metric(spec.head),
      rawFlexionDeg: 5,
      rawHeadForwardDeg: 5,
    },
    cues,
    calibration: { status: 'none', progress: 0, trunkFlexionNeutralDeg: null, headForwardNeutralDeg: null },
  };
}

/** Upper-body points (normalised) for a seated pianist; every tracked point usable. */
export const BASE_POSE: Record<number, [number, number]> = {
  [LM.LEFT_EAR]: [0.56, 0.2],
  [LM.RIGHT_EAR]: [0.44, 0.2],
  [LM.LEFT_SHOULDER]: [0.62, 0.35],
  [LM.RIGHT_SHOULDER]: [0.38, 0.35],
  [LM.LEFT_ELBOW]: [0.66, 0.55],
  [LM.RIGHT_ELBOW]: [0.34, 0.55],
  [LM.LEFT_WRIST]: [0.6, 0.7],
  [LM.RIGHT_WRIST]: [0.4, 0.7],
  [LM.LEFT_INDEX]: [0.57, 0.74],
  [LM.RIGHT_INDEX]: [0.43, 0.74],
  [LM.LEFT_HIP]: [0.58, 0.85],
  [LM.RIGHT_HIP]: [0.42, 0.85],
};

/** Builds a HUD buffer. `dx` shifts every point; `hide` marks landmarks unusable. */
export function makePoints(dx = 0, hide: number[] = []): Float32Array {
  const p = new Float32Array(POSE_LANDMARK_COUNT * HUD_STRIDE);
  for (const [k, [x, y]] of Object.entries(BASE_POSE)) {
    const i = Number(k);
    const o = i * HUD_STRIDE;
    p[o] = x + dx;
    p[o + 1] = y;
    p[o + 2] = hide.includes(i) ? 0 : 1;
  }
  return p;
}
