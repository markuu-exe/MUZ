/** Best performance score per song, kept on this device (performance mode is practice: nothing is saved to the account). */
export const BEST_KEY = 'muz-perform-best';

export function readBestScores(): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(BEST_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, v]) => typeof v === 'number' && v >= 0 && v <= 100)) as Record<string, number>;
  } catch {
    return {};
  }
}

/** Saves the score if it beats the stored best; returns whether it was a new best. */
export function saveBestScore(songId: string, score: number): boolean {
  const best = readBestScores();
  if ((best[songId] ?? -1) >= score) return false;
  try {
    window.localStorage.setItem(BEST_KEY, JSON.stringify({ ...best, [songId]: score }));
  } catch {
    // Storage unavailable: the best score lasts for this page only.
  }
  return true;
}
