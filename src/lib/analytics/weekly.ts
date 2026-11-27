/**
 * P8: daily goal and weekly summary for the Profile page, from data the app already keeps.
 *
 * Daily goal (owner decision 2026-11-27): finish one lesson today. It uses the streak's own
 * rule (ruling D9: any finished, non-quit lesson run) and the streak's own record,
 * `profiles.last_activity_date`, so the goal and the streak can never disagree.
 *
 * Weekly summary: the last 7 local calendar days (today included) from `performance_records`.
 * A performance record is written only when a lesson ran a playing or rhythm exercise
 * (applyResult), so theory-only lessons count for the goal and the streak but not here;
 * the UI says so. Days are the device's local days, like the streak.
 * These values are written by the browser (ruling D14): they are a progress view, not proof.
 */
import { daysBetween, toLocalDate } from '../progress/streak';

export const DAILY_GOAL_LESSONS = 1;
export const WEEK_DAYS = 7;

export interface WeeklyRow {
  session_timestamp: string;
  drill_duration_sec: number | null;
}

export interface WeekDay {
  /** Local date YYYY-MM-DD. */
  date: string;
  /** Short weekday name ("Mon"). */
  label: string;
  isToday: boolean;
  /** Recorded playing/rhythm sessions that day. */
  sessions: number;
  /** Recorded drill time that day, whole minutes (rounded). */
  minutes: number;
  /** Any lesson finished that day that we know of (a session, or today's streak activity). */
  active: boolean;
}

export interface WeeklySummary {
  days: WeekDay[];
  activeDays: number;
  sessions: number;
  minutes: number;
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Start of the local day `WEEK_DAYS - 1` days before `now`, as an ISO instant (for the query). */
export function weekStartIso(now: Date): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (WEEK_DAYS - 1));
  return d.toISOString();
}

/** Whether today's goal is met: the streak's last activity is today (local). */
export function dailyGoalMet(lastActivityDate: string | null | undefined, now: Date): boolean {
  if (!lastActivityDate) return false;
  return daysBetween(lastActivityDate, toLocalDate(now)) === 0;
}

export function weeklySummary(rows: readonly WeeklyRow[], now: Date, lastActivityDate: string | null | undefined): WeeklySummary {
  const days: WeekDay[] = [];
  for (let i = WEEK_DAYS - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    days.push({ date: toLocalDate(d), label: WEEKDAY[d.getDay()], isToday: i === 0, sessions: 0, minutes: 0, active: false });
  }
  const byDate = new Map(days.map((d) => [d.date, d]));
  const seconds = new Map<string, number>();
  for (const row of rows) {
    const t = new Date(row.session_timestamp);
    if (Number.isNaN(t.getTime())) continue;
    const day = byDate.get(toLocalDate(t));
    if (!day) continue;
    day.sessions++;
    day.active = true;
    const s = Number(row.drill_duration_sec);
    if (Number.isFinite(s) && s > 0) seconds.set(day.date, (seconds.get(day.date) ?? 0) + s);
  }
  for (const d of days) d.minutes = Math.round((seconds.get(d.date) ?? 0) / 60);
  if (dailyGoalMet(lastActivityDate, now)) days[days.length - 1].active = true;
  return {
    days,
    activeDays: days.filter((d) => d.active).length,
    sessions: days.reduce((n, d) => n + d.sessions, 0),
    minutes: Math.round([...seconds.values()].reduce((a, b) => a + b, 0) / 60),
  };
}
