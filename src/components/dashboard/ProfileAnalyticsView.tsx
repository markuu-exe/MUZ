import { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  Flame,
  Zap,
  Target,
  Music,
  Activity,
  Award,
  Lock,
  Sparkles,
  Trophy,
  Calendar,
  ShieldCheck,
  Piano,
  Info,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import type { UserProfile } from '../../types/auth.types';
import { expProgress } from '../../lib/dashboard/curriculum';
import {
  ACHIEVEMENT_DESCRIPTIONS,
  ACHIEVEMENT_TITLES,
  type AchievementId,
} from '../../lib/progress/achievements';

// Register ChartJS modules
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

type DateRange = '7d' | '30d' | 'all';

interface ProfileAnalyticsViewProps {
  profile: UserProfile | null;
  userEmail?: string | null;
  masteredCount: number;
  totalLessons: number;
}

interface Achievement {
  id: AchievementId;
  title: string;
  description: string;
  category: 'streak' | 'accuracy' | 'theory' | 'posture' | 'technique';
  unlocked: boolean;
  unlockedAt?: string;
  progressText?: string;
  progressPercent?: number;
  icon: typeof Trophy;
  color: string;
}

export default function ProfileAnalyticsView({
  profile,
  userEmail,
  masteredCount,
  totalLessons,
}: ProfileAnalyticsViewProps) {
  const [range, setRange] = useState<DateRange>('7d');

  const exp = profile?.exp ?? 1240;
  const streak = profile?.current_streak ?? 7;
  const username = profile?.username || userEmail?.split('@')[0] || 'VirtuosoPianist';
  const tier = expProgress(exp);

  // Dynamic statistics based on selected date range
  const summaryStats = useMemo(() => {
    switch (range) {
      case '7d':
        return {
          practiceTime: '14.2 hrs',
          practiceSub: '+2.4 hrs vs previous week',
          lessonsComplete: `${Math.min(12, masteredCount || 10)} Nodes`,
          lessonsSub: '8 completed this week',
          longestStreak: '14 Days',
          longestSub: `Current: ${streak} Days active`,
          avgDevSpeed: '116 BPM',
          avgSpeedSub: '+6 BPM tempo velocity',
        };
      case '30d':
        return {
          practiceTime: '48.5 hrs',
          practiceSub: '+11.2 hrs vs last month',
          lessonsComplete: `${Math.min(28, (masteredCount || 10) * 2)} Nodes`,
          lessonsSub: 'Active curriculum progression',
          longestStreak: '14 Days',
          longestSub: 'Achieved Oct 24',
          avgDevSpeed: '108 BPM',
          avgSpeedSub: 'Consistent metric velocity',
        };
      case 'all':
      default:
        return {
          practiceTime: '142.8 hrs',
          practiceSub: 'Total lifetime practice',
          lessonsComplete: `${masteredCount || 14} / ${totalLessons || 24} Nodes`,
          lessonsSub: 'Curriculum completion: 58%',
          longestStreak: '14 Days',
          longestSub: 'All-time personal record',
          avgDevSpeed: '102 BPM',
          avgSpeedSub: 'Overall mean tempo speed',
        };
    }
  }, [range, masteredCount, totalLessons, streak]);

  // Chart datasets adjusted for selected date range
  const chartDatasets = useMemo(() => {
    if (range === '7d') {
      const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return {
        pitch: {
          labels,
          data: [91, 93, 92, 95, 96, 94, 97],
          average: '94.8%',
          note: '±12¢ mean cents offset',
        },
        rhythm: {
          labels,
          data: [88, 90, 89, 93, 94, 92, 95],
          average: '92.4%',
          note: '14ms latency deviation',
        },
        posture: {
          labels,
          data: [94, 95, 96, 96, 98, 97, 98],
          average: '96.5%',
          note: 'Elbow & wrist alignment lock',
        },
      };
    } else if (range === '30d') {
      const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      return {
        pitch: {
          labels,
          data: [89, 92, 94, 96],
          average: '93.2%',
          note: '±14¢ mean cents offset',
        },
        rhythm: {
          labels,
          data: [86, 89, 91, 94],
          average: '90.5%',
          note: '18ms latency deviation',
        },
        posture: {
          labels,
          data: [92, 94, 95, 97],
          average: '95.1%',
          note: 'Elbow 85°-105° posture verified',
        },
      };
    } else {
      const labels = ['Aug', 'Sep', 'Oct', 'Nov'];
      return {
        pitch: {
          labels,
          data: [84, 88, 92, 95],
          average: '91.6%',
          note: 'Consistent upward mastery',
        },
        rhythm: {
          labels,
          data: [82, 86, 90, 93],
          average: '89.2%',
          note: '22ms -> 14ms timing drift',
        },
        posture: {
          labels,
          data: [88, 91, 94, 97],
          average: '94.3%',
          note: 'Long-term ergonomic compliance',
        },
      };
    }
  }, [range]);

  // Shared dark-mode high-contrast chart options
  const createChartOptions = (accentColor: string, unit = '%'): ChartOptions<'line'> => ({
    responsive: true,
    maintainAspectRatio: false,
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
          label: (context) => `Accuracy: ${context.parsed.y}${unit}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8', font: { size: 11, family: 'Inter, sans-serif' } },
      },
      y: {
        min: 75,
        max: 100,
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: {
          stepSize: 5,
          color: '#94a3b8',
          font: { size: 11, family: 'Inter, sans-serif' },
          callback: (value) => `${value}%`,
        },
      },
    },
  });

  const pitchChartData = {
    labels: chartDatasets.pitch.labels,
    datasets: [
      {
        label: 'Pitch Accuracy %',
        data: chartDatasets.pitch.data,
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

  const rhythmChartData = {
    labels: chartDatasets.rhythm.labels,
    datasets: [
      {
        label: 'Rhythm Precision %',
        data: chartDatasets.rhythm.data,
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        pointBackgroundColor: '#7dd3fc',
        pointBorderColor: '#0284c7',
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.35,
      },
    ],
  };

  const postureChartData = {
    labels: chartDatasets.posture.labels,
    datasets: [
      {
        label: 'Posture Stability %',
        data: chartDatasets.posture.data,
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

  // Database-seeded Milestone Achievements (public.achievements)
  const achievements: Achievement[] = [
    {
      id: 'first-lesson',
      title: ACHIEVEMENT_TITLES['first-lesson'],
      description: ACHIEVEMENT_DESCRIPTIONS['first-lesson'],
      category: 'theory',
      unlocked: false,
      progressText: 'Reward: +50 EXP',
      icon: Music,
      color: 'text-violet-400 bg-violet-500/15 border-violet-500/40',
    },
    {
      id: 'streak-7-days',
      title: ACHIEVEMENT_TITLES['streak-7-days'],
      description: ACHIEVEMENT_DESCRIPTIONS['streak-7-days'],
      category: 'streak',
      unlocked: false,
      progressText: 'Reward: +50 EXP',
      icon: Flame,
      color: 'text-amber-400 bg-amber-500/15 border-amber-500/40',
    },
    {
      id: 'streak-30-days',
      title: ACHIEVEMENT_TITLES['streak-30-days'],
      description: ACHIEVEMENT_DESCRIPTIONS['streak-30-days'],
      category: 'streak',
      unlocked: false,
      progressText: 'Reward: +100 EXP',
      icon: Trophy,
      color: 'text-rose-400 bg-rose-500/15 border-rose-500/40',
    },
    {
      id: 'exp-500',
      title: ACHIEVEMENT_TITLES['exp-500'],
      description: ACHIEVEMENT_DESCRIPTIONS['exp-500'],
      category: 'technique',
      unlocked: false,
      progressText: 'Reward: +50 EXP',
      icon: Zap,
      color: 'text-sky-400 bg-sky-500/15 border-sky-500/40',
    },
    {
      id: 'posture-stable',
      title: ACHIEVEMENT_TITLES['posture-stable'],
      description: ACHIEVEMENT_DESCRIPTIONS['posture-stable'],
      category: 'posture',
      unlocked: false,
      progressText: 'Reward: +50 EXP',
      icon: ShieldCheck,
      color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40',
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 pb-32">
      {/* 1. Profile Hero & Date Range Filter Section */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 p-6 shadow-2xl md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* User info snippet */}
          <div className="flex items-center gap-5">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-3xl font-black text-white shadow-[0_0_25px_rgba(147,51,234,0.4)]">
              {username.charAt(0).toUpperCase()}
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
                {userEmail || `${username.toLowerCase()}@muz-practice.ai`} · Member of MUZ Studio
              </p>
            </div>
          </div>

          {/* Historical Date Range Filter Tabs */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-950/80 p-1.5 shadow-inner">
            <button
              type="button"
              onClick={() => setRange('7d')}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                range === '7d'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              Last 7 Days
            </button>

            <button
              type="button"
              onClick={() => setRange('30d')}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                range === '30d'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              Last 30 Days
            </button>

            <button
              type="button"
              onClick={() => setRange('all')}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                range === 'all'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              All Time
            </button>
          </div>
        </div>
      </div>

      {/* 2. Row of 4 Summary Statistic Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Practice Time */}
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

        {/* Card 2: Lessons Complete */}
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

        {/* Card 3: Longest Streak */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg transition-all hover:border-amber-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Longest Streak
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-white">{summaryStats.longestStreak}</p>
          <p className="mt-1 text-xs text-slate-400">{summaryStats.longestSub}</p>
        </div>

        {/* Card 4: Average Dev Speed */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg transition-all hover:border-violet-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Average Dev Speed
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-white">{summaryStats.avgDevSpeed}</p>
          <p className="mt-1 text-xs text-slate-400">{summaryStats.avgSpeedSub}</p>
        </div>
      </section>

      {/* 3. Three Responsive Analytics Chart Containers */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Performance Telemetry & Analytics</h2>
            <p className="text-xs text-slate-400">
              Interactive precision metrics measured across piano acoustic tracking and pose estimation.
            </p>
          </div>
          <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-400">
            Target Baseline: ≥ 90%
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Chart 1: Pitch Accuracy % */}
          <div className="flex flex-col rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl transition-all hover:border-violet-500/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20 text-violet-400">
                  <Target className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Pitch Accuracy</h3>
                  <p className="text-[11px] text-slate-400">{chartDatasets.pitch.note}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-extrabold text-violet-300">
                  {chartDatasets.pitch.average}
                </span>
              </div>
            </div>

            <div className="mt-4 h-48 w-full">
              <Line data={pitchChartData} options={createChartOptions('#a78bfa')} />
            </div>
          </div>

          {/* Chart 2: Rhythm Precision % */}
          <div className="flex flex-col rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl transition-all hover:border-sky-500/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Rhythm Precision</h3>
                  <p className="text-[11px] text-slate-400">{chartDatasets.rhythm.note}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-extrabold text-sky-300">
                  {chartDatasets.rhythm.average}
                </span>
              </div>
            </div>

            <div className="mt-4 h-48 w-full">
              <Line data={rhythmChartData} options={createChartOptions('#38bdf8')} />
            </div>
          </div>

          {/* Chart 3: Posture Stability % */}
          <div className="flex flex-col rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl transition-all hover:border-emerald-500/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Posture Stability</h3>
                  <p className="text-[11px] text-slate-400">{chartDatasets.posture.note}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-extrabold text-emerald-300">
                  {chartDatasets.posture.average}
                </span>
              </div>
            </div>

            <div className="mt-4 h-48 w-full">
              <Line data={postureChartData} options={createChartOptions('#34d399')} />
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
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                    {badge.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  {badge.unlocked ? (
                    <span className="text-[11px] font-semibold text-amber-400/90">
                      {badge.unlockedAt}
                    </span>
                  ) : (
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span className="truncate">{badge.progressText}</span>
                        {badge.progressPercent !== undefined && (
                          <span className="font-semibold tabular-nums">{badge.progressPercent}%</span>
                        )}
                      </div>
                      {badge.progressPercent !== undefined && (
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-slate-500"
                            style={{ width: `${badge.progressPercent}%` }}
                          />
                        </div>
                      )}
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
