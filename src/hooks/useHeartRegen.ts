/**
 * COURSE-6: heart regeneration that persists across sessions via `profiles.last_heart_update`
 * and localStorage. The countdown runs while hearts < 5; when a 15-minute period completes,
 * `onRegenerate` restores the heart(s) and advances the timer anchor.
 */
import { useEffect, useRef, useState } from 'react';
import {
  computePassiveHeartRegen,
  HEART_REGEN_INTERVAL_MS,
  MAX_HEARTS,
  clampHearts,
} from '../lib/gamification';

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export type LegacyRegenCallback = (
  restoredCount: number,
  nextHearts: number,
  nextStartedAtMs: number | null,
) => void;

export interface HeartRegenOptions {
  /** Persist the regenerated hearts; resolve true if they were written. Omit to only show the countdown (demo). */
  onRegenerate?: (to: number, from: number, nextStartedAtMs: number | null) => Promise<boolean> | boolean | void;
  /** Optional database `profiles.last_heart_update` ISO timestamp. */
  lastHeartUpdate?: string | null;
}

export function useHeartRegen(
  userId: string | undefined,
  hearts: number,
  optionsOrCallback?: LegacyRegenCallback | HeartRegenOptions,
  lastHeartUpdateArg?: string | null,
) {
  const storageKey = `muz-heart-regen-${userId ?? 'guest'}`;
  const clampedHearts = clampHearts(hearts);
  const [now, setNow] = useState(() => Date.now());
  const prevHeartsRef = useRef<number>(clampedHearts);
  const inFlight = useRef(false);

  const isCallback = typeof optionsOrCallback === 'function';
  const lastHeartUpdate = isCallback
    ? lastHeartUpdateArg
    : (optionsOrCallback?.lastHeartUpdate ?? lastHeartUpdateArg);

  const callbackRef = useRef(optionsOrCallback);
  callbackRef.current = optionsOrCallback;

  const parsedLastUpdateMs = lastHeartUpdate ? Date.parse(lastHeartUpdate) : NaN;
  const validDbAnchorMs = Number.isFinite(parsedLastUpdateMs) ? parsedLastUpdateMs : null;

  // Manage regeneration timer anchor in localStorage when hearts or last_heart_update change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (clampedHearts >= MAX_HEARTS) {
      window.localStorage.removeItem(storageKey);
      prevHeartsRef.current = clampedHearts;
      return;
    }

    if (validDbAnchorMs !== null) {
      window.localStorage.setItem(storageKey, String(validDbAnchorMs));
      setNow(Date.now());
      prevHeartsRef.current = clampedHearts;
      return;
    }

    const existingRaw = window.localStorage.getItem(storageKey);
    const prevHearts = prevHeartsRef.current;

    // Fallback when no DB last_heart_update timestamp is provided
    if (!existingRaw || prevHearts >= MAX_HEARTS || clampedHearts < prevHearts) {
      const anchor = Date.now();
      window.localStorage.setItem(storageKey, String(anchor));
      setNow(anchor);
    }

    prevHeartsRef.current = clampedHearts;
  }, [clampedHearts, storageKey, validDbAnchorMs]);

  // Tick every second while hearts < 5 and trigger heart restoration when a 15m cycle completes
  useEffect(() => {
    if (clampedHearts >= MAX_HEARTS || typeof window === 'undefined') return undefined;

    const checkTick = () => {
      const currentNow = Date.now();
      setNow(currentNow);

      if (inFlight.current) return;

      const raw = window.localStorage.getItem(storageKey);
      const startedAt =
        validDbAnchorMs !== null ? validDbAnchorMs : raw ? Number(raw) : currentNow;
      const calc = computePassiveHeartRegen(
        clampedHearts,
        startedAt,
        currentNow,
        HEART_REGEN_INTERVAL_MS,
      );

      if (calc.restoredCount > 0) {
        const updateLocalAnchor = () => {
          if (calc.nextStartedAtMs === null) {
            window.localStorage.removeItem(storageKey);
          } else {
            window.localStorage.setItem(storageKey, String(calc.nextStartedAtMs));
          }
        };

        const handler = callbackRef.current;
        if (typeof handler === 'function') {
          updateLocalAnchor();
          handler(calc.restoredCount, calc.hearts, calc.nextStartedAtMs);
        } else if (handler?.onRegenerate) {
          inFlight.current = true;
          void Promise.resolve(
            handler.onRegenerate(calc.hearts, clampedHearts, calc.nextStartedAtMs),
          )
            .then((written) => {
              if (written !== false) {
                updateLocalAnchor();
              }
            })
            .finally(() => {
              inFlight.current = false;
            });
        } else {
          updateLocalAnchor();
        }
      }
    };

    checkTick();
    const timer = window.setInterval(checkTick, 1000);
    return () => window.clearInterval(timer);
  }, [clampedHearts, storageKey, validDbAnchorMs]);

  const rawAnchor =
    typeof window === 'undefined' ? null : window.localStorage.getItem(storageKey);
  const startedAt =
    validDbAnchorMs !== null ? validDbAnchorMs : rawAnchor ? Number(rawAnchor) : now;
  const calc = computePassiveHeartRegen(
    clampedHearts,
    startedAt,
    now,
    HEART_REGEN_INTERVAL_MS,
  );

  return {
    regenerating: calc.regenerating,
    remainingMs: calc.remainingMs,
    label: formatCountdown(calc.remainingMs),
  };
}
