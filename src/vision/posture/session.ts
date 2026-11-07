/**
 * Session aggregation for SDD `performance_records.posture_score` and SRS 3.1.7.2
 * ("posture stability metrics by aggregating angular deviation logs").
 * Runs on the main thread from received snapshots; O(1) memory (Welford).
 */
import type { BandThreshold, PostureSnapshot, Side } from './types';

class RunningStats {
  n = 0;
  mean = 0;
  private m2 = 0;
  /** Sum of degrees outside the OK band (0 for in-band samples). */
  private deviationSum = 0;

  add(x: number, band: BandThreshold): void {
    this.n++;
    const d = x - this.mean;
    this.mean += d / this.n;
    this.m2 += d * (x - this.mean);
    this.deviationSum += x < band.min ? band.min - x : x > band.max ? x - band.max : 0;
  }

  summary(): AngleSummary | null {
    if (this.n === 0) return null;
    return {
      samples: this.n,
      meanDeg: round2(this.mean),
      stdDeg: round2(this.n > 1 ? Math.sqrt(this.m2 / (this.n - 1)) : 0),
      meanDeviationDeg: round2(this.deviationSum / this.n),
    };
  }
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

export interface AngleSummary {
  samples: number;
  meanDeg: number;
  /** Lower = steadier posture. */
  stdDeg: number;
  /** Average degrees outside the target band (0 = always in band). */
  meanDeviationDeg: number;
}

export interface PostureSessionSummary {
  /** SDD posture_score: % of evaluable frames within the elbow and wrist bands. null if none were evaluable. */
  postureScore: number | null;
  framesTotal: number;
  framesEvaluated: number;
  /** Fraction of frames where posture could be evaluated (framing quality). */
  coverage: number;
  elbow: Record<Side, AngleSummary | null>;
  wrist: Record<Side, AngleSummary | null>;
}

export class PostureSession {
  private total = 0;
  private evaluated = 0;
  private inBand = 0;
  private readonly elbow = { left: new RunningStats(), right: new RunningStats() };
  private readonly wrist = { left: new RunningStats(), right: new RunningStats() };

  constructor(
    private readonly elbowBand: BandThreshold,
    private readonly wristBand: BandThreshold,
  ) {}

  add(s: PostureSnapshot): void {
    this.total++;
    if (s.inBandStrict !== null) {
      this.evaluated++;
      if (s.inBandStrict) this.inBand++;
    }
    for (const side of ['left', 'right'] as const) {
      const a = s.arms[side];
      if (a.elbow.value !== null) this.elbow[side].add(a.elbow.value, this.elbowBand);
      if (a.wrist.value !== null) this.wrist[side].add(a.wrist.value, this.wristBand);
    }
  }

  summary(): PostureSessionSummary {
    return {
      postureScore: this.evaluated > 0 ? round2((100 * this.inBand) / this.evaluated) : null,
      framesTotal: this.total,
      framesEvaluated: this.evaluated,
      coverage: this.total > 0 ? round2(this.evaluated / this.total) : 0,
      elbow: { left: this.elbow.left.summary(), right: this.elbow.right.summary() },
      wrist: { left: this.wrist.left.summary(), right: this.wrist.right.summary() },
    };
  }
}
