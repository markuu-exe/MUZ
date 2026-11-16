/**
 * COURSE-6: daily streak from `profiles.last_activity_date` (a `date` column).
 * "Today" is the learner's local calendar day.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** The local calendar date of `d` as YYYY-MM-DD. */
export function toLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayNumber(date: string): number {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

/** Whole calendar days from `from` to `to` (negative if `to` is earlier). Full ISO timestamps are read by their date part. */
export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

/** Streak after a lesson finishes `today`. */
export function nextStreak(streak: number, lastActivity: string | null, today: string): number {
  if (!lastActivity) return 1;
  const gap = daysBetween(lastActivity, today);
  if (gap <= 0) return Math.max(streak, 1);
  if (gap === 1) return streak + 1;
  return 1;
}

/** Streak to show before any lesson today: it is still alive if the last activity was today or yesterday. */
export function displayedStreak(streak: number, lastActivity: string | null, today: string): number {
  if (!lastActivity) return 0;
  return daysBetween(lastActivity, today) <= 1 ? streak : 0;
}
