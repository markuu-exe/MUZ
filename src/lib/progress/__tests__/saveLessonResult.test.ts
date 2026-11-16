import { describe, expect, it } from 'vitest';
import type { LessonResult } from '../../../lesson/types';
import type { PerformanceRow, ProfileSnapshot, ProgressSnapshot } from '../applyResult';
import { saveLessonResult, type ProgressStore } from '../saveLessonResult';

class MemoryStore implements ProgressStore {
  calls: string[] = [];
  profiles = new Map<string, ProfileSnapshot>();
  progress = new Map<string, ProgressSnapshot>();
  performance: Array<PerformanceRow & { userId: string; lessonId: string }> = [];
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
  it('reads fresh rows, then writes progress, performance and profile in that order', async () => {
    const store = setup();
    const out = await save(store, result());
    expect(store.calls).toEqual(['getProfile', 'getProgress', 'upsertProgress', 'insertPerformance', 'updateProfile']);
    expect(store.progress.get('u1/pno-mod1-node2')).toMatchObject({ completed: true, accuracy_percentage: 90, posture_stability_score: 85 });
    expect(store.performance).toHaveLength(1);
    expect(store.profiles.get('u1')).toEqual({ exp: 10, hearts: 4, current_streak: 1, last_activity_date: '2026-11-16' });
    expect(out.expGained).toBe(10);
  });

  it('a quit writes only the profile (spent hearts)', async () => {
    const store = setup();
    await save(store, result({ status: 'quit', passed: false, expAwarded: 0 }));
    expect(store.calls).toEqual(['getProfile', 'getProgress', 'updateProfile']);
    expect(store.profiles.get('u1')?.hearts).toBe(4);
  });

  it('does not grant EXP when the progress write fails', async () => {
    const store = setup();
    store.failOn = 'upsertProgress';
    await expect(save(store, result())).rejects.toThrow('upsertProgress failed');
    expect(store.profiles.get('u1')?.exp).toBe(0);
  });

  it('fails clearly when the profile row is missing', async () => {
    const store = new MemoryStore();
    await expect(save(store, result())).rejects.toThrow(/profile/i);
  });
});
