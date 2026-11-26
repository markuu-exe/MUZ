/**
 * Camera framing for practice drills. PostureAnalyzer reports `compliant: null`
 * when it cannot see enough of the arm to judge posture. A drill must not run
 * its timeout (and cost hearts) while the camera cannot see the learner, so the
 * drill view only runs while this tracker says 'framed'.
 *
 * - 'searching': not framed yet since the camera started.
 * - 'framed': posture has been judgeable for FRAMED_AFTER_MS without a break.
 * - 'lost': was framed, then unjudgeable for LOST_AFTER_MS without a break.
 */
import { NOT_VISIBLE_AFTER_MS } from './visibilityCue';

export type FramingState = 'searching' | 'framed' | 'lost';

export const FRAMED_AFTER_MS = 800;
export const LOST_AFTER_MS = NOT_VISIBLE_AFTER_MS;

export class FramingTracker {
  private state: FramingState = 'searching';
  private seenSince: number | null = null;
  private missingSince: number | null = null;

  constructor(
    private readonly framedAfterMs = FRAMED_AFTER_MS,
    private readonly lostAfterMs = LOST_AFTER_MS,
  ) {}

  /** Feed one posture result; returns the framing state after it. */
  push(tMs: number, compliant: boolean | null): FramingState {
    if (compliant !== null) {
      this.missingSince = null;
      if (this.seenSince === null) this.seenSince = tMs;
      if (this.state !== 'framed' && tMs - this.seenSince >= this.framedAfterMs) this.state = 'framed';
    } else {
      this.seenSince = null;
      if (this.missingSince === null) this.missingSince = tMs;
      if (this.state === 'framed' && tMs - this.missingSince >= this.lostAfterMs) this.state = 'lost';
    }
    return this.state;
  }

  get current(): FramingState {
    return this.state;
  }
}
