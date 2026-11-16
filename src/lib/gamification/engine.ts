import { expProgress, learnerTier, type CurriculumNode, type LessonKind } from '../dashboard/curriculum';
import type { Lesson, PerformanceRecord } from '../../types/database.types';

// ============================================================================
// 1. EXP & TIER PROGRESSION RULES
// ============================================================================

export const BASE_LESSON_EXP = 50;
export const REPLAY_LESSON_EXP = 15;
export const PERFECT_ACCURACY_BONUS_EXP = 20;
export const HIGH_ACCURACY_BONUS_EXP = 10;
export const HIGH_POSTURE_BONUS_EXP = 10;
export const STREAK_EXTENSION_BONUS_EXP = 10;

export interface LessonExpInput {
  lesson?: Pick<Lesson, 'required_exp'> | null;
  kind?: LessonKind;
  isReplay?: boolean;
  accuracyPercent?: number;
  postureScore?: number | null;
  streakExtended?: boolean;
  currentStreak?: number;
}

export interface LessonExpBreakdown {
  baseExp: number;
  accuracyBonus: number;
  postureBonus: number;
  streakBonus: number;
  totalExp: number;
}

/**
 * Computes the base EXP reward displayed on a curriculum node card before bonuses.
 */
export function nodeBaseExpReward(lesson?: Pick<Lesson, 'required_exp'> | null): number {
  const required = lesson?.required_exp ?? 0;
  return required > 0 ? Math.max(BASE_LESSON_EXP, Math.round(required / 4)) : BASE_LESSON_EXP;
}

/**
 * Calculates the EXP earned from completing a lesson, practice drill, or rhythm session.
 * First-time mastery awards the full node base EXP (at least 50 EXP); replays award
 * a smaller practice stipend plus performance bonuses.
 */
export function calculateLessonExpReward(input: LessonExpInput): LessonExpBreakdown {
  const {
    lesson,
    isReplay = false,
    accuracyPercent = 100,
    postureScore = null,
    streakExtended = false,
    currentStreak = 0,
  } = input;

  const baseExp = isReplay ? REPLAY_LESSON_EXP : nodeBaseExpReward(lesson);

  const clampedAccuracy = Math.max(0, Math.min(100, accuracyPercent));
  const accuracyBonus =
    clampedAccuracy >= 100
      ? PERFECT_ACCURACY_BONUS_EXP
      : clampedAccuracy >= 90
        ? HIGH_ACCURACY_BONUS_EXP
        : 0;

  const postureBonus =
    postureScore !== null && postureScore !== undefined && postureScore >= 90
      ? HIGH_POSTURE_BONUS_EXP
      : 0;

  const streakBonus =
    streakExtended && currentStreak >= 3 ? STREAK_EXTENSION_BONUS_EXP : 0;

  const totalExp = Math.max(0, Math.round(baseExp + accuracyBonus + postureBonus + streakBonus));

  return {
    baseExp,
    accuracyBonus,
    postureBonus,
    streakBonus,
    totalExp,
  };
}

/**
 * Safely applies an EXP delta to a learner's current EXP total (clamped >= 0).
 */
export function applyExpGain(currentExp: number, deltaExp: number): number {
  const safeCurrent = Number.isFinite(currentExp) ? Math.max(0, Math.floor(currentExp)) : 0;
  const safeDelta = Number.isFinite(deltaExp) ? Math.floor(deltaExp) : 0;
  return Math.max(0, safeCurrent + safeDelta);
}

/**
 * Checks whether gaining EXP caused the learner to advance to a higher tier.
 */
export function evaluateTierTransition(previousExp: number, nextExp: number): {
  leveledUp: boolean;
  previousTier: ReturnType<typeof learnerTier>;
  nextTier: ReturnType<typeof learnerTier>;
  progress: ReturnType<typeof expProgress>;
} {
  const previousTier = learnerTier(Math.max(0, previousExp));
  const nextTier = learnerTier(Math.max(0, nextExp));
  return {
    leveledUp: nextTier.currentFloor > previousTier.currentFloor,
    previousTier,
    nextTier,
    progress: expProgress(Math.max(0, nextExp)),
  };
}

// ============================================================================
// 2. DAILY STREAK COUNTER RULES
// ============================================================================

/**
 * Normalizes a Date, ISO timestamp, or YYYY-MM-DD string into a calendar date key (YYYY-MM-DD).
 */
export function toDateKey(input?: string | Date | null): string | null {
  if (!input) return null;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const directMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
    if (directMatch && !trimmed.includes('T')) {
      return `${directMatch[1]}-${directMatch[2]}-${directMatch[3]}`;
    }
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return formatLocalDateKey(parsed);
  }
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return null;
    return formatLocalDateKey(input);
  }
  return null;
}

function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKeyUtcNoon(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

/**
 * Computes the exact number of calendar days from `earlierDateKey` to `laterDateKey`.
 * Positive when `laterDateKey` is after `earlierDateKey`, 0 when same day.
 */
export function calendarDaysBetween(earlierDateKey: string, laterDateKey: string): number {
  const startMs = parseDateKeyUtcNoon(earlierDateKey);
  const endMs = parseDateKeyUtcNoon(laterDateKey);
  return Math.round((endMs - startMs) / (24 * 60 * 60 * 1000));
}

export interface StreakStatusEvaluation {
  /** Current active streak after accounting for missed calendar days. */
  effectiveStreak: number;
  /** Whether the learner has already logged an activity today. */
  practicedToday: boolean;
  /** True when the last activity was yesterday and the learner must practice today to keep the streak. */
  streakAtRisk: boolean;
  /** True when more than 1 calendar day has elapsed since `lastActivityDate` and a non-zero streak was reset. */
  streakBroken: boolean;
  /** Calendar days since last activity (0 = today, 1 = yesterday, >1 = missed day, null = never). */
  daysSinceLastActivity: number | null;
  /** Normalized YYYY-MM-DD key for today. */
  todayKey: string;
}

/**
 * Evaluates a learner's streak state when opening the dashboard or loading their profile.
 * - Same day (diff === 0): streak is active and already secured for today.
 * - Yesterday (diff === 1): streak is still intact (`effectiveStreak = currentStreak`), at risk until today's practice.
 * - Missed day(s) (diff > 1): streak breaks and resets to 0.
 */
export function evaluateStreakStatus(
  currentStreak: number,
  lastActivityDate: string | Date | null | undefined,
  now: Date | string = new Date(),
): StreakStatusEvaluation {
  const safeStreak = Math.max(0, Math.floor(Number.isFinite(currentStreak) ? currentStreak : 0));
  const todayKey = toDateKey(now) ?? formatLocalDateKey(new Date());
  const lastKey = toDateKey(lastActivityDate);

  if (!lastKey) {
    return {
      effectiveStreak: 0,
      practicedToday: false,
      streakAtRisk: false,
      streakBroken: false,
      daysSinceLastActivity: null,
      todayKey,
    };
  }

  const diff = calendarDaysBetween(lastKey, todayKey);

  if (diff <= 0) {
    return {
      effectiveStreak: safeStreak,
      practicedToday: safeStreak > 0,
      streakAtRisk: false,
      streakBroken: false,
      daysSinceLastActivity: 0,
      todayKey,
    };
  }

  if (diff === 1) {
    return {
      effectiveStreak: safeStreak,
      practicedToday: false,
      streakAtRisk: safeStreak > 0,
      streakBroken: false,
      daysSinceLastActivity: 1,
      todayKey,
    };
  }

  // diff > 1: missed at least one full calendar day -> streak resets to 0
  return {
    effectiveStreak: 0,
    practicedToday: false,
    streakAtRisk: false,
    streakBroken: safeStreak > 0,
    daysSinceLastActivity: diff,
    todayKey,
  };
}

export interface StreakUpdateResult {
  previousStreak: number;
  currentStreak: number;
  lastActivityDate: string;
  incremented: boolean;
  wasReset: boolean;
}

/**
 * Updates the daily streak when the learner completes a lesson, quiz, or practice drill.
 * - If already practiced today (`diff === 0`) and `currentStreak > 0`: keeps `currentStreak`.
 * - If practiced yesterday (`diff === 1`): increments `currentStreak + 1`.
 * - If missed a day (`diff > 1`) or first-ever practice (`lastKey === null` or `currentStreak === 0`): sets `currentStreak = 1`.
 */
export function recordDailyPracticeStreak(
  currentStreak: number,
  lastActivityDate: string | Date | null | undefined,
  now: Date | string = new Date(),
): StreakUpdateResult {
  const safeStreak = Math.max(0, Math.floor(Number.isFinite(currentStreak) ? currentStreak : 0));
  const todayKey = toDateKey(now) ?? formatLocalDateKey(new Date());
  const lastKey = toDateKey(lastActivityDate);

  if (!lastKey) {
    return {
      previousStreak: safeStreak,
      currentStreak: 1,
      lastActivityDate: todayKey,
      incremented: true,
      wasReset: false,
    };
  }

  const diff = calendarDaysBetween(lastKey, todayKey);

  if (diff === 0) {
    if (safeStreak === 0) {
      return {
        previousStreak: 0,
        currentStreak: 1,
        lastActivityDate: todayKey,
        incremented: true,
        wasReset: false,
      };
    }
    return {
      previousStreak: safeStreak,
      currentStreak: safeStreak,
      lastActivityDate: todayKey,
      incremented: false,
      wasReset: false,
    };
  }

  if (diff === 1) {
    const nextStreak = safeStreak + 1;
    return {
      previousStreak: safeStreak,
      currentStreak: nextStreak,
      lastActivityDate: todayKey,
      incremented: true,
      wasReset: false,
    };
  }

  // diff > 1 (missed at least one full day) or diff < 0 (clock skew): restart at 1
  return {
    previousStreak: safeStreak,
    currentStreak: 1,
    lastActivityDate: todayKey,
    incremented: true,
    wasReset: diff > 1 && safeStreak > 0,
  };
}

// ============================================================================
// 3. HEART DEPLETION & REGENERATION RULES
// ============================================================================

export const MAX_HEARTS = 5;
export const MIN_HEARTS = 0;
export const HEART_REGEN_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes per heart
export const MAX_CONSECUTIVE_MISSES = 3; // SRS 3.1.2.4: 3 consecutive wrong attempts cost 1 heart
export const DRILL_TIMEOUT_SEC = 15; // SDD 6.3: 15s drill timeout costs 1 heart
export const THEORY_QUIZ_HEART_RESTORE_THRESHOLD = 80; // >= 80% on theory quiz restores +1 heart
export const RHYTHM_PASS_ACCURACY_THRESHOLD = 60; // < 60% rhythm accuracy costs 1 heart

export type HeartDepletionReason = 'timeout' | 'misses' | 'rhythm-fail' | 'manual';
export type HeartRestoreSource = 'theory-quiz' | 'regen' | 'bonus';

/**
 * Clamps a heart count to the valid integer range [0, 5].
 */
export function clampHearts(hearts: number): number {
  if (!Number.isFinite(hearts)) return MAX_HEARTS;
  return Math.max(MIN_HEARTS, Math.min(MAX_HEARTS, Math.floor(hearts)));
}

/**
 * Determines whether a learner has enough stamina hearts to start a given lesson modality.
 * - Theory lessons (`kind === 'theory'`) are ALWAYS free (even at 0 hearts).
 * - Practice and Rhythm drills require at least 1 heart (`hearts > 0`).
 */
export function canStartLessonWithHearts(
  hearts: number,
  kind: LessonKind,
): { allowed: boolean; reason?: string } {
  const clamped = clampHearts(hearts);
  if (kind === 'theory') {
    return { allowed: true };
  }
  if (clamped <= 0) {
    return {
      allowed: false,
      reason:
        'No Stamina Hearts remaining! Complete a free Theory unit to restore +1 Heart immediately or wait for passive heart regeneration.',
    };
  }
  return { allowed: true };
}

export interface HeartDepletionResult {
  previousHearts: number;
  hearts: number;
  depleted: boolean;
  lockedOut: boolean;
  reason: HeartDepletionReason;
  message: string;
}

/**
 * Applies the heart depletion rule for drill timeouts (15s), 3 consecutive misses, or rhythm failure.
 */
export function depleteHeart(
  currentHearts: number,
  reason: HeartDepletionReason,
): HeartDepletionResult {
  const previousHearts = clampHearts(currentHearts);
  const hearts = Math.max(MIN_HEARTS, previousHearts - 1);
  const depleted = hearts < previousHearts;
  const lockedOut = hearts === 0;

  let message: string;
  switch (reason) {
    case 'timeout':
      message = lockedOut
        ? '15s drill timer expired! Final heart lost — practice drills are now locked until you recover a heart.'
        : `15s drill timer expired without a valid latch (-1 Heart · ${hearts}/${MAX_HEARTS} remaining).`;
      break;
    case 'misses':
      message = lockedOut
        ? '3 consecutive wrong attempts! Final heart lost — practice drills are now locked until you recover a heart.'
        : `3 consecutive wrong attempts (-1 Heart · ${hearts}/${MAX_HEARTS} remaining).`;
      break;
    case 'rhythm-fail':
      message = lockedOut
        ? 'Rhythm accuracy below threshold! Final heart lost — practice drills are now locked.'
        : `Rhythm drill accuracy below ${RHYTHM_PASS_ACCURACY_THRESHOLD}% (-1 Heart · ${hearts}/${MAX_HEARTS} remaining).`;
      break;
    default:
      message = `Lost 1 Stamina Heart (${hearts}/${MAX_HEARTS} remaining).`;
      break;
  }

  return {
    previousHearts,
    hearts,
    depleted,
    lockedOut,
    reason,
    message,
  };
}

export interface HeartRestoreResult {
  previousHearts: number;
  hearts: number;
  restoredCount: number;
  source: HeartRestoreSource;
}

/**
 * Restores stamina hearts up to `MAX_HEARTS` (5).
 */
export function restoreHeart(
  currentHearts: number,
  amount = 1,
  source: HeartRestoreSource = 'theory-quiz',
): HeartRestoreResult {
  const previousHearts = clampHearts(currentHearts);
  const safeAmount = Math.max(0, Math.floor(amount));
  const hearts = Math.min(MAX_HEARTS, previousHearts + safeAmount);
  return {
    previousHearts,
    hearts,
    restoredCount: hearts - previousHearts,
    source,
  };
}

/**
 * Evaluates whether completing a Theory quiz restores +1 Heart (requires >= 80% score).
 */
export function evaluateTheoryQuizHeartRestore(
  currentHearts: number,
  quizPercent: number,
): HeartRestoreResult & { qualified: boolean } {
  const qualified = quizPercent >= THEORY_QUIZ_HEART_RESTORE_THRESHOLD;
  if (!qualified) {
    const clamped = clampHearts(currentHearts);
    return {
      previousHearts: clamped,
      hearts: clamped,
      restoredCount: 0,
      source: 'theory-quiz',
      qualified: false,
    };
  }
  const result = restoreHeart(currentHearts, 1, 'theory-quiz');
  return {
    ...result,
    qualified: true,
  };
}

export interface PassiveHeartRegenComputation {
  hearts: number;
  restoredCount: number;
  remainingMs: number;
  nextStartedAtMs: number | null;
  regenerating: boolean;
}

/**
 * Pure calculation for passive 15-minute heart regeneration.
 */
export function computePassiveHeartRegen(
  currentHearts: number,
  startedAtMs: number | null,
  nowMs: number,
  intervalMs: number = HEART_REGEN_INTERVAL_MS,
): PassiveHeartRegenComputation {
  const clamped = clampHearts(currentHearts);
  if (clamped >= MAX_HEARTS) {
    return {
      hearts: MAX_HEARTS,
      restoredCount: 0,
      remainingMs: 0,
      nextStartedAtMs: null,
      regenerating: false,
    };
  }

  const effectiveStart =
    startedAtMs !== null && Number.isFinite(startedAtMs) && startedAtMs <= nowMs
      ? startedAtMs
      : nowMs;

  const elapsed = Math.max(0, nowMs - effectiveStart);
  const ticks = Math.floor(elapsed / intervalMs);
  const nextHearts = Math.min(MAX_HEARTS, clamped + ticks);
  const restoredCount = nextHearts - clamped;

  if (nextHearts >= MAX_HEARTS) {
    return {
      hearts: MAX_HEARTS,
      restoredCount,
      remainingMs: 0,
      nextStartedAtMs: null,
      regenerating: false,
    };
  }

  const nextStartedAtMs = effectiveStart + ticks * intervalMs;
  const cycleElapsed = Math.max(0, nowMs - nextStartedAtMs);
  const remainingMs = Math.max(0, intervalMs - cycleElapsed);

  return {
    hearts: nextHearts,
    restoredCount,
    remainingMs,
    nextStartedAtMs,
    regenerating: true,
  };
}

// ============================================================================
// 4. ACHIEVEMENT BADGES CATALOG & UNLOCK ENGINE
// ============================================================================

export type AchievementCategory = 'streak' | 'accuracy' | 'theory' | 'posture' | 'technique';

export interface AchievementDefinition {
  /** Matches `public.achievements.id` in Supabase (`first-lesson`, `streak-7-days`, etc.). */
  id: string;
  /** Badge display title. */
  title: string;
  /** Concise description of how the badge is earned. */
  description: string;
  /** Category for icon & colour styling. */
  category: AchievementCategory;
  /** EXP bonus awarded when the badge is unlocked (`public.achievements.exp_reward`). */
  expReward: number;
  /** Whether this badge ID exists in the seeded `public.achievements` SQL table. */
  inDatabaseCatalog: boolean;
}

/**
 * Canonical achievement catalog combining the 5 SDD database badges (`supabase/seed.sql`)
 * and the 3 additional mastery milestones shown in Profile & Analytics.
 */
export const ACHIEVEMENT_CATALOG: readonly AchievementDefinition[] = Object.freeze([
  {
    id: 'first-lesson',
    title: 'First Note',
    description: 'Complete your first piano curriculum lesson or practice drill.',
    category: 'theory',
    expReward: 50,
    inDatabaseCatalog: true,
  },
  {
    id: 'streak-7-days',
    title: 'Week of Practice',
    description: 'Log consecutive piano practice sessions for 7 days without interruption.',
    category: 'streak',
    expReward: 50,
    inDatabaseCatalog: true,
  },
  {
    id: 'streak-30-days',
    title: 'Month of Practice',
    description: 'Maintain a 30-day consecutive daily piano practice streak.',
    category: 'streak',
    expReward: 100,
    inDatabaseCatalog: true,
  },
  {
    id: 'exp-500',
    title: 'Rising Pianist',
    description: 'Earn 500 or more total Experience Points (EXP) across lessons and drills.',
    category: 'technique',
    expReward: 50,
    inDatabaseCatalog: true,
  },
  {
    id: 'posture-stable',
    title: 'Steady Hands',
    description: 'Maintain 90%+ ergonomic elbow and wrist posture stability during a drill.',
    category: 'posture',
    expReward: 50,
    inDatabaseCatalog: true,
  },
  {
    id: 'perfect-pitch',
    title: 'Perfect Score',
    description: 'Achieve 100% pitch or quiz accuracy on any curriculum lesson.',
    category: 'accuracy',
    expReward: 50,
    inDatabaseCatalog: false,
  },
  {
    id: 'rhythm-master',
    title: 'Metronome Master',
    description: 'Achieve 90%+ rhythm timing consistency on a beat highway drill.',
    category: 'technique',
    expReward: 75,
    inDatabaseCatalog: false,
  },
  {
    id: 'full-mastery',
    title: 'Grand Maestro',
    description: 'Master every lesson node in the active piano curriculum.',
    category: 'theory',
    expReward: 150,
    inDatabaseCatalog: false,
  },
]);

export interface EvaluatedAchievement extends AchievementDefinition {
  unlocked: boolean;
  unlockedAt: string | null;
  progressPercent: number;
  progressText: string;
}

export interface AchievementEvalContext {
  exp: number;
  currentStreak: number;
  longestStreak?: number;
  completedLessonIds: Iterable<string>;
  lessons: CurriculumNode[];
  performanceRecords?: Array<
    Pick<PerformanceRecord, 'pitch_accuracy' | 'rhythm_consistency' | 'posture_score'>
  >;
  bestAccuracyPercent?: number;
  bestPostureScore?: number;
  bestRhythmConsistency?: number;
  /** Map of `achievement_id -> unlocked_at` ISO timestamp for already-unlocked badges. */
  existingUnlocked?: Record<string, string>;
  nowIso?: string;
}

export interface AchievementEvalResult {
  badges: EvaluatedAchievement[];
  newlyUnlocked: EvaluatedAchievement[];
  unlockedMap: Record<string, string>;
  bonusExpAwarded: number;
}

/**
 * Evaluates all achievement badges against the learner's current state.
 * Also supports cascading EXP unlocks (e.g., unlocking `first-lesson` grants +50 EXP,
 * which can push `exp` from 460 to 510 and unlock `exp-500` in the same pass).
 */
export function evaluateAchievements(context: AchievementEvalContext): AchievementEvalResult {
  const nowIso = context.nowIso ?? new Date().toISOString();
  const completedSet = new Set(context.completedLessonIds);
  const completedCount = completedSet.size;
  const totalLessons = Math.max(1, context.lessons.length);
  const bestStreak = Math.max(
    0,
    context.currentStreak,
    context.longestStreak ?? context.currentStreak,
  );

  const records = context.performanceRecords ?? [];
  const maxRecordPitch = records.reduce((max, r) => Math.max(max, Number(r.pitch_accuracy) || 0), 0);
  const maxRecordPosture = records.reduce((max, r) => Math.max(max, Number(r.posture_score) || 0), 0);
  const maxRecordRhythm = records.reduce(
    (max, r) => Math.max(max, Number(r.rhythm_consistency) || 0),
    0,
  );

  const bestAccuracy = Math.max(context.bestAccuracyPercent ?? 0, maxRecordPitch);
  const bestPosture = Math.max(context.bestPostureScore ?? 0, maxRecordPosture);
  const bestRhythm = Math.max(context.bestRhythmConsistency ?? 0, maxRecordRhythm);

  const unlockedMap: Record<string, string> = { ...(context.existingUnlocked ?? {}) };
  let workingExp = Math.max(0, context.exp);
  let bonusExpAwarded = 0;
  const newlyUnlockedIds = new Set<string>();

  const checkCondition = (def: AchievementDefinition, expValue: number) => {
    switch (def.id) {
      case 'first-lesson': {
        const met = completedCount >= 1;
        const pct = met ? 100 : 0;
        return {
          met,
          progressPercent: pct,
          progressText: `${Math.min(1, completedCount)} / 1 lesson completed`,
        };
      }
      case 'streak-7-days': {
        const met = bestStreak >= 7;
        const pct = Math.min(100, Math.round((bestStreak / 7) * 100));
        return {
          met,
          progressPercent: pct,
          progressText: `${Math.min(7, bestStreak)} / 7 consecutive days`,
        };
      }
      case 'streak-30-days': {
        const met = bestStreak >= 30;
        const pct = Math.min(100, Math.round((bestStreak / 30) * 100));
        return {
          met,
          progressPercent: pct,
          progressText: `${Math.min(30, bestStreak)} / 30 consecutive days`,
        };
      }
      case 'exp-500': {
        const met = expValue >= 500;
        const pct = Math.min(100, Math.round((expValue / 500) * 100));
        return {
          met,
          progressPercent: pct,
          progressText: `${Math.min(500, expValue)} / 500 EXP earned`,
        };
      }
      case 'posture-stable': {
        const met = bestPosture >= 90;
        const pct = Math.min(100, Math.round((bestPosture / 90) * 100));
        return {
          met,
          progressPercent: pct,
          progressText:
            bestPosture > 0
              ? `Best posture: ${Math.round(bestPosture)}% (Target: 90%)`
              : 'Complete a practice drill with >= 90% posture',
        };
      }
      case 'perfect-pitch': {
        const met = bestAccuracy >= 100;
        const pct = Math.min(100, Math.round(bestAccuracy));
        return {
          met,
          progressPercent: pct,
          progressText:
            bestAccuracy > 0
              ? `Best accuracy: ${Math.round(bestAccuracy)}% (Target: 100%)`
              : 'Score 100% on a quiz or drill',
        };
      }
      case 'rhythm-master': {
        const rhythmLessons = context.lessons.filter((l) => l.kind === 'rhythm');
        const completedRhythm = rhythmLessons.filter((l) => completedSet.has(l.id)).length;
        const met = bestRhythm >= 90 || (rhythmLessons.length > 0 && completedRhythm >= rhythmLessons.length);
        const pct = met
          ? 100
          : Math.min(
              100,
              Math.max(
                Math.round((bestRhythm / 90) * 100),
                rhythmLessons.length > 0
                  ? Math.round((completedRhythm / rhythmLessons.length) * 100)
                  : 0,
              ),
            );
        return {
          met,
          progressPercent: pct,
          progressText:
            bestRhythm > 0
              ? `Best rhythm consistency: ${Math.round(bestRhythm)}% (Target: 90%)`
              : `${completedRhythm} / ${Math.max(1, rhythmLessons.length)} rhythm drills mastered`,
        };
      }
      case 'full-mastery': {
        const met = context.lessons.length > 0 && completedCount >= context.lessons.length;
        const pct = Math.min(100, Math.round((completedCount / totalLessons) * 100));
        return {
          met,
          progressPercent: pct,
          progressText: `${completedCount} / ${totalLessons} nodes mastered`,
        };
      }
      default:
        return { met: false, progressPercent: 0, progressText: 'Locked' };
    }
  };

  // Run two passes so EXP rewards from newly unlocked badges can trigger `exp-500`
  for (let pass = 0; pass < 2; pass++) {
    let anyNewInPass = false;
    for (const def of ACHIEVEMENT_CATALOG) {
      if (unlockedMap[def.id]) continue;
      const status = checkCondition(def, workingExp);
      if (status.met) {
        unlockedMap[def.id] = nowIso;
        newlyUnlockedIds.add(def.id);
        bonusExpAwarded += def.expReward;
        workingExp += def.expReward;
        anyNewInPass = true;
      }
    }
    if (!anyNewInPass) break;
  }

  const badges: EvaluatedAchievement[] = ACHIEVEMENT_CATALOG.map((def) => {
    const unlockedAt = unlockedMap[def.id] ?? null;
    const unlocked = Boolean(unlockedAt);
    const status = checkCondition(def, workingExp);
    return {
      ...def,
      unlocked,
      unlockedAt,
      progressPercent: unlocked ? 100 : status.progressPercent,
      progressText: unlocked ? `Unlocked · +${def.expReward} EXP` : status.progressText,
    };
  });

  const newlyUnlocked = badges.filter((b) => newlyUnlockedIds.has(b.id));

  return {
    badges,
    newlyUnlocked,
    unlockedMap,
    bonusExpAwarded,
  };
}
