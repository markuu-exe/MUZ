/**
 * KAN-248 orchestrator: PoseFrame → smoothing → metrics → rules → PostureSnapshot.
 * Pure TypeScript, no DOM: runs inside the posture Web Worker (SRS 3.4, SDD C-05).
 * Cost per frame is a few hundred floating-point ops (<0.05 ms), negligible next to inference.
 */
import { PostureCalibrator, type CalibrationOptions } from './calibration';
import { resolvePostureConfig } from './config';
import { LandmarkSmoother } from './filters/OneEuroFilter';
import { createRawMetrics, PostureMetricsComputer, type RawPostureMetrics } from './metrics';
import { PostureRules } from './rules';
import type { CalibrationState, PostureConfig, PostureConfigInput, PostureSnapshot } from './types';
import type { PoseFrame } from './landmarks';

export class PostureAnalyzer {
  readonly config: PostureConfig;
  private readonly smoother: LandmarkSmoother;
  private readonly metrics: PostureMetricsComputer;
  private readonly rules: PostureRules;
  private readonly calibrator = new PostureCalibrator();
  private readonly raw: RawPostureMetrics = createRawMetrics();
  private lastTimestamp = -Infinity;

  constructor(config?: PostureConfigInput) {
    this.config = resolvePostureConfig(config);
    this.smoother = new LandmarkSmoother(this.config.smoothing);
    this.metrics = new PostureMetricsComputer(this.config.gate, this.config.up, this.config.handPoint);
    this.rules = new PostureRules(this.config.thresholds, this.config.gating);
  }

  /**
   * Analyse one frame. `frame` is smoothed IN PLACE (so the caller can draw the smoothed
   * image landmarks on the HUD). Timestamps must be monotonic milliseconds.
   */
  process(frame: PoseFrame): PostureSnapshot {
    if (frame.timestampMs <= this.lastTimestamp) {
      frame.timestampMs = this.lastTimestamp + 0.001;
    }
    this.lastTimestamp = frame.timestampMs;

    this.smoother.apply(frame, this.config.gate);
    this.metrics.compute(frame, this.raw);
    this.calibrator.feed(this.raw);
    const calibration = this.calibrator.current;
    const r = this.rules.evaluate(this.raw, calibration);

    return {
      timestampMs: frame.timestampMs,
      hasPose: frame.hasPose,
      compliant: r.compliant,
      inBandStrict: r.inBandStrict,
      arms: r.arms,
      trunk: r.trunk,
      cues: r.cues,
      calibration: { ...calibration },
    };
  }

  startCalibration(options?: Partial<CalibrationOptions>): void {
    this.calibrator.start(options);
  }

  clearCalibration(): void {
    this.calibrator.clear();
  }

  restoreCalibration(state: Pick<CalibrationState, 'trunkFlexionNeutralDeg' | 'headForwardNeutralDeg'>): void {
    this.calibrator.restore(state);
  }

  /** Call when the stream restarts (camera switch, tab return) so filters don't bridge the gap. */
  reset(): void {
    this.smoother.reset();
    this.rules.reset();
    this.lastTimestamp = -Infinity;
  }
}
