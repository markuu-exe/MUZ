/**
 * Optional neutral-posture calibration for the advisory slouch / head-forward rules.
 * The player sits in their best posture for `durationMs`; we store the median trunk lean and
 * head-forward angle. Afterwards those rules compare change-from-neutral, which removes both
 * individual build differences and any constant bias from a slightly pitched camera.
 * Elbow and wrist bands are spec-fixed absolute angles and are never calibrated.
 */
import type { RawPostureMetrics } from './metrics';
import type { CalibrationState } from './types';

export interface CalibrationOptions {
  durationMs: number;
  /** Fraction of frames in the window that must have a valid trunk reading. */
  minValidFraction: number;
}

export const DEFAULT_CALIBRATION: CalibrationOptions = {
  durationMs: 3000,
  minValidFraction: 0.6,
};

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export class PostureCalibrator {
  private state: CalibrationState = { status: 'none', progress: 0, trunkFlexionNeutralDeg: null, headForwardNeutralDeg: null };
  private startedAt = NaN;
  private frames = 0;
  private flex: number[] = [];
  private head: number[] = [];
  private options: CalibrationOptions = DEFAULT_CALIBRATION;

  get current(): CalibrationState {
    return this.state;
  }

  start(options: Partial<CalibrationOptions> = {}): void {
    this.options = { ...DEFAULT_CALIBRATION, ...options };
    this.startedAt = NaN; // set by the first frame, so worker/main clocks never mix
    this.frames = 0;
    this.flex = [];
    this.head = [];
    this.state = { status: 'collecting', progress: 0, trunkFlexionNeutralDeg: null, headForwardNeutralDeg: null };
  }

  clear(): void {
    this.state = { status: 'none', progress: 0, trunkFlexionNeutralDeg: null, headForwardNeutralDeg: null };
  }

  /** Restore a previously saved calibration (e.g. from IndexedDB). */
  restore(state: Pick<CalibrationState, 'trunkFlexionNeutralDeg' | 'headForwardNeutralDeg'>): void {
    this.state = { status: 'done', progress: 1, ...state };
  }

  feed(m: RawPostureMetrics): void {
    if (this.state.status !== 'collecting') return;
    const t = m.timestampMs;
    if (!Number.isFinite(this.startedAt)) this.startedAt = t;
    this.frames++;
    if (Number.isFinite(m.trunk.flexionDeg)) this.flex.push(m.trunk.flexionDeg);
    if (Number.isFinite(m.trunk.headForwardDeg)) this.head.push(m.trunk.headForwardDeg);

    const elapsed = t - this.startedAt;
    const progress = Math.min(1, elapsed / this.options.durationMs);
    if (progress < 1) {
      this.state = { ...this.state, progress };
      return;
    }
    const enough = this.frames > 0 && this.flex.length / this.frames >= this.options.minValidFraction;
    this.state = enough
      ? {
          status: 'done',
          progress: 1,
          trunkFlexionNeutralDeg: median(this.flex),
          headForwardNeutralDeg: this.head.length / this.frames >= this.options.minValidFraction ? median(this.head) : null,
        }
      : { status: 'failed', progress: 1, trunkFlexionNeutralDeg: null, headForwardNeutralDeg: null };
    this.flex = [];
    this.head = [];
  }
}
