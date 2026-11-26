/**
 * COURSE-6: heart regeneration that persists. The countdown runs while hearts < 5;
 * when a period completes, `onRegenerate(to, from, nextAnchorIso)` writes the new
 * values and the timer advances only if that write succeeded. For authenticated users,
 * `dbAnchorIso` (`profiles.last_heart_update`) is authoritative across devices/sessions
 * and `localStorage` serves as a local fallback/cache.
 */
import { useEffect, useRef, useState } from 'react';
import { msUntilNextHeart, parseHeartAnchor, regenStep, type RegenState } from '../lib/progress/heartRegen';
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
  /** Authoritative timer anchor from `profiles.last_heart_update` (ISO string or null). Omit in demo/unauthenticated mode. */
  dbAnchorIso?: string | null;
  /** Persist an initial anchor when hearts < 5 and DB has none yet, or clear it when hearts === 5. */
  onSyncAnchor?: (anchorIso: string | null, expectedHearts: number) => Promise<void>;
  /** Persist the regenerated hearts and next anchor; resolve true if they were written. Omit to only show the countdown (demo). */
  onRegenerate?: (to: number, from: number, nextAnchorIso: string | null) => Promise<boolean>;
}

export function useHeartRegen(
  userId: string | undefined,
  hearts: number,
  { dbAnchorIso, onSyncAnchor, onRegenerate }: HeartRegenOptions = {},
) {
  // v2: the old key held a first-visit time that was never cleared; reading it as a
  // timer start would refill hearts for every period since that first visit.
  const storageKey = `muz-heart-regen-v2-${userId ?? 'guest'}`;
  const hasDbAnchor = dbAnchorIso !== undefined;
  const dbAnchorMs = hasDbAnchor ? parseHeartAnchor(dbAnchorIso) : null;
  const [now, setNow] = useState(() => Date.now());
  const [anchorState, setAnchorState] = useState<{ key: string; value: number | null }>(() => ({
    key: storageKey,
    value: readAnchor(storageKey),
  }));
  const localAnchorMs = anchorState.key === storageKey ? anchorState.value : readAnchor(storageKey);
  const anchorMs = hasDbAnchor ? (dbAnchorMs ?? (hearts < MAX_HEARTS ? localAnchorMs : null)) : localAnchorMs;
  const inFlight = useRef(false);
  const syncAnchorInFlight = useRef(false);
  const lastSyncedSignature = useRef<string | null>(null);
  const retryAt = useRef(0);
  const onRegenerateRef = useRef(onRegenerate);
  onRegenerateRef.current = onRegenerate;
  const onSyncAnchorRef = useRef(onSyncAnchor);
  onSyncAnchorRef.current = onSyncAnchor;

  useEffect(() => {
    setAnchorState({ key: storageKey, value: readAnchor(storageKey) });
  }, [storageKey]);

  useEffect(() => {
    if (!hasDbAnchor) return;
    if (dbAnchorMs !== null) {
      writeAnchor(storageKey, dbAnchorMs);
      setAnchorState({ key: storageKey, value: dbAnchorMs });
    } else if (hearts >= MAX_HEARTS) {
      writeAnchor(storageKey, null);
      setAnchorState({ key: storageKey, value: null });
    }
  }, [hasDbAnchor, dbAnchorMs, hearts, storageKey]);

  useEffect(() => {
    if (hearts >= MAX_HEARTS) return undefined;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [hearts]);

  useEffect(() => {
    if (inFlight.current) return;
    // Read the clock here, not the `now` state: `now` stops ticking while hearts are full,
    // so a timer started from it after a heart is lost would begin in the past.
    const t = Date.now();
    const currentAnchor = hasDbAnchor
      ? (dbAnchorMs ?? (hearts < MAX_HEARTS && anchorState.key === storageKey ? anchorState.value : null))
      : (anchorState.key === storageKey ? anchorState.value : readAnchor(storageKey));
    const step = regenStep({ hearts, anchorMs: currentAnchor }, t);

    // Keep DB `last_heart_update` in sync when hearts < 5 has no DB anchor yet, or hearts === 5 has a stale one.
    const syncAnchor = onSyncAnchorRef.current;
    if (hasDbAnchor && syncAnchor && !syncAnchorInFlight.current) {
      if (hearts < MAX_HEARTS && dbAnchorMs === null && step.anchorMs !== null) {
        const sig = `${storageKey}:${hearts}:start`;
        if (lastSyncedSignature.current !== sig) {
          lastSyncedSignature.current = sig;
          syncAnchorInFlight.current = true;
          void syncAnchor(new Date(step.anchorMs).toISOString(), hearts).finally(() => {
            syncAnchorInFlight.current = false;
          });
        }
      } else if (hearts >= MAX_HEARTS && dbAnchorMs !== null) {
        const sig = `${storageKey}:${hearts}:clear`;
        if (lastSyncedSignature.current !== sig) {
          lastSyncedSignature.current = sig;
          syncAnchorInFlight.current = true;
          void syncAnchor(null, hearts).finally(() => {
            syncAnchorInFlight.current = false;
          });
        }
      } else {
        lastSyncedSignature.current = null;
      }
    }

    if (step.gained === 0) {
      if (step.anchorMs !== currentAnchor || anchorState.key !== storageKey) {
        writeAnchor(storageKey, step.anchorMs);
        setAnchorState({ key: storageKey, value: step.anchorMs });
      }
      return;
    }

    const persist = onRegenerateRef.current;
    if (!persist || t < retryAt.current) return;
    inFlight.current = true;
    const nextAnchorIso = step.anchorMs === null ? null : new Date(step.anchorMs).toISOString();
    void persist(step.hearts, hearts, nextAnchorIso)
      .then((written) => {
        if (!written) return;
        writeAnchor(storageKey, step.anchorMs);
        setAnchorState({ key: storageKey, value: step.anchorMs });
      })
      .catch(() => {
        retryAt.current = Date.now() + 30_000;
      })
      .finally(() => {
        inFlight.current = false;
      });
  }, [anchorState, dbAnchorMs, hasDbAnchor, hearts, now, storageKey]);

  const state: RegenState = { hearts, anchorMs };
  const remainingMs = msUntilNextHeart(state, now);
  return {
    regenerating: hearts < MAX_HEARTS,
    remainingMs,
    label: formatCountdown(remainingMs),
  };
}
