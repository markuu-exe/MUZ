import { describe, expect, it } from 'vitest';
import { DEMO_CURRICULUM } from '../../dashboard/curriculum';
import {
  ACHIEVEMENT_CATALOG,
  applyExpGain,
  calculateLessonExpReward,
  calendarDaysBetween,
  canStartLessonWithHearts,
  clampHearts,
  computePassiveHeartRegen,
  depleteHeart,
  evaluateAchievements,
  evaluateStreakStatus,
  evaluateTheoryQuizHeartRestore,
  evaluateTierTransition,
  HEART_REGEN_INTERVAL_MS,
  MAX_HEARTS,
  nodeBaseExpReward,
  recordDailyPracticeStreak,
  restoreHeart,
  toDateKey,
} from '../engine';

describe('EXP & Tier Progression Rules', () => {
  it('awards at least 50 base EXP for first-time lesson mastery and scales with required_exp', () => {
    expect(nodeBaseExpReward({ required_exp: 0 })).toBe(50);
    expect(nodeBaseExpReward({ required_exp: 120 })).toBe(50);
    expect(nodeBaseExpReward({ required_exp: 440 })).toBe(110);
  });

  it('computes lesson EXP breakdown with accuracy, posture, and streak bonuses', () => {
    const firstTime = calculateLessonExpReward({
      lesson: { required_exp: 280 },
      kind: 'practice',
      isReplay: false,
      accuracyPercent: 100,
      postureScore: 95,
      streakExtended: true,
      currentStreak: 5,
    });
    expect(firstTime.baseExp).toBe(70);
    expect(firstTime.accuracyBonus).toBe(20);
    expect(firstTime.postureBonus).toBe(10);
    expect(firstTime.streakBonus).toBe(10);
    expect(firstTime.totalExp).toBe(110);

    const replay = calculateLessonExpReward({
      lesson: { required_exp: 280 },
      kind: 'practice',
      isReplay: true,
      accuracyPercent: 85,
      postureScore: 80,
      streakExtended: false,
      currentStreak: 5,
    });
    expect(replay.baseExp).toBe(15);
    expect(replay.accuracyBonus).toBe(0);
    expect(replay.postureBonus).toBe(0);
    expect(replay.streakBonus).toBe(0);
    expect(replay.totalExp).toBe(15);
  });

  it('clamps EXP non-negative and detects tier transitions', () => {
    expect(applyExpGain(100, -500)).toBe(0);
    expect(applyExpGain(960, 50)).toBe(1010);

    const transition = evaluateTierTransition(960, 1010);
    expect(transition.leveledUp).toBe(true);
    expect(transition.previousTier.label).toBe('Bronze Tier Learner');
    expect(transition.nextTier.label).toBe('Silver Tier Learner');
  });
});

describe('Daily Streak Counter Rules', () => {
  it('normalizes dates and computes calendar day differences accurately', () => {
    expect(toDateKey('2026-11-15')).toBe('2026-11-15');
    expect(calendarDaysBetween('2026-11-14', '2026-11-15')).toBe(1);
    expect(calendarDaysBetween('2026-11-10', '2026-11-15')).toBe(5);
  });

  it('keeps streak intact on the same day or next day, and resets to 0 when a day is missed', () => {
    // Practiced today
    const sameDay = evaluateStreakStatus(7, '2026-11-15', '2026-11-15');
    expect(sameDay.effectiveStreak).toBe(7);
    expect(sameDay.practicedToday).toBe(true);
    expect(sameDay.streakAtRisk).toBe(false);
    expect(sameDay.streakBroken).toBe(false);

    // Practiced yesterday (at risk until today's practice)
    const yesterday = evaluateStreakStatus(7, '2026-11-14', '2026-11-15');
    expect(yesterday.effectiveStreak).toBe(7);
    expect(yesterday.practicedToday).toBe(false);
    expect(yesterday.streakAtRisk).toBe(true);
    expect(yesterday.streakBroken).toBe(false);

    // Missed a day (2 days ago) -> broken, resets to 0
    const missed = evaluateStreakStatus(7, '2026-11-13', '2026-11-15');
    expect(missed.effectiveStreak).toBe(0);
    expect(missed.practicedToday).toBe(false);
    expect(missed.streakBroken).toBe(true);
  });

  it('increments streak on consecutive day practice, does not double-increment on same day, and restarts at 1 after gap', () => {
    // Consecutive day: 7 -> 8
    const inc = recordDailyPracticeStreak(7, '2026-11-14', '2026-11-15');
    expect(inc.currentStreak).toBe(8);
    expect(inc.incremented).toBe(true);
    expect(inc.wasReset).toBe(false);
    expect(inc.lastActivityDate).toBe('2026-11-15');

    // Second session on the same day: stays 8
    const same = recordDailyPracticeStreak(8, '2026-11-15', '2026-11-15');
    expect(same.currentStreak).toBe(8);
    expect(same.incremented).toBe(false);

    // After a 3-day gap: resets to 1
    const reset = recordDailyPracticeStreak(8, '2026-11-10', '2026-11-15');
    expect(reset.currentStreak).toBe(1);
    expect(reset.incremented).toBe(true);
    expect(reset.wasReset).toBe(true);
  });
});

describe('Heart Depletion & Regeneration Rules', () => {
  it('clamps hearts between 0 and 5', () => {
    expect(clampHearts(8)).toBe(MAX_HEARTS);
    expect(clampHearts(-2)).toBe(0);
    expect(clampHearts(3)).toBe(3);
  });

  it('locks Practice and Rhythm drills at 0 hearts while keeping Theory lessons free', () => {
    expect(canStartLessonWithHearts(0, 'theory').allowed).toBe(true);
    expect(canStartLessonWithHearts(0, 'practice').allowed).toBe(false);
    expect(canStartLessonWithHearts(0, 'rhythm').allowed).toBe(false);
    expect(canStartLessonWithHearts(1, 'practice').allowed).toBe(true);
  });

  it('depletes 1 heart on 15s timeout or 3 consecutive misses and flags lockout at 0', () => {
    const r1 = depleteHeart(2, 'timeout');
    expect(r1.hearts).toBe(1);
    expect(r1.depleted).toBe(true);
    expect(r1.lockedOut).toBe(false);

    const r2 = depleteHeart(r1.hearts, 'misses');
    expect(r2.hearts).toBe(0);
    expect(r2.depleted).toBe(true);
    expect(r2.lockedOut).toBe(true);
  });

  it('restores +1 heart when Theory quiz score is >= 80%, capped at 5', () => {
    const failQuiz = evaluateTheoryQuizHeartRestore(0, 75);
    expect(failQuiz.qualified).toBe(false);
    expect(failQuiz.hearts).toBe(0);
    expect(failQuiz.restoredCount).toBe(0);

    const passQuiz = evaluateTheoryQuizHeartRestore(0, 83);
    expect(passQuiz.qualified).toBe(true);
    expect(passQuiz.hearts).toBe(1);
    expect(passQuiz.restoredCount).toBe(1);

    const alreadyFull = restoreHeart(5, 1, 'theory-quiz');
    expect(alreadyFull.hearts).toBe(5);
    expect(alreadyFull.restoredCount).toBe(0);
  });

  it('computes passive 15-minute heart regeneration cycles deterministically', () => {
    const t0 = 1_000_000;
    // 5 minutes elapsed -> 0 hearts restored, 10 minutes left
    const mid = computePassiveHeartRegen(3, t0, t0 + 5 * 60 * 1000);
    expect(mid.hearts).toBe(3);
    expect(mid.restoredCount).toBe(0);
    expect(mid.remainingMs).toBe(10 * 60 * 1000);
    expect(mid.regenerating).toBe(true);

    // 32 minutes elapsed (2 full 15-min cycles) from 2 hearts -> 4 hearts, 13 min left on next
    const twoCycles = computePassiveHeartRegen(
      2,
      t0,
      t0 + 2 * HEART_REGEN_INTERVAL_MS + 2 * 60 * 1000,
    );
    expect(twoCycles.hearts).toBe(4);
    expect(twoCycles.restoredCount).toBe(2);
    expect(twoCycles.remainingMs).toBe(13 * 60 * 1000);
    expect(twoCycles.regenerating).toBe(true);
  });
});

describe('Achievement Badges Catalog & Unlock Rules', () => {
  it('includes all 5 SDD database achievements in the catalog', () => {
    const ids = ACHIEVEMENT_CATALOG.map((a) => a.id);
    expect(ids).toContain('first-lesson');
    expect(ids).toContain('streak-7-days');
    expect(ids).toContain('streak-30-days');
    expect(ids).toContain('exp-500');
    expect(ids).toContain('posture-stable');
  });

  it('unlocks badges when criteria are met and cascades EXP rewards into exp-500', () => {
    // Learner at 460 EXP completes their first lesson with 95% posture ->
    // unlocks `first-lesson` (+50 EXP) and `posture-stable` (+50 EXP), pushing EXP to 560 ->
    // cascades to unlock `exp-500` (+50 EXP) in the same evaluation!
    const evalResult = evaluateAchievements({
      exp: 460,
      currentStreak: 3,
      longestStreak: 3,
      completedLessonIds: ['pno-mod1-node1'],
      lessons: DEMO_CURRICULUM,
      bestAccuracyPercent: 95,
      bestPostureScore: 95,
      bestRhythmConsistency: 80,
      existingUnlocked: {},
      nowIso: '2026-11-15T12:00:00.000Z',
    });

    const newlyUnlockedIds = evalResult.newlyUnlocked.map((b) => b.id);
    expect(newlyUnlockedIds).toContain('first-lesson');
    expect(newlyUnlockedIds).toContain('posture-stable');
    expect(newlyUnlockedIds).toContain('exp-500');
    expect(evalResult.bonusExpAwarded).toBe(150);
  });

  it('does not re-award EXP for already-unlocked badges', () => {
    const evalResult = evaluateAchievements({
      exp: 600,
      currentStreak: 7,
      longestStreak: 7,
      completedLessonIds: ['pno-mod1-node1'],
      lessons: DEMO_CURRICULUM,
      bestAccuracyPercent: 95,
      bestPostureScore: 95,
      existingUnlocked: {
        'first-lesson': '2026-11-01T00:00:00.000Z',
        'posture-stable': '2026-11-01T00:00:00.000Z',
        'exp-500': '2026-11-01T00:00:00.000Z',
      },
    });

    const newlyUnlockedIds = evalResult.newlyUnlocked.map((b) => b.id);
    expect(newlyUnlockedIds).toEqual(['streak-7-days']);
    expect(evalResult.bonusExpAwarded).toBe(50);
  });
});
