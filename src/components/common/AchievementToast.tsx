import { Trophy, X } from 'lucide-react';
import {
  ACHIEVEMENT_DESCRIPTIONS,
  ACHIEVEMENT_TITLES,
  type AchievementId,
} from '../../lib/progress/achievements';

export interface AchievementToastItem {
  key: string;
  id: AchievementId;
}

interface AchievementToastProps {
  toasts: readonly AchievementToastItem[];
  onDismiss: (key: string) => void;
}

/** Side pop-up notifications for newly unlocked achievements. */
export default function AchievementToast({ toasts, onDismiss }: AchievementToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Achievement notifications"
      className="pointer-events-none fixed right-5 top-20 z-[70] flex w-80 max-w-[calc(100vw-2.5rem)] flex-col gap-3"
    >
      {toasts.map(({ key, id }) => (
        <div
          key={key}
          role="status"
          className="animate-achievement-toast-in pointer-events-auto flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-slate-900/95 p-3.5 shadow-[0_12px_36px_rgba(0,0,0,0.55),0_0_24px_rgba(245,158,11,0.18)] backdrop-blur-md"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-500/15 text-amber-300">
            <Trophy className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Achievement Unlocked
            </p>
            <p className="truncate text-sm font-bold text-white">
              {ACHIEVEMENT_TITLES[id]}
            </p>
            <p className="mt-0.5 text-xs leading-snug text-slate-300">
              {ACHIEVEMENT_DESCRIPTIONS[id]}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onDismiss(key)}
            aria-label={`Dismiss ${ACHIEVEMENT_TITLES[id]} notification`}
            className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
