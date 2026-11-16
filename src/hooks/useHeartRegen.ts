/**
 * COURSE-6: heart regeneration that persists. The countdown runs while hearts < 5;
 * when a period completes, `onRegenerate(to, from)` writes the new value and the
 * timer advances only if that write succeeded. The timer start is kept per user in
 * localStorage (best effort: if storage is unavailable the timer restarts, which
 * only ever delays a heart, never grants one early).
 */
import { useEffect, useRef, useState } from 'react';
import { msUntilNextHeart, regenStep, type RegenState } from '../lib/progress/heartRegen';
import { MAX_HEARTS } from '../lesson/runner';

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function readAnchor(key: string): number | null {
  try {
    const raw = window.localStorage.getItem(key);
    const n = raw === null ? NaN : Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function writeAnchor(key: string, anchorMs: number | null): void {
  try {
    if (anchorMs === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, String(anchorMs));
  } catch {
    // Storage blocked: the timer restarts next load.
  }
}

export interface HeartRegenOptions {
  /** Persist the regenerated hearts; resolve true if they were written. Omit to only show the countdown (demo). */
  onRegenerate?: (to: number, from: number) => Promise<boolean>;
}

export function useHeartRegen(userId: string | undefined, hearts: number, { onRegenerate }: HeartRegenOptions = {}) {
  // v2: the old key held a first-visit time that was never cleared; reading it as a
  // timer start would refill hearts for every period since that first visit.
  const storageKey = `muz-heart-regen-v2-${userId ?? 'guest'}`;
  const [now, setNow] = useState(() => Date.now());
  const [anchorMs, setAnchorMs] = useState<number | null>(() => readAnchor(storageKey));
  const inFlight = useRef(false);
  const retryAt = useRef(0);
  const onRegenerateRef = useRef(onRegenerate);
  onRegenerateRef.current = onRegenerate;

  useEffect(() => setAnchorMs(readAnchor(storageKey)), [storageKey]);

  useEffect(() => {
    if (hearts >= MAX_HEARTS) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [hearts]);

  useEffect(() => {
    if (inFlight.current) return;
    // Read the clock here, not the `now` state: `now` stops ticking while hearts are full,
    // so a timer started from it after a heart is lost would begin in the past.
    const t = Date.now();
    const step = regenStep({ hearts, anchorMs }, t);

    if (step.gained === 0) {
      if (step.anchorMs !== anchorMs) {
        writeAnchor(storageKey, step.anchorMs);
        setAnchorMs(step.anchorMs);
      }
      return;
    }

    const persist = onRegenerateRef.current;
    if (!persist || t < retryAt.current) return;
    inFlight.current = true;
    void persist(step.hearts, hearts)
      .then((written) => {
        if (!written) return;
        writeAnchor(storageKey, step.anchorMs);
        setAnchorMs(step.anchorMs);
      })
      .catch(() => {
        retryAt.current = Date.now() + 30_000;
      })
      .finally(() => {
        inFlight.current = false;
      });
  }, [anchorMs, hearts, now, storageKey]);

  const state: RegenState = { hearts, anchorMs };
  const remainingMs = msUntilNextHeart(state, now);
  return {
    regenerating: hearts < MAX_HEARTS,
    remainingMs,
    label: formatCountdown(remainingMs),
  };
}
