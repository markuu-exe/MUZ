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

export function useHeartRegen(
  userId: string | undefined,
  hearts: number,
  onRegenerate?: (restoredCount: number, nextHearts: number) => void,
) {
  const storageKey = `muz-heart-regen-${userId ?? 'guest'}`;
  const clampedHearts = clampHearts(hearts);
  const [now, setNow] = useState(() => Date.now());
  const prevHeartsRef = useRef<number>(clampedHearts);
  const onRegenRef = useRef(onRegenerate);
  onRegenRef.current = onRegenerate;

  // Manage regeneration timer anchor in localStorage when hearts change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (clampedHearts >= MAX_HEARTS) {
      window.localStorage.removeItem(storageKey);
      prevHeartsRef.current = clampedHearts;
      return;
    }

    const existingRaw = window.localStorage.getItem(storageKey);
    const prevHearts = prevHeartsRef.current;

    // If hearts just dropped from full (5) or no timer was stored, start a fresh 15m cycle
    if (!existingRaw || prevHearts >= MAX_HEARTS || clampedHearts < prevHearts) {
      const anchor = Date.now();
      window.localStorage.setItem(storageKey, String(anchor));
      setNow(anchor);
    }

    prevHeartsRef.current = clampedHearts;
  }, [clampedHearts, storageKey]);

  // Tick every second while hearts < 5 and trigger heart restoration when a 15m cycle completes
  useEffect(() => {
    if (clampedHearts >= MAX_HEARTS || typeof window === 'undefined') return undefined;

    const checkTick = () => {
      const currentNow = Date.now();
      setNow(currentNow);

      const raw = window.localStorage.getItem(storageKey);
      const startedAt = raw ? Number(raw) : currentNow;
      const calc = computePassiveHeartRegen(
        clampedHearts,
        startedAt,
        currentNow,
        HEART_REGEN_INTERVAL_MS,
      );

      if (calc.restoredCount > 0) {
        if (calc.nextStartedAtMs === null) {
          window.localStorage.removeItem(storageKey);
        } else {
          window.localStorage.setItem(storageKey, String(calc.nextStartedAtMs));
        }
        onRegenRef.current?.(calc.restoredCount, calc.hearts);
      }
    };

    checkTick();
    const timer = window.setInterval(checkTick, 1000);
    return () => window.clearInterval(timer);
  }, [clampedHearts, storageKey]);

  const rawAnchor =
    typeof window === 'undefined' ? null : window.localStorage.getItem(storageKey);
  const startedAt = rawAnchor ? Number(rawAnchor) : now;
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
