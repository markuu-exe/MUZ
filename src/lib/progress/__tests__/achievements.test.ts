import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENT_TITLES,
  evaluateAchievements,
  type AchievementId,
  type AchievementInput,
} from '../achievements';

const baseInput = (over: Partial<AchievementInput> = {}): AchievementInput => ({
  completedNow: false,
  exp: 0,
  currentStreak: 1,
  postureScore: null,
  unlocked: new Set<string>(),
  ...over,
});

describe('evaluateAchievements (T-11 / U-04)', () => {
  it('defines titles for all 5 seeded database achievements', () => {
    const ids = Object.keys(ACHIEVEMENT_TITLES) as AchievementId[];
    expect(ids).toEqual([
      'first-lesson',
      'streak-7-days',
      'streak-30-days',
      'exp-500',
      'posture-stable',
    ]);
  });

  it('unlocks first-lesson only when completedNow is true', () => {
    expect(evaluateAchievements(baseInput({ completedNow: true }))).toEqual(['first-lesson']);
    expect(evaluateAchievements(baseInput({ completedNow: false }))).toEqual([]);
  });

  it('unlocks streak-7-days at 7 and streak-30-days at 30', () => {
    expect(evaluateAchievements(baseInput({ currentStreak: 6 }))).toEqual([]);
    expect(evaluateAchievements(baseInput({ currentStreak: 7 }))).toEqual(['streak-7-days']);
    expect(evaluateAchievements(baseInput({ currentStreak: 29 }))).toEqual(['streak-7-days']);
    expect(evaluateAchievements(baseInput({ currentStreak: 30 }))).toEqual([
      'streak-7-days',
      'streak-30-days',
    ]);
  });

  it('unlocks exp-500 at 500 without cascading badge bonuses', () => {
    expect(evaluateAchievements(baseInput({ exp: 499 }))).toEqual([]);
    expect(evaluateAchievements(baseInput({ exp: 500 }))).toEqual(['exp-500']);

    // 460 EXP + first-lesson (+50) + posture-stable (+50) would exceed 500 only after bonuses;
    // U-04 specifies single-pass evaluation before badge bonuses (no cascade).
    const unlocked = evaluateAchievements(
      baseInput({
        completedNow: true,
        exp: 460,
        postureScore: 95,
      }),
    );
    expect(unlocked).toEqual(['first-lesson', 'posture-stable']);
    expect(unlocked).not.toContain('exp-500');
  });

  it('unlocks posture-stable at >= 90 only when a practice exercise ran', () => {
    expect(evaluateAchievements(baseInput({ postureScore: null }))).toEqual([]);
    expect(evaluateAchievements(baseInput({ postureScore: 89.99 }))).toEqual([]);
    expect(evaluateAchievements(baseInput({ postureScore: 90 }))).toEqual(['posture-stable']);
  });

  it('does not re-award already-unlocked badges', () => {
    const unlocked = evaluateAchievements(
      baseInput({
        completedNow: true,
        exp: 600,
        currentStreak: 7,
        postureScore: 95,
        unlocked: new Set(['first-lesson', 'posture-stable', 'exp-500']),
      }),
    );
    expect(unlocked).toEqual(['streak-7-days']);
  });

  it('returns nothing when a quit run produces no progress or milestones', () => {
    expect(evaluateAchievements(baseInput())).toEqual([]);
  });
});
