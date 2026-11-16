/**
 * COURSE-3: the lesson runner. Pure functions, no React, no timers.
 * Every lesson rule lives here (stage order, retries, hearts, pass marks,
 * scoring), so a rule change is one edit that applies to all 59 lessons.
 *
 * Rules
 *  - Exercises run in authored order, so learn → check → rhythm → play (SRS 3.1.3.3).
 *  - Normal lessons: a failed exercise is re-queued at the end of its own stage
 *    and must be passed before the next stage starts (SDD C-03 "100 % correct").
 *  - Checkpoints (review stage): one try per exercise; the lesson passes when the
 *    share passed ≥ passMark.
 *  - Hearts: practice drills report the hearts they spent; a failed rhythm
 *    exercise costs settings.rhythmFailHeartCost (0 by default, per SRS 3.1.2.4).
 *    At 0 hearts the lesson stops as soon as a heart-consuming exercise is next.
 *  - ≥ 80 % first-try theory score restores one heart (SRS 3.1.2.4).
 */
import { exerciseSettings, lessonExp } from '../content';
import { EXERCISE_ENGINE, type Exercise, type LessonPayload, type StageKind } from '../types/lesson.types';
import type { ExerciseOutcome, ExerciseRecord, LessonResult, LessonStatus } from './types';

export const MAX_HEARTS = 5;
export const THEORY_RESTORE_THRESHOLD = 80;

export interface QueueItem {
  exercise: Exercise;
  stage: StageKind;
  stageIndex: number;
  attempt: number;
}

export interface LessonRunState {
  lessonId: string;
  payload: LessonPayload;
  queue: QueueItem[];
  cursor: number;
  records: ExerciseRecord[];
  heartsStart: number;
  hearts: number;
  status: LessonStatus;
  startedAtMs: number;
  finishedAtMs: number | null;
}

const isGraded = (e: Exercise) => e.type !== 'concept-card';
const needsHearts = (e: Exercise) => EXERCISE_ENGINE[e.type] === 'practice';

export function createLessonRun(lessonId: string, payload: LessonPayload, hearts: number, nowMs: number): LessonRunState {
  const queue: QueueItem[] = payload.stages.flatMap((stage, stageIndex) =>
    stage.exercises.map((exercise) => ({ exercise, stage: stage.kind, stageIndex, attempt: 1 })),
  );
  const h = Math.max(0, Math.min(MAX_HEARTS, Math.floor(hearts)));
  const state: LessonRunState = {
    lessonId,
    payload,
    queue,
    cursor: 0,
    records: [],
    heartsStart: h,
    hearts: h,
    status: 'running',
    startedAtMs: nowMs,
    finishedAtMs: null,
  };
  return guardHearts(state, nowMs);
}

export function currentItem(state: LessonRunState): QueueItem | null {
  return state.status === 'running' ? (state.queue[state.cursor] ?? null) : null;
}

export function lessonProgress(state: LessonRunState): { done: number; total: number; fraction: number } {
  const total = state.queue.length;
  const done = state.status === 'running' ? state.cursor : total;
  return { done, total, fraction: total === 0 ? 1 : done / total };
}

/** Apply the outcome of the current exercise. Returns a new state. */
export function submitOutcome(state: LessonRunState, outcome: ExerciseOutcome, nowMs: number): LessonRunState {
  const item = currentItem(state);
  if (!item) return state;

  const engine = EXERCISE_ENGINE[item.exercise.type];
  const settings = exerciseSettings(state.payload, item.exercise);
  const record: ExerciseRecord = {
    ...outcome,
    exerciseId: item.exercise.id,
    type: item.exercise.type,
    engine,
    stage: item.stage,
    attempt: item.attempt,
  };

  let hearts = state.hearts - Math.max(0, outcome.heartsLost ?? 0);
  if (engine === 'rhythm' && !outcome.passed) hearts -= settings.rhythmFailHeartCost;
  hearts = Math.max(0, hearts);

  let queue = state.queue;
  if (!outcome.passed && item.stage !== 'review' && isGraded(item.exercise)) {
    // Re-queue at the end of this stage so the next stage stays locked until it is passed.
    let insertAt = state.cursor + 1;
    while (insertAt < queue.length && queue[insertAt].stageIndex === item.stageIndex) insertAt++;
    queue = [...queue.slice(0, insertAt), { ...item, attempt: item.attempt + 1 }, ...queue.slice(insertAt)];
  }

  const next: LessonRunState = {
    ...state,
    queue,
    cursor: state.cursor + 1,
    records: [...state.records, record],
    hearts,
  };

  if (next.cursor >= next.queue.length) return finish(next, nowMs);
  return guardHearts(next, nowMs);
}

/** Leave the lesson early. Nothing is awarded. */
export function quitLesson(state: LessonRunState, nowMs: number): LessonRunState {
  if (state.status !== 'running') return state;
  return { ...state, status: 'quit', finishedAtMs: nowMs };
}

function guardHearts(state: LessonRunState, nowMs: number): LessonRunState {
  if (state.status !== 'running' || state.hearts > 0) return state;
  const upcoming = state.queue.slice(state.cursor);
  if (upcoming.some((i) => needsHearts(i.exercise))) {
    return { ...state, status: 'out-of-hearts', finishedAtMs: nowMs };
  }
  return state;
}

function finish(state: LessonRunState, nowMs: number): LessonRunState {
  let passed = true;
  if (state.payload.isCheckpoint) {
    const graded = state.records.filter((r) => r.type !== 'concept-card');
    const share = graded.length === 0 ? 1 : graded.filter((r) => r.passed).length / graded.length;
    passed = share >= state.payload.settings.passMark;
  }
  return { ...state, status: passed ? 'passed' : 'failed', finishedAtMs: nowMs };
}

function pct(n: number, d: number): number {
  return d === 0 ? 0 : Math.round((n / d) * 10000) / 100;
}

function average(values: Array<number | undefined>): number {
  const v = values.filter((x): x is number => typeof x === 'number');
  return v.length === 0 ? 0 : Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100;
}

/** Summarise a finished (or quit) run. */
export function buildLessonResult(state: LessonRunState): LessonResult {
  if (state.status === 'running') throw new Error('Lesson is still running.');
  const status = state.status;

  const firstTries = state.records.filter((r) => r.attempt === 1 && r.type !== 'concept-card');
  const accuracy = pct(firstTries.filter((r) => r.passed).length, firstTries.length);

  const theory = firstTries.filter((r) => r.engine === 'theory');
  const theoryScore = theory.length === 0 ? null : pct(theory.filter((r) => r.passed).length, theory.length);

  const heartsLost = Math.max(0, state.heartsStart - state.hearts);
  const heartRestored =
    status !== 'quit' && theoryScore !== null && theoryScore >= THEORY_RESTORE_THRESHOLD && state.hearts < MAX_HEARTS;
  const passed = status === 'passed';

  return {
    lessonId: state.lessonId,
    status,
    passed,
    accuracy: passed && firstTries.length === 0 ? 100 : accuracy,
    theoryScore,
    heartsStart: state.heartsStart,
    heartsEnd: Math.min(MAX_HEARTS, state.hearts + (heartRestored ? 1 : 0)),
    heartsLost,
    heartRestored,
    expAwarded: passed ? lessonExp(state.payload) : 0,
    durationSec: Math.max(0, Math.round(((state.finishedAtMs ?? state.startedAtMs) - state.startedAtMs) / 1000)),
    metrics: {
      pitchAccuracy: average(state.records.map((r) => r.metrics?.pitchAccuracy)),
      rhythmConsistency: average(state.records.map((r) => r.metrics?.rhythmConsistency)),
      postureScore: average(state.records.map((r) => r.metrics?.postureScore)),
    },
    records: state.records,
  };
}
