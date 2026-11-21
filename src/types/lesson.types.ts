/**
 * MUZ lesson payload — schema v2 (COURSE-1).
 *
 * This is the ONLY lesson payload shape. It is stored in `lessons.payload` (jsonb)
 * and authored in `src/content/` with the builders in `src/content/builders.ts`.
 * Do not hand-write payload JSON anywhere else.
 *
 * Hierarchy: Tier → Unit (= module_index) → Lesson (= node_index) → Stage → Exercise.
 */

export const LESSON_SCHEMA_VERSION = 2 as const;

export type Tier = 'novice' | 'proficient' | 'virtuoso';
export const TIER_ORDER: readonly Tier[] = ['novice', 'proficient', 'virtuoso'];

/** Stage order inside a normal lesson is always learn → check → rhythm → play (SRS 3.1.3.3). */
export type StageKind = 'learn' | 'check' | 'rhythm' | 'play' | 'review';
export const STAGE_ORDER: readonly StageKind[] = ['learn', 'check', 'rhythm', 'play'];

/** Display mode for anything that shows notes. */
export type NoteDisplay = 'staff' | 'keyboard' | 'both';

/** Settings that cascade tier → unit → lesson → exercise. See src/content/tiers.ts. */
export interface LessonSettings {
  /** Fraction (0–1) needed to pass a rhythm exercise or a review stage. */
  passMark: number;
  /** Wait-state drill timeout for play-* exercises (SRS: 15 s). */
  timeoutSec: number;
  /** Default tempo for rhythm exercises. */
  bpm: number;
  /** Clicks played before the first target. */
  countInBeats: number;
  /** How many times a rhythm pattern repeats in one exercise. */
  rhythmRepeats: number;
  /** Seconds the posture must stay compliant in posture-hold. */
  postureHoldSec: number;
  /** Hearts lost when a rhythm exercise fails. SRS 3.1.2.4 only charges practice drills, so tiers default to 0. */
  rhythmFailHeartCost: number;
  /** EXP for completing a normal lesson / a checkpoint. */
  exp: number;
  checkpointExp: number;
}

/** Overrides an author may put on a unit, lesson or exercise. */
export type SettingsOverride = Partial<LessonSettings>;

// ---------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------

export type ExerciseType =
  // Theory engine (no microphone / camera)
  | 'concept-card'
  | 'choose-answer'
  | 'name-the-note'
  | 'find-the-key'
  | 'build-the-chord'
  | 'ear-pick'
  // Rhythm engine (spacebar)
  | 'tap-along'
  | 'tap-echo'
  | 'tap-read'
  // Practice engine (microphone + camera wait-state)
  | 'play-note'
  | 'play-chord'
  | 'play-sequence'
  | 'posture-hold';

interface ExerciseBase {
  /** Unique inside the lesson. Assigned by the content compiler (`s{stage}-e{index}`). */
  id: string;
  settings?: SettingsOverride;
}

export interface ConceptCardExercise extends ExerciseBase {
  type: 'concept-card';
  title: string;
  body: string;
  /** MIDI note numbers to show / play. */
  notes?: number[];
  display?: NoteDisplay;
  /** Draw `notes` stacked as one chord on the staff. */
  chord?: boolean;
}

export interface ChooseAnswerExercise extends ExerciseBase {
  type: 'choose-answer';
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  notes?: number[];
  display?: NoteDisplay;
}

export interface NameTheNoteExercise extends ExerciseBase {
  type: 'name-the-note';
  prompt: string;
  /** The note drawn on the grand staff (MIDI). */
  note: number;
  /** Letter names, e.g. ["E", "G", "B", "D"]. */
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface FindTheKeyExercise extends ExerciseBase {
  type: 'find-the-key';
  prompt: string;
  /** Correct MIDI note. */
  target: number;
  /** Accept the same letter in any octave. */
  anyOctave: boolean;
  /** Keyboard range shown [low, high] MIDI, inclusive. */
  range: [number, number];
  explanation: string;
}

export interface BuildTheChordExercise extends ExerciseBase {
  type: 'build-the-chord';
  prompt: string;
  /** Chord label parsed by src/audio/chords/vocabulary.ts, e.g. "C", "Am", "G7". */
  chord: string;
  range: [number, number];
  explanation: string;
}

export interface EarPickExercise extends ExerciseBase {
  type: 'ear-pick';
  prompt: string;
  /** Groups played in order; notes inside one group sound together. */
  play: number[][];
  options: string[];
  correctIndex: number;
  explanation: string;
}

export type TapExerciseType = 'tap-along' | 'tap-echo' | 'tap-read';

export interface TapExercise extends ExerciseBase {
  type: TapExerciseType;
  /** Id in src/content/patterns.ts. */
  pattern: string;
  /** Optional instruction shown above the game. */
  prompt?: string;
}

export interface PlayNoteExercise extends ExerciseBase {
  type: 'play-note';
  /** MIDI, octave included: graded by PitchVerifier (T-07/T-08, SRS 3.1.6.2: ±35 cents of this exact note). */
  note: number;
}

export interface PlayChordExercise extends ExerciseBase {
  type: 'play-chord';
  chord: string;
}

export type SequenceStep = { kind: 'note'; note: number } | { kind: 'chord'; chord: string };

export interface PlaySequenceExercise extends ExerciseBase {
  type: 'play-sequence';
  prompt?: string;
  steps: SequenceStep[];
}

export interface PostureHoldExercise extends ExerciseBase {
  type: 'posture-hold';
  prompt?: string;
}

export type Exercise =
  | ConceptCardExercise
  | ChooseAnswerExercise
  | NameTheNoteExercise
  | FindTheKeyExercise
  | BuildTheChordExercise
  | EarPickExercise
  | TapExercise
  | PlayNoteExercise
  | PlayChordExercise
  | PlaySequenceExercise
  | PostureHoldExercise;

export type ExerciseOf<T extends ExerciseType> = Extract<Exercise, { type: T }>;

/** Which engine an exercise needs. Drives hearts, stage rules and the node badge. */
export type ExerciseEngine = 'theory' | 'rhythm' | 'practice';

export const EXERCISE_ENGINE: Readonly<Record<ExerciseType, ExerciseEngine>> = Object.freeze({
  'concept-card': 'theory',
  'choose-answer': 'theory',
  'name-the-note': 'theory',
  'find-the-key': 'theory',
  'build-the-chord': 'theory',
  'ear-pick': 'theory',
  'tap-along': 'rhythm',
  'tap-echo': 'rhythm',
  'tap-read': 'rhythm',
  'play-note': 'practice',
  'play-chord': 'practice',
  'play-sequence': 'practice',
  'posture-hold': 'practice',
});

/** Which exercise types each stage may contain. `review` may mix everything except concept cards. */
export const STAGE_EXERCISES: Readonly<Record<StageKind, readonly ExerciseType[]>> = Object.freeze({
  learn: ['concept-card'],
  check: ['choose-answer', 'name-the-note', 'find-the-key', 'build-the-chord', 'ear-pick'],
  rhythm: ['tap-along', 'tap-echo', 'tap-read'],
  play: ['play-note', 'play-chord', 'play-sequence', 'posture-hold'],
  review: [
    'choose-answer',
    'name-the-note',
    'find-the-key',
    'build-the-chord',
    'ear-pick',
    'tap-along',
    'tap-echo',
    'tap-read',
    'play-note',
    'play-chord',
    'play-sequence',
    'posture-hold',
  ],
});

// ---------------------------------------------------------------------------
// Stages and payload
// ---------------------------------------------------------------------------

export interface Stage {
  kind: StageKind;
  exercises: Exercise[];
}

export interface LessonPayload {
  schemaVersion: typeof LESSON_SCHEMA_VERSION;
  tier: Tier;
  /** Same as lessons.module_index. Kept in the payload so a payload is self-describing. */
  unit: number;
  isCheckpoint: boolean;
  /** Fully resolved settings (tier → unit → lesson). Exercise overrides stay on the exercise. */
  settings: LessonSettings;
  stages: Stage[];
}

/** Narrow an unknown jsonb value to a v2 payload. */
export function isLessonPayload(value: unknown): value is LessonPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Partial<LessonPayload>;
  return v.schemaVersion === LESSON_SCHEMA_VERSION && Array.isArray(v.stages) && typeof v.tier === 'string';
}
