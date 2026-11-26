/**
 * AI-1: the "can't see you" cue. PostureAnalyzer reports `compliant: null` when
 * the pose model cannot see enough of the arm to judge posture. A single null
 * frame is normal (a hand passes in front of the elbow), so the cue only shows
 * once posture has been unevaluable for NOT_VISIBLE_AFTER_MS without a break.
 */
export const NOT_VISIBLE_AFTER_MS = 1500;

export const NOT_VISIBLE_MESSAGE = 'Move so the camera can see your arm and hand, from a three-quarter angle.';

export class NotVisibleTimer {
  private since: number | null = null;

  constructor(private readonly afterMs = NOT_VISIBLE_AFTER_MS) {}

  /** Feed one posture result; returns whether the cue should be showing. */
  push(tMs: number, compliant: boolean | null): boolean {
    if (compliant !== null) {
      this.since = null;
      return false;
    }
    if (this.since === null) this.since = tMs;
    return tMs - this.since >= this.afterMs;
  }

  reset(): void {
    this.since = null;
  }
}
