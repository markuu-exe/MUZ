/**
 * One-Euro filter (Casiez, Roussel & Vogel, CHI 2012) — adaptive low-pass for noisy
 * real-time signals. Low cutoff when still (kills jitter), higher cutoff when moving
 * (keeps lag low on fast hand motion). Handles variable frame intervals, which matters
 * because inference runs at 20–30 Hz with occasional drops (SRS 3.4).
 */
import { POSE_LANDMARK_COUNT, TRACKED_LANDMARKS, isUsable, type GateConfig, type PoseFrame } from '../landmarks';

export interface OneEuroParams {
  /** Hz. Cutoff when the signal is still. Lower = smoother but laggier at rest. */
  minCutoff: number;
  /** Cutoff increase per unit of speed (Hz per unit/s). Higher = less lag when moving. */
  beta: number;
  /** Hz. Cutoff for the derivative estimate. */
  dCutoff: number;
}

function smoothingFactor(dtSec: number, cutoffHz: number): number {
  const r = 2 * Math.PI * cutoffHz * dtSec;
  return r / (r + 1);
}

export class OneEuroFilter {
  private xPrev = NaN;
  private dxPrev = 0;
  private tPrev = NaN;

  constructor(private readonly params: OneEuroParams) {}

  reset(): void {
    this.xPrev = NaN;
    this.dxPrev = 0;
    this.tPrev = NaN;
  }

  /** @param tMs monotonic timestamp in milliseconds. */
  filter(x: number, tMs: number): number {
    if (!Number.isFinite(x)) return x;
    if (!Number.isFinite(this.xPrev) || !Number.isFinite(this.tPrev)) {
      this.xPrev = x;
      this.dxPrev = 0;
      this.tPrev = tMs;
      return x;
    }
    const dt = (tMs - this.tPrev) / 1000;
    if (!(dt > 0)) return this.xPrev; // duplicate / out-of-order timestamp
    const { minCutoff, beta, dCutoff } = this.params;

    const dx = (x - this.xPrev) / dt;
    const aD = smoothingFactor(dt, dCutoff);
    const dxHat = aD * dx + (1 - aD) * this.dxPrev;

    const cutoff = minCutoff + beta * Math.abs(dxHat);
    const a = smoothingFactor(dt, cutoff);
    const xHat = a * x + (1 - a) * this.xPrev;

    this.xPrev = xHat;
    this.dxPrev = dxHat;
    this.tPrev = tMs;
    return xHat;
  }
}

export interface SmoothingConfig {
  enabled: boolean;
  world: OneEuroParams;
  image: OneEuroParams;
  /** If the gap since a landmark's last good sample exceeds this, restart its filter (no smoothing across occlusions). */
  maxGapMs: number;
}

/**
 * Defaults are a starting point, in units of metres (world) and normalised frame widths
 * (image). Tune with recorded sessions: set beta = 0, lower minCutoff until resting
 * jitter disappears, then raise beta until fast passages stop lagging.
 */
export const DEFAULT_SMOOTHING: SmoothingConfig = {
  enabled: true,
  world: { minCutoff: 1.2, beta: 4, dCutoff: 1 },
  image: { minCutoff: 1.2, beta: 4, dCutoff: 1 },
  maxGapMs: 500,
};

/**
 * Smooths the tracked landmarks of a PoseFrame in place.
 * Unusable landmarks are left untouched (still gated out downstream) and their filters
 * restart when they reappear, so a re-acquired wrist does not "slide in" from its old spot.
 */
export class LandmarkSmoother {
  private readonly world: OneEuroFilter[] = [];
  private readonly image: OneEuroFilter[] = [];
  private readonly lastSeen = new Float64Array(POSE_LANDMARK_COUNT).fill(NaN);

  constructor(private readonly config: SmoothingConfig) {
    for (let i = 0; i < POSE_LANDMARK_COUNT * 3; i++) {
      this.world.push(new OneEuroFilter(config.world));
      this.image.push(new OneEuroFilter(config.image));
    }
  }

  reset(): void {
    for (const f of this.world) f.reset();
    for (const f of this.image) f.reset();
    this.lastSeen.fill(NaN);
  }

  apply(frame: PoseFrame, gate: GateConfig): void {
    if (!this.config.enabled || !frame.hasPose) return;
    const t = frame.timestampMs;
    for (const i of TRACKED_LANDMARKS) {
      if (!isUsable(frame, i, gate)) continue;
      const last = this.lastSeen[i];
      if (!Number.isFinite(last) || t - last > this.config.maxGapMs) {
        for (let k = 0; k < 3; k++) {
          this.world[i * 3 + k].reset();
          this.image[i * 3 + k].reset();
        }
      }
      this.lastSeen[i] = t;
      for (let k = 0; k < 3; k++) {
        const o = i * 3 + k;
        frame.world[o] = this.world[o].filter(frame.world[o], t);
        frame.image[o] = this.image[o].filter(frame.image[o], t);
      }
    }
  }
}
