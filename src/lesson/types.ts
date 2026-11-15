import type { ExerciseEngine, ExerciseType, StageKind } from '../types/lesson.types';

/** Optional measurements an exercise can report (all 0–100). */
export interface ExerciseMetrics {
  /** Practice: share of verification attempts that matched. */
  pitchAccuracy?: number;
  /** Rhythm: RhythmSummary.consistency. */
  rhythmConsistency?: number;
  /** Rhythm: RhythmSummary.accuracy. */
  rhythmAccuracy?: number;
  /** Practice: share of posture samples that were compliant. */
  postureScore?: number;
}

/** What an exercise component reports back to the player. */
export interface ExerciseOutcome {
  passed: boolean;
  /** 0–1 quality of this attempt. Theory: 1 or 0. Rhythm: accuracy. Practice: 1 on success. */
  score: number;
  /** Hearts the exercise itself already spent (practice drills deduct inside the wait-state machine). */
  heartsLost?: number;
  metrics?: ExerciseMetrics;
}

export interface ExerciseRecord extends ExerciseOutcome {
  exerciseId: string;
  type: ExerciseType;
  engine: ExerciseEngine;
  stage: StageKind;
  /** 1 for the first try of this exercise, 2+ for retries. */
  attempt: number;
}

export type LessonStatus = 'running' | 'passed' | 'failed' | 'out-of-hearts' | 'quit';

export interface LessonResult {
  lessonId: string;
  status: Exclude<LessonStatus, 'running'>;
  passed: boolean;
  /** 0–100: graded exercises passed on their first try. Stored as user_progress.accuracy_percentage. */
  accuracy: number;
  /** 0–100: first-try correctness of theory checks; ≥ 80 restores a heart (SRS 3.1.2.4). */
  theoryScore: number | null;
  heartsStart: number;
  heartsEnd: number;
  heartsLost: number;
  heartRestored: boolean;
  expAwarded: number;
  durationSec: number;
  /** Averages over the exercises that reported them, for performance_records. */
  metrics: Required<Pick<ExerciseMetrics, 'pitchAccuracy' | 'rhythmConsistency' | 'postureScore'>>;
  records: ExerciseRecord[];
}
