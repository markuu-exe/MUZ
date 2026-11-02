import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  GitBranch,
  Heart,
  LogOut,
  Music2,
  Piano,
  Settings,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useHeartRegen } from '../../hooks/useHeartRegen';
import { cn } from '../../lib/cn';
import {
  displayNameFromProfile,
  expProgress,
  groupByModule,
  nodeStatus,
  type CurriculumNode,
  type DashboardView,
  type NodeStatus,
} from '../../lib/dashboard/curriculum';
import DashboardHud from './DashboardHud';
import SkillTreeView from './SkillTreeView';

const NAV: Array<{ id: DashboardView; label: string; icon: typeof GitBranch }> = [
  { id: 'skill-tree', label: 'Skill Tree', icon: GitBranch },
  { id: 'lessons', label: 'Lessons', icon: BookOpen },
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const KIND_LABEL: Record<CurriculumNode['kind'], string> = {
  theory: 'Theory',
  practice: 'Practice',
  rhythm: 'Rhythm',
};

export default function DashboardScreen() {
  const { user, profile, isDemo, signOut } = useAuth();
  const data = useDashboardData(profile, isDemo);
  const [view, setView] = useState<DashboardView>('skill-tree');
  const [banner, setBanner] = useState<string | null>(null);
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<CurriculumNode | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<NodeStatus | null>(null);

  const hearts = profile?.hearts ?? 5;
  const streak = profile?.current_streak ?? 0;
  const exp = profile?.exp ?? 0;
  const name = displayNameFromProfile(profile, user?.email);
  const progressMeta = expProgress(exp);
  const regen = useHeartRegen(profile?.id ?? user?.id, hearts);

  const masteredCount = useMemo(
    () => data.lessons.filter((lesson) => data.progress[lesson.id]?.completed).length,
    [data.lessons, data.progress],
  );

  const currentNode = useMemo(() => {
    const modules = groupByModule(data.lessons);
    for (const group of modules) {
      const found = group.lessons.find((lesson, index) => {
        return nodeStatus(lesson, index, group.lessons, data.progress, exp, data.lessons) === 'current';
      });
      if (found) return found;
    }
    return null;
  }, [data.lessons, data.progress, exp]);

  const handleSelect = (lesson: CurriculumNode, status: NodeStatus) => {
    if (status === 'locked') {
      setSelected(null);
      setSelectedStatus(null);
      setShakingId(lesson.id);
      window.setTimeout(() => setShakingId(null), 520);
      const reason =
        exp < (lesson.required_exp ?? 0)
          ? `Requires ${lesson.required_exp} EXP before this node unlocks.`
          : 'Complete the previous node before this lesson can be opened.';
      setBanner(`${lesson.title} is locked. ${reason}`);
      return;
    }

    if (hearts === 0 && lesson.kind !== 'theory') {
      setSelected(null);
      setSelectedStatus(null);
      setShakingId(lesson.id);
      window.setTimeout(() => setShakingId(null), 520);
      setBanner('Practice drills stay disabled until a heart restores. Theory lessons remain free.');
      return;
    }

    setBanner(null);
    setSelected(lesson);
    setSelectedStatus(status);
  };

  const startLabel = selected
    ? hearts === 0 && selected.kind === 'theory'
      ? `Start ${selected.title} (Free)`
      : selectedStatus === 'mastered'
        ? `Replay ${selected.title}`
        : `Start ${selected.title}`
    : 'Start node';

  return (
    <div className="flex min-h-screen bg-[#0b0e18] text-white">
      <aside className="flex w-[232px] shrink-0 flex-col border-r border-white/10 bg-[#10131d] px-4 py-5">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500 text-white">
            <Music2 className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold tracking-[0.18em]">MUZ</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setView(item.id);
                  if (item.id === 'settings') {
                    setSelected(null);
                    setSelectedStatus(null);
                  }
                }}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  active ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto flex items-center gap-3 rounded-xl px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-[11px] text-white/45">{progressMeta.label}</p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/10 px-8 py-4">
          <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
          <DashboardHud hearts={hearts} streak={streak} exp={exp} />
        </header>

        {hearts === 0 ? (
          <div className="flex items-center justify-between gap-4 border-b border-rose-500/30 bg-gradient-to-r from-rose-500/20 to-fuchsia-500/10 px-8 py-3">
            <div className="flex items-center gap-3">
              <Heart className="h-4 w-4 fill-rose-400 text-rose-400" />
              <div>
                <p className="text-sm font-semibold text-rose-100">You are out of Hearts!</p>
                <p className="text-xs text-rose-100/70">
                  Complete a Theory lesson to earn a heart back instantly.
                </p>
              </div>
            </div>
            <span className="rounded-full bg-rose-500 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white">
              Next heart in {regen.label}
            </span>
          </div>
        ) : null}

        <main className="relative flex-1 overflow-y-auto px-8 py-8">
          {banner ? (
            <div
              role="alert"
              className="mx-auto mb-6 max-w-2xl rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100"
            >
              {banner}
            </div>
          ) : null}

          {data.loading ? (
            <div className="mx-auto max-w-2xl space-y-4">
              <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
              <div className="mx-auto h-12 w-72 animate-pulse rounded-full bg-white/5" />
              <div className="mx-auto h-12 w-72 animate-pulse rounded-full bg-white/5" />
            </div>
          ) : null}

          {!data.loading && view === 'skill-tree' ? (
            <SkillTreeView
              lessons={data.lessons}
              progress={data.progress}
              exp={exp}
              hearts={hearts}
              shakingId={shakingId}
              selectedId={selected?.id ?? null}
              onSelect={handleSelect}
            />
          ) : null}

          {!data.loading && view === 'lessons' ? (
            <section className="mx-auto max-w-3xl">
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold">Lessons</h2>
                  <p className="mt-1 text-sm text-white/50">
                    Piano curriculum nodes, gated by mastery and EXP.
                  </p>
                </div>
                {currentNode ? (
                  <button
                    type="button"
                    onClick={() => handleSelect(currentNode, 'current')}
                    className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold hover:bg-violet-400"
                  >
                    Continue {currentNode.title}
                  </button>
                ) : null}
              </div>
              <div className="space-y-3">
                {data.lessons.map((lesson, _index, all) => {
                  const moduleLessons = all
                    .filter((item) => item.module_index === lesson.module_index)
                    .sort((a, b) => a.node_index - b.node_index);
                  const status = nodeStatus(
                    lesson,
                    moduleLessons.findIndex((item) => item.id === lesson.id),
                    moduleLessons,
                    data.progress,
                    exp,
                    data.lessons,
                  );
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => handleSelect(lesson, status)}
                      className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-[#151826] px-5 py-4 text-left transition hover:border-white/20"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                          Module {lesson.module_index} · Node {lesson.node_index}
                        </p>
                        <p className="mt-1 text-sm font-semibold">{lesson.title}</p>
                        <p className="mt-1 text-xs text-white/45">{lesson.description}</p>
                      </div>
                      <div className="ml-4 flex shrink-0 flex-col items-end gap-1">
                        <span className="text-[11px] uppercase tracking-wide text-white/40">
                          {KIND_LABEL[lesson.kind]}
                        </span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize',
                            status === 'mastered' && 'bg-emerald-400/15 text-emerald-300',
                            status === 'current' && 'bg-violet-400/15 text-violet-200',
                            status === 'locked' && 'bg-white/5 text-white/40',
                          )}
                        >
                          {status}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {!data.loading && view === 'profile' ? (
            <section className="mx-auto max-w-3xl space-y-4">
              <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#151826]">
                <div className="h-20 bg-gradient-to-r from-violet-600/40 via-fuchsia-500/20 to-transparent" />
                <div className="-mt-8 flex items-end gap-4 px-6 pb-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#151826] bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xl font-bold">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="pb-1">
                    <h2 className="text-xl font-semibold">{name}</h2>
                    <p className="text-sm text-white/50">{progressMeta.label}</p>
                    <p className="text-xs text-white/35">{user?.email}</p>
                  </div>
                </div>
              </article>

              <article className="rounded-2xl border border-white/10 bg-[#151826] p-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">EXP toward next tier</span>
                  <span className="font-semibold tabular-nums">
                    {exp}/{progressMeta.nextAt} XP
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-violet-400"
                    style={{ width: `${progressMeta.percent}%` }}
                  />
                </div>
              </article>

              <div className="grid gap-4 md:grid-cols-4">
                <article className="rounded-2xl border border-white/10 bg-[#151826] p-5">
                  <p className="text-xs uppercase tracking-wide text-white/45">Hearts</p>
                  <p className="mt-2 text-2xl font-semibold">{hearts}/5</p>
                </article>
                <article className="rounded-2xl border border-white/10 bg-[#151826] p-5">
                  <p className="text-xs uppercase tracking-wide text-white/45">Streak</p>
                  <p className="mt-2 text-2xl font-semibold">{streak} days</p>
                </article>
                <article className="rounded-2xl border border-white/10 bg-[#151826] p-5">
                  <p className="text-xs uppercase tracking-wide text-white/45">EXP</p>
                  <p className="mt-2 text-2xl font-semibold">{exp.toLocaleString()}</p>
                </article>
                <article className="rounded-2xl border border-white/10 bg-[#151826] p-5">
                  <p className="text-xs uppercase tracking-wide text-white/45">Nodes mastered</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {masteredCount}/{data.lessons.length}
                  </p>
                </article>
              </div>

              <article className="rounded-2xl border border-white/10 bg-[#151826] p-5">
                <div className="flex items-center gap-3">
                  <Piano className="h-5 w-5 text-violet-300" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/45">Instrument focus</p>
                    <p className="mt-1 text-lg font-semibold capitalize">
                      {profile?.instrument_focus ?? 'piano'}
                    </p>
                    <p className="mt-1 text-sm text-white/45">
                      Curriculum is locked to piano for this release.
                    </p>
                  </div>
                </div>
              </article>

              {currentNode ? (
                <article className="flex items-center justify-between rounded-2xl border border-violet-400/30 bg-violet-500/10 p-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-violet-300">Continue learning</p>
                    <p className="mt-1 text-lg font-semibold">{currentNode.title}</p>
                    <p className="mt-1 text-sm text-white/55">{currentNode.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setView('skill-tree');
                      handleSelect(currentNode, 'current');
                    }}
                    className="rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold hover:bg-violet-400"
                  >
                    Open node
                  </button>
                </article>
              ) : null}
            </section>
          ) : null}

          {view === 'settings' ? (
            <section className="mx-auto max-w-xl space-y-4">
              <article className="rounded-2xl border border-white/10 bg-[#151826] p-6">
                <h2 className="text-xl font-semibold">Settings</h2>
                <p className="mt-2 text-sm text-white/50">
                  Piano is the only instrument track available. Alternate instruments stay disabled.
                </p>
                {isDemo ? (
                  <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                    Guest demo session — progress is local until you create an account.
                  </p>
                ) : null}
                {data.usingFallback && !isDemo ? (
                  <p className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
                    Lesson catalog is using the built-in piano curriculum until the remote table is populated.
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm hover:border-rose-400/40 hover:text-rose-300"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </article>
            </section>
          ) : null}

          {selected && view !== 'settings' ? (
            <div className="pointer-events-none sticky bottom-6 z-20 mx-auto max-w-xl">
              <div className="pointer-events-auto rounded-2xl border border-violet-400/40 bg-[#161427] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.45)]">
                {hearts === 0 && selected.kind === 'theory' ? (
                  <div className="mb-3 flex items-start gap-2 text-amber-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Theory lessons are free</p>
                      <p className="mt-1 text-xs text-amber-100/80">
                        Theory lessons do not cost hearts to play. Learn now to instantly recover a heart.
                      </p>
                    </div>
                  </div>
                ) : null}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-violet-300">
                      {KIND_LABEL[selected.kind]}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">{selected.title}</h3>
                    <p className="mt-1 text-sm text-white/55">{selected.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(null);
                      setSelectedStatus(null);
                    }}
                    className="text-xs text-white/50 hover:text-white"
                  >
                    Close
                  </button>
                </div>
                <button
                  type="button"
                  className="mt-4 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-400"
                >
                  {startLabel}
                </button>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
