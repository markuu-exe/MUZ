/**
 * Decision D1: a lesson a developer opened through the lock override is saved as test
 * data only. Learner progress, EXP, streak, achievements and analytics are untouched;
 * the hearts the run cost are still spent (the zero-heart rule keeps applying).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { LessonResult } from '../../../lesson/types';
import type { PerformanceRow, ProfileSnapshot, ProgressSnapshot } from '../applyResult';
import { canOpenLesson, resultDestination } from '../devAccess';
import { DEV_TEST_NOTE, devTestRow, saveRunResult, type DevTestRow, type DevTestStore } from '../devTestResults';
import type { ProgressStore } from '../saveLessonResult';

const USER = 'user-1';
const LESSON = { passMark: 0.8, expReward: 120 };
const NOW = new Date('2026-11-19T10:00:00Z');

function result(over: Partial<LessonResult> = {}): LessonResult {
  return {
    lessonId: 'u5-n3',
    status: 'passed',
    passed: true,
    accuracy: 100,
    theoryScore: null,
    heartsStart: 5,
    heartsEnd: 5,
    heartsLost: 0,
    heartRestored: false,
    expAwarded: 120,
    durationSec: 42,
    metrics: { pitchAccuracy: 90, rhythmConsistency: 0, postureScore: 80 },
    records: [{ exerciseId: 'e1', engine: 'practice', passed: true, firstTry: true } as unknown as LessonResult['records'][number]],
    ...over,
  };
}

const PROFILE: ProfileSnapshot = { exp: 500, hearts: 4, current_streak: 6, last_activity_date: '2026-11-18' };

/** Records every write, so a test can assert that nothing else was touched. */
function stores(profile: ProfileSnapshot = PROFILE) {
  const writes: string[] = [];
  let current = { ...profile };
  const devRows: DevTestRow[] = [];
  const progress: ProgressStore = {
    getProfile: async () => current,
    getProgress: async () => null,
    upsertProgress: async (_u, _l, _r: ProgressSnapshot) => void writes.push('user_progress'),
    insertPerformance: async (_u, _l, _r: PerformanceRow) => void writes.push('performance_records'),
    getUnlockedAchievements: async () => new Set(),
    getAchievementRewards: async () => ({}),
    insertAchievements: async () => undefined,
    updateProfile: async (_u, patch) => {
      writes.push(`profile:${Object.keys(patch).sort().join(',')}`);
      current = { ...current, ...patch };
    },
  };
  const devTest: DevTestStore = {
    getHearts: async () => current.hearts,
    insertDevTestResult: async (_u, _l, row) => {
      writes.push('dev_test_results');
      devRows.push(row);
    },
    updateHearts: async (_u, hearts) => {
      writes.push('profile:hearts');
      current = { ...current, hearts };
    },
  };
  return { progress, devTest, writes, devRows, profile: () => current };
}

describe('resultDestination (D1)', () => {
  it('sends runs of lessons opened while locked to test storage, everything else to learner progress', () => {
    expect(resultDestination('locked')).toBe('dev-test');
    expect(resultDestination('current')).toBe('learner');
    expect(resultDestination('mastered')).toBe('learner');
    expect(resultDestination(null)).toBe('learner');
  });

  it('fails closed: "locked at open" is a test run whatever the account is when the run ends', () => {
    // Only developers can open a locked node (canOpenLesson). If is_dev is revoked mid-run,
    // the run must still not become learner progress; RLS then rejects the test row.
    expect(canOpenLesson('locked', false)).toBe(false);
    expect(resultDestination('locked')).toBe('dev-test');
  });
});

describe('saveRunResult (D1)', () => {
  it('developer completes a locked lesson: one test row, nothing in learner progress', async () => {
    const s = stores();
    const feedback = await saveRunResult({ destination: 'dev-test', userId: USER, lesson: LESSON, result: result(), now: NOW }, s);
    expect(s.writes).toEqual(['dev_test_results']);
    expect(s.devRows).toHaveLength(1);
    expect(feedback).toEqual({ note: DEV_TEST_NOTE, expAwarded: 0 });
    // EXP, streak and last activity unchanged; no progress or performance row; no badges (nothing writes them).
    expect(s.profile()).toEqual(PROFILE);
  });

  it('records the test result with its identifying fields', () => {
    const row = devTestRow(result({ status: 'failed', passed: false, accuracy: 61.234, heartsLost: 2, theoryScore: 75 }));
    expect(row).toEqual({
      status: 'failed',
      passed: false,
      accuracy: 61.23,
      hearts_lost: 2,
      metrics: { pitchAccuracy: 90, rhythmConsistency: 0, postureScore: 80, theoryScore: 75, durationSec: 42 },
    });
  });

  it('developer test run that loses hearts still spends them, and only them', async () => {
    const s = stores();
    await saveRunResult(
      { destination: 'dev-test', userId: USER, lesson: LESSON, result: result({ status: 'failed', passed: false, heartsEnd: 3, heartsLost: 2 }), now: NOW },
      s,
    );
    // Hearts first: the zero-heart rule must hold even if the test row cannot be written.
    expect(s.writes).toEqual(['profile:hearts', 'dev_test_results']);
    expect(s.profile()).toEqual({ ...PROFILE, hearts: 2 });
  });

  it('a developer who quits mid-drill still pays the hearts (T-06 rule)', async () => {
    const s = stores();
    await saveRunResult(
      { destination: 'dev-test', userId: USER, lesson: LESSON, result: result({ status: 'quit', passed: false, heartsEnd: 4, heartsLost: 1 }), now: NOW },
      s,
    );
    expect(s.profile().hearts).toBe(3);
    expect(s.devRows[0].status).toBe('quit');
  });

  it('hearts never go below zero', async () => {
    const s = stores({ ...PROFILE, hearts: 1 });
    await saveRunResult(
      { destination: 'dev-test', userId: USER, lesson: LESSON, result: result({ status: 'out-of-hearts', passed: false, heartsEnd: 0, heartsLost: 5 }), now: NOW },
      s,
    );
    expect(s.profile().hearts).toBe(0);
  });

  it('developer access revoked mid-run: the test row is rejected, hearts are still spent, nothing reaches learner progress', async () => {
    const s = stores();
    s.devTest.insertDevTestResult = async () => {
      throw new Error('new row violates row-level security policy for table "dev_test_results"');
    };
    await expect(
      saveRunResult(
        { destination: 'dev-test', userId: USER, lesson: LESSON, result: result({ heartsEnd: 4, heartsLost: 1 }), now: NOW },
        s,
      ),
    ).rejects.toThrow(/row-level security/);
    expect(s.writes).toEqual(['profile:hearts']);
    expect(s.profile()).toEqual({ ...PROFILE, hearts: 3 });
  });

  it('ordinary learner completion is saved exactly as before (and nothing goes to test storage)', async () => {
    const s = stores();
    const feedback = await saveRunResult({ destination: 'learner', userId: USER, lesson: LESSON, result: result(), now: NOW }, s);
    expect(s.writes).toEqual(['user_progress', 'performance_records', 'profile:current_streak,exp,hearts,last_activity_date']);
    expect(s.devRows).toEqual([]);
    expect(feedback.expAwarded).toBe(120);
    expect(s.profile().exp).toBe(620);
  });

  it('a developer replaying an unlocked lesson progresses like a learner', async () => {
    const s = stores();
    await saveRunResult({ destination: resultDestination('current'), userId: USER, lesson: LESSON, result: result(), now: NOW }, s);
    expect(s.writes).toContain('user_progress');
    expect(s.devRows).toEqual([]);
  });
});

describe('zero-heart rule still applies to developers (D1)', () => {
  it('a developer may open a locked lesson, but practice still needs a heart', () => {
    // canOpenLesson only lifts the lock; DashboardScreen.handleSelect checks hearts
    // after it, for developers too, and createLessonRun refuses practice at 0 hearts.
    expect(canOpenLesson('locked', true)).toBe(true);
    const dashboard = readFileSync(fileURLToPath(new URL('../../../components/dashboard/DashboardScreen.tsx', import.meta.url)), 'utf8');
    const select = dashboard.slice(dashboard.indexOf('const handleSelect'));
    expect(select.indexOf('canOpenLesson(')).toBeGreaterThan(-1);
    expect(select.indexOf("hearts === 0 && lesson.kind === 'practice'")).toBeGreaterThan(select.indexOf('canOpenLesson('));
  });
});

describe('learner analytics never read test data (D1)', () => {
  const SRC = fileURLToPath(new URL('../../../', import.meta.url));
  const ALLOWED = new Set(['lib/progress/devTestResults.ts', 'lib/progress/supabaseStore.ts', 'types/database.types.ts']);

  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) return name === '__tests__' ? [] : files(p);
      return /\.(ts|tsx)$/.test(name) ? [p] : [];
    });
  }

  it('only the developer save path mentions dev_test_results', () => {
    const offenders = files(SRC)
      .map((p) => p.slice(SRC.length).replace(/\\/g, '/'))
      .filter((rel) => !ALLOWED.has(rel) && readFileSync(join(SRC, rel), 'utf8').includes('dev_test_results'));
    expect(offenders).toEqual([]);
  });
});
