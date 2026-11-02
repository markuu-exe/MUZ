import { Lock, Music2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import {
  MODULE_COPY,
  groupByModule,
  nodeStatus,
  type CurriculumNode,
} from '../../lib/dashboard/curriculum';
import type { UserProgress } from '../../types/database.types';

interface SkillTreeViewProps {
  lessons: CurriculumNode[];
  progress: Record<string, UserProgress | Pick<UserProgress, 'lesson_id' | 'completed'>>;
  exp: number;
  hearts: number;
  shakingId: string | null;
  selectedId: string | null;
  onSelect: (lesson: CurriculumNode, status: ReturnType<typeof nodeStatus>) => void;
}

const KIND_LABEL: Record<CurriculumNode['kind'], string> = {
  theory: 'THEORY',
  practice: 'PRACTICE',
  rhythm: 'RHYTHM',
};

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
      <path
        d="M5 10.5 8.2 13.7 15 6.8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SkillTreeView({
  lessons,
  progress,
  exp,
  hearts,
  shakingId,
  selectedId,
  onSelect,
}: SkillTreeViewProps) {
  const modules = groupByModule(lessons);

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col items-center gap-14 pb-28">
      {modules.map(({ moduleIndex, lessons: nodes }) => {
        const copy = MODULE_COPY[moduleIndex] ?? {
          title: `Module ${moduleIndex}`,
          blurb: 'Continue your piano curriculum.',
        };
        const statuses = nodes.map((node, index) =>
          nodeStatus(node, index, nodes, progress, exp, lessons),
        );
        const moduleUnlocked = statuses.some((status) => status !== 'locked');

        return (
          <section key={moduleIndex} className="w-full">
            <div
              className={cn(
                'rounded-2xl border px-7 py-5',
                moduleUnlocked
                  ? 'border-white/10 bg-[#151826]'
                  : 'border-white/5 bg-[#12141f] opacity-60',
              )}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-400">
                Module {moduleIndex}
              </p>
              <h2 className="mt-1 text-[22px] font-semibold tracking-tight text-white">{copy.title}</h2>
              <p className="mt-1 text-sm text-white/50">{copy.blurb}</p>
            </div>

            <div className="relative mx-auto mt-8 flex w-full max-w-[320px] flex-col items-center">
              {nodes.map((lesson, index) => {
                const status = statuses[index];
                const isLast = index === nodes.length - 1;
                const nextStatus = isLast ? null : statuses[index + 1];
                const connectorClass =
                  status === 'mastered' && (nextStatus === 'mastered' || nextStatus === 'current')
                    ? 'bg-emerald-400'
                    : status === 'current' || nextStatus === 'current'
                      ? 'bg-violet-400/80'
                      : 'bg-white/15';
                const drillsDisabled = hearts === 0 && lesson.kind !== 'theory' && status !== 'locked';

                return (
                  <div key={lesson.id} className="relative flex w-full flex-col items-center">
                    {!isLast ? (
                      <div
                        className={cn(
                          'absolute left-1/2 top-[52px] h-[46px] w-px -translate-x-1/2',
                          connectorClass,
                        )}
                      />
                    ) : null}

                    <button
                      type="button"
                      onClick={() => onSelect(lesson, status)}
                      className={cn(
                        'relative z-10 flex w-[300px] items-center justify-between rounded-full border px-3.5 py-2.5 text-left transition duration-200',
                        status === 'mastered' &&
                          'border-emerald-400/90 bg-[#10251c] text-white hover:scale-[1.02]',
                        status === 'current' &&
                          'border-violet-400 bg-[#1a1630] text-white shadow-[0_0_28px_rgba(139,108,255,0.45)] hover:scale-[1.02]',
                        status === 'locked' && 'border-white/10 bg-[#141722] text-white/35',
                        shakingId === lesson.id && 'animate-node-shake',
                        selectedId === lesson.id && 'ring-2 ring-violet-300/80',
                        drillsDisabled && 'opacity-80',
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        {status === 'mastered' ? (
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400 text-slate-950">
                            <CheckIcon />
                          </span>
                        ) : status === 'current' ? (
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500 text-white">
                            <Music2 className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15">
                            <Lock className="h-3.5 w-3.5" />
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{lesson.title}</span>
                          {status === 'current' && lesson.unitCount ? (
                            <span className="block text-[11px] text-white/55">
                              {lesson.unitCompleted ?? 0} of {lesson.unitCount} lessons complete
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide',
                          status === 'mastered' && 'bg-white/10 text-emerald-200',
                          status === 'current' && 'bg-white/10 text-violet-200',
                          status === 'locked' && 'bg-white/5 text-white/30',
                        )}
                      >
                        {KIND_LABEL[lesson.kind]}
                      </span>
                    </button>

                    {drillsDisabled ? (
                      <p className="relative z-20 mt-2 rounded-full border border-white/10 bg-[#12141f] px-3 py-1 text-[11px] text-white/55">
                        Lesson Locked (No Hearts)
                      </p>
                    ) : null}

                    <div className={drillsDisabled ? 'h-5' : 'h-8'} />
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
