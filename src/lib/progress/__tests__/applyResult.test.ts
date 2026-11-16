import { describe, expect, it } from 'vitest';
import type { ExerciseRecord, LessonResult } from '../../../lesson/types';
import { applyResult, type ProfileSnapshot, type ProgressSnapshot } from '../applyResult';

const TODAY = '2026-11-16';
const NOW = '2026-11-16T10:00:00.000Z';
const LESSON = { passMark: 0.7, expReward: 20 };

function record(engine: ExerciseRecord['engine'], passed = true): ExerciseRecord {
  return {
    exerciseId: `${engine}-1`,
    type: engine === 'theory' ? 'choose-answer' : engine === 'rhythm' ? 'tap-along' : 'play-note',
    engine,
    stage: engine === 'theory' ? 'check' : engine === 'rhythm' ? 'rhythm' : 'play',
    attempt: 1,
    passed,
    score: passed ? 1 : 0,
  } as ExerciseRecord;
}

function result(over: Partial<LessonResult> = {}): LessonResult {
  return {
    lessonId: 'pno-mod1-node2',
    status: 'passed',
    passed: true,
    accuracy: 90,
    theoryScore: 100,
    heartsStart: 5,
    heartsEnd: 5,
    heartsLost: 0,
    heartRestored: false,
    expAwarded: 20,
    durationSec: 95,
    metrics: { pitchAccuracy: 0, rhythmConsistency: 0, postureScore: 0 },
    records: [record('theory')],
    ...over,
  };
}

const profile = (over: Partial<ProfileSnapshot> = {}): ProfileSnapshot => ({
  exp: 100,
  hearts: 5,
  current_streak: 3,
  last_activity_date: '2026-11-15',
  ...over,
});

const run = (r: LessonResult, p: ProfileSnapshot = profile(), prog: ProgressSnapshot | null = null) =>
  applyResult({ profile: p, progress: prog, lesson: LESSON, result: r, today: TODAY, nowIso: NOW });

describe('applyResult: first mastery', () => {
  const out = run(result());

  it('awards the lesson EXP once and marks the lesson completed', () => {
    expect(out.expGained).toBe(20);
    expect(out.completedNow).toBe(true);
    expect(out.profile.exp).toBe(120);
    expect(out.progress).toEqual({
      completed: true,
      accuracy_percentage: 90,
      posture_stability_score: 0,
      completed_at: NOW,
    });
  });

  it('continues the streak and stamps today as the last activity', () => {
    expect(out.profile.current_streak).toBe(4);
    expect(out.profile.last_activity_date).toBe(TODAY);
  });

  it('writes no performance record when no rhythm or practice exercise ran', () => {
    expect(out.performance).toBeNull();
  });
});

describe('applyResult: EXP only on first completion', () => {
  it('a replay of a completed lesson gains no EXP and keeps the first completion time', () => {
    const prev: ProgressSnapshot = {
      completed: true,
      accuracy_percentage: 95,
      posture_stability_score: 0,
      completed_at: '2026-11-01T08:00:00.000Z',
    };
    const out = run(result({ accuracy: 80 }), profile(), prev);
    expect(out.expGained).toBe(0);
    expect(out.completedNow).toBe(false);
    expect(out.profile.exp).toBe(100);
    expect(out.progress).toMatchObject({ completed: true, accuracy_percentage: 95, completed_at: '2026-11-01T08:00:00.000Z' });
    expect(out.note).toMatch(/only awarded the first time/i);
  });
});

describe('applyResult: mastery gate (SRS 3.1.2.5)', () => {
  it('a pass below the pass mark is saved as not completed, with no EXP and an explanation', () => {
    const out = run(result({ accuracy: 55 }));
    expect(out.expGained).toBe(0);
    expect(out.completedNow).toBe(false);
    expect(out.progress).toMatchObject({ completed: false, accuracy_percentage: 55, completed_at: null });
    expect(out.note).toContain('70%');
    expect(out.note).toContain('55%');
  });

  it('a later run that clears the gate completes the lesson and awards EXP then', () => {
    const prev: ProgressSnapshot = { completed: false, accuracy_percentage: 55, posture_stability_score: 0, completed_at: null };
    const out = run(result({ accuracy: 75 }), profile(), prev);
    expect(out.completedNow).toBe(true);
    expect(out.expGained).toBe(20);
    expect(out.progress).toMatchObject({ completed: true, accuracy_percentage: 75, completed_at: NOW });
  });

  it('keeps the best accuracy, never lowering it', () => {
    const prev: ProgressSnapshot = { completed: false, accuracy_percentage: 60, posture_stability_score: 0, completed_at: null };
    expect(run(result({ accuracy: 40 }), profile(), prev).progress?.accuracy_percentage).toBe(60);
  });
});

describe('applyResult: failed and out-of-hearts runs', () => {
  it('a failed checkpoint saves a not-completed row, no EXP, and still counts for the streak', () => {
    const out = run(result({ status: 'failed', passed: false, accuracy: 40, expAwarded: 0 }));
    expect(out.expGained).toBe(0);
    expect(out.progress).toMatchObject({ completed: false, accuracy_percentage: 40 });
    expect(out.profile.current_streak).toBe(4);
  });

  it('never un-completes a lesson that was already completed', () => {
    const prev: ProgressSnapshot = { completed: true, accuracy_percentage: 90, posture_stability_score: 0, completed_at: '2026-11-01T08:00:00.000Z' };
    const out = run(result({ status: 'out-of-hearts', passed: false, accuracy: 10, expAwarded: 0 }), profile(), prev);
    expect(out.progress).toMatchObject({ completed: true, completed_at: '2026-11-01T08:00:00.000Z' });
  });
});

describe('applyResult: hearts', () => {
  it('applies the run’s heart change to the current profile hearts, not the hearts the lesson opened with', () => {
    // Lesson opened at 3 hearts, drill cost 2 (3 → 1); a heart regenerated meanwhile, so the profile now says 4.
    const out = run(
      result({ heartsStart: 3, heartsEnd: 1, heartsLost: 2, records: [record('practice')] }),
      profile({ hearts: 4 }),
    );
    expect(out.profile.hearts).toBe(2);
  });

  it('a theory heart restore adds one, capped at 5', () => {
    expect(run(result({ heartsStart: 4, heartsEnd: 5, heartRestored: true }), profile({ hearts: 5 })).profile.hearts).toBe(5);
    expect(run(result({ heartsStart: 2, heartsEnd: 3, heartRestored: true }), profile({ hearts: 2 })).profile.hearts).toBe(3);
  });

  it('never goes below 0', () => {
    expect(run(result({ heartsStart: 5, heartsEnd: 0, heartsLost: 5 }), profile({ hearts: 3 })).profile.hearts).toBe(0);
  });
});

describe('applyResult: quitting', () => {
  const quit = result({ status: 'quit', passed: false, accuracy: 0, expAwarded: 0, heartsStart: 5, heartsEnd: 4, heartsLost: 1 });
  const out = run(quit);

  it('keeps the hearts the learner already spent (quitting cannot refund a drill)', () => {
    expect(out.profile.hearts).toBe(4);
  });

  it('saves no progress, no performance record, no EXP, and does not touch the streak', () => {
    expect(out.progress).toBeNull();
    expect(out.performance).toBeNull();
    expect(out.expGained).toBe(0);
    expect(out.profile.current_streak).toBe(3);
    expect(out.profile.last_activity_date).toBe('2026-11-15');
  });
});

describe('applyResult: performance records and posture', () => {
  it('records pitch, rhythm, posture and duration when practice or rhythm ran', () => {
    const out = run(
      result({
        records: [record('theory'), record('rhythm'), record('practice')],
        metrics: { pitchAccuracy: 88.5, rhythmConsistency: 72, postureScore: 93 },
        durationSec: 240,
      }),
    );
    expect(out.performance).toEqual({ pitch_accuracy: 88.5, rhythm_consistency: 72, posture_score: 93, drill_duration_sec: 240 });
    expect(out.progress?.posture_stability_score).toBe(93);
  });

  it('clamps metrics into the 0–100 ranges the schema enforces', () => {
    const out = run(result({ records: [record('practice')], metrics: { pitchAccuracy: 101, rhythmConsistency: -3, postureScore: 50 } }));
    expect(out.performance).toMatchObject({ pitch_accuracy: 100, rhythm_consistency: 0 });
  });

  it('keeps the previous posture score when no practice exercise ran this time', () => {
    const prev: ProgressSnapshot = { completed: true, accuracy_percentage: 90, posture_stability_score: 81, completed_at: NOW };
    expect(run(result(), profile(), prev).progress?.posture_stability_score).toBe(81);
  });
});
