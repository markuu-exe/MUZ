/**
 * COURSE-6: passive heart regeneration, one heart per period up to MAX_HEARTS.
 * `anchorMs` is when the current period started; null when hearts are full.
 */
import { MAX_HEARTS } from '../../lesson/runner';

export const HEART_REGEN_MS = 15 * 60 * 1000;

export interface RegenState {
  hearts: number;
  anchorMs: number | null;
}

export function regenStep(state: RegenState, nowMs: number, periodMs = HEART_REGEN_MS): RegenState & { gained: number } {
  if (state.hearts >= MAX_HEARTS) return { hearts: MAX_HEARTS, anchorMs: null, gained: 0 };
  if (state.anchorMs === null || state.anchorMs > nowMs) return { hearts: state.hearts, anchorMs: nowMs, gained: 0 };

  const periods = Math.floor((nowMs - state.anchorMs) / periodMs);
  const hearts = Math.min(MAX_HEARTS, state.hearts + periods);
  const gained = hearts - state.hearts;
  if (hearts >= MAX_HEARTS) return { hearts, anchorMs: null, gained };
  return { hearts, anchorMs: state.anchorMs + periods * periodMs, gained };
}

export function msUntilNextHeart(state: RegenState, nowMs: number, periodMs = HEART_REGEN_MS): number {
  if (state.hearts >= MAX_HEARTS) return 0;
  if (state.anchorMs === null) return periodMs;
  return Math.min(periodMs, Math.max(0, periodMs - (nowMs - state.anchorMs)));
}
