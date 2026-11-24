import { Flame, Heart, Sparkles, AlertCircle } from 'lucide-react';
import { expProgress } from '../../lib/dashboard/curriculum';
import { profileHudPresentation } from '../../lib/dashboard/profileHud';
import type { ProfileStatus } from '../../types/auth.types';

interface DashboardHudProps {
  hearts: number;
  streak: number;
  exp: number;
  nextHeartLabel?: string;
  profileStatus: ProfileStatus;
  onRetry?: () => void;
}

export default function DashboardHud({
  hearts,
  streak,
  exp,
  nextHeartLabel,
  profileStatus,
  onRetry,
}: DashboardHudProps) {
  const { showValues, message, canRetry } = profileHudPresentation(profileStatus);
  const clampedHearts = Math.max(0, Math.min(5, hearts));
  const progress = expProgress(exp);

  return (
    <div className="flex flex-wrap items-center justify-end gap-3 md:gap-4">
      {/* 1. Hearts / Stamina visual counter (0 to 5) */}
      <div
        className={`group relative flex items-center gap-2.5 rounded-2xl border px-3.5 py-2 transition-all ${
          showValues && clampedHearts === 0
            ? 'border-rose-500/50 bg-rose-500/10 shadow-[0_0_16px_rgba(244,63,94,0.25)]'
            : 'border-slate-800/90 bg-slate-900/90 hover:border-rose-500/30'
        }`}
        title={
          showValues
            ? `Stamina: ${clampedHearts}/5 Hearts${
                clampedHearts < 5 && nextHeartLabel ? ` · Next in ${nextHeartLabel}` : ''
              }`
            : 'Stamina values are unavailable while the profile is not loaded.'
        }
      >
        <div className="flex items-center gap-1">
          {showValues ? (
            Array.from({ length: 5 }).map((_, index) => {
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
            })
          ) : (
            <span className="px-1 text-sm font-bold text-slate-400" aria-hidden="true">—</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 border-l border-slate-700/60 pl-2.5">
          <span
            className={`text-xs font-bold tracking-tight tabular-nums ${
              clampedHearts === 0 ? 'text-rose-400' : 'text-slate-200'
            }`}
          >
            {showValues ? `${clampedHearts}/5` : '—'}
          </span>
          <span className="hidden text-[11px] font-medium uppercase tracking-wider text-slate-400 xl:inline">
            Hearts
          </span>
        </div>

        {showValues && clampedHearts === 0 && (
          <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
        )}
      </div>

      {/* 2. Streak Badge with Flame icon */}
      <div
        className="flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 to-orange-500/10 px-3.5 py-2 shadow-[0_0_15px_rgba(245,158,11,0.12)] transition-all hover:border-amber-500/50"
        title={showValues ? `${streak} consecutive days of piano practice` : 'Practice streak is unavailable while the profile is not loaded.'}
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 animate-flame">
          <Flame className="h-4 w-4 fill-amber-400 text-amber-400" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xs font-extrabold uppercase tracking-wide text-amber-300 tabular-nums">
            {showValues ? streak : '—'}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90">
            {showValues && streak === 1 ? 'DAY' : 'DAYS'}
          </span>
        </div>
      </div>

      {/* 3. EXP Progress Bar against next tier requirement */}
      <div
        className="flex min-w-[210px] sm:min-w-[240px] flex-col justify-center gap-1.5 rounded-2xl border border-slate-800/90 bg-slate-900/90 px-3.5 py-1.5 transition-all hover:border-violet-500/30"
        title={showValues ? `${exp} EXP total · ${progress.label} (${progress.percent}% toward next tier)` : 'EXP progress is unavailable while the profile is not loaded.'}
      >
        <div className="flex items-center justify-between text-[11px]">
          <span className="inline-flex items-center gap-1 font-semibold text-violet-300">
            <Sparkles className="h-3 w-3" />
            <span className="truncate max-w-[100px]">{showValues ? progress.label.replace(' Learner', '') : '—'}</span>
          </span>
          <span className="font-mono font-bold text-slate-200 tabular-nums">
            {showValues ? `${exp.toLocaleString()} / ${progress.nextAt.toLocaleString()}` : '—'} {showValues && <span className="text-violet-400 font-sans text-[10px]">XP</span>}
          </span>
        </div>

        {/* High-contrast Progress Bar */}
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800/90">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-purple-400 to-fuchsia-400 transition-all duration-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
            style={{ width: showValues ? `${Math.min(100, Math.max(4, progress.percent))}%` : '0%' }}
          />
        </div>
      </div>
      {message && (
        <div
          role={profileStatus === 'failed' ? 'alert' : 'status'}
          className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{message}</span>
          {canRetry && onRetry && (
            <button type="button" onClick={onRetry} className="ml-1 font-bold underline underline-offset-2">
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
