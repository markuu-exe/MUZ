/**
 * The MUZ piano course (COURSE-1). Single source of truth for:
 *  - the Supabase `lessons` rows (scripts/generate-lesson-seed.ts writes them to supabase/seed.sql)
 *  - the dashboard's offline/demo curriculum (src/lib/dashboard/curriculum.ts)
 *  - unit titles and tier info shown in the skill tree
 */
import {
  EXERCISE_ENGINE,
  LESSON_SCHEMA_VERSION,
  type Exercise,
  type ExerciseEngine,
  type LessonSettings,
  type LessonPayload,
  type Stage,
  type TapExercise,
  type Tier,
} from '../types/lesson.types';
import type { AuthoredUnit } from './builders';
import { isWarmUpUnit, resolveSettings, tierOfUnit, TIERS, WARM_UP } from './tiers';
import { getPattern } from './patterns';
import { NOVICE_UNITS } from './units/novice';
import { PROFICIENT_UNITS } from './units/proficient';
import { VIRTUOSO_UNITS } from './units/virtuoso';

export const AUTHORED_UNITS: readonly AuthoredUnit[] = [...NOVICE_UNITS, ...PROFICIENT_UNITS, ...VIRTUOSO_UNITS];

/** Share of the EXP from all earlier lessons a learner needs to open a lesson. */
export const REQUIRED_EXP_RATIO = 0.8;

export interface UnitInfo {
  index: number;
  tier: Tier;
  title: string;
  blurb: string;
  lessonIds: string[];
}

/** Shape of a `lessons` row (matches src/types/database.types.ts). */
export interface LessonRow {
  id: string;
  instrument: 'piano';
  module_index: number;
  node_index: number;
  title: string;
  description: string;
  required_exp: number;
  payload: LessonPayload;
}

export function lessonId(unit: number, node: number): string {
  return `pno-mod${unit}-node${node}`;
}

function compileCourse(units: readonly AuthoredUnit[]): { lessons: LessonRow[]; units: UnitInfo[] } {
  const lessons: LessonRow[] = [];
  const infos: UnitInfo[] = [];
  let cumulativeExp = 0;

  for (const u of [...units].sort((a, b) => a.index - b.index)) {
    const tier = tierOfUnit(u.index);
    const info: UnitInfo = { index: u.index, tier, title: u.title, blurb: u.blurb, lessonIds: [] };

    u.lessons.forEach((l, i) => {
      const nodeIndex = i + 1;
      const id = lessonId(u.index, nodeIndex);
      const settings = resolveSettings(tier, u.settings, l.settings);
      const stages: Stage[] = l.stages.map((s, si) => ({
        kind: s.kind,
        exercises: s.exercises.map((e, ei) => ({ ...e, id: `s${si + 1}-e${ei + 1}` }) as Exercise),
      }));
      const payload: LessonPayload = {
        schemaVersion: LESSON_SCHEMA_VERSION,
        tier,
        unit: u.index,
        isCheckpoint: Boolean(l.checkpoint),
        settings,
        stages,
      };
      lessons.push({
        id,
        instrument: 'piano',
        module_index: u.index,
        node_index: nodeIndex,
        title: l.title,
        description: l.description,
        required_exp: Math.floor((cumulativeExp * REQUIRED_EXP_RATIO) / 10) * 10,
        payload,
      });
      info.lessonIds.push(id);
      cumulativeExp += payload.isCheckpoint ? settings.checkpointExp : settings.exp;
    });
    infos.push(info);
  }
  return { lessons, units: infos };
}

const COMPILED = compileCourse(AUTHORED_UNITS);

/** Every lesson row, ordered by unit then node. */
export const COURSE_LESSONS: readonly LessonRow[] = COMPILED.lessons;
export const COURSE_UNITS: readonly UnitInfo[] = COMPILED.units;

export function getUnit(index: number): UnitInfo | undefined {
  return COURSE_UNITS.find((u) => u.index === index);
}

export function getCourseLesson(id: string): LessonRow | undefined {
  return COURSE_LESSONS.find((l) => l.id === id);
}

/** EXP awarded for finishing a lesson. */
export function lessonExp(payload: LessonPayload): number {
  return payload.isCheckpoint ? payload.settings.checkpointExp : payload.settings.exp;
}

/** Engines used by a lesson, in course order (theory → rhythm → practice). */
export function lessonEngines(payload: LessonPayload): ExerciseEngine[] {
  const used = new Set<ExerciseEngine>();
  for (const s of payload.stages) for (const e of s.exercises) used.add(EXERCISE_ENGINE[e.type]);
  return (['theory', 'rhythm', 'practice'] as const).filter((x) => used.has(x));
}

/**
 * Badge shown on the skill-tree node. The most demanding engine wins:
 * practice (mic + camera) > rhythm > theory.
 */
export function lessonBadge(payload: LessonPayload): ExerciseEngine {
  const engines = lessonEngines(payload);
  return engines[engines.length - 1] ?? 'theory';
}

export { TIERS, resolveSettings, tierOfUnit } from './tiers';
export { PATTERNS, getPattern } from './patterns';

// ---------------------------------------------------------------------------
// Runtime resolution helpers (used by the lesson player AND the validation test,
// so the rules can never drift apart).
// ---------------------------------------------------------------------------


/** Lesson settings with the exercise's own overrides applied. */
export function exerciseSettings(payload: LessonPayload, exercise: Exercise): LessonSettings {
  const settings = resolveSettings(payload.tier, payload.settings, exercise.settings);
  if (!isWarmUpUnit(payload.unit)) return settings;
  // Ruling W1: applied here, in code, so it also holds for lessons already stored in the database.
  return { ...settings, timeoutSec: Math.max(settings.timeoutSec, WARM_UP.timeoutSec), drillHeartCost: WARM_UP.drillHeartCost };
}

/** Tempo for a tap exercise: exercise override → pattern suggestion → lesson/tier bpm. */
export function exerciseBpm(payload: LessonPayload, exercise: TapExercise): number {
  return exercise.settings?.bpm ?? getPattern(exercise.pattern).bpm ?? payload.settings.bpm;
}
