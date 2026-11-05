import { Lock, Music2, CheckCircle2, Sparkles, BookOpen, Dumbbell, Activity } from 'lucide-react';
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

const KIND_CONFIG: Record<
  CurriculumNode['kind'],
  { label: string; icon: typeof BookOpen; color: string; badgeBg: string }
> = {
  theory: {
    label: 'Theory',
    icon: BookOpen,
    color: 'text-sky-400',
    badgeBg: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  },
  practice: {
    label: 'Practice',
    icon: Dumbbell,
    color: 'text-violet-400',
    badgeBg: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  },
  rhythm: {
    label: 'Rhythm',
    icon: Activity,
    color: 'text-amber-400',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
};

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
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-12 pb-32">
      {modules.map(({ moduleIndex, lessons: nodes }) => {
        const copy = MODULE_COPY[moduleIndex] ?? {
          title: `Module ${moduleIndex}: Advanced Piano Technique`,
          blurb: 'Continue expanding your harmonic mastery and motor independence.',
        };
        const statuses = nodes.map((node, index) =>
          nodeStatus(node, index, nodes, progress, exp, lessons),
        );
        const completedInModule = statuses.filter((s) => s === 'mastered').length;
        const moduleUnlocked = statuses.some((status) => status !== 'locked');

        return (
          <section key={moduleIndex} className="w-full">
            {/* Module Header Card */}
            <div
              className={cn(
                'relative overflow-hidden rounded-3xl border p-6 backdrop-blur-md transition-all',
                moduleUnlocked
                  ? 'border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950 shadow-xl'
                  : 'border-slate-800/50 bg-slate-950/60 opacity-60',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
                  <Sparkles className="h-3 w-3" />
                  Module {moduleIndex}
                </span>

                <span className="text-xs font-semibold text-slate-400 tabular-nums">
                  {completedInModule} / {nodes.length} Complete
                </span>
              </div>

              <h2 className="mt-3 text-2xl font-bold tracking-tight text-white">{copy.title}</h2>
              <p className="mt-1 text-sm text-slate-400">{copy.blurb}</p>

              {/* Module Progress Bar */}
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                  style={{ width: `${(completedInModule / nodes.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Vertical Pathway Nodes */}
            <div className="relative mx-auto mt-8 flex w-full max-w-md flex-col items-center">
              {nodes.map((lesson, index) => {
                const status = statuses[index];
                const isLast = index === nodes.length - 1;
                const nextStatus = isLast ? null : statuses[index + 1];
                const kindMeta = KIND_CONFIG[lesson.kind];
                const KindIcon = kindMeta.icon;

                // Visual connector line between vertical nodes
                const isConnectorActive =
                  status === 'mastered' && (nextStatus === 'mastered' || nextStatus === 'current');
                const isConnectorCurrent = status === 'current' || nextStatus === 'current';

                const drillsDisabled = hearts === 0 && lesson.kind !== 'theory' && status !== 'locked';

                return (
                  <div key={lesson.id} className="relative flex w-full flex-col items-center">
                    {/* Conduit Line connecting to next node */}
                    {!isLast && (
                      <div
                        className={cn(
                          'absolute left-1/2 top-[58px] z-0 h-[48px] w-1 -translate-x-1/2 transition-colors duration-300',
                          isConnectorActive
                            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                            : isConnectorCurrent
                              ? 'bg-gradient-to-b from-violet-500 to-slate-800'
                              : 'bg-slate-800',
                        )}
                      />
                    )}

                    {/* Node Interactive Item with 3 distinct visual states: Locked, Available (Current), Completed */}
                    <button
                      type="button"
                      onClick={() => onSelect(lesson, status)}
                      className={cn(
                        'group relative z-10 flex w-full max-w-[360px] items-center justify-between rounded-2xl border p-4 text-left transition-all duration-200',
                        // State 1: Completed (checkmark, emerald green)
                        status === 'mastered' &&
                          'border-emerald-500/70 bg-[#0c1f17]/90 text-white shadow-[0_4px_20px_rgba(16,185,129,0.15)] hover:border-emerald-400 hover:scale-[1.02]',
                        // State 2: Available / Current (highlighted / glowing, radiant purple/violet beacon)
                        status === 'current' &&
                          'border-violet-400 bg-gradient-to-r from-violet-950/80 via-slate-900 to-violet-950/80 text-white shadow-[0_0_28px_rgba(139,92,246,0.4)] ring-2 ring-violet-400/40 hover:scale-[1.02] hover:shadow-[0_0_36px_rgba(139,92,246,0.55)]',
                        // State 3: Locked (greyed out / padlock)
                        status === 'locked' &&
                          'border-slate-800/90 bg-slate-950/70 text-slate-500 hover:border-slate-700/80 hover:bg-slate-900/60 cursor-pointer',
                        // Shake animation when clicked while locked
                        shakingId === lesson.id && 'animate-node-shake border-amber-500/80 ring-2 ring-amber-500/40',
                        // Selected highlight
                        selectedId === lesson.id && 'ring-2 ring-violet-400 shadow-glow',
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-3.5">
                        {/* Status Icon Disc */}
                        {status === 'mastered' ? (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 shadow-md">
                            <CheckCircle2 className="h-6 w-6" />
                          </div>
                        ) : status === 'current' ? (
                          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.6)]">
                            <Music2 className="h-5 w-5 animate-pulse" />
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
                              <span className="relative inline-flex h-3 w-3 rounded-full bg-violet-500" />
                            </span>
                          </div>
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-900/90 text-slate-500 group-hover:text-slate-400">
                            <Lock className="h-5 w-5" />
                          </div>
                        )}

                        {/* Title and details */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'truncate text-sm font-bold',
                                status === 'mastered' && 'text-slate-100',
                                status === 'current' && 'text-white',
                                status === 'locked' && 'text-slate-400 group-hover:text-slate-300',
                              )}
                            >
                              {lesson.title}
                            </span>
                          </div>

                          {status === 'current' && (
                            <span className="mt-0.5 block text-xs font-medium text-violet-300">
                              {lesson.unitCompleted ?? 0} of {lesson.unitCount ?? 3} units complete
                            </span>
                          )}

                          {status === 'mastered' && (
                            <span className="mt-0.5 block text-xs font-medium text-emerald-400">
                              Mastered · +{lesson.required_exp || 50} XP
                            </span>
                          )}

                          {status === 'locked' && (
                            <span className="mt-0.5 block text-xs text-slate-500 group-hover:text-amber-400/90 transition-colors">
                              {lesson.required_exp && lesson.required_exp > exp
                                ? `Requires ${lesson.required_exp} XP`
                                : 'Locked · Click to view prerequisites'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Tag: Kind Badge (Theory, Practice, Rhythm) */}
                      <div className="ml-3 shrink-0">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                            status === 'locked'
                              ? 'border-slate-800 bg-slate-900 text-slate-500'
                              : kindMeta.badgeBg,
                          )}
                        >
                          <KindIcon className="h-3 w-3" />
                          {kindMeta.label}
                        </span>
                      </div>
                    </button>

                    {/* Low stamina warning if applicable */}
                    {drillsDisabled && (
                      <p className="relative z-20 mt-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[11px] font-medium text-rose-300">
                        Practice drill paused · 0 Hearts available
                      </p>
                    )}

                    {/* Conduit spacing gap */}
                    <div className={drillsDisabled ? 'h-6' : 'h-10'} />
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
