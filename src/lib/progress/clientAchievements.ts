import type { LessonResult } from '../../lesson/types';
import {
  evaluateAchievements,
  type AchievementId,
} from './achievements';
import {
  applyResult,
  type LessonFacts,
  type ProfileSnapshot,
  type ProgressSnapshot,
} from './applyResult';
import { toLocalDate } from './streak';

export type UnlockedAchievementsMap = Partial<Record<AchievementId, string>>;

export const ACHIEVEMENT_REWARDS: Record<AchievementId, number> = {
  'first-lesson': 50,
  'streak-7-days': 50,
  'streak-30-days': 100,
  'exp-500': 50,
  'posture-stable': 50,
};

const STORAGE_PREFIX = 'muz_client_achievements_v1:';

const VALID_IDS = new Set<AchievementId>([
  'first-lesson',
  'streak-7-days',
  'streak-30-days',
  'exp-500',
  'posture-stable',
]);

function storageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function readClientAchievements(userId: string): UnlockedAchievementsMap {
  if (!storageAvailable()) return {};
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: UnlockedAchievementsMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (VALID_IDS.has(key as AchievementId) && typeof value === 'string') {
        out[key as AchievementId] = value;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function writeClientAchievements(userId: string, map: UnlockedAchievementsMap): void {
  if (!storageAvailable()) return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(map));
  } catch {
    // Ignore quota or storage-access failures in private browsing modes.
  }
}

export function syncClientAchievements(
  userId: string,
  ids: readonly AchievementId[],
  now: Date = new Date(),
): UnlockedAchievementsMap {
  const existing = readClientAchievements(userId);
  if (ids.length === 0) return existing;
  const iso = now.toISOString();
  let changed = false;
  const next: UnlockedAchievementsMap = { ...existing };
  for (const id of ids) {
    if (!next[id]) {
      next[id] = iso;
      changed = true;
    }
  }
  if (changed) writeClientAchievements(userId, next);
  return next;
}

export interface EvaluateClientAchievementsInput {
  userId: string;
  profile: ProfileSnapshot;
  progress: ProgressSnapshot | null;
  lesson: LessonFacts;
  result: LessonResult;
  now?: Date;
}

export interface EvaluateClientAchievementsOutput {
  newlyUnlocked: AchievementId[];
  allUnlocked: UnlockedAchievementsMap;
  bonusExp: number;
}

/**
 * Evaluates and persists achievements in localStorage using the pure lesson
 * rules, so achievements and notifications work even before server lesson
 * progress tables are wired or in demo mode.
 */
export function evaluateClientAchievementsForRun({
  userId,
  profile,
  progress,
  lesson,
  result,
  now = new Date(),
}: EvaluateClientAchievementsInput): EvaluateClientAchievementsOutput {
  const existing = readClientAchievements(userId);
  const applied = applyResult({
    profile,
    progress,
    lesson,
    result,
    today: toLocalDate(now),
    nowIso: now.toISOString(),
  });

  if (applied.progress === null) {
    return { newlyUnlocked: [], allUnlocked: existing, bonusExp: 0 };
  }

  const ranPractice = result.records.some((r) => r.engine === 'practice');
  const postureScore = ranPractice && applied.performance ? applied.performance.posture_score : null;

  const newlyUnlocked = evaluateAchievements({
    completedNow: applied.completedNow,
    exp: applied.profile.exp,
    currentStreak: applied.profile.current_streak,
    postureScore,
    unlocked: new Set(Object.keys(existing)),
  });

  const allUnlocked =
    newlyUnlocked.length > 0 ? syncClientAchievements(userId, newlyUnlocked, now) : existing;
  const bonusExp = newlyUnlocked.reduce((sum, id) => sum + ACHIEVEMENT_REWARDS[id], 0);

  return { newlyUnlocked, allUnlocked, bonusExp };
}
