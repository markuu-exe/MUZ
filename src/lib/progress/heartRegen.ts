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

/** Parse an ISO timestamp from `profiles.last_heart_update` into epoch ms, or null if absent/invalid. */
export function parseHeartAnchor(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Compute the next `profiles.last_heart_update` value after a heart write:
 *  - full hearts clear the timer (`null`);
 *  - below full keeps an active timer from `prevAnchorIso` if `prevHearts < MAX_HEARTS`;
 *  - otherwise starts a new timer at `nowIso`.
 */
export function nextHeartUpdateTimestamp(
  prevHearts: number,
  nextHearts: number,
  prevAnchorIso: string | null | undefined,
  nowIso: string,
): string | null {
  if (nextHearts >= MAX_HEARTS) return null;
  if (prevHearts < MAX_HEARTS && parseHeartAnchor(prevAnchorIso) !== null) {
    return prevAnchorIso as string;
  }
  return nowIso;
}
