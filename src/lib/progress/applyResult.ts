/**
 * COURSE-6: what one finished lesson run changes. Pure: the caller reads the
 * current rows, this decides the new ones, saveLessonResult writes them.
 *
 * Rules
 *  - Hearts: the run's change (heartsEnd − heartsStart) is applied to the profile's
 *    current hearts, so a heart regenerated during the lesson is kept. Applies to
 *    quits too, so leaving cannot refund a drill.
 *  - Quit: nothing else is saved.
 *  - Any other finished run counts as activity (streak, last_activity_date) and
 *    upserts the progress row.
 *  - Completed requires the mastery gate (pass + first-try accuracy ≥ pass mark);
 *    once completed, a row is never un-completed.
 *  - EXP is awarded only on the run that first completes the lesson.
 *  - Accuracy and posture keep the best value seen.
 *  - A performance record is written when a rhythm or practice exercise ran.
 */
import type { LessonResult } from '../../lesson/types';
import { MAX_HEARTS } from '../../lesson/runner';
import { meetsMasteryGate, passMarkPercent } from './gate';
import { nextStreak } from './streak';

export interface ProfileSnapshot {
  exp: number;
  hearts: number;
  current_streak: number;
  last_activity_date: string | null;
}

export interface ProgressSnapshot {
  completed: boolean;
  accuracy_percentage: number;
  posture_stability_score: number;
  completed_at: string | null;
}

export interface PerformanceRow {
  pitch_accuracy: number;
  rhythm_consistency: number;
  posture_score: number;
  drill_duration_sec: number;
  /** T-13: attempt id; a replayed save with the same id is ignored by the database. */
  run_id?: string | null;
}

export interface LessonFacts {
  /** 0–1, the lesson's settings.passMark. */
  passMark: number;
  /** EXP for first completion (lessonExp(payload)). */
  expReward: number;
}

export interface ApplyInput {
  profile: ProfileSnapshot;
  progress: ProgressSnapshot | null;
  lesson: LessonFacts;
  result: LessonResult;
  /** Learner's local date, YYYY-MM-DD. */
  today: string;
  nowIso: string;
}

export interface AppliedResult {
  profile: ProfileSnapshot;
  progress: ProgressSnapshot | null;
  performance: PerformanceRow | null;
  expGained: number;
  completedNow: boolean;
  /** Short line for the results screen, or null. */
  note: string | null;
  /** Badge ids unlocked by this run (set by saveLessonResult, T-11). */
  achievements?: string[];
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const pct = (v: number) => Math.round(clamp(v, 0, 100) * 100) / 100;

export function applyResult({ profile, progress, lesson, result, today, nowIso }: ApplyInput): AppliedResult {
  const hearts = clamp(profile.hearts + (result.heartsEnd - result.heartsStart), 0, MAX_HEARTS);

  if (result.status === 'quit') {
    return {
      profile: { ...profile, hearts },
      progress: null,
      performance: null,
      expGained: 0,
      completedNow: false,
      note: null,
    };
  }

  const mastered = meetsMasteryGate(result, lesson.passMark);
  const wasCompleted = progress?.completed ?? false;
  const completedNow = mastered && !wasCompleted;
  const expGained = completedNow ? lesson.expReward : 0;
  const ranPractice = result.records.some((r) => r.engine === 'practice');
  const ranDrill = ranPractice || result.records.some((r) => r.engine === 'rhythm');

  const nextProgress: ProgressSnapshot = {
    completed: wasCompleted || mastered,
    accuracy_percentage: Math.max(progress?.accuracy_percentage ?? 0, pct(result.accuracy)),
    posture_stability_score: ranPractice
      ? Math.max(progress?.posture_stability_score ?? 0, pct(result.metrics.postureScore))
      : (progress?.posture_stability_score ?? 0),
    completed_at: progress?.completed_at ?? (completedNow ? nowIso : null),
  };

  let note: string | null = null;
  if (result.passed && wasCompleted) {
    note = 'Replay saved. EXP is only awarded the first time you master a lesson.';
  } else if (result.passed && !mastered) {
    note =
      `Mastery needs ${passMarkPercent(lesson.passMark)}% first-try accuracy; you scored ${Math.round(result.accuracy)}%. ` +
      'Replay this lesson to unlock the next one.';
  }

  return {
    profile: {
      exp: profile.exp + expGained,
      hearts,
      current_streak: nextStreak(profile.current_streak, profile.last_activity_date, today),
      last_activity_date: today,
    },
    progress: nextProgress,
    performance: ranDrill
      ? {
          pitch_accuracy: pct(result.metrics.pitchAccuracy),
          rhythm_consistency: pct(result.metrics.rhythmConsistency),
          posture_score: pct(result.metrics.postureScore),
          drill_duration_sec: Math.max(0, Math.round(result.durationSec)),
          run_id: result.runId ?? null,
        }
      : null,
    expGained,
    completedNow,
    note,
  };
}
