/**
 * COURSE-6: save one lesson run. Reads the current profile and progress rows
 * (not the copies the dashboard holds, which can be stale after regeneration),
 * applies the rules in applyResult, then writes progress → performance → profile.
 * Progress goes first so EXP is never granted without the completion it pays for.
 */
import type { LessonResult } from '../../lesson/types';
import { applyResult, type AppliedResult, type LessonFacts, type PerformanceRow, type ProfileSnapshot, type ProgressSnapshot } from './applyResult';
import { toLocalDate } from './streak';

export interface ProgressStore {
  getProfile(userId: string): Promise<ProfileSnapshot | null>;
  getProgress(userId: string, lessonId: string): Promise<ProgressSnapshot | null>;
  upsertProgress(userId: string, lessonId: string, row: ProgressSnapshot): Promise<void>;
  insertPerformance(userId: string, lessonId: string, row: PerformanceRow): Promise<void>;
  updateProfile(userId: string, patch: ProfileSnapshot): Promise<void>;
}

export interface SaveLessonInput {
  userId: string;
  lesson: LessonFacts;
  result: LessonResult;
  now?: Date;
}

export async function saveLessonResult(store: ProgressStore, { userId, lesson, result, now = new Date() }: SaveLessonInput): Promise<AppliedResult> {
  const profile = await store.getProfile(userId);
  if (!profile) throw new Error('Your profile could not be loaded, so the result was not saved.');
  const progress = await store.getProgress(userId, result.lessonId);

  const applied = applyResult({
    profile,
    progress,
    lesson,
    result,
    today: toLocalDate(now),
    nowIso: now.toISOString(),
  });

  if (applied.progress) await store.upsertProgress(userId, result.lessonId, applied.progress);
  if (applied.performance) await store.insertPerformance(userId, result.lessonId, applied.performance);
  await store.updateProfile(userId, applied.profile);
  return applied;
}
