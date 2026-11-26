import { describe, expect, it } from 'vitest';
import type { LessonResult } from '../../../lesson/types';
import type { PerformanceRow, ProfileSnapshot, ProgressSnapshot } from '../applyResult';
import { saveLessonResult, type ProgressStore } from '../saveLessonResult';

const DEFAULT_REWARDS: Record<string, number> = {
  'first-lesson': 50,
  'streak-7-days': 50,
  'streak-30-days': 100,
  'exp-500': 50,
  'posture-stable': 50,
};

class MemoryStore implements ProgressStore {
  calls: string[] = [];
  profiles = new Map<string, ProfileSnapshot>();
  progress = new Map<string, ProgressSnapshot>();
  performance: Array<PerformanceRow & { userId: string; lessonId: string }> = [];
  unlocked = new Map<string, Set<string>>();
  achievementInserts: Array<{ userId: string; id: string }> = [];
  rewards: Record<string, number> = { ...DEFAULT_REWARDS };
  failOn: string | null = null;

  private maybeFail(op: string) {
    this.calls.push(op);
    if (this.failOn === op) throw new Error(`${op} failed`);
  }
  async getProfile(userId: string) {
    this.maybeFail('getProfile');
    return this.profiles.get(userId) ?? null;
  }
  async getProgress(userId: string, lessonId: string) {
    this.maybeFail('getProgress');
    return this.progress.get(`${userId}/${lessonId}`) ?? null;
  }
  async upsertProgress(userId: string, lessonId: string, row: ProgressSnapshot) {
    this.maybeFail('upsertProgress');
    this.progress.set(`${userId}/${lessonId}`, row);
  }
  async insertPerformance(userId: string, lessonId: string, row: PerformanceRow) {
    this.maybeFail('insertPerformance');
    this.performance.push({ userId, lessonId, ...row });
  }
  async getUnlockedAchievements(userId: string) {
    this.maybeFail('getUnlockedAchievements');
    return new Set(this.unlocked.get(userId) ?? []);
  }
  async getAchievementRewards() {
    this.maybeFail('getAchievementRewards');
    return { ...this.rewards };
  }
  async insertAchievements(userId: string, ids: string[]) {
    this.maybeFail('insertAchievements');
    const current = this.unlocked.get(userId) ?? new Set<string>();
    for (const id of ids) {
      current.add(id);
      this.achievementInserts.push({ userId, id });
    }
    this.unlocked.set(userId, current);
  }
  async updateProfile(userId: string, patch: ProfileSnapshot) {
    this.maybeFail('updateProfile');
    this.profiles.set(userId, { ...this.profiles.get(userId)!, ...patch });
  }
}

const result = (over: Partial<LessonResult> = {}): LessonResult => ({
  lessonId: 'pno-mod1-node2',
  status: 'passed',
  passed: true,
  accuracy: 90,
  theoryScore: 100,
  heartsStart: 5,
  heartsEnd: 4,
  heartsLost: 1,
  heartRestored: false,
  expAwarded: 10,
  durationSec: 60,
  metrics: { pitchAccuracy: 90, rhythmConsistency: 0, postureScore: 85 },
  records: [{ exerciseId: 'p', type: 'play-note', engine: 'practice', stage: 'play', attempt: 1, passed: true, score: 1 }],
  ...over,
} as LessonResult);

function setup() {
  const store = new MemoryStore();
  store.profiles.set('u1', { exp: 0, hearts: 5, current_streak: 0, last_activity_date: null });
  return store;
}

const save = (store: MemoryStore, r: LessonResult) =>
  saveLessonResult(store, {
    userId: 'u1',
    lesson: { passMark: 0.7, expReward: 10 },
    result: r,
    now: new Date(2026, 10, 16, 18, 30),
  });

describe('saveLessonResult', () => {
  it('reads fresh rows, then writes progress, performance, achievements and profile in order', async () => {
    const store = setup();
    const out = await save(store, result());
    expect(store.calls).toEqual([
      'getProfile',
      'getProgress',
      'upsertProgress',
      'insertPerformance',
      'getUnlockedAchievements',
      'getAchievementRewards',
      'insertAchievements',
      'updateProfile',
    ]);
    expect(store.progress.get('u1/pno-mod1-node2')).toMatchObject({ completed: true, accuracy_percentage: 90, posture_stability_score: 85 });
    expect(store.performance).toHaveLength(1);
    expect(store.achievementInserts).toEqual([{ userId: 'u1', id: 'first-lesson' }]);
    expect(store.profiles.get('u1')).toEqual({ exp: 60, hearts: 4, current_streak: 1, last_activity_date: '2026-11-16' });
    expect(out.expGained).toBe(10);
    expect(out.achievements).toEqual(['first-lesson']);
    expect(out.note).toBe('Badge unlocked: First Note');
  });

  it('a second completion inserts nothing and grants no duplicate badge bonus', async () => {
    const store = setup();
    await save(store, result());

    store.calls = [];
    store.achievementInserts = [];
    const second = await save(store, result({ lessonId: 'pno-mod1-node3' }));

    expect(store.calls).toEqual([
      'getProfile',
      'getProgress',
      'upsertProgress',
      'insertPerformance',
      'getUnlockedAchievements',
      'updateProfile',
    ]);
    expect(store.achievementInserts).toEqual([]);
    expect(store.profiles.get('u1')?.exp).toBe(70);
    expect(second.achievements).toEqual([]);
  });

  it('a quit writes only the profile (spent hearts) and evaluates no achievements', async () => {
    const store = setup();
    const out = await save(store, result({ status: 'quit', passed: false, expAwarded: 0 }));
    expect(store.calls).toEqual(['getProfile', 'getProgress', 'updateProfile']);
    expect(store.profiles.get('u1')?.hearts).toBe(4);
    expect(store.achievementInserts).toEqual([]);
    expect(out.achievements).toBeUndefined();
  });

  it('does not unlock posture-stable on a rhythm-only run without a practice exercise', async () => {
    const store = setup();
    store.unlocked.set('u1', new Set(['first-lesson']));
    const out = await save(
      store,
      result({
        metrics: { pitchAccuracy: 0, rhythmConsistency: 95, postureScore: 95 },
        records: [{ exerciseId: 'r', type: 'tap-along', engine: 'rhythm', stage: 'play', attempt: 1, passed: true, score: 1 }],
      }),
    );
    expect(store.achievementInserts).toEqual([]);
    expect(out.achievements).toEqual([]);
  });

  it('does not grant EXP when the progress write fails', async () => {
    const store = setup();
    store.failOn = 'upsertProgress';
    await expect(save(store, result())).rejects.toThrow('upsertProgress failed');
    expect(store.profiles.get('u1')?.exp).toBe(0);
    expect(store.achievementInserts).toEqual([]);
  });

  it('fails clearly when the profile row is missing', async () => {
    const store = new MemoryStore();
    await expect(save(store, result())).rejects.toThrow(/profile/i);
  });
});

describe('isMissingRunIdColumn (T-13)', () => {
  it('recognises the missing-column errors only for run_id', async () => {
    const { isMissingRunIdColumn } = await import('../supabaseStore');
    expect(isMissingRunIdColumn({ code: 'PGRST204', message: "Could not find the 'run_id' column of 'performance_records'" })).toBe(true);
    expect(isMissingRunIdColumn({ code: '42703', message: 'column "run_id" does not exist' })).toBe(true);
    expect(isMissingRunIdColumn({ code: 'PGRST204', message: "Could not find the 'other' column" })).toBe(false);
    expect(isMissingRunIdColumn({ code: '23505', message: 'duplicate key value violates unique constraint "performance_records_run_id_key"' })).toBe(false);
  });
});
