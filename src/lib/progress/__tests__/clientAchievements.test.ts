import { beforeEach, describe, expect, it } from 'vitest';
import type { LessonResult } from '../../../lesson/types';
import {
  evaluateClientAchievementsForRun,
  readClientAchievements,
  syncClientAchievements,
} from '../clientAchievements';

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key) {
      return store.get(key) ?? null;
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key) {
      store.delete(key);
    },
    setItem(key, value) {
      store.set(key, value);
    },
  };
}

function makeResult(over: Partial<LessonResult> = {}): LessonResult {
  return {
    lessonId: 'lesson-1',
    status: 'passed',
    passed: true,
    accuracy: 100,
    theoryScore: 100,
    heartsStart: 5,
    heartsEnd: 5,
    heartsLost: 0,
    heartRestored: false,
    expAwarded: 50,
    durationSec: 30,
    metrics: { pitchAccuracy: 100, rhythmConsistency: 0, postureScore: 95 },
    records: [],
    ...over,
  };
}

describe('clientAchievements', () => {
  beforeEach(() => {
    const storage = createMemoryStorage();
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: storage },
      configurable: true,
    });
  });

  it('unlocks first-lesson on first mastered run and avoids repeating it on subsequent runs', () => {
    const now = new Date('2026-11-23T12:00:00Z');
    const first = evaluateClientAchievementsForRun({
      userId: 'demo',
      profile: { exp: 0, hearts: 5, current_streak: 0, last_activity_date: null },
      progress: null,
      lesson: { passMark: 0.7, expReward: 50 },
      result: makeResult(),
      now,
    });

    expect(first.newlyUnlocked).toEqual(['first-lesson']);
    expect(first.bonusExp).toBe(50);
    expect(first.allUnlocked['first-lesson']).toBe(now.toISOString());
    expect(readClientAchievements('demo')).toEqual({ 'first-lesson': now.toISOString() });

    const second = evaluateClientAchievementsForRun({
      userId: 'demo',
      profile: { exp: 50, hearts: 5, current_streak: 1, last_activity_date: '2026-11-23' },
      progress: null,
      lesson: { passMark: 0.7, expReward: 50 },
      result: makeResult({ lessonId: 'lesson-2' }),
      now,
    });

    expect(second.newlyUnlocked).toEqual([]);
    expect(second.bonusExp).toBe(0);
  });

  it('does not unlock achievements when the user quits mid-lesson', () => {
    const out = evaluateClientAchievementsForRun({
      userId: 'user-1',
      profile: { exp: 600, hearts: 5, current_streak: 10, last_activity_date: null },
      progress: null,
      lesson: { passMark: 0.7, expReward: 50 },
      result: makeResult({ status: 'quit', passed: false }),
    });

    expect(out.newlyUnlocked).toEqual([]);
    expect(readClientAchievements('user-1')).toEqual({});
  });

  it('unlocks posture-stable when a practice exercise finishes with >= 90 posture score', () => {
    const out = evaluateClientAchievementsForRun({
      userId: 'user-2',
      profile: { exp: 500, hearts: 5, current_streak: 7, last_activity_date: '2026-11-22' },
      progress: null,
      lesson: { passMark: 0.7, expReward: 50 },
      now: new Date('2026-11-23T12:00:00Z'),
      result: makeResult({
        records: [
          {
            exerciseId: 'ex-1',
            type: 'play-note',
            engine: 'practice',
            stage: 'play',
            attempt: 1,
            passed: true,
            score: 1,
            metrics: { pitchAccuracy: 100, postureScore: 92 },
          },
        ],
        metrics: { pitchAccuracy: 100, rhythmConsistency: 0, postureScore: 92 },
      }),
    });

    expect(out.newlyUnlocked).toEqual(['first-lesson', 'streak-7-days', 'exp-500', 'posture-stable']);
  });

  it('syncClientAchievements preserves existing timestamps and adds new ones', () => {
    const t1 = new Date('2026-11-20T08:00:00Z');
    const t2 = new Date('2026-11-23T09:00:00Z');
    syncClientAchievements('user-3', ['first-lesson'], t1);
    const merged = syncClientAchievements('user-3', ['first-lesson', 'exp-500'], t2);

    expect(merged).toEqual({
      'first-lesson': t1.toISOString(),
      'exp-500': t2.toISOString(),
    });
  });
});
