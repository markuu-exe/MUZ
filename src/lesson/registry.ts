/**
 * COURSE-3: one entry per exercise type. To add or fix an exercise type, change
 * its entry here; no lesson content changes. COURSE-4 and COURSE-5 replace the
 * placeholder views for the rhythm and practice types.
 */
import type { ComponentType } from 'react';
import type { Exercise, ExerciseType, LessonPayload, LessonSettings } from '../types/lesson.types';
import type { ExerciseOutcome } from './types';

export interface ExerciseViewProps<T extends Exercise = Exercise> {
  exercise: T;
  payload: LessonPayload;
  /** Lesson settings with this exercise's overrides applied. */
  settings: LessonSettings;
  hearts: number;
  /** Answer-type views: true after the learner pressed Check. Lock input and colour the answer. */
  submitted: boolean;
  /** Answer views call this once on Check. Activity views call it when the activity ends. */
  onOutcome: (outcome: ExerciseOutcome) => void;
}

export interface ExerciseRegistryEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  View: ComponentType<ExerciseViewProps<any>>;
  /**
   * 'answer'   → the player shows right/wrong + explanation and a Continue button.
   * 'activity' → the view shows its own result; the player advances immediately.
   */
  feedback: 'answer' | 'activity';
  /** Short label shown above the exercise. */
  label: string;
  /** Use the wide layout (keyboards, the rhythm highway, the camera view). */
  wide?: boolean;
}

export type ExerciseRegistry = Record<ExerciseType, ExerciseRegistryEntry>;
