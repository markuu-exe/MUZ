import { CheckCircle2, Flame, Heart, Sparkles } from 'lucide-react';
import { expProgress } from '../../lib/dashboard/curriculum';
import { clampHearts, MAX_HEARTS } from '../../lib/gamification';

interface DashboardHudProps {
  hearts: number;
  streak: number;
  exp: number;
  nextHeartLabel?: string;
  practicedToday?: boolean;
  streakAtRisk?: boolean;
}

export default function DashboardHud({
  hearts,
  streak,
  exp,
  nextHeartLabel,
  practicedToday = true,
  streakAtRisk = false,
}: DashboardHudProps) {
  const clampedHearts = clampHearts(hearts);
  const progress = expProgress(exp);

  return (
    <div className="flex flex-wrap items-center justify-end gap-3 md:gap-4">
      {/* 1. Hearts / Stamina visual counter (0 to 5) + Regeneration Countdown */}
      <div
        className={`group relative flex items-center gap-2.5 rounded-2xl border px-3.5 py-2 transition-all ${
          clampedHearts === 0
            ? 'border-rose-500/50 bg-rose-500/10 shadow-[0_0_16px_rgba(244,63,94,0.25)]'
            : 'border-slate-800/90 bg-slate-900/90 hover:border-rose-500/30'
        }`}
        title={`Stamina: ${clampedHearts}/${MAX_HEARTS} Hearts${
          clampedHearts < MAX_HEARTS && nextHeartLabel ? ` · Next in ${nextHeartLabel}` : ''
        }`}
      >
        <div className="flex items-center gap-1">
          {Array.from({ length: MAX_HEARTS }).map((_, index) => {
            const isFilled = index < clampedHearts;
            return (
              <Heart
                key={index}
                className={`h-4 w-4 transition-all duration-300 ${
                  isFilled
                    ? 'fill-rose-500 text-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.7)]'
                    : 'text-slate-600/70'
                }`}
              />
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 border-l border-slate-700/60 pl-2.5">
          <span
            className={`text-xs font-bold tracking-tight tabular-nums ${
              clampedHearts === 0 ? 'text-rose-400' : 'text-slate-200'
            }`}
          >
            {clampedHearts}/{MAX_HEARTS}
          </span>
          {clampedHearts < MAX_HEARTS && nextHeartLabel ? (
            <span className="hidden rounded-md bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-rose-300 xl:inline">
              +1 in {nextHeartLabel}
            </span>
          ) : (
            <span className="hidden text-[11px] font-medium uppercase tracking-wider text-slate-400 xl:inline">
              Hearts
            </span>
          )}
        </div>

        {clampedHearts === 0 && (
          <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
        )}
      </div>

      {/* 2. Daily Streak Badge with Flame icon */}
      <div
        className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2 transition-all ${
          streakAtRisk
            ? 'border-orange-500/50 bg-orange-500/15 shadow-[0_0_15px_rgba(249,115,22,0.18)]'
            : 'border-amber-500/30 bg-gradient-to-r from-amber-500/15 to-orange-500/10 shadow-[0_0_15px_rgba(245,158,11,0.12)] hover:border-amber-500/50'
        }`}
        title={
          streakAtRisk
            ? `${streak}-day streak at risk! Complete a lesson today to extend your streak.`
            : practicedToday
              ? `${streak} consecutive days of piano practice (Today's streak logged)`
              : `${streak} consecutive days of piano practice`
        }
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 animate-flame">
          <Flame className="h-4 w-4 fill-amber-400 text-amber-400" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xs font-extrabold uppercase tracking-wide text-amber-300 tabular-nums">
            {streak}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90">
            {streak === 1 ? 'DAY' : 'DAYS'}
          </span>
        </div>
        {practicedToday && streak > 0 && (
          <CheckCircle2
            className="h-3.5 w-3.5 text-emerald-400"
            aria-label="Practiced today"
          />
        )}
      </div>

      {/* 3. EXP Progress Bar against next tier requirement */}
      <div
        className="flex min-w-[210px] sm:min-w-[240px] flex-col justify-center gap-1.5 rounded-2xl border border-slate-800/90 bg-slate-900/90 px-3.5 py-1.5 transition-all hover:border-violet-500/30"
        title={`${exp} EXP total · ${progress.label} (${progress.percent}% toward next tier)`}
      >
        <div className="flex items-center justify-between text-[11px]">
          <span className="inline-flex items-center gap-1 font-semibold text-violet-300">
            <Sparkles className="h-3 w-3" />
            <span className="truncate max-w-[100px]">
              {progress.label.replace(' Learner', '')}
            </span>
          </span>
          <span className="font-mono font-bold text-slate-200 tabular-nums">
            {exp.toLocaleString()} / {progress.nextAt.toLocaleString()}{' '}
            <span className="text-violet-400 font-sans text-[10px]">XP</span>
          </span>
        </div>

        {/* High-contrast Progress Bar */}
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800/90">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-purple-400 to-fuchsia-400 transition-all duration-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
            style={{ width: `${Math.min(100, Math.max(4, progress.percent))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
