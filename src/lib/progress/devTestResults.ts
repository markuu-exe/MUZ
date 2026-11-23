/**
 * Decision D1 (A, 2026-11-19): developer test results are kept apart from learner
 * progress. A run of a lesson a developer opened through the lock override
 * (resultDestination → 'dev-test') writes one row to `dev_test_results` and applies
 * only its hearts change to the profile, so the zero-heart rule still bites.
 * It never writes user_progress, performance_records or achievements, and never
 * changes EXP, streak or last activity. Migration: 20261121000000_dev_test_results.sql.
 */
import type { LessonResult } from '../../lesson/types';
import { MAX_HEARTS } from '../../lesson/runner';
import type { AchievementId } from './achievements';
import type { AppliedResult, LessonFacts } from './applyResult';
import type { ResultDestination } from './devAccess';
import { saveLessonResult, type ProgressStore } from './saveLessonResult';

export const DEV_TEST_NOTE = 'Developer test run: saved as test data. Learner progress, EXP and streak are unchanged.';

export interface DevTestRow {
  status: LessonResult['status'];
  passed: boolean;
  accuracy: number;
  hearts_lost: number;
  metrics: {
    pitchAccuracy: number;
    rhythmConsistency: number;
    postureScore: number;
    theoryScore: number | null;
    durationSec: number;
  };
}

export interface DevTestStore {
  /** Current hearts on the profile (fresh read, as saveLessonResult does), null if no profile. */
  getHearts(userId: string): Promise<number | null>;
  insertDevTestResult(userId: string, lessonId: string, row: DevTestRow): Promise<void>;
  /** Writes profiles.hearts only. */
  updateHearts(userId: string, hearts: number): Promise<void>;
}

const round2 = (v: number) => Math.round(Math.min(100, Math.max(0, v)) * 100) / 100;

export function devTestRow(result: LessonResult): DevTestRow {
  return {
    status: result.status,
    passed: result.passed,
    accuracy: round2(result.accuracy),
    hearts_lost: Math.max(0, Math.round(result.heartsLost)),
    metrics: {
      pitchAccuracy: result.metrics.pitchAccuracy,
      rhythmConsistency: result.metrics.rhythmConsistency,
      postureScore: result.metrics.postureScore,
      theoryScore: result.theoryScore,
      durationSec: Math.max(0, Math.round(result.durationSec)),
    },
  };
}

/** Hearts first: the zero-heart rule must hold even if the test row cannot be written. */
async function saveDevTestResult(store: DevTestStore, userId: string, result: LessonResult): Promise<void> {
  const delta = result.heartsEnd - result.heartsStart;
  if (delta !== 0) {
    const current = await store.getHearts(userId);
    if (current === null) throw new Error('Your profile could not be loaded, so the hearts change was not saved.');
    const hearts = Math.min(MAX_HEARTS, Math.max(0, current + delta));
    if (hearts !== current) await store.updateHearts(userId, hearts);
  }
  await store.insertDevTestResult(userId, result.lessonId, devTestRow(result));
}

export interface SaveRunInput {
  destination: ResultDestination;
  userId: string;
  lesson: LessonFacts;
  result: LessonResult;
  now?: Date;
}

export interface SaveRunFeedback {
  note: string | null;
  expAwarded: number;
  achievements?: AchievementId[];
}

/** Save one finished run where D1 says it belongs. */
export async function saveRunResult(
  { destination, userId, lesson, result, now }: SaveRunInput,
  stores: { progress: ProgressStore; devTest: DevTestStore },
): Promise<SaveRunFeedback> {
  if (destination === 'dev-test') {
    await saveDevTestResult(stores.devTest, userId, result);
    return { note: DEV_TEST_NOTE, expAwarded: 0 };
  }
  const applied: AppliedResult = await saveLessonResult(stores.progress, { userId, lesson, result, now });
  return {
    note: applied.note,
    expAwarded: applied.expGained,
    achievements: applied.achievements as AchievementId[] | undefined,
  };
}
