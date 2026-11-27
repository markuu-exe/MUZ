/**
 * "Suggested practice" on Profile (owner request 2026-11-27): the weakest skill from the last
 * 30 days, the lesson to replay for it, a simple trend, and how it was chosen. Rule-based and
 * free (src/lib/analytics/suggestion.ts); every state says what it is based on.
 */
import { useMemo } from 'react';
import { Lightbulb, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useRecentPerformance } from '../../hooks/useRecentPerformance';
import type { CurriculumNode, NodeStatus, ProgressMap } from '../../lib/dashboard/curriculum';
import { GOOD_ENOUGH, SKILL_LABEL, WINDOW_DAYS, practiceSuggestion, type Trend } from '../../lib/analytics/suggestion';

interface Props {
  userId: string | null | undefined;
  isDemo: boolean;
  lessons: CurriculumNode[];
  progress: ProgressMap;
  exp: number;
  onOpen: (lesson: CurriculumNode, status: NodeStatus) => void;
}

const TREND: Record<Exclude<Trend, 'unknown'>, { text: string; Icon: typeof TrendingUp }> = {
  up: { text: 'Improving lately', Icon: TrendingUp },
  down: { text: 'Dipping lately', Icon: TrendingDown },
  steady: { text: 'Holding steady', Icon: Minus },
};

export default function PracticeSuggestionCard({ userId, isDemo, lessons, progress, exp, onOpen }: Props) {
  const { rows, loading, error, reload } = useRecentPerformance(userId, isDemo);
  const suggestion = useMemo(() => practiceSuggestion(rows, lessons, progress, exp), [rows, lessons, progress, exp]);

  return (
    <section aria-labelledby="suggestion-title" className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <h3 id="suggestion-title" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Lightbulb className="h-4 w-4 text-amber-300" aria-hidden="true" /> Suggested practice
        </h3>
        <span className="text-xs text-slate-400">Last {WINDOW_DAYS} days</span>
      </div>

      {loading ? (
        <p role="status" className="mt-3 text-sm text-slate-400">Looking at your recent results…</p>
      ) : error ? (
        <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 text-sm text-rose-200">
          Your recent results could not be loaded.
          <button type="button" onClick={reload} className="rounded-lg border border-rose-400/50 px-3 py-1 text-xs font-bold hover:border-rose-300">
            Try again
          </button>
        </div>
      ) : suggestion.kind === 'replay' ? (
        <div className="mt-3 space-y-3">
          <p className="text-lg font-black text-white">
            Replay “{suggestion.lesson.title}” to work on {SKILL_LABEL[suggestion.skill].toLowerCase()}
          </p>
          <p className="text-sm text-slate-300">{suggestion.explanation}</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onOpen(suggestion.lesson, suggestion.status)}
              className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#020617] transition hover:bg-amber-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-200"
            >
              Replay this lesson
            </button>
            {suggestion.trend !== 'unknown' && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                {(() => {
                  const { Icon, text } = TREND[suggestion.trend];
                  return (
                    <>
                      <Icon className="h-4 w-4" aria-hidden="true" /> {text}
                    </>
                  );
                })()}
              </span>
            )}
          </div>
        </div>
      ) : suggestion.kind === 'all-good' ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-semibold text-emerald-200">Every skill measured recently is at {GOOD_ENOUGH}% or more. Keep going with your next lesson.</p>
          <ul className="flex flex-wrap gap-2 text-xs text-slate-300">
            {suggestion.skills.map((s) => (
              <li key={s.skill} className="rounded-full border border-slate-700 px-2.5 py-1">
                {SKILL_LABEL[s.skill]}: {s.average}%
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-400">
          {isDemo
            ? 'Demo mode saves nothing, so there is no history to suggest from.'
            : 'Finish a few practice or rhythm lessons and MUZ will suggest the one to replay, based on your weakest skill.'}
        </p>
      )}
      <p className="mt-3 text-xs text-slate-400">
        Based on your own results only (rhythm, notes, chords and posture from lessons that measured them, and first-try theory accuracy). Worked out on this device; nothing is sent anywhere.
      </p>
    </section>
  );
}
