import type { LessonResult } from '../../lesson/types';

/** Pass mark (0–1) as a percentage, rounded to 2 dp so 0.7 compares as exactly 70. */
export function passMarkPercent(passMark: number): number {
  return Math.round(passMark * 10000) / 100;
}

/**
 * SRS 3.1.2.5: a lesson is mastered (user_progress.completed) only when the run
 * passed and its first-try accuracy reached the tier pass mark.
 */
export function meetsMasteryGate(result: Pick<LessonResult, 'passed' | 'accuracy'>, passMark: number): boolean {
  return result.passed && result.accuracy >= passMarkPercent(passMark);
}
