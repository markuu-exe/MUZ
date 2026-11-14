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
  Play,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Sliders,
  Volume2,
  Camera,
  Layers,
  ChevronRight,
  Flame,
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
import ProfileAnalyticsView from './ProfileAnalyticsView';

interface NavItem {
  id: DashboardView;
  label: string;
  icon: typeof GitBranch;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'skill-tree', label: 'Skill Tree', icon: GitBranch },
  { id: 'lessons', label: 'Lessons', icon: BookOpen },
  { id: 'profile', label: 'Profile & Analytics', icon: UserRound },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function DashboardScreen() {
  const { user, profile, isDemo, signOut } = useAuth();
  const data = useDashboardData(profile, isDemo);
  const [view, setView] = useState<DashboardView>('skill-tree');
  const [banner, setBanner] = useState<{ message: string; type: 'warning' | 'error' | 'info' } | null>(null);
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<CurriculumNode | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<NodeStatus | null>(null);
  const [lessonFilter, setLessonFilter] = useState<'all' | 'theory' | 'practice' | 'rhythm'>('all');

  const hearts = profile?.hearts ?? 4;
  const streak = profile?.current_streak ?? 7;
  const exp = profile?.exp ?? 1240;
  const username = displayNameFromProfile(profile, user?.email);
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

  // Click handler for Skill Tree & Lesson nodes
  const handleSelect = (lesson: CurriculumNode, status: NodeStatus) => {
    if (status === 'locked') {
      setSelected(null);
      setSelectedStatus(null);
      setShakingId(lesson.id);
      window.setTimeout(() => setShakingId(null), 500);

      const requiredExp = lesson.required_exp ?? 0;
      let reason = 'You must complete the prerequisite lesson nodes to unlock this pathway.';
      if (exp < requiredExp) {
        reason = `Requires ${requiredExp} EXP before this node can be unlocked (Current: ${exp} EXP).`;
      }

      setBanner({
        message: `Node Locked: "${lesson.title}". ${reason}`,
        type: 'warning',
      });
      return;
    }

    if (hearts === 0 && lesson.kind !== 'theory') {
      setSelected(null);
      setSelectedStatus(null);
      setShakingId(lesson.id);
      window.setTimeout(() => setShakingId(null), 500);
      setBanner({
        message: 'No Stamina Hearts remaining! Complete a free Theory unit or wait for your heart regeneration.',
        type: 'error',
      });
      return;
    }

    setBanner(null);
    setSelected(lesson);
    setSelectedStatus(status);
  };

  // Filtered lessons for Lessons view
  const filteredLessons = useMemo(() => {
    if (lessonFilter === 'all') return data.lessons;
    return data.lessons.filter((l) => l.kind === lessonFilter);
  }, [data.lessons, lessonFilter]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#070b14] text-slate-100 font-sans select-none">
      {/* =========================================================================
          LEFT-ALIGNED VERTICAL SIDEBAR
          ========================================================================= */}
      <aside className="flex w-[260px] shrink-0 flex-col border-r border-slate-800/90 bg-[#0c1220] px-4 py-6 shadow-2xl">
        {/* App Branding & Logo */}
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.5)]">
            <Piano className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-widest text-white">MUZ</span>
              <span className="rounded-md border border-violet-500/40 bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-300">
                PRO
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400">Piano Instruction</p>
          </div>
        </div>

        {/* Sidebar Navigation Links */}
        <nav className="flex flex-1 flex-col gap-1.5">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Navigation
          </p>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setView(item.id);
                  if (item.id === 'settings' || item.id === 'profile') {
                    setSelected(null);
                    setSelectedStatus(null);
                  }
                }}
                className={cn(
                  'group flex items-center justify-between rounded-2xl px-3.5 py-3 text-sm font-semibold transition-all duration-200',
                  active
                    ? 'border border-violet-500/40 bg-gradient-to-r from-violet-600/25 to-purple-600/10 text-white shadow-[0_0_15px_rgba(139,92,246,0.2)]'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100',
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-xl transition-colors',
                      active ? 'bg-violet-600 text-white' : 'bg-slate-800/80 text-slate-400 group-hover:text-slate-200',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span>{item.label}</span>
                </div>

                {active && (
                  <span className="h-2 w-2 rounded-full bg-violet-400 shadow-[0_0_8px_#a78bfa]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile Snippet (Bottom of Sidebar) */}
        <div className="mt-auto border-t border-slate-800/80 pt-4">
          <div className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/80 p-3 shadow-md">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-sm font-extrabold text-white shadow-md">
                {username.charAt(0).toUpperCase()}
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-500" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-white">{username}</p>
                <p className="truncate text-[10px] font-semibold text-violet-300">
                  {progressMeta.label}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void signOut()}
              title="Sign out of MUZ"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700/60 text-slate-400 hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          MAIN APPLICATION WORKSPACE (TOP HEADER & VIEWPORT)
          ========================================================================= */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#070b14]">
        {/* TOP GAMIFICATION HEADER */}
        <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-800/90 bg-[#0c1220]/90 px-8 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400">
                  Desktop Studio
                </span>
                {isDemo && (
                  <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                    Guest Demo
                  </span>
                )}
              </div>
              <h1 className="text-xl font-black tracking-tight text-white capitalize">
                {view === 'skill-tree'
                  ? 'Piano Skill Tree'
                  : view === 'profile'
                    ? 'Profile & Performance Telemetry'
                    : view === 'lessons'
                      ? 'Piano Curriculum Catalog'
                      : 'Studio Settings'}
              </h1>
            </div>
          </div>

          {/* Top Gamification Metrics (Hearts, Streak, EXP Bar) */}
          <DashboardHud
            hearts={hearts}
            streak={streak}
            exp={exp}
            nextHeartLabel={regen.label}
          />
        </header>

        {/* Global Warning / Locked Node Notification Banner */}
        {banner && (
          <div
            role="alert"
            className={cn(
              'flex items-center justify-between border-b px-8 py-3 text-sm font-semibold transition-all',
              banner.type === 'warning' &&
                'border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-slate-900 to-amber-500/10 text-amber-200',
              banner.type === 'error' &&
                'border-rose-500/30 bg-gradient-to-r from-rose-500/15 via-slate-900 to-rose-500/10 text-rose-200',
              banner.type === 'info' &&
                'border-violet-500/30 bg-gradient-to-r from-violet-500/15 via-slate-900 to-violet-500/10 text-violet-200',
            )}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>{banner.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Depleted Stamina Notification Bar */}
        {hearts === 0 && !banner && (
          <div className="flex items-center justify-between border-b border-rose-500/30 bg-rose-500/15 px-8 py-2.5 text-xs text-rose-100">
            <div className="flex items-center gap-2 font-medium">
              <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
              <span>
                <strong>0 Hearts remaining:</strong> Practice drills are locked. Play a Theory lesson to recover stamina immediately.
              </span>
            </div>
            <span className="font-bold uppercase tracking-wider text-rose-300">
              Next Heart in {regen.label}
            </span>
          </div>
        )}

        {/* Scrollable Main Content Container */}
        <main className="relative flex-1 overflow-y-auto px-8 py-8">
          {/* VIEW 1: SKILL TREE PROGRESSION (Default State) */}
          {view === 'skill-tree' && (
            <SkillTreeView
              lessons={data.lessons}
              progress={data.progress}
              exp={exp}
              hearts={hearts}
              shakingId={shakingId}
              selectedId={selected?.id ?? null}
              onSelect={handleSelect}
            />
          )}

          {/* VIEW 2: PROFILE & ANALYTICS DASHBOARD */}
          {view === 'profile' && (
            <ProfileAnalyticsView
              profile={profile}
              userEmail={user?.email}
              masteredCount={masteredCount}
              totalLessons={data.lessons.length}
            />
          )}

          {/* VIEW 3: LESSONS CATALOG */}
          {view === 'lessons' && (
            <div className="mx-auto max-w-4xl space-y-6 pb-28">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Interactive Lesson Catalog</h2>
                  <p className="text-sm text-slate-400">
                    All piano curriculum nodes organized by learning modality and progression gates.
                  </p>
                </div>

                {/* Filter buttons */}
                <div className="flex items-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-900/90 p-1">
                  {(['all', 'theory', 'practice', 'rhythm'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setLessonFilter(filter)}
                      className={cn(
                        'rounded-xl px-3 py-1.5 text-xs font-bold capitalize transition-all',
                        lessonFilter === filter
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200',
                      )}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {filteredLessons.map((lesson) => {
                  const moduleLessons = data.lessons
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
                    <div
                      key={lesson.id}
                      onClick={() => handleSelect(lesson, status)}
                      className={cn(
                        'flex cursor-pointer items-center justify-between rounded-2xl border p-5 transition-all duration-200',
                        status === 'mastered' &&
                          'border-emerald-500/40 bg-slate-900/80 hover:border-emerald-500/70',
                        status === 'current' &&
                          'border-violet-400/80 bg-gradient-to-r from-violet-950/40 to-slate-900 shadow-md hover:border-violet-400',
                        status === 'locked' &&
                          'border-slate-800/80 bg-slate-950/60 opacity-60 hover:opacity-85',
                      )}
                    >
                      <div className="min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Module {lesson.module_index} · Node {lesson.node_index}
                          </span>
                          <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-300">
                            {lesson.kind}
                          </span>
                        </div>
                        <h3 className="mt-1 text-base font-bold text-white">{lesson.title}</h3>
                        <p className="mt-0.5 text-xs text-slate-400">{lesson.description}</p>
                      </div>

                      <div className="shrink-0 text-right">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider',
                            status === 'mastered' && 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
                            status === 'current' && 'bg-violet-500/20 text-violet-300 border border-violet-500/40',
                            status === 'locked' && 'bg-slate-800 text-slate-400 border border-slate-700',
                          )}
                        >
                          {status === 'mastered' && <CheckCircle2 className="h-3.5 w-3.5" />}
                          {status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 4: SETTINGS */}
          {view === 'settings' && (
            <div className="mx-auto max-w-2xl space-y-6 pb-28">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400">
                    <Sliders className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Audio & Posture Calibration</h2>
                    <p className="text-xs text-slate-400">Configure your local sensors and acoustic analysis.</p>
                  </div>
                </div>

                <div className="mt-6 space-y-4 border-t border-slate-800/80 pt-6">
                  <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-center gap-3">
                      <Volume2 className="h-5 w-5 text-violet-400" />
                      <div>
                        <p className="text-sm font-semibold text-white">Chromagram Pitch Tracking</p>
                        <p className="text-xs text-slate-400">Browser WASM pitch latch window (400ms buffer).</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                      Active
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-center gap-3">
                      <Camera className="h-5 w-5 text-emerald-400" />
                      <div>
                        <p className="text-sm font-semibold text-white">MediaPipe Hand & Wrist Pose Lock</p>
                        <p className="text-xs text-slate-400">Ergonomic verification for piano practice posture.</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                      Enabled
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-center gap-3">
                      <Layers className="h-5 w-5 text-cyan-400" />
                      <div>
                        <p className="text-sm font-semibold text-white">Active Instrument Track</p>
                        <p className="text-xs text-slate-400">Curriculum is calibrated for 88-key Acoustic Piano.</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-300">Acoustic Piano</span>
                  </div>
                </div>
              </div>

              {/* Account Management & Sign Out */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Account & Session
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Logged in as <strong className="text-white">{user?.email || username}</strong>
                </p>

                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-rose-300 hover:bg-rose-500/20 transition-all"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out of MUZ
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              SELECTED NODE INTERACTIVE TRAY / DRAWER
              ========================================================================= */}
          {selected && (
            <div className="pointer-events-none fixed bottom-8 left-1/2 z-30 w-full max-w-xl -translate-x-1/2 px-4">
              <div className="pointer-events-auto rounded-3xl border border-violet-500/50 bg-[#0d1322]/95 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.65)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-violet-500/40 bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-300">
                        {selected.kind} Unit
                      </span>
                      <span className="text-xs text-slate-400">
                        Module {selected.module_index} · Node {selected.node_index}
                      </span>
                    </div>

                    <h3 className="mt-2 text-xl font-bold text-white">{selected.title}</h3>
                    <p className="mt-1 text-sm text-slate-300 leading-relaxed">
                      {selected.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelected(null);
                      setSelectedStatus(null);
                    }}
                    className="rounded-lg p-1 text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-800/80 pt-4">
                  <div className="flex items-center gap-3 text-xs text-slate-300">
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                      +{selected.required_exp ? Math.max(50, Math.round(selected.required_exp / 4)) : 50} EXP
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5 text-rose-400" />
                      {selected.kind === 'theory' ? 'Free Stamina' : '1 Heart Cost'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setBanner({
                        message: `Starting ${selected.title} practice session... Launching dual-stream audio & pose engine.`,
                        type: 'info',
                      });
                    }}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:brightness-110 active:scale-95 transition-all"
                  >
                    {selectedStatus === 'mastered' ? (
                      <>
                        <RotateCcw className="h-4 w-4" />
                        Replay Lesson
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 fill-white" />
                        Start Lesson
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
