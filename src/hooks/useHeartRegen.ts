import { useEffect, useState } from 'react';

const HEART_REGEN_MS = 15 * 60 * 1000;

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function useHeartRegen(userId: string | undefined, hearts: number) {
  const storageKey = `muz-heart-regen-${userId ?? 'guest'}`;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.localStorage.getItem(storageKey)) {
      window.localStorage.setItem(storageKey, String(Date.now()));
    }
  }, [storageKey]);

  useEffect(() => {
    if (hearts >= 5) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [hearts]);

  const startedAt = Number(
    (typeof window === 'undefined' ? null : window.localStorage.getItem(storageKey)) ?? Date.now(),
  );
  const elapsed = Math.max(0, now - startedAt);
  const remainingMs = hearts >= 5 ? 0 : HEART_REGEN_MS - (elapsed % HEART_REGEN_MS);

  return {
    regenerating: hearts < 5,
    remainingMs,
    label: formatCountdown(remainingMs),
  };
}
