import { useEffect, useRef } from 'react';
import { Activity, BookOpen, Check, Heart, Lock, Piano, Trophy } from 'lucide-react';
import { cn } from '../../lib/cn';
import {
  MODULE_COPY,
  groupByModule,
  nodeStatus,
  nodeStatusLabel,
  type CurriculumNode,
  type NodeStatus,
} from '../../lib/dashboard/curriculum';
import { PATH_WIDTH, pathHeight, pathPoints, segmentPath } from '../../lib/dashboard/pathLayout';
import type { UserProgress } from '../../types/database.types';
import { isLessonPayload, type Tier } from '../../types/lesson.types';
import { lessonNeedsHearts } from '../../lesson/runner';
import { TIERS } from '../../content';
import UnitArt from './skilltree/UnitArt';

interface SkillTreeViewProps {
  lessons: CurriculumNode[];
  progress: Record<string, UserProgress | Pick<UserProgress, 'lesson_id' | 'completed'>>;
  exp: number;
  hearts: number;
  profileLoaded: boolean;
  shakingId: string | null;
  selectedId: string | null;
  onSelect: (lesson: CurriculumNode, status: NodeStatus) => void;
}

const KIND_META: Record<CurriculumNode['kind'], { label: string; icon: typeof BookOpen }> = {
  theory: { label: 'Theory', icon: BookOpen },
  practice: { label: 'Practice', icon: Piano },
  rhythm: { label: 'Rhythm', icon: Activity },
};

/** Colour theme per tier, so the three stages of the course read as distinct regions. */
const TIER_THEME: Record<Tier, { banner: string; art: string; chip: string; track: string; node: string; lip: string; ring: string }> = {
  novice: {
    banner: 'from-emerald-950/70 via-slate-900/80 to-slate-950',
    art: 'text-emerald-300/80',
    chip: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    track: '#10b981',
    node: 'from-violet-500 to-fuchsia-600',
    lip: 'shadow-[0_6px_0_#5b21b6]',
    ring: 'ring-violet-400/50',
  },
  proficient: {
    banner: 'from-sky-950/70 via-slate-900/80 to-slate-950',
    art: 'text-sky-300/80',
    chip: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
    track: '#10b981',
    node: 'from-sky-500 to-indigo-600',
    lip: 'shadow-[0_6px_0_#3730a3]',
    ring: 'ring-sky-400/50',
  },
  virtuoso: {
    banner: 'from-amber-950/60 via-slate-900/80 to-slate-950',
    art: 'text-amber-300/80',
    chip: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    track: '#10b981',
    node: 'from-amber-400 to-rose-500',
    lip: 'shadow-[0_6px_0_#9f1239]',
    ring: 'ring-amber-300/50',
  },
};

const NODE_SIZE = 68;

function isCheckpoint(lesson: CurriculumNode): boolean {
  return isLessonPayload(lesson.payload) && lesson.payload.isCheckpoint;
}


export default function SkillTreeView({
  lessons,
  progress,
  exp,
  hearts,
  profileLoaded,
  shakingId,
  selectedId,
  onSelect,
}: SkillTreeViewProps) {
  const modules = groupByModule(lessons);
  const currentRef = useRef<HTMLButtonElement | null>(null);
  const scrolledRef = useRef(false);

  // Bring the learner's next step into view once, the first time the path renders with one.
  useEffect(() => {
    if (scrolledRef.current || !currentRef.current) return;
    scrolledRef.current = true;
    currentRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });

  let courseIndex = 0;
  let previousTier: Tier | null = null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-10 pb-40">
      {modules.map(({ moduleIndex, lessons: nodes }) => {
        const copy = MODULE_COPY[moduleIndex];
        const tier: Tier = copy?.tier ?? 'novice';
        const theme = TIER_THEME[tier];
        const statuses = nodes.map((node, index) => nodeStatus(node, index, nodes, progress, exp, lessons));
        const completed = statuses.filter((s) => s === 'mastered').length;
        const unitLocked = statuses.every((s) => s === 'locked');
        const points = pathPoints(nodes.length, courseIndex);
        courseIndex += nodes.length;
        const showTierHeader = tier !== previousTier;
        previousTier = tier;

        return (
          <section key={moduleIndex} className="w-full" aria-labelledby={`unit-${moduleIndex}-title`}>
            {showTierHeader && (
              <div className="mb-6 flex items-center gap-3" role="presentation">
                <div className="h-px flex-1 bg-slate-800" />
                <span className={cn('rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]', theme.chip)}>
                  {TIERS[tier].label} · {TIERS[tier].level}
                </span>
                <div className="h-px flex-1 bg-slate-800" />
              </div>
            )}

            {/* Unit banner */}
            <div
              className={cn(
                'relative overflow-hidden rounded-3xl border bg-gradient-to-br p-6 shadow-xl',
                theme.banner,
                unitLocked ? 'border-slate-800/60 opacity-70' : 'border-slate-700/70',
              )}
            >
              <UnitArt
                unit={moduleIndex}
                className={cn('pointer-events-none absolute -right-2 top-1/2 h-28 w-40 -translate-y-1/2', theme.art, unitLocked && 'opacity-40')}
              />
              <div className="relative max-w-[70%]">
                <div className="flex items-center gap-2">
                  <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider', theme.chip)}>
                    Unit {moduleIndex}
                  </span>
                  {unitLocked && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                      <Lock className="h-3 w-3" aria-hidden="true" /> Locked
                    </span>
                  )}
                </div>
                <h2 id={`unit-${moduleIndex}-title`} className="mt-2 text-2xl font-bold tracking-tight text-white">
                  {copy?.title.replace(/^Unit \d+:\s*/, '') ?? `Unit ${moduleIndex}`}
                </h2>
                <p className="mt-1 text-sm text-slate-300/80">{copy?.blurb.replace(/^[^·]+·\s*/, '')}</p>
                <div className="mt-4 flex items-center gap-3">
                  <div
                    className="h-2 w-48 overflow-hidden rounded-full bg-slate-800"
                    role="progressbar"
                    aria-label={`Unit ${moduleIndex} progress`}
                    aria-valuemin={0}
                    aria-valuemax={nodes.length}
                    aria-valuenow={completed}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-300 transition-all duration-500"
                      style={{ width: `${(completed / nodes.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-slate-300">
                    {completed} / {nodes.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Winding path */}
            <div className="relative mx-auto mt-6" style={{ width: PATH_WIDTH, height: pathHeight(nodes.length) }}>
              <svg
                className="absolute inset-0"
                width={PATH_WIDTH}
                height={pathHeight(nodes.length)}
                aria-hidden="true"
                focusable="false"
              >
                {points.slice(1).map((p, i) => {
                  const from = points[i];
                  const done = statuses[i] === 'mastered';
                  const lit = done && statuses[i + 1] !== 'locked';
                  return (
                    <g key={i}>
                      <path d={segmentPath(from, p)} fill="none" style={{ stroke: 'rgb(var(--c-slate-800))' }} strokeWidth={14} strokeLinecap="round" />
                      <path
                        d={segmentPath(from, p)}
                        fill="none"
                        style={{ stroke: lit ? theme.track : 'rgb(var(--c-slate-600))' }}
                        strokeWidth={lit ? 6 : 4}
                        strokeLinecap="round"
                        strokeDasharray={lit ? undefined : '2 12'}
                      />
                    </g>
                  );
                })}
              </svg>

              {nodes.map((lesson, index) => {
                const status = statuses[index];
                const point = points[index];
                const checkpoint = isCheckpoint(lesson);
                const kind = KIND_META[lesson.kind];
                const KindIcon = kind.icon;
                const isCurrent = status === 'current';
                const size = isCurrent || checkpoint ? NODE_SIZE + 10 : NODE_SIZE;
                const heartsBlocked =
                  profileLoaded &&
                  hearts === 0 &&
                  status !== 'locked' &&
                  isLessonPayload(lesson.payload) &&
                  lessonNeedsHearts(lesson.payload);
                const meta = nodeStatusLabel(lesson, status, exp, lessons, progress);

                return (
                  <div key={lesson.id}>
                    {isCurrent && (
                      <div
                        className="pointer-events-none absolute z-20 -translate-x-1/2 motion-safe:animate-bounce"
                        style={{ left: point.x, top: point.y - size / 2 - 40 }}
                        aria-hidden="true"
                      >
                        <span className="relative block rounded-xl border border-white/10 bg-white px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-900 shadow-lg">
                          Start
                          <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[6px] border-x-transparent border-t-white" />
                        </span>
                      </div>
                    )}

                    <button
                      ref={isCurrent ? currentRef : undefined}
                      data-node-id={lesson.id}
                      type="button"
                      onClick={() => onSelect(lesson, status)}
                      aria-label={`${lesson.title}. ${kind.label} lesson${checkpoint ? ', checkpoint' : ''}. ${meta}.`}
                      aria-current={isCurrent ? 'step' : undefined}
                      className={cn(
                        'absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 transition-transform duration-150',
                        'focus:outline-none focus-visible:ring-4 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
                        'hover:-translate-y-[calc(50%+2px)] active:translate-y-[calc(-50%+4px)]',
                        status === 'mastered' &&
                          'border-emerald-300/60 bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 shadow-[0_6px_0_#065f46]',
                        isCurrent && cn('border-white/70 bg-gradient-to-b text-white ring-8', theme.node, theme.lip, theme.ring),
                        status === 'locked' && 'border-slate-700 bg-slate-800 text-slate-400 shadow-[0_6px_0_#0f172a]',
                        checkpoint && status !== 'locked' && 'border-amber-200/80',
                        shakingId === lesson.id && 'animate-node-shake ring-4 ring-amber-400/70',
                        selectedId === lesson.id && 'ring-4 ring-white/70',
                      )}
                      style={{ left: point.x, top: point.y, width: size, height: size }}
                    >
                      {status === 'locked' ? (
                        <Lock className="h-6 w-6" aria-hidden="true" />
                      ) : status === 'mastered' ? (
                        checkpoint ? <Trophy className="h-7 w-7" aria-hidden="true" /> : <Check className="h-8 w-8" strokeWidth={3} aria-hidden="true" />
                      ) : checkpoint ? (
                        <Trophy className="h-8 w-8" aria-hidden="true" />
                      ) : (
                        <KindIcon className="h-8 w-8" aria-hidden="true" />
                      )}
                      {isCurrent && (
                        <span className="pointer-events-none absolute inset-0 rounded-full ring-4 ring-white/30 motion-safe:animate-ping" aria-hidden="true" />
                      )}
                    </button>

                    {/* Label beside the node, on the side away from the swing */}
                    <div
                      className={cn(
                        'pointer-events-none absolute z-10 w-[190px] -translate-y-1/2',
                        point.labelSide === 'right' ? 'text-left' : 'text-right',
                      )}
                      style={
                        point.labelSide === 'right'
                          ? { left: point.x + size / 2 + 16, top: point.y }
                          : { left: point.x - size / 2 - 16 - 190, top: point.y }
                      }
                      aria-hidden="true"
                    >
                      <p
                        className={cn(
                          'text-sm font-bold leading-snug',
                          status === 'locked' ? 'text-slate-400' : 'text-white',
                        )}
                      >
                        {lesson.title}
                      </p>
                      <p
                        className={cn(
                          'mt-0.5 text-[11px] font-semibold',
                          status === 'mastered' && 'text-emerald-400',
                          isCurrent && 'text-violet-200',
                          status === 'locked' && 'text-slate-400',
                        )}
                      >
                        {meta}
                      </p>
                      <span
                        className={cn(
                          'mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                          status === 'locked' ? 'border-slate-800 text-slate-400' : 'border-slate-700 bg-slate-900/80 text-slate-300',
                        )}
                      >
                        <KindIcon className="h-3 w-3" />
                        {checkpoint ? 'Checkpoint' : kind.label}
                      </span>
                      {heartsBlocked && (
                        <span
                          className={cn(
                            'mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-300',
                            point.labelSide === 'left' && 'justify-end',
                          )}
                        >
                          <Heart className="h-3 w-3" /> Needs a heart
                        </span>
                      )}
                    </div>
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
