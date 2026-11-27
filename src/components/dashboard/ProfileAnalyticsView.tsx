import ProfileAvatar from '../common/ProfileAvatar';
import WeeklyGoalCard from './WeeklyGoalCard';
import ContinueCard from './ContinueCard';
import type { ProfileLook } from '../../lib/profile/look';
import { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Info,
  Lock,
  Music,
  ShieldCheck,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import type { UserProfile } from '../../types/auth.types';
import { displayNameFromProfile, expProgress, type CurriculumNode, type NodeStatus, type ProgressMap } from '../../lib/dashboard/curriculum';
import PracticeSuggestionCard from './PracticeSuggestionCard';
import {
  ACHIEVEMENT_DESCRIPTIONS,
  ACHIEVEMENT_TITLES,
  type AchievementId,
} from '../../lib/progress/achievements';
import {
  ACHIEVEMENT_REWARDS,
  type UnlockedAchievementsMap,
} from '../../lib/progress/clientAchievements';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

export type AnalyticsDateRange = '7d' | '30d' | 'all';

export interface AnalyticsSessionPoint {
  day: string;
  pitch: number | null;
  rhythm: number | null;
  posture: number | null;
  minutes: number;
}

export interface RhythmHistogramBucket {
  bucket: string;
  count: number;
}

const DEFAULT_HISTOGRAM_BUCKETS: RhythmHistogramBucket[] = [
  { bucket: '0–59', count: 0 },
  { bucket: '60–69', count: 0 },
  { bucket: '70–79', count: 0 },
  { bucket: '80–89', count: 0 },
  { bucket: '90–100', count: 0 },
];

interface ProfileAnalyticsViewProps {
  profile: UserProfile | null;
  userEmail?: string | null;
  masteredCount: number;
  totalLessons: number;
  unlockedAchievements?: UnlockedAchievementsMap;
  /** T-12 UI-only inputs; populated once the analytics data hook is connected. */
  sessions?: readonly AnalyticsSessionPoint[];
  rhythmHistogram?: readonly RhythmHistogramBucket[];
  range?: AnalyticsDateRange;
  onRangeChange?: (range: AnalyticsDateRange) => void;
  loading?: boolean;
  error?: string | null;
  /** Chosen avatar and frame (Settings → Profile). */
  look?: ProfileLook;
  /** P8: whose week to load for the daily goal / weekly summary card. */
  userId?: string | null;
  isDemo?: boolean;
  /** UX 2026-11-27: the next action comes first on Profile. */
  continueLesson?: Pick<CurriculumNode, 'title' | 'description' | 'kind'> | null;
  onContinue?: () => void;
  /** Smart practice suggestion inputs (the course, progress and how to open a lesson). */
  suggestion?: {
    lessons: CurriculumNode[];
    progress: ProgressMap;
    exp: number;
    onOpen: (lesson: CurriculumNode, status: NodeStatus) => void;
  };
}

interface Achievement {
  id: AchievementId;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
  progressText: string;
  icon: typeof Trophy;
  color: string;
}

function formatPracticeTime(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0 min';
  if (totalMinutes < 60) return `${Math.round(totalMinutes)} min`;
  const hours = totalMinutes / 60;
  return `${hours.toFixed(1)} hrs`;
}

function averageMetric(values: readonly (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return valid.reduce((sum, v) => sum + v, 0) / valid.length;
}

export default function ProfileAnalyticsView({
  profile,
  userEmail,
  masteredCount,
  totalLessons,
  unlockedAchievements = {},
  sessions = [],
  rhythmHistogram = DEFAULT_HISTOGRAM_BUCKETS,
  range: controlledRange,
  onRangeChange,
  loading = false,
  error = null,
  look,
  userId = null,
  isDemo = false,
  continueLesson = null,
  onContinue,
  suggestion,
}: ProfileAnalyticsViewProps) {
  const [internalRange, setInternalRange] = useState<AnalyticsDateRange>('7d');
  const activeRange = controlledRange ?? internalRange;

  const setActiveRange = (next: AnalyticsDateRange) => {
    setInternalRange(next);
    onRangeChange?.(next);
  };

  const exp = profile?.exp ?? 0;
  const streak = profile?.current_streak ?? 0;
  const username = displayNameFromProfile(profile, userEmail);
  const tier = expProgress(exp);

  const rangeLabel =
    activeRange === '7d' ? 'Last 7 days' : activeRange === '30d' ? 'Last 30 days' : 'All time';

  const summaryStats = useMemo(() => {
    const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);
    const completionPct = totalLessons > 0 ? Math.round((masteredCount / totalLessons) * 100) : 0;

    return {
      practiceTime: formatPracticeTime(totalMinutes),
      practiceSub: sessions.length === 0 ? 'No sessions in range' : `${sessions.length} practice day(s) · ${rangeLabel}`,
      lessonsComplete: `${masteredCount} / ${totalLessons} Nodes`,
      lessonsSub: `${completionPct}% curriculum mastered`,
      currentStreak: `${streak} ${streak === 1 ? 'Day' : 'Days'}`,
      streakSub: streak > 0 ? 'Keep daily practice going' : 'Complete a lesson to start',
      totalExp: `${exp} EXP`,
      expSub: `${tier.label} tier`,
    };
  }, [sessions, rangeLabel, masteredCount, totalLessons, streak, exp, tier.label]);

  const hasSessions = sessions.length > 0;

  const pitchAvg = useMemo(() => averageMetric(sessions.map((s) => s.pitch)), [sessions]);
  const postureAvg = useMemo(() => averageMetric(sessions.map((s) => s.posture)), [sessions]);
  const histogramTotal = useMemo(
    () => rhythmHistogram.reduce((sum, b) => sum + b.count, 0),
    [rhythmHistogram],
  );
  const hasPitchData = pitchAvg !== null;
  const hasPostureData = postureAvg !== null;

  const lineOptions = (accentColor: string): ChartOptions<'line'> => ({
    responsive: true,
    maintainAspectRatio: false,
    spanGaps: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: accentColor,
        borderWidth: 1,
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        padding: 10,
        cornerRadius: 10,
        displayColors: false,
        callbacks: {
          label: (context) =>
            context.parsed.y === null ? 'Not measured' : `Score: ${Math.round(context.parsed.y)}%`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8', font: { size: 11, family: 'Inter, sans-serif' } },
      },
      y: {
        min: 0,
        max: 100,
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: {
          stepSize: 25,
          color: '#94a3b8',
          font: { size: 11, family: 'Inter, sans-serif' },
          callback: (value) => `${value}%`,
        },
      },
    },
  });

  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#38bdf8',
        borderWidth: 1,
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        padding: 10,
        cornerRadius: 10,
        displayColors: false,
        callbacks: {
          label: (context) => `Sessions: ${context.parsed.y}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { size: 11, family: 'Inter, sans-serif' } },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: {
          precision: 0,
          color: '#94a3b8',
          font: { size: 11, family: 'Inter, sans-serif' },
        },
      },
    },
  };

  const sessionLabels = sessions.map((s) => s.day);

  const pitchChartData = {
    labels: sessionLabels,
    datasets: [
      {
        label: 'Pitch Accuracy %',
        data: sessions.map((s) => s.pitch),
        borderColor: '#a78bfa',
        backgroundColor: 'rgba(167, 139, 250, 0.15)',
        pointBackgroundColor: '#c4b5fd',
        pointBorderColor: '#7c3aed',
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.35,
      },
    ],
  };

  const rhythmHistogramData = {
    labels: rhythmHistogram.map((b) => b.bucket),
    datasets: [
      {
        label: 'Rhythm Sessions',
        data: rhythmHistogram.map((b) => b.count),
        backgroundColor: 'rgba(56, 189, 248, 0.55)',
        borderColor: '#38bdf8',
        borderWidth: 1.5,
        borderRadius: 8,
      },
    ],
  };

  const postureChartData = {
    labels: sessionLabels,
    datasets: [
      {
        label: 'Posture Stability %',
        data: sessions.map((s) => s.posture),
        borderColor: '#34d399',
        backgroundColor: 'rgba(52, 211, 153, 0.15)',
        pointBackgroundColor: '#6ee7b7',
        pointBorderColor: '#059669',
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.35,
      },
    ],
  };

  const formatUnlockedAt = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'Unlocked';
    return `Unlocked ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  const makeAchievement = (
    id: AchievementId,
    icon: typeof Trophy,
    color: string,
  ): Achievement => {
    const unlockedAtIso = unlockedAchievements[id];
    return {
      id,
      title: ACHIEVEMENT_TITLES[id],
      description: ACHIEVEMENT_DESCRIPTIONS[id],
      unlocked: Boolean(unlockedAtIso),
      unlockedAt: unlockedAtIso ? formatUnlockedAt(unlockedAtIso) : undefined,
      progressText: `Reward: +${ACHIEVEMENT_REWARDS[id]} EXP`,
      icon,
      color,
    };
  };

  // Database-seeded Milestone Achievements (public.achievements), tracked client-side
  const achievements: Achievement[] = [
    makeAchievement('first-lesson', Music, 'text-violet-400 bg-violet-500/15 border-violet-500/40'),
    makeAchievement('streak-7-days', Flame, 'text-amber-400 bg-amber-500/15 border-amber-500/40'),
    makeAchievement('streak-30-days', Trophy, 'text-rose-400 bg-rose-500/15 border-rose-500/40'),
    makeAchievement('exp-500', Zap, 'text-sky-400 bg-sky-500/15 border-sky-500/40'),
    makeAchievement('posture-stable', ShieldCheck, 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40'),
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 pb-32">
      {/* 1. Profile Hero & Date Range Filter Section */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 p-6 shadow-2xl md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="relative">
              <ProfileAvatar name={username} avatar={look?.avatar ?? null} frame={look?.frame ?? 'none'} size={80} />
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-900 bg-emerald-500 text-slate-950">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                  {username}
                </h1>
                <span className="rounded-full border border-violet-500/40 bg-violet-500/15 px-3 py-0.5 text-xs font-semibold text-violet-300">
                  {tier.label}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-0.5 text-xs text-slate-300">
                  Acoustic Piano
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                {userEmail || 'Local Studio Session'} · MUZ Piano Studio
              </p>
            </div>
          </div>

          {/* Historical Date Range Filter Tabs */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-950/80 p-1.5 shadow-inner">
            {(
              [
                { id: '7d', label: 'Last 7 Days' },
                { id: '30d', label: 'Last 30 Days' },
                { id: 'all', label: 'All Time' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveRange(tab.id)}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeRange === tab.id
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Row of 4 Summary Statistic Cards */}
      {continueLesson && onContinue && <ContinueCard lesson={continueLesson} onContinue={onContinue} compact />}

      {suggestion && (
        <PracticeSuggestionCard
          userId={userId}
          isDemo={isDemo}
          lessons={suggestion.lessons}
          progress={suggestion.progress}
          exp={suggestion.exp}
          onOpen={suggestion.onOpen}
        />
      )}

      <WeeklyGoalCard userId={userId} isDemo={isDemo} lastActivityDate={profile?.last_activity_date} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg transition-all hover:border-cyan-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Practice Time
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-white">{summaryStats.practiceTime}</p>
          <p className="mt-1 text-xs text-slate-400">{summaryStats.practiceSub}</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg transition-all hover:border-emerald-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Lessons Complete
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-white">{summaryStats.lessonsComplete}</p>
          <p className="mt-1 text-xs text-slate-400">{summaryStats.lessonsSub}</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg transition-all hover:border-amber-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Current Streak
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-white">{summaryStats.currentStreak}</p>
          <p className="mt-1 text-xs text-slate-400">{summaryStats.streakSub}</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg transition-all hover:border-violet-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total EXP
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-white">{summaryStats.totalExp}</p>
          <p className="mt-1 text-xs text-slate-400">{summaryStats.expSub}</p>
        </div>
      </section>

      {/* 3. Three Responsive Analytics Chart Containers (T-12 UI) */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-white">Performance Telemetry & Analytics</h2>
            <p className="text-xs text-slate-400">
              Pitch accuracy, rhythm consistency distribution, and posture stability over {rangeLabel.toLowerCase()}.
            </p>
          </div>
          <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-400">
            Target Baseline: ≥ 90%
          </span>
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            <Info className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !hasSessions && (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-xs text-slate-300">
            <Info className="h-4 w-4 shrink-0 text-violet-400" />
            <span>No practice sessions yet. Finish a rhythm or practice lesson to see your progress.</span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Chart 1: Pitch Accuracy Line */}
          <div className="flex flex-col rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl transition-all hover:border-violet-500/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20 text-violet-400">
                  <Target className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Pitch Accuracy</h3>
                  <p className="text-[11px] text-slate-400">Practice drill pitch match</p>
                </div>
              </div>
              <span className="text-xl font-extrabold text-violet-300">
                {pitchAvg !== null ? `${Math.round(pitchAvg)}%` : '—'}
              </span>
            </div>

            <div className="relative mt-4 h-48 w-full">
              {loading ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-500">
                  Loading pitch telemetry…
                </div>
              ) : hasPitchData ? (
                <Line data={pitchChartData} options={lineOptions('#a78bfa')} />
              ) : (
                <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 px-4 text-center">
                  <Activity className="mb-2 h-5 w-5 text-slate-600" />
                  <p className="text-xs font-medium text-slate-400">No pitch sessions recorded yet</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">Complete a practice drill to plot accuracy</p>
                </div>
              )}
            </div>
          </div>

          {/* Chart 2: Rhythm Consistency Histogram (Bar) */}
          <div className="flex flex-col rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl transition-all hover:border-sky-500/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Rhythm Consistency</h3>
                  <p className="text-[11px] text-slate-400">Session score histogram</p>
                </div>
              </div>
              <span className="text-xl font-extrabold text-sky-300">
                {histogramTotal > 0 ? `${histogramTotal} runs` : '—'}
              </span>
            </div>

            <div className="relative mt-4 h-48 w-full">
              {loading ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-500">
                  Loading rhythm histogram…
                </div>
              ) : histogramTotal > 0 ? (
                <Bar data={rhythmHistogramData} options={barOptions} />
              ) : (
                <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 px-4 text-center">
                  <BarChart3 className="mb-2 h-5 w-5 text-slate-600" />
                  <p className="text-xs font-medium text-slate-400">No rhythm runs recorded yet</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">Buckets: 0–59, 60–69, 70–79, 80–89, 90–100</p>
                </div>
              )}
            </div>
          </div>

          {/* Chart 3: Posture Stability Line */}
          <div className="flex flex-col rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl transition-all hover:border-emerald-500/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Posture Stability</h3>
                  <p className="text-[11px] text-slate-400">Hand & wrist pose compliance</p>
                </div>
              </div>
              <span className="text-xl font-extrabold text-emerald-300">
                {postureAvg !== null ? `${Math.round(postureAvg)}%` : '—'}
              </span>
            </div>

            <div className="relative mt-4 h-48 w-full">
              {loading ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-500">
                  Loading posture telemetry…
                </div>
              ) : hasPostureData ? (
                <Line data={postureChartData} options={lineOptions('#34d399')} />
              ) : (
                <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 px-4 text-center">
                  <ShieldCheck className="mb-2 h-5 w-5 text-slate-600" />
                  <p className="text-xs font-medium text-slate-400">No posture sessions recorded yet</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">Complete a camera-tracked drill to plot posture</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Achievements Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Milestone Achievements</h2>
            <p className="text-xs text-slate-400">
              Badges earned through consistent practice, pitch accuracy, and motor discipline.
            </p>
          </div>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
            {achievements.filter((a) => a.unlocked).length} / {achievements.length} Unlocked
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((badge) => {
            const Icon = badge.icon;
            return (
              <div
                key={badge.id}
                className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border p-5 transition-all ${
                  badge.unlocked
                    ? 'border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 shadow-[0_4px_20px_rgba(245,158,11,0.12)] hover:border-amber-400/70 hover:scale-[1.02]'
                    : 'border-slate-800/80 bg-slate-950/70 opacity-65 hover:opacity-85'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                        badge.unlocked
                          ? badge.color
                          : 'border-slate-800 bg-slate-900 text-slate-600'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    {badge.unlocked ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                        <CheckCircle2 className="h-3 w-3" />
                        Unlocked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                        <Lock className="h-3 w-3" />
                        Locked
                      </span>
                    )}
                  </div>

                  <h3
                    className={`mt-3 text-sm font-bold ${
                      badge.unlocked ? 'text-white' : 'text-slate-400'
                    }`}
                  >
                    {badge.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    {badge.description}
                  </p>
                </div>

                <div className="mt-4 border-t border-slate-800/80 pt-3">
                  {badge.unlocked ? (
                    <span className="text-[11px] font-semibold text-amber-400/90">
                      {badge.unlockedAt}
                    </span>
                  ) : (
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span className="truncate">{badge.progressText}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
