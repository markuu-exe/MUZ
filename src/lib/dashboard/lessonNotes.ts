/**
 * Lessons tab: read-only study notes built from the concept cards the course
 * already teaches. No grading, no progress, no database: the bundled course in
 * src/content is the same source the lesson seed is generated from.
 */
import type { LessonRow, UnitInfo } from '../../content';
import type { ConceptCardExercise } from '../../types/lesson.types';

/** Notes cover the Novice tier (units 1–4): early theory the activities support. */
export const NOTES_MAX_UNIT = 4;

export interface LessonNoteCard {
  title: string;
  body: string;
  notes?: number[];
  display?: ConceptCardExercise['display'];
  chord?: boolean;
}

export interface LessonNote {
  id: string;
  title: string;
  description: string;
  cards: LessonNoteCard[];
}

export interface UnitNotes {
  unit: number;
  title: string;
  blurb: string;
  lessons: LessonNote[];
}

export function buildLessonNotes(
  lessons: readonly LessonRow[],
  units: readonly UnitInfo[],
  maxUnit: number = NOTES_MAX_UNIT,
): UnitNotes[] {
  const out: UnitNotes[] = [];
  for (const unit of [...units].sort((a, b) => a.index - b.index)) {
    if (unit.index > maxUnit) continue;
    const unitLessons: LessonNote[] = [];
    for (const lesson of lessons) {
      if (lesson.module_index !== unit.index) continue;
      const cards: LessonNoteCard[] = [];
      for (const stage of lesson.payload.stages) {
        for (const exercise of stage.exercises) {
          if (exercise.type !== 'concept-card') continue;
          cards.push({
            title: exercise.title,
            body: exercise.body,
            notes: exercise.notes,
            display: exercise.display,
            chord: exercise.chord,
          });
        }
      }
      if (cards.length > 0) {
        unitLessons.push({ id: lesson.id, title: lesson.title, description: lesson.description, cards });
      }
    }
    if (unitLessons.length > 0) {
      out.push({ unit: unit.index, title: unit.title, blurb: unit.blurb, lessons: unitLessons });
    }
  }
  return out;
}
