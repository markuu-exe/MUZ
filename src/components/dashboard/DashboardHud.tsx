import { Flame, Heart, UserRound } from 'lucide-react';
import { learnerTier } from '../../lib/dashboard/curriculum';

interface DashboardHudProps {
  hearts: number;
  streak: number;
  exp: number;
}

export default function DashboardHud({ hearts, streak, exp }: DashboardHudProps) {
  const clampedHearts = Math.max(0, Math.min(5, hearts));
  const tier = learnerTier(exp);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#161a27] px-3 py-1.5">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Heart
              key={index}
              className={
                index < clampedHearts
                  ? 'h-3.5 w-3.5 fill-rose-500 text-rose-500'
                  : 'h-3.5 w-3.5 text-white/25'
              }
            />
          ))}
        </div>
        <span className="text-xs font-semibold tabular-nums text-white/80">{clampedHearts}/5</span>
      </div>

      <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#161a27] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white/85">
        <Flame className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        {streak} Days
      </div>

      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#161a27] px-3 py-1.5 text-xs font-semibold text-white/85">
        <UserRound className="h-3.5 w-3.5 text-violet-300" />
        <span className="tabular-nums">
          {exp}/{tier.nextAt} XP
        </span>
      </div>
    </div>
  );
}
