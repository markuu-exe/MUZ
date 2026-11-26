import { DEFAULT_GATE } from './landmarks';
import { DEFAULT_SMOOTHING } from './filters/OneEuroFilter';
import type { PostureConfig, PostureConfigInput } from './types';

/**
 * Defaults.
 * - elbow / wrist bands: SRS 3.1.5.4 and SDD C-05 (spec-fixed, do not tune without a spec change).
 * - forearm / trunk / head bands: PROVISIONAL engineering defaults (not in SRS/SDD). Tune on recordings.
 * - gating: SRS 3.1.6.5 + SDD posture_score define "posture valid" as elbow + wrist only, so
 *   spine/head/forearm are advisory cues by default.
 */
export const DEFAULT_POSTURE_CONFIG: PostureConfig = {
  gate: DEFAULT_GATE,
  smoothing: DEFAULT_SMOOTHING,
  thresholds: {
    elbow: { min: 80, max: 110 },
    wrist: { min: 140, max: 180 }, // ruling W2 (2026-11-27): SRS 150° widened by 10°, both bend directions
    wristFlexDeadbandDeg: 3,
    forearmPitch: { min: -15, max: 15 },
    trunkFlexion: { min: -90, max: 20 },
    trunkFlexionCalibrated: { min: -90, max: 12 },
    headForward: { min: -90, max: 25 },
    headForwardCalibrated: { min: -90, max: 15 },
    hysteresisDeg: 2,
    unknownGraceMs: 300,
    cueDelayMs: 600,
  },
  gating: {
    elbow: true,
    wrist: true,
    forearmPitch: false,
    trunk: false,
    head: false,
    minKnownArms: 1,
    nearArmOnlyDepthM: 0.15,
  },
  handPoint: 'index',
  up: { x: 0, y: -1, z: 0 },
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && !ArrayBuffer.isView(v);
}

function deepMerge<T>(base: T, patch: unknown): T {
  if (!isPlainObject(patch) || !isPlainObject(base)) return (patch === undefined ? base : (patch as T));
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    out[k] = isPlainObject(v) && isPlainObject(out[k]) ? deepMerge(out[k], v) : v;
  }
  return out as T;
}

/** Merges a partial config over the defaults and validates it. Returns a fresh object. */
export function resolvePostureConfig(input?: PostureConfigInput): PostureConfig {
  const cfg = deepMerge(structuredCloneSafe(DEFAULT_POSTURE_CONFIG), input);
  const t = cfg.thresholds;
  for (const [name, band] of Object.entries({
    elbow: t.elbow,
    wrist: t.wrist,
    forearmPitch: t.forearmPitch,
    trunkFlexion: t.trunkFlexion,
    trunkFlexionCalibrated: t.trunkFlexionCalibrated,
    headForward: t.headForward,
    headForwardCalibrated: t.headForwardCalibrated,
  })) {
    if (!(band.min <= band.max)) throw new RangeError(`posture threshold "${name}": min must be <= max`);
  }
  const upLen = Math.hypot(cfg.up.x, cfg.up.y, cfg.up.z);
  if (!(upLen > 1e-6)) throw new RangeError('posture config "up" must be a non-zero vector');
  cfg.up = { x: cfg.up.x / upLen, y: cfg.up.y / upLen, z: cfg.up.z / upLen };
  return cfg;
}

function structuredCloneSafe<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}
