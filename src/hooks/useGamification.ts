import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase/client';
import type { CurriculumNode } from '../lib/dashboard/curriculum';
import type { UserProfile } from '../types/auth.types';
import type { PerformanceRecord, UserProgress } from '../types/database.types';
import {
  applyExpGain,
  calculateLessonExpReward,
  clampHearts,
  depleteHeart,
  evaluateAchievements,
  evaluateStreakStatus,
  evaluateTheoryQuizHeartRestore,
  evaluateTierTransition,
  MAX_HEARTS,
  recordDailyPracticeStreak,
  restoreHeart,
  type EvaluatedAchievement,
  type HeartDepletionReason,
  type HeartDepletionResult,
  type HeartRestoreSource,
  type LessonExpBreakdown,
} from '../lib/gamification';

interface StoredGamificationState {
  exp: number;
  hearts: number;
  lastHeartUpdate?: string | null;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  completedIds: string[];
  unlockedMap: Record<string, string>;
  bestAccuracyPercent: number;
  bestPostureScore: number;
  bestRhythmConsistency: number;
  performanceRecords: PerformanceRecord[];
}

export interface CompleteLessonParams {
  lesson: CurriculumNode;
  accuracyPercent?: number;
  rhythmConsistency?: number;
  postureScore?: number;
  durationSec?: number;
  heartsEnd?: number;
  heartRestoredOverride?: boolean;
}

export interface SessionCompletionSummary {
  lesson: CurriculumNode;
  isReplay: boolean;
  expBreakdown: LessonExpBreakdown;
  achievementBonusExp: number;
  totalExpAwarded: number;
  previousExp: number;
  nextExp: number;
  leveledUp: boolean;
  tierLabel: string;
  previousStreak: number;
  currentStreak: number;
  streakIncremented: boolean;
  previousHearts: number;
  hearts: number;
  heartRestored: boolean;
  newlyUnlockedBadges: EvaluatedAchievement[];
  accuracyPercent: number;
  postureScore: number;
  rhythmConsistency: number;
}

function getStorageKey(userId: string): string {
  return `muz-gamification-v1-${userId}`;
}

function readStoredState(userId: string): Partial<StoredGamificationState> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as Partial<StoredGamificationState>;
  } catch {
    return null;
  }
}

function writeStoredState(userId: string, state: StoredGamificationState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getStorageKey(userId), JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function useGamification(
  profile: UserProfile | null,
  isDemo: boolean,
  lessons: CurriculumNode[],
  remoteProgress: Record<string, UserProgress | Pick<UserProgress, 'lesson_id' | 'completed'>>,
  refreshProfile?: () => Promise<void>,
) {
  const userId = profile?.id ?? 'guest-pianist';

  const initialCompletedIds = useMemo(() => {
    return Object.values(remoteProgress)
      .filter((row) => row?.completed && row?.lesson_id)
      .map((row) => row.lesson_id);
  }, [remoteProgress]);

  const [exp, setExp] = useState<number>(() => profile?.exp ?? 1240);
  const [hearts, setHearts] = useState<number>(() => clampHearts(profile?.hearts ?? MAX_HEARTS));
  const [lastHeartUpdate, setLastHeartUpdate] = useState<string | null>(
    () => profile?.last_heart_update ?? null,
  );
  const [currentStreak, setCurrentStreak] = useState<number>(() => profile?.current_streak ?? 7);
  const [longestStreak, setLongestStreak] = useState<number>(() =>
    Math.max(14, profile?.current_streak ?? 7),
  );
  const [lastActivityDate, setLastActivityDate] = useState<string | null>(
    () => profile?.last_activity_date ?? new Date().toISOString(),
  );
  const [completedIds, setCompletedIds] = useState<string[]>(initialCompletedIds);
  const [unlockedMap, setUnlockedMap] = useState<Record<string, string>>({});
  const [bestAccuracyPercent, setBestAccuracyPercent] = useState<number>(96);
  const [bestPostureScore, setBestPostureScore] = useState<number>(95);
  const [bestRhythmConsistency, setBestRhythmConsistency] = useState<number>(92);
  const [performanceRecords, setPerformanceRecords] = useState<PerformanceRecord[]>([]);
  const [newlyUnlockedBadges, setNewlyUnlockedBadges] = useState<EvaluatedAchievement[]>([]);

  // Hydrate from profile + localStorage + Supabase tables
  useEffect(() => {
    const stored = readStoredState(userId);
    const baseExp = !isDemo && profile ? profile.exp : (stored?.exp ?? profile?.exp ?? 1240);
    const baseHearts = clampHearts(
      !isDemo && profile
        ? profile.hearts
        : (stored?.hearts ?? profile?.hearts ?? MAX_HEARTS),
    );
    const baseLastHeartUpdate =
      baseHearts >= MAX_HEARTS
        ? null
        : !isDemo && profile
          ? (profile.last_heart_update ?? stored?.lastHeartUpdate ?? new Date().toISOString())
          : (stored?.lastHeartUpdate ?? profile?.last_heart_update ?? new Date().toISOString());
    const rawStreak =
      !isDemo && profile
        ? profile.current_streak
        : (stored?.currentStreak ?? profile?.current_streak ?? 7);
    const rawLastDate =
      !isDemo && profile
        ? profile.last_activity_date
        : (stored?.lastActivityDate ?? profile?.last_activity_date ?? null);

    // Evaluate whether streak is still active or expired due to missed calendar day(s)
    const streakEval = evaluateStreakStatus(rawStreak, rawLastDate);
    const effectiveStreak = streakEval.effectiveStreak;
    const baseLongest = Math.max(
      stored?.longestStreak ?? 0,
      rawStreak,
      effectiveStreak,
      isDemo ? 14 : effectiveStreak,
    );

    const mergedCompleted = Array.from(
      new Set([...initialCompletedIds, ...(stored?.completedIds ?? [])]),
    );

    setExp(baseExp);
    setHearts(baseHearts);
    setLastHeartUpdate(baseLastHeartUpdate);
    setCurrentStreak(effectiveStreak);
    setLongestStreak(baseLongest);
    setLastActivityDate(rawLastDate);
    setCompletedIds(mergedCompleted);
    setUnlockedMap(stored?.unlockedMap ?? {});
    setBestAccuracyPercent(stored?.bestAccuracyPercent ?? (mergedCompleted.length > 0 ? 96 : 0));
    setBestPostureScore(stored?.bestPostureScore ?? (mergedCompleted.length > 0 ? 95 : 0));
    setBestRhythmConsistency(
      stored?.bestRhythmConsistency ?? (mergedCompleted.length > 0 ? 92 : 0),
    );
    setPerformanceRecords(stored?.performanceRecords ?? []);

    if (isDemo || !profile?.id) {
      return;
    }

    let cancelled = false;
    const loadRemoteExtras = async () => {
      try {
        const [achRes, perfRes] = await Promise.all([
          supabase.from('user_achievements').select('*').eq('user_id', profile.id),
          supabase
            .from('performance_records')
            .select('*')
            .eq('user_id', profile.id)
            .order('session_timestamp', { ascending: false })
            .limit(50),
        ]);

        if (cancelled) return;

        if (achRes.data && achRes.data.length > 0) {
          setUnlockedMap((prev) => {
            const next = { ...prev };
            for (const row of achRes.data) {
              if (row.achievement_id) {
                next[row.achievement_id] = row.unlocked_at ?? new Date().toISOString();
              }
            }
            return next;
          });
        }

        if (perfRes.data && perfRes.data.length > 0) {
          const rows = perfRes.data as PerformanceRecord[];
          setPerformanceRecords(rows);
        }

        // If streak broke while away, persist reset streak to Supabase
        if (streakEval.streakBroken) {
          await supabase
            .from('profiles')
            .update({ current_streak: 0 })
            .eq('id', profile.id);
        }
      } catch {
        // Ignore network/table fallback errors
      }
    };

    void loadRemoteExtras();
    return () => {
      cancelled = true;
    };
  }, [
    userId,
    profile?.id,
    profile?.exp,
    profile?.hearts,
    profile?.last_heart_update,
    profile?.current_streak,
    profile?.last_activity_date,
    isDemo,
    initialCompletedIds,
  ]);

  // Evaluate achievement badges against current state
  const achievementEvaluation = useMemo(() => {
    return evaluateAchievements({
      exp,
      currentStreak,
      longestStreak,
      completedLessonIds: completedIds,
      lessons,
      performanceRecords,
      bestAccuracyPercent,
      bestPostureScore,
      bestRhythmConsistency,
      existingUnlocked: unlockedMap,
    });
  }, [
    exp,
    currentStreak,
    longestStreak,
    completedIds,
    lessons,
    performanceRecords,
    bestAccuracyPercent,
    bestPostureScore,
    bestRhythmConsistency,
    unlockedMap,
  ]);

  // Keep localStorage in sync whenever state changes
  useEffect(() => {
    if (!isDemo && !profile?.id) return;
    writeStoredState(userId, {
      exp,
      hearts,
      lastHeartUpdate,
      currentStreak,
      longestStreak,
      lastActivityDate,
      completedIds,
      unlockedMap: achievementEvaluation.unlockedMap,
      bestAccuracyPercent,
      bestPostureScore,
      bestRhythmConsistency,
      performanceRecords,
    });
  }, [
    isDemo,
    profile?.id,
    userId,
    exp,
    hearts,
    lastHeartUpdate,
    currentStreak,
    longestStreak,
    lastActivityDate,
    completedIds,
    achievementEvaluation.unlockedMap,
    bestAccuracyPercent,
    bestPostureScore,
    bestRhythmConsistency,
    performanceRecords,
  ]);

  const streakStatus = useMemo(
    () => evaluateStreakStatus(currentStreak, lastActivityDate),
    [currentStreak, lastActivityDate],
  );

  // Merge remoteProgress with locally completed lessons
  const progressMap = useMemo(() => {
    const merged: Record<string, UserProgress | Pick<UserProgress, 'lesson_id' | 'completed'>> = {
      ...remoteProgress,
    };
    for (const id of completedIds) {
      merged[id] = {
        ...(merged[id] ?? { lesson_id: id }),
        lesson_id: id,
        completed: true,
      };
    }
    return merged;
  }, [remoteProgress, completedIds]);

  const syncProfileToSupabase = useCallback(
    async (patch: {
      exp?: number;
      hearts?: number;
      last_heart_update?: string | null;
      current_streak?: number;
      last_activity_date?: string | null;
    }) => {
      if (isDemo || !profile?.id) return;
      try {
        await supabase.from('profiles').update(patch).eq('id', profile.id);
        await refreshProfile?.();
      } catch {
        // Offline / fallback resilience
      }
    },
    [isDemo, profile?.id, refreshProfile],
  );

  const depleteHeartForDrill = useCallback(
    (reason: HeartDepletionReason): HeartDepletionResult => {
      const result = depleteHeart(hearts, reason);
      setHearts(result.hearts);
      if (result.depleted) {
        const nowMs = Date.now();
        const nowIso = new Date(nowMs).toISOString();
        setLastHeartUpdate(nowIso);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(`muz-heart-regen-${userId}`, String(nowMs));
        }
        void syncProfileToSupabase({ hearts: result.hearts, last_heart_update: nowIso });
      } else {
        void syncProfileToSupabase({ hearts: result.hearts });
      }
      return result;
    },
    [hearts, syncProfileToSupabase, userId],
  );

  const restoreHearts = useCallback(
    (
      amount = 1,
      source: HeartRestoreSource = 'regen',
      nextStartedAtMs?: number | null,
    ) => {
      const result = restoreHeart(hearts, amount, source);
      if (result.restoredCount > 0) {
        const nextUpdateIso =
          result.hearts >= MAX_HEARTS
            ? null
            : typeof nextStartedAtMs === 'number' && Number.isFinite(nextStartedAtMs)
              ? new Date(nextStartedAtMs).toISOString()
              : (lastHeartUpdate ?? new Date().toISOString());
        setHearts(result.hearts);
        setLastHeartUpdate(nextUpdateIso);
        if (typeof window !== 'undefined') {
          if (result.hearts >= MAX_HEARTS) {
            window.localStorage.removeItem(`muz-heart-regen-${userId}`);
          } else if (nextUpdateIso) {
            window.localStorage.setItem(
              `muz-heart-regen-${userId}`,
              String(Date.parse(nextUpdateIso)),
            );
          }
        }
        void syncProfileToSupabase({
          hearts: result.hearts,
          last_heart_update: nextUpdateIso,
        });
      }
      return result;
    },
    [hearts, lastHeartUpdate, syncProfileToSupabase, userId],
  );

  const completeLessonSession = useCallback(
    (params: CompleteLessonParams): SessionCompletionSummary => {
      const {
        lesson,
        accuracyPercent = 100,
        rhythmConsistency = 95,
        postureScore = 95,
        durationSec = 45,
        heartsEnd,
        heartRestoredOverride,
      } = params;

      const isReplay = completedIds.includes(lesson.id);

      // 1. Update daily streak
      const streakResult = recordDailyPracticeStreak(currentStreak, lastActivityDate);
      const nextStreak = streakResult.currentStreak;
      const nextLongestStreak = Math.max(longestStreak, nextStreak);
      const nextLastActivityDate = streakResult.lastActivityDate;

      // 2. Heart restoration on Theory lessons (quiz >= 80%) or explicit lesson outcome
      const previousHearts = hearts;
      let nextHearts = typeof heartsEnd === 'number' ? clampHearts(heartsEnd) : hearts;
      let heartRestored = Boolean(heartRestoredOverride);
      if (typeof heartsEnd !== 'number' && lesson.kind === 'theory') {
        const restoreRes = evaluateTheoryQuizHeartRestore(hearts, accuracyPercent);
        nextHearts = restoreRes.hearts;
        heartRestored = restoreRes.restoredCount > 0;
      }

      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();
      const nextLastHeartUpdate =
        nextHearts >= MAX_HEARTS
          ? null
          : nextHearts < previousHearts
            ? nowIso
            : (lastHeartUpdate ?? nowIso);

      // 3. Calculate lesson EXP reward
      const expBreakdown = calculateLessonExpReward({
        lesson,
        kind: lesson.kind,
        isReplay,
        accuracyPercent,
        postureScore,
        streakExtended: streakResult.incremented,
        currentStreak: nextStreak,
      });

      const nextCompletedIds = isReplay ? completedIds : [...completedIds, lesson.id];
      const nextBestAccuracy = Math.max(bestAccuracyPercent, accuracyPercent);
      const nextBestPosture = Math.max(bestPostureScore, postureScore);
      const nextBestRhythm = Math.max(bestRhythmConsistency, rhythmConsistency);

      const newRecord: PerformanceRecord = {
        id: `perf-${Date.now()}`,
        user_id: userId,
        lesson_id: lesson.id,
        session_timestamp: nowIso,
        pitch_accuracy: accuracyPercent,
        rhythm_consistency: rhythmConsistency,
        posture_score: postureScore,
        drill_duration_sec: durationSec,
      };
      const nextRecords = [newRecord, ...performanceRecords].slice(0, 50);

      // 4. Evaluate achievements with the lesson's EXP applied
      const expAfterLesson = applyExpGain(exp, expBreakdown.totalExp);
      const achEval = evaluateAchievements({
        exp: expAfterLesson,
        currentStreak: nextStreak,
        longestStreak: nextLongestStreak,
        completedLessonIds: nextCompletedIds,
        lessons,
        performanceRecords: nextRecords,
        bestAccuracyPercent: nextBestAccuracy,
        bestPostureScore: nextBestPosture,
        bestRhythmConsistency: nextBestRhythm,
        existingUnlocked: achievementEvaluation.unlockedMap,
        nowIso,
      });

      const achievementBonusExp = achEval.bonusExpAwarded;
      const finalExp = applyExpGain(expAfterLesson, achievementBonusExp);
      const totalExpAwarded = finalExp - exp;
      const tierTransition = evaluateTierTransition(exp, finalExp);

      // 5. Commit state updates
      setExp(finalExp);
      setHearts(nextHearts);
      setLastHeartUpdate(nextLastHeartUpdate);
      if (typeof window !== 'undefined') {
        if (nextHearts >= MAX_HEARTS) {
          window.localStorage.removeItem(`muz-heart-regen-${userId}`);
        } else if (nextLastHeartUpdate) {
          window.localStorage.setItem(
            `muz-heart-regen-${userId}`,
            String(Date.parse(nextLastHeartUpdate)),
          );
        }
      }
      setCurrentStreak(nextStreak);
      setLongestStreak(nextLongestStreak);
      setLastActivityDate(nextLastActivityDate);
      setCompletedIds(nextCompletedIds);
      setBestAccuracyPercent(nextBestAccuracy);
      setBestPostureScore(nextBestPosture);
      setBestRhythmConsistency(nextBestRhythm);
      setPerformanceRecords(nextRecords);
      setUnlockedMap(achEval.unlockedMap);

      if (achEval.newlyUnlocked.length > 0) {
        setNewlyUnlockedBadges(achEval.newlyUnlocked);
      }

      // 6. Sync to Supabase asynchronously when authenticated
      if (!isDemo && profile?.id) {
        void (async () => {
          try {
            await supabase
              .from('profiles')
              .update({
                exp: finalExp,
                hearts: nextHearts,
                last_heart_update: nextLastHeartUpdate,
                current_streak: nextStreak,
                last_activity_date: nextLastActivityDate,
              })
              .eq('id', profile.id);

            await supabase.from('user_progress').upsert(
              {
                user_id: profile.id,
                lesson_id: lesson.id,
                completed: true,
                accuracy_percentage: accuracyPercent,
                posture_stability_score: postureScore,
                completed_at: nowIso,
              },
              { onConflict: 'user_id,lesson_id' },
            );

            await supabase.from('performance_records').insert({
              user_id: profile.id,
              lesson_id: lesson.id,
              session_timestamp: nowIso,
              pitch_accuracy: accuracyPercent,
              rhythm_consistency: rhythmConsistency,
              posture_score: postureScore,
              drill_duration_sec: durationSec,
            });

            const dbBadges = achEval.newlyUnlocked.filter((b) => b.inDatabaseCatalog);
            if (dbBadges.length > 0) {
              await supabase.from('user_achievements').upsert(
                dbBadges.map((b) => ({
                  user_id: profile.id,
                  achievement_id: b.id,
                  unlocked_at: nowIso,
                })),
                { onConflict: 'user_id,achievement_id' },
              );
            }

            await refreshProfile?.();
          } catch {
            // Local state already updated
          }
        })();
      }

      return {
        lesson,
        isReplay,
        expBreakdown,
        achievementBonusExp,
        totalExpAwarded,
        previousExp: exp,
        nextExp: finalExp,
        leveledUp: tierTransition.leveledUp,
        tierLabel: tierTransition.nextTier.label,
        previousStreak: currentStreak,
        currentStreak: nextStreak,
        streakIncremented: streakResult.incremented,
        previousHearts,
        hearts: nextHearts,
        heartRestored,
        newlyUnlockedBadges: achEval.newlyUnlocked,
        accuracyPercent,
        postureScore,
        rhythmConsistency,
      };
    },
    [
      completedIds,
      currentStreak,
      lastActivityDate,
      longestStreak,
      hearts,
      lastHeartUpdate,
      bestAccuracyPercent,
      bestPostureScore,
      bestRhythmConsistency,
      userId,
      performanceRecords,
      exp,
      lessons,
      achievementEvaluation.unlockedMap,
      isDemo,
      profile?.id,
      refreshProfile,
    ],
  );

  const dismissNewlyUnlockedBadges = useCallback(() => {
    setNewlyUnlockedBadges([]);
  }, []);

  return {
    exp,
    hearts: clampHearts(hearts),
    lastHeartUpdate,
    maxHearts: MAX_HEARTS,
    currentStreak,
    longestStreak,
    lastActivityDate,
    practicedToday: streakStatus.practicedToday,
    streakAtRisk: streakStatus.streakAtRisk,
    streakBroken: streakStatus.streakBroken,
    progressMap,
    badges: achievementEvaluation.badges,
    newlyUnlockedBadges,
    performanceRecords,
    completeLessonSession,
    depleteHeartForDrill,
    restoreHearts,
    dismissNewlyUnlockedBadges,
  };
}
