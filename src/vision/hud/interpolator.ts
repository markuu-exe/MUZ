/**
 * KAN-258 — Render-delay interpolation of HUD landmarks (SRS 3.4).
 *
 * Results arrive at 20–30 Hz, each tagged with the display time of the video frame it was
 * computed from (`captureTimeMs`, performance clock). Every animation frame the HUD renders the
 * pose at `renderTime = now − D` by lerping the two samples on either side of it, so motion
 * is continuous at 60 FPS and also follows the camera's evenly spaced frame clock rather than
 * postMessage arrival jitter.
 *
 * D adapts: D = EMA(arrival − capture) + EMA(capture interval) + margin, clamped. That is the
 * smallest delay that normally still has a newer sample to lerp towards.
 *
 * Rules:
 * - Never extrapolate. If renderTime is past the newest sample, hold the newest pose.
 * - Landmarks with `usable = 0` are never lerped. A point that (re)appears snaps to its new
 *   position and fades in. A point that drops out keeps its last position and fades out.
 * - A jump larger than `teleportThreshold` (normalised units) snaps instead of sweeping across
 *   the screen. This covers re-detection or another person entering the frame.
 *
 * Landmarks are already One-Euro smoothed in the worker (KAN-248), so nothing here smooths again.
 * Smoothing twice would only add lag.
 *
 * No allocation after construction.
 */
import { POSE_LANDMARK_COUNT } from '../posture/landmarks';
import type { PostureSnapshot } from '../posture/types';
import { HUD_STRIDE, type HudPoints } from '../posture/workerProtocol';

export interface InterpolatorOptions {
  /** Ring capacity. 4 covers D up to ~3 intervals. */
  capacity: number;
  minDelayMs: number;
  maxDelayMs: number;
  /** Added on top of latency + interval to absorb jitter. */
  marginMs: number;
  /** EMA weight for latency / interval estimates. */
  emaAlpha: number;
  /** Starting estimates before any data (SRS 3.4: 20–30 Hz, ≤ 35 ms inference). */
  initialIntervalMs: number;
  initialLatencyMs: number;
  /** Normalised distance above which a point snaps instead of lerping. */
  teleportThreshold: number;
  /** Per-landmark fade in/out time. */
  visibilityFadeMs: number;
}

export const DEFAULT_INTERPOLATOR_OPTIONS: InterpolatorOptions = {
  capacity: 4,
  minDelayMs: 20,
  maxDelayMs: 150,
  marginMs: 4,
  emaAlpha: 0.1,
  initialIntervalMs: 40,
  initialLatencyMs: 30,
  teleportThreshold: 0.2,
  visibilityFadeMs: 120,
};

interface Sample {
  t: number;
  points: Float32Array;
  snapshot: PostureSnapshot | null;
}

export class LandmarkInterpolator {
  readonly options: InterpolatorOptions;

  /** Interpolated x, y per landmark (normalised), valid where `alpha > 0`. */
  readonly x = new Float32Array(POSE_LANDMARK_COUNT);
  readonly y = new Float32Array(POSE_LANDMARK_COUNT);
  /** Per-landmark opacity, 0–1 (animated). */
  readonly alpha = new Float32Array(POSE_LANDMARK_COUNT);

  private readonly ring: Sample[];
  private head = 0; // index of the oldest sample
  private count = 0;
  private readonly visTarget = new Uint8Array(POSE_LANDMARK_COUNT);

  private intervalEma: number;
  private latencyEma: number;
  private lastArrivalMs = -Infinity;
  private dataVersion = 0;

  constructor(options: Partial<InterpolatorOptions> = {}) {
    this.options = { ...DEFAULT_INTERPOLATOR_OPTIONS, ...options };
    this.ring = Array.from({ length: Math.max(2, this.options.capacity) }, () => ({
      t: 0,
      points: new Float32Array(POSE_LANDMARK_COUNT * HUD_STRIDE),
      snapshot: null,
    }));
    this.intervalEma = this.options.initialIntervalMs;
    this.latencyEma = this.options.initialLatencyMs;
  }

  /** Current render delay D (ms). */
  get delayMs(): number {
    const o = this.options;
    const d = this.latencyEma + this.intervalEma + o.marginMs;
    return d < o.minDelayMs ? o.minDelayMs : d > o.maxDelayMs ? o.maxDelayMs : d;
  }

  get intervalMs(): number {
    return this.intervalEma;
  }

  get latencyMs(): number {
    return this.latencyEma;
  }

  get size(): number {
    return this.count;
  }

  /** Capture time of the newest sample (−Infinity when empty). */
  get newestTime(): number {
    return this.count > 0 ? this.ring[(this.head + this.count - 1) % this.ring.length].t : -Infinity;
  }

  get lastArrival(): number {
    return this.lastArrivalMs;
  }

  /** Increments on every accepted push. The engine uses it for its dirty check. */
  get version(): number {
    return this.dataVersion;
  }

  /**
   * Adds a result. `captureTimeMs` is the frame's display time (performance clock);
   * `arrivalMs` is performance.now() at receipt. Returns false if the sample was dropped
   * because it is out of order.
   */
  push(points: HudPoints, snapshot: PostureSnapshot | null, captureTimeMs: number, arrivalMs: number): boolean {
    if (points.length < POSE_LANDMARK_COUNT * HUD_STRIDE) return false;
    const o = this.options;
    const newest = this.count > 0 ? this.ring[(this.head + this.count - 1) % this.ring.length] : null;
    if (newest && !(captureTimeMs > newest.t)) return false;

    if (newest) {
      const interval = captureTimeMs - newest.t;
      if (interval > 0 && interval < 250) this.intervalEma += o.emaAlpha * (interval - this.intervalEma);
    }
    const latency = arrivalMs - captureTimeMs;
    if (latency >= 0 && latency < 500) this.latencyEma += o.emaAlpha * (latency - this.latencyEma);

    let slot: Sample;
    if (this.count < this.ring.length) {
      slot = this.ring[(this.head + this.count) % this.ring.length];
      this.count++;
    } else {
      slot = this.ring[this.head];
      this.head = (this.head + 1) % this.ring.length;
    }
    slot.t = captureTimeMs;
    slot.points.set(points.subarray(0, POSE_LANDMARK_COUNT * HUD_STRIDE));
    slot.snapshot = snapshot;
    this.lastArrivalMs = arrivalMs;
    this.dataVersion++;
    return true;
  }

  /** Forgets all samples (camera paused or switched). Points fade out from where they are. */
  clear(): void {
    this.count = 0;
    this.head = 0;
    this.visTarget.fill(0);
    this.lastArrivalMs = -Infinity;
    for (const s of this.ring) s.snapshot = null;
    this.dataVersion++;
  }

  /**
   * Samples the pose at `renderTimeMs` into x / y / visibility targets, and returns the snapshot
   * of the sample nearest that time, so colours stay in step with the drawn pose.
   * Call `stepVisibility()` afterwards to animate the alphas.
   */
  sample(renderTimeMs: number): PostureSnapshot | null {
    if (this.count === 0) return null;
    const cap = this.ring.length;
    const oldest = this.ring[this.head];
    const newest = this.ring[(this.head + this.count - 1) % cap];

    let a: Sample;
    let b: Sample;
    let w: number;
    if (renderTimeMs >= newest.t || this.count === 1) {
      a = b = newest; // hold — never extrapolate
      w = 1;
    } else if (renderTimeMs <= oldest.t) {
      a = b = oldest;
      w = 0;
    } else {
      a = oldest;
      b = oldest;
      w = 0;
      for (let k = 1; k < this.count; k++) {
        const s = this.ring[(this.head + k) % cap];
        if (s.t >= renderTimeMs) {
          b = s;
          a = this.ring[(this.head + k - 1) % cap];
          w = (renderTimeMs - a.t) / (s.t - a.t);
          break;
        }
      }
    }

    const pa = a.points;
    const pb = b.points;
    const teleport2 = this.options.teleportThreshold * this.options.teleportThreshold;
    for (let i = 0; i < POSE_LANDMARK_COUNT; i++) {
      const o = i * HUD_STRIDE;
      const ua = pa[o + 2] > 0.5;
      const ub = pb[o + 2] > 0.5;
      const nearestUsable = w < 0.5 ? ua : ub;
      this.visTarget[i] = nearestUsable ? 1 : 0;

      if (ua && ub) {
        const ax = pa[o];
        const ay = pa[o + 1];
        const dx = pb[o] - ax;
        const dy = pb[o + 1] - ay;
        if (dx * dx + dy * dy > teleport2) {
          this.x[i] = w < 0.5 ? ax : pb[o];
          this.y[i] = w < 0.5 ? ay : pb[o + 1];
        } else {
          this.x[i] = ax + dx * w;
          this.y[i] = ay + dy * w;
        }
      } else if (nearestUsable) {
        const p = w < 0.5 ? pa : pb;
        this.x[i] = p[o];
        this.y[i] = p[o + 1];
      }
      // else: keep the last position while fading out.
    }
    return (w < 0.5 ? a : b).snapshot;
  }

  /** Animates per-landmark alpha. Returns true while any landmark is still fading. */
  stepVisibility(dtMs: number): boolean {
    const step = this.options.visibilityFadeMs > 0 ? dtMs / this.options.visibilityFadeMs : 1;
    let animating = false;
    for (let i = 0; i < POSE_LANDMARK_COUNT; i++) {
      const target = this.visTarget[i];
      const a = this.alpha[i];
      if (target === 1) {
        if (a === 0) {
          // Appearing: alpha starts from 0 at the snapped position.
          this.alpha[i] = Math.min(1, step);
        } else if (a < 1) {
          this.alpha[i] = Math.min(1, a + step);
        }
      } else if (a > 0) {
        this.alpha[i] = Math.max(0, a - step);
      }
      if (this.alpha[i] !== target) animating = true;
    }
    return animating;
  }
}
