import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  GitBranch,
  Heart,
  LogOut,
  Piano,
  Settings,
  UserRound,
  Play,
  RotateCcw,
  Sparkles,
  Sliders,
  Volume2,
  Camera,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useAnalyticsData } from '../../hooks/useAnalyticsData';
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
import TapCalibration from '../lesson/rhythm/TapCalibration';
import SoundToggle from './SoundToggle';
import SkillTreeSkeleton from './SkillTreeSkeleton';
import LessonNotesView from './LessonNotesView';
import LessonPlayer, { type LessonSaveFeedback } from '../lesson/LessonPlayer';
import { isLessonPayload, type LessonPayload } from '../../types/lesson.types';
import ProfileAnalyticsView, { type AnalyticsDateRange } from './ProfileAnalyticsView';
import PlacementModal from './PlacementModal';
import OnboardingWelcome from './OnboardingWelcome';
import DemoBanner from '../common/DemoBanner';
import ProfileAvatar from '../common/ProfileAvatar';
import ProfileEditor from './ProfileEditor';
import { saveDisplayName, saveLook } from '../../lib/profile/saveProfile';
import { readLook, type ProfileLook } from '../../lib/profile/look';
import ConnectionStatus from '../common/ConnectionStatus';
import AchievementToast, { type AchievementToastItem } from '../common/AchievementToast';
import { lessonExp } from '../../content';
import type { LessonResult } from '../../lesson/types';
import { supabase } from '../../lib/supabase/client';
import { formatUnlockedBadgesNote, type AchievementId } from '../../lib/progress/achievements';
import {
  evaluateClientAchievementsForRun,
  readClientAchievements,
  syncClientAchievements,
  type UnlockedAchievementsMap,
} from '../../lib/progress/clientAchievements';
import { canOpenLesson, isDevAccount, resultDestination, type ResultDestination } from '../../lib/progress/devAccess';
import { saveRunResult } from '../../lib/progress/devTestResults';
import { saveLessonResult } from '../../lib/progress/saveLessonResult';
import { createMemorySyncQueue, isNetworkError, openSyncQueue, type SyncQueue } from '../../lib/sync/queue';
import { OFFLINE_NOTE, queueForUser, startQueueSync } from '../../lib/sync/syncLoop';
import { PLACEMENT_METADATA_KEY } from '../../lib/progress/placement';
import { displayedStreak, toLocalDate } from '../../lib/progress/streak';
import { persistRegeneratedHearts, savePlacement, supabaseDevTestStore, supabaseProgressStore } from '../../lib/progress/supabaseStore';
import { lessonNeedsHearts } from '../../lesson/runner';
import { blockingLesson } from '../../lib/dashboard/curriculum';

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
  const { user, profile, profileStatus, isDemo, signOut, refreshProfile } = useAuth();
  const profileIsLoaded = profileStatus === 'loaded' && profile !== null;
  const hudProfileStatus = profileStatus === 'loaded' && !profile ? 'failed' : profileStatus;
  // AUX-TEST-ACCESS-01: developer accounts may open locked lessons (access only, never progress).
  const isDev = isDevAccount(profile, isDemo);
  const data = useDashboardData(profile, isDemo);
  const [view, setView] = useState<DashboardView>('skill-tree');
  const [banner, setBanner] = useState<{ message: string; type: 'warning' | 'error' | 'info' } | null>(null);
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<CurriculumNode | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<NodeStatus | null>(null);
  const [activeLesson, setActiveLesson] = useState<CurriculumNode | null>(null);
  // D1: where this lesson's results are saved, decided once when it is opened.
  const [activeDestination, setActiveDestination] = useState<ResultDestination>('learner');
  const [placementDone, setPlacementDone] = useState(false);
  // T-14 (U-25): the welcome step shows until placement is finished; placement itself is stored on the account.
  const [welcomeSeen, setWelcomeSeen] = useState(false);
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsDateRange>('7d');
  const analytics = useAnalyticsData(isDemo ? null : (profile?.id ?? user?.id ?? null), analyticsRange, isDemo);
  const [achievementToasts, setAchievementToasts] = useState<AchievementToastItem[]>([]);
  const toastTimers = useRef<Map<string, number>>(new Map());
  const achievementUserId = isDemo ? 'demo' : (profile?.id ?? user?.id ?? 'demo');
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievementsMap>(() =>
    readClientAchievements(achievementUserId),
  );

  useEffect(() => {
    if (profileStatus === 'not_found' && user?.id) {
      console.error('Profile not found for user', user.id);
    }
  }, [profileStatus, user?.id]);

  useEffect(() => {
    setUnlockedAchievements(readClientAchievements(achievementUserId));
  }, [achievementUserId]);

  const mergedAchievements = useMemo<UnlockedAchievementsMap>(() => {
    const merged: UnlockedAchievementsMap = { ...unlockedAchievements };
    for (const badge of analytics.badges) {
      if (badge.unlockedAt && !merged[badge.id as AchievementId]) {
        merged[badge.id as AchievementId] = badge.unlockedAt;
      }
    }
    return merged;
  }, [unlockedAchievements, analytics.badges]);

  const dismissAchievementToast = useCallback((key: string) => {
    const timer = toastTimers.current.get(key);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      toastTimers.current.delete(key);
    }
    setAchievementToasts((prev) => prev.filter((item) => item.key !== key));
  }, []);

  const pushAchievementToasts = useCallback(
    (ids: readonly AchievementId[]) => {
      if (ids.length === 0) return;
      const created = ids.map((id, idx) => ({
        key: `${id}-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
        id,
      }));
      setAchievementToasts((prev) => [...prev, ...created]);
      for (const item of created) {
        const timer = window.setTimeout(() => dismissAchievementToast(item.key), 6000);
        toastTimers.current.set(item.key, timer);
      }
    },
    [dismissAchievementToast],
  );

  useEffect(() => {
    const timers = toastTimers.current;
    return () => {
      for (const timer of timers.values()) window.clearTimeout(timer);
      timers.clear();
    };
  }, []);

  // Until this learner's own lessons and progress have loaded once, show a skeleton instead of the
  // bundled course with no progress, which looks like the learner's data was reset.
  const treeReady =
    isDemo || (profileStatus !== 'loading' && (!profile || data.loadedFor === profile.id));
  const hearts = profile?.hearts ?? 0;
  const streak = profile
    ? displayedStreak(profile.current_streak, profile.last_activity_date, toLocalDate(new Date()))
    : 0;
  const exp = profile?.exp ?? 0;
  const username = displayNameFromProfile(profile, user?.email);
  // Avatar and frame live in auth user_metadata; demo mode keeps them in memory only.
  const [demoLook, setDemoLook] = useState<ProfileLook>({ avatar: null, frame: 'none' });
  const look: ProfileLook = isDemo ? demoLook : readLook(user?.user_metadata);
  const progressMeta = expProgress(exp);
  const regen = useHeartRegen(profile?.id ?? user?.id, hearts, {
    onRegenerate:
      isDemo || !profile
        ? undefined
        : async (to, from) => {
            const written = await persistRegeneratedHearts(supabase, profile.id, from, to);
            await refreshProfile();
            return written;
          },
  });

  // COURSE-6: ask a new learner where to start, once, when the course is in the database.
  const needsPlacement =
    !isDemo &&
    Boolean(profile) &&
    !placementDone &&
    !data.loading &&
    !data.usingFallback &&
    Object.keys(data.progress).length === 0 &&
    !user?.user_metadata?.[PLACEMENT_METADATA_KEY];

  const choosePlacement = async (startUnit: number) => {
    if (!profile) return;
    await savePlacement(supabase, profile.id, startUnit, data.lessons);
    setPlacementDone(true);
    await refreshProfile();
    data.reload();
  };

  const evaluateClientSide = (
    lesson: CurriculumNode,
    payload: LessonPayload,
    result: LessonResult,
    ignoreExistingProgress = false,
  ) => {
    const existingProgress = ignoreExistingProgress ? undefined : data.progress[lesson.id];
    const progressSnapshot = existingProgress
      ? {
          completed: existingProgress.completed,
          accuracy_percentage: existingProgress.accuracy_percentage ?? 0,
          posture_stability_score: existingProgress.posture_stability_score ?? 0,
          completed_at: null,
        }
      : null;
    const profileSnapshot = profile
      ? {
          exp: profile.exp,
          hearts: profile.hearts,
          current_streak: profile.current_streak,
          last_activity_date: profile.last_activity_date,
        }
      : { exp, hearts, current_streak: streak, last_activity_date: null };

    const out = evaluateClientAchievementsForRun({
      userId: achievementUserId,
      profile: profileSnapshot,
      progress: progressSnapshot,
      lesson: { passMark: payload.settings.passMark, expReward: lessonExp(payload) },
      result,
    });
    setUnlockedAchievements(out.allUnlocked);
    if (out.newlyUnlocked.length > 0) {
      pushAchievementToasts(out.newlyUnlocked);
    }
    return out;
  };

  // T-13 (SRS 3.3.2, SDD C-08): offline queue for lesson saves. IndexedDB when available, memory otherwise.
  const syncQueueRef = useRef<SyncQueue | null>(null);
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [pendingSync, setPendingSync] = useState(0);
  const [justSynced, setJustSynced] = useState(0);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  useEffect(() => {
    if (justSynced === 0) return;
    const timer = window.setTimeout(() => setJustSynced(0), 5000);
    return () => window.clearTimeout(timer);
  }, [justSynced]);
  const refreshPending = useCallback(async () => {
    const queue = syncQueueRef.current;
    setPendingSync(queue ? (await queue.list()).length : 0);
  }, []);
  const afterSyncRef = useRef<(saved: number) => void>(() => {});
  afterSyncRef.current = (saved) => {
    setJustSynced(saved);
    void refreshPending();
    void refreshProfile();
    data.reload();
    analytics.reload();
  };
  const syncUserId = !isDemo && profile ? profile.id : null;
  useEffect(() => {
    if (!syncUserId) {
      syncQueueRef.current = null;
      return;
    }
    let stop: (() => void) | null = null;
    let cancelled = false;
    void (async () => {
      let base: SyncQueue;
      try {
        base = await openSyncQueue();
      } catch {
        base = createMemorySyncQueue();
      }
      if (cancelled) return;
      const queue = queueForUser(base, syncUserId);
      syncQueueRef.current = queue;
      void refreshPending();
      stop = startQueueSync({
        queue,
        save: (input) => saveLessonResult(supabaseProgressStore(supabase), input),
        onSynced: (saved) => afterSyncRef.current(saved),
      });
    })();
    return () => {
      cancelled = true;
      stop?.();
      syncQueueRef.current = null;
    };
  }, [syncUserId, refreshPending]);

  // COURSE-6: save each finished run; demo mode saves nothing.
  // D1: a lesson a developer opened while it was locked is saved as test data only.
  // Achievements are also evaluated client-side so unlocks & notifications work even before server lesson tables exist.
  const handleLessonComplete = async (
    lesson: CurriculumNode,
    result: LessonResult,
    destination: ResultDestination,
  ): Promise<LessonSaveFeedback> => {
    const payload = lesson.payload as unknown as LessonPayload;

    if (isDemo || !profile) {
      const clientOut =
        destination === 'dev-test' ? null : evaluateClientSide(lesson, payload, result, true);
      const badgeNote =
        clientOut && clientOut.newlyUnlocked.length > 0
          ? formatUnlockedBadgesNote(clientOut.newlyUnlocked)
          : null;
      return {
        note: badgeNote
          ? `Demo mode: results are not saved.\n${badgeNote}`
          : 'Demo mode: results are not saved.',
      };
    }

    try {
      const feedback = await saveRunResult(
        {
          destination,
          userId: profile.id,
          lesson: { passMark: payload.settings.passMark, expReward: lessonExp(payload) },
          result,
        },
        { progress: supabaseProgressStore(supabase), devTest: supabaseDevTestStore(supabase) },
      );
      if (destination !== 'dev-test') {
        if (feedback.achievements && feedback.achievements.length > 0) {
          const merged = syncClientAchievements(achievementUserId, feedback.achievements);
          setUnlockedAchievements(merged);
          pushAchievementToasts(feedback.achievements);
        } else {
          evaluateClientSide(lesson, payload, result);
        }
      }
      await refreshProfile();
      data.reload();
      analytics.reload();
      return feedback;
    } catch (err) {
      if (destination === 'dev-test') {
        return { note: 'Your result could not be saved.' };
      }
      // T-13 (SRS 3.3.2): offline, keep the run in the local queue and sync it when the connection returns.
      if (isNetworkError(err) && syncQueueRef.current) {
        try {
          await syncQueueRef.current.enqueue({
            userId: profile.id,
            lesson: { passMark: payload.settings.passMark, expReward: lessonExp(payload) },
            result,
            now: new Date(),
          });
          void refreshPending();
          return { note: OFFLINE_NOTE, expAwarded: 0 };
        } catch {
          // Could not even store it locally: fall through to the normal failure message.
        }
      }
      const clientOut = evaluateClientSide(lesson, payload, result);
      const badgeNote =
        clientOut.newlyUnlocked.length > 0 ? formatUnlockedBadgesNote(clientOut.newlyUnlocked) : null;
      return {
        note: badgeNote
          ? `Could not save to server; achievements checked locally.\n${badgeNote}`
          : 'Your result could not be saved.',
        expAwarded: 0,
      };
    }
  };

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
    if (!canOpenLesson(status, isDev)) {
      setSelected(null);
      setSelectedStatus(null);
      setShakingId(lesson.id);
      window.setTimeout(() => setShakingId(null), 500);

      const requiredExp = lesson.required_exp ?? 0;
      const blocking = blockingLesson(lesson, data.lessons, data.progress);
      let reason = 'You must complete the prerequisite lesson nodes to unlock this pathway.';
      if (blocking) {
        reason = `Finish "${blocking.title}" first to unlock "${lesson.title}".`;
      } else if (exp < requiredExp) {
        reason = `Requires ${requiredExp} EXP before this node can be unlocked (Current: ${exp} EXP).`;
      }

      setBanner({
        message: `Node Locked: "${lesson.title}". ${reason}`,
        type: 'warning',
      });
      return;
    }

    if (profileIsLoaded && hearts === 0 && isLessonPayload(lesson.payload) && lessonNeedsHearts(lesson.payload)) {
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
              <div className="relative">
                <ProfileAvatar name={username} avatar={look.avatar} frame={look.frame} size={40} />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-500" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-white">{username}</p>
                <p className="truncate text-[10px] font-semibold text-violet-300">
                  {profileIsLoaded ? progressMeta.label : 'Profile unavailable'}
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
        {isDemo && <DemoBanner onExit={() => void signOut()} />}
        {/* TOP GAMIFICATION HEADER */}
        <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-800/90 bg-[#0c1220]/90 px-8 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400">
                  Desktop Studio
                </span>
                {isDev && (
                  <span
                    className="rounded-full border border-sky-500/40 bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-300"
                    title="Locked lessons can be opened for testing. Progress, EXP and hearts work normally."
                  >
                    Developer access
                  </span>
                )}
              </div>
              <h1 className="text-xl font-black tracking-tight text-white capitalize">
                {view === 'skill-tree'
                  ? 'Piano Skill Tree'
                  : view === 'profile'
                    ? 'Profile & Performance Telemetry'
                    : view === 'lessons'
                      ? 'Lesson Notes'
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
            profileStatus={hudProfileStatus}
            onRetry={() => void refreshProfile()}
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
        {profileIsLoaded && hearts === 0 && !banner && (
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
          {view === 'skill-tree' && !treeReady && <SkillTreeSkeleton />}
          {view === 'skill-tree' && treeReady && (
            <SkillTreeView
              lessons={data.lessons}
              progress={data.progress}
              exp={exp}
              hearts={hearts}
              profileLoaded={profileIsLoaded}
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
              unlockedAchievements={mergedAchievements}
              sessions={analytics.sessions}
              rhythmHistogram={analytics.rhythmHistogram}
              range={analyticsRange}
              onRangeChange={setAnalyticsRange}
              loading={analytics.loading}
              error={analytics.error}
              look={look}
            />
          )}

          {/* VIEW 3: LESSON NOTES (read-only study notes; practice lives on the Skill Tree) */}
          {view === 'lessons' && <LessonNotesView />}

          {/* VIEW 4: SETTINGS */}
          {view === 'settings' && (
            <div className="mx-auto max-w-2xl space-y-6 pb-28">
              <ProfileEditor
                name={username}
                look={look}
                exp={exp}
                isDemo={isDemo}
                onSaveName={async (name) => {
                  if (!profile) return 'Your profile is not loaded yet.';
                  const error = await saveDisplayName(supabase, profile.id, name);
                  if (!error) await refreshProfile();
                  return error;
                }}
                onSaveLook={async (next) => {
                  if (isDemo) {
                    setDemoLook(next);
                    return null;
                  }
                  return saveLook(supabase, next);
                }}
              />

              <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400">
                    <Sliders className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Camera & Microphone</h2>
                    <p className="text-xs text-slate-400">How practice lessons use your devices.</p>
                  </div>
                </div>

                <div className="mt-6 space-y-4 border-t border-slate-800/80 pt-6">
                  <div className="flex items-center rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-center gap-3">
                      <Volume2 className="h-5 w-5 text-violet-400" />
                      <div>
                        <p className="text-sm font-semibold text-white">Pitch & chord detection (microphone, on-device)</p>
                        <p className="text-xs text-slate-400">
                          Runs only in your browser during practice lessons. Nothing is recorded or uploaded.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-center gap-3">
                      <Camera className="h-5 w-5 text-emerald-400" />
                      <div>
                        <p className="text-sm font-semibold text-white">Posture tracking (camera, on-device)</p>
                        <p className="text-xs text-slate-400">
                          Runs only in your browser during practice lessons. Nothing is recorded or uploaded.
                        </p>
                      </div>
                    </div>
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

              <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Rhythm timing</h3>
                <p className="mb-3 mt-1 text-xs text-slate-400">
                  Measures your speakers' or headphones' delay so rhythm taps are judged fairly. Saved on this device.
                </p>
                <TapCalibration />
              </div>

              <SoundToggle />

              {!isDemo && (
                <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Course data</h3>
                  <p className="mt-1 text-xs text-slate-300">
                    {data.source.kind === 'database'
                      ? `Loaded from the database: ${data.source.valid} lessons.`
                      : `Using the course built into the app. Database returned ${data.source.rows} piano lessons, ${data.source.valid} in the current format${data.source.error ? ` (error: ${data.source.error})` : ''}. Placement only runs with database lessons.`}
                  </p>
                </div>
              )}

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
                      +{selected.expReward} EXP
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5 text-rose-400" />
                      {selected.kind === 'practice' ? 'Uses hearts' : 'Free stamina'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!isLessonPayload(selected.payload)) {
                        setBanner({ message: 'This lesson has no playable content yet.', type: 'warning' });
                        return;
                      }
                      setBanner(null);
                      setActiveLesson(selected);
                      setActiveDestination(resultDestination(selectedStatus));
                      setSelected(null);
                      setSelectedStatus(null);
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
                        {selectedStatus === 'locked' ? 'Start test run (developer access)' : 'Start Lesson'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* COURSE-3: the lesson player covers the dashboard while a lesson is open. */}
      {activeLesson && isLessonPayload(activeLesson.payload) && (
        <LessonPlayer
          key={activeLesson.id}
          lessonId={activeLesson.id}
          title={activeLesson.title}
          payload={activeLesson.payload}
          hearts={hearts}
          onComplete={(result) => handleLessonComplete(activeLesson, result, activeDestination)}
          testRun={activeDestination === 'dev-test'}
          onClose={() => setActiveLesson(null)}
        />
      )}

      {needsPlacement && !welcomeSeen && <OnboardingWelcome onContinue={() => setWelcomeSeen(true)} />}
      {needsPlacement && welcomeSeen && <PlacementModal onChoose={choosePlacement} />}
      <AchievementToast toasts={achievementToasts} onDismiss={dismissAchievementToast} />
      {!isDemo && <ConnectionStatus online={online} pending={pendingSync} justSynced={justSynced} />}
    </div>
  );
}
