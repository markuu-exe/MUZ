/**
 * P8: today's goal (finish one lesson, the streak's own rule) and the last 7 days.
 * Each day shows its numbers as text and a check mark, so nothing relies on colour alone.
 */
import { CheckCircle2, Circle, Target } from 'lucide-react';
import { useMemo } from 'react';
import { useWeeklyActivity } from '../../hooks/useWeeklyActivity';
import { DAILY_GOAL_LESSONS, dailyGoalMet, weeklySummary } from '../../lib/analytics/weekly';
import { cn } from '../../lib/cn';

interface WeeklyGoalCardProps {
  userId: string | null | undefined;
  isDemo: boolean;
  lastActivityDate: string | null | undefined;
}

export default function WeeklyGoalCard({ userId, isDemo, lastActivityDate }: WeeklyGoalCardProps) {
  const { rows, loading, error, reload } = useWeeklyActivity(userId, isDemo);
  const now = useMemo(() => new Date(), []);
  const goalMet = dailyGoalMet(lastActivityDate, now);
  const week = useMemo(() => weeklySummary(rows, now, lastActivityDate), [rows, now, lastActivityDate]);
  const maxMinutes = Math.max(1, ...week.days.map((d) => d.minutes));

  return (
    <section aria-labelledby="weekly-goal-title" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 id="weekly-goal-title" className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Today's goal
          </h3>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
            <Target className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>
        <p className="mt-3 flex items-center gap-2 text-2xl font-black text-white">
          {goalMet ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-400" aria-hidden="true" />
          ) : (
            <Circle className="h-6 w-6 text-slate-400" aria-hidden="true" />
          )}
          {goalMet ? DAILY_GOAL_LESSONS : 0} of {DAILY_GOAL_LESSONS} lesson
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {goalMet ? 'Done for today. Your streak is safe.' : 'Finish any lesson today to meet it and keep your streak.'}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Last 7 days</h3>
          {!loading && !error && (
            <p className="text-xs text-slate-300">
              <strong className="text-white">{week.activeDays}</strong> of 7 days active ·{' '}
              <strong className="text-white">{week.sessions}</strong> recorded {week.sessions === 1 ? 'session' : 'sessions'} ·{' '}
              <strong className="text-white">{week.minutes}</strong> min of drills
            </p>
          )}
        </div>

        {loading ? (
          <p role="status" className="mt-4 text-sm text-slate-400">Loading this week…</p>
        ) : error ? (
          <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 text-sm text-rose-200">
            This week could not be loaded.
            <button type="button" onClick={reload} className="rounded-lg border border-rose-400/50 px-3 py-1 text-xs font-bold hover:border-rose-300">
              Try again
            </button>
          </div>
        ) : (
          <ul className="mt-4 grid grid-cols-7 gap-2" aria-label="Activity in the last 7 days">
            {week.days.map((d) => (
              <li
                key={d.date}
                aria-label={`${d.label}${d.isToday ? ' (today)' : ''}: ${d.active ? 'active' : 'no lesson'}, ${d.sessions} recorded ${d.sessions === 1 ? 'session' : 'sessions'}, ${d.minutes} minutes`}
                className="flex flex-col items-center gap-1"
              >
                <div className="flex h-16 w-full items-end justify-center rounded-lg bg-slate-950/70 p-1" aria-hidden="true">
                  <div
                    className={cn('w-3/5 rounded-md', d.active ? 'bg-violet-400' : 'bg-slate-700')}
                    style={{ height: d.minutes > 0 ? `${Math.max(12, (d.minutes / maxMinutes) * 100)}%` : d.active ? '12%' : '4%' }}
                  />
                </div>
                <span aria-hidden="true" className={cn('text-xs font-bold', d.isToday ? 'text-white' : 'text-slate-400')}>
                  {d.label}
                </span>
                <span aria-hidden="true" className="text-xs text-slate-300">
                  {d.active ? '✓' : '–'} {d.minutes > 0 ? `${d.minutes}m` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs leading-snug text-slate-400">
          {isDemo
            ? 'Demo mode saves nothing, so this week stays empty.'
            : 'Sessions and minutes come from lessons with a playing or rhythm exercise. Theory-only lessons count toward today’s goal and your streak.'}
        </p>
      </div>
    </section>
  );
}
