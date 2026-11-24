export type AchievementId =
  | 'first-lesson'
  | 'streak-7-days'
  | 'streak-30-days'
  | 'exp-500'
  | 'posture-stable';

export const ACHIEVEMENT_TITLES: Record<AchievementId, string> = {
  'first-lesson': 'First Note',
  'streak-7-days': 'Week of Practice',
  'streak-30-days': 'Month of Practice',
  'exp-500': 'Rising Pianist',
  'posture-stable': 'Steady Hands',
};

export const ACHIEVEMENT_DESCRIPTIONS: Record<AchievementId, string> = {
  'first-lesson': 'Completed your first piano lesson.',
  'streak-7-days': 'Practiced 7 days in a row.',
  'streak-30-days': 'Practiced 30 days in a row.',
  'exp-500': 'Earned 500 total EXP.',
  'posture-stable': 'Maintained 90%+ posture score in a practice session.',
};

export interface AchievementInput {
  completedNow: boolean;
  exp: number;
  currentStreak: number;
  /** This run's performance.posture_score, null if no practice ran. */
  postureScore: number | null;
  unlocked: ReadonlySet<string>;
}

const RULES: ReadonlyArray<{ id: AchievementId; matches: (i: AchievementInput) => boolean }> = [
  { id: 'first-lesson', matches: (i) => i.completedNow },
  { id: 'streak-7-days', matches: (i) => i.currentStreak >= 7 },
  { id: 'streak-30-days', matches: (i) => i.currentStreak >= 30 },
  // Single pass on post-lesson EXP before badge bonuses (U-04: no cascade).
  { id: 'exp-500', matches: (i) => i.exp >= 500 },
  { id: 'posture-stable', matches: (i) => i.postureScore !== null && i.postureScore >= 90 },
];

/** Returns only the achievement ids newly unlocked by this run. */
export function evaluateAchievements(i: AchievementInput): AchievementId[] {
  return RULES.filter((rule) => !i.unlocked.has(rule.id) && rule.matches(i)).map((rule) => rule.id);
}

export function formatUnlockedBadgesNote(ids: readonly AchievementId[]): string {
  return ids.map((id) => `Badge unlocked: ${ACHIEVEMENT_TITLES[id]}`).join('\n');
}
