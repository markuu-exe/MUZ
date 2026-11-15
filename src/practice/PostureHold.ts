/**
 * COURSE-5: "hold a good playing posture for N seconds" (posture-hold exercise).
 * Pure and timestamp-driven so it can be unit tested.
 *
 * The hold counts up while PostureSnapshot.compliant is true. A lapse (false, or
 * null = body not visible) shorter than `graceMs` is forgiven; a longer one resets
 * the hold to zero. No hearts are involved.
 */
export interface PostureHoldOptions {
  /** settings.postureHoldSec × 1000. */
  holdMs: number;
  graceMs?: number;
}

export const POSTURE_HOLD_GRACE_MS = 400;

export class PostureHold {
  readonly holdMs: number;
  private readonly graceMs: number;
  private holdStartMs: number | null = null;
  private lastGoodMs = 0;
  private lastMs = 0;
  private samples = 0;
  private inBand = 0;
  private _done = false;

  constructor(options: PostureHoldOptions) {
    this.holdMs = Math.max(0, options.holdMs);
    this.graceMs = options.graceMs ?? POSTURE_HOLD_GRACE_MS;
  }

  get done(): boolean {
    return this._done;
  }

  /** Milliseconds of the current unbroken hold (capped at holdMs). */
  get heldMs(): number {
    if (this._done) return this.holdMs;
    if (this.holdStartMs === null) return 0;
    return Math.min(this.holdMs, Math.max(0, this.lastGoodMs - this.holdStartMs));
  }

  get progress(): number {
    return this.holdMs === 0 ? 1 : this.heldMs / this.holdMs;
  }

  /** Share of evaluable frames inside the elbow and wrist bands, 0–100. */
  get postureScore(): number {
    return this.samples === 0 ? 0 : Math.round((this.inBand / this.samples) * 10000) / 100;
  }

  /** Feed one posture result. Returns true on the sample that completes the hold. */
  push(tMs: number, compliant: boolean | null, inBandStrict: boolean | null = compliant): boolean {
    if (this._done || tMs < this.lastMs) return false;
    this.lastMs = tMs;
    if (inBandStrict !== null) {
      this.samples++;
      if (inBandStrict) this.inBand++;
    }
    if (compliant === true) {
      if (this.holdStartMs === null) this.holdStartMs = tMs;
      this.lastGoodMs = tMs;
      if (tMs - this.holdStartMs >= this.holdMs) {
        this._done = true;
        return true;
      }
    } else if (this.holdStartMs !== null && tMs - this.lastGoodMs > this.graceMs) {
      this.holdStartMs = null;
    }
    return false;
  }
}
