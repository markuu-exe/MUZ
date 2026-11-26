/**
 * Authoring helpers for src/content/units/*.ts (COURSE-1).
 * They keep lesson files short and make the common mistakes impossible:
 * notes are written as names ("C4") and turned into MIDI, answer positions are
 * placed deterministically, ids and settings are filled in by the compiler.
 */
import type {
  BuildTheChordExercise,
  ChooseAnswerExercise,
  ConceptCardExercise,
  EarPickExercise,
  Exercise,
  FindTheKeyExercise,
  NameTheNoteExercise,
  NoteDisplay,
  PlayChordExercise,
  PlayNoteExercise,
  PlaySequenceExercise,
  PostureHoldExercise,
  SequenceStep,
  SettingsOverride,
  StageKind,
  TapExercise,
  TapExerciseType,
  IllustrationId,
} from '../types/lesson.types';

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NOTE_RE = /^([A-G])(#|b)?(-?\d)$/;

/** "C4" → 60, "F#3" → 54, "Bb4" → 70. Throws on anything else. */
export function n(name: string): number {
  const m = NOTE_RE.exec(name.trim());
  if (!m) throw new Error(`Bad note name "${name}" (use e.g. C4, F#3, Bb4)`);
  const [, letter, acc, octave] = m;
  let pc = LETTER_PC[letter];
  if (acc === '#') pc += 1;
  if (acc === 'b') pc -= 1;
  return (Number(octave) + 1) * 12 + pc;
}

/** Space-separated names → MIDI list: ns("C4 E4 G4"). */
export function ns(names: string): number[] {
  return names.trim().split(/\s+/).map(n);
}

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/** Default keyboard ranges. */
export const RANGE_ONE_OCTAVE: [number, number] = [60, 71];
export const RANGE_TWO_OCTAVES: [number, number] = [48, 71];
export const RANGE_CHORDS: [number, number] = [48, 83];

// ---------------------------------------------------------------------------
// Deterministic option placement
// ---------------------------------------------------------------------------

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Put `correct` among `wrong` at a stable, prompt-dependent index. */
export function placeAnswer(key: string, correct: string, wrong: string[]): { options: string[]; correctIndex: number } {
  const options = [...wrong];
  const correctIndex = hash(`${key}|${correct}`) % (wrong.length + 1);
  options.splice(correctIndex, 0, correct);
  return { options, correctIndex };
}

// ---------------------------------------------------------------------------
// Exercise builders (no ids: the compiler assigns them)
// ---------------------------------------------------------------------------

export type Authored<T extends Exercise> = Omit<T, 'id'>;
export type AuthoredExercise = Authored<Exercise>;

interface WithSettings {
  settings?: SettingsOverride;
}

export function card(
  title: string,
  body: string,
  opts: { notes?: number[]; display?: NoteDisplay; chord?: boolean; illustration?: IllustrationId } = {},
): Authored<ConceptCardExercise> {
  return { type: 'concept-card', title, body, ...opts };
}

export function choose(
  prompt: string,
  correct: string,
  wrong: string[],
  explanation: string,
  opts: { notes?: number[]; display?: NoteDisplay } = {},
): Authored<ChooseAnswerExercise> {
  return { type: 'choose-answer', prompt, ...placeAnswer(prompt, correct, wrong), explanation, ...opts };
}

/** Name-the-note with three neighbouring letters as distractors. */
export function nameNote(noteName: string, explanation?: string): Authored<NameTheNoteExercise> {
  const midi = n(noteName);
  const letter = noteName[0];
  const i = LETTERS.indexOf(letter);
  const wrong = [LETTERS[(i + 1) % 7], LETTERS[(i + 6) % 7], LETTERS[(i + 2) % 7]];
  return {
    type: 'name-the-note',
    prompt: 'Name this note.',
    note: midi,
    ...placeAnswer(noteName, letter, wrong),
    explanation: explanation ?? `This note is ${letter} (${noteName}).`,
  };
}

export function findKey(
  prompt: string,
  noteName: string,
  explanation: string,
  opts: { anyOctave?: boolean; range?: [number, number] } = {},
): Authored<FindTheKeyExercise> {
  return {
    type: 'find-the-key',
    prompt,
    target: n(noteName),
    anyOctave: opts.anyOctave ?? false,
    range: opts.range ?? RANGE_TWO_OCTAVES,
    explanation,
  };
}

export function buildChord(chord: string, explanation: string, prompt?: string): Authored<BuildTheChordExercise> {
  return {
    type: 'build-the-chord',
    prompt: prompt ?? `Build a ${chord} chord on the keyboard.`,
    chord,
    range: RANGE_CHORDS,
    explanation,
  };
}

/**
 * Ear training. `play` is a list of groups written as note names:
 * ear('…', ['C4 E4 G4'], …) plays one chord; ear('…', ['C4', 'G4'], …) plays two notes in turn.
 */
export function ear(
  prompt: string,
  play: string[],
  correct: string,
  wrong: string[],
  explanation: string,
): Authored<EarPickExercise> {
  return {
    type: 'ear-pick',
    prompt,
    play: play.map(ns),
    ...placeAnswer(prompt + play.join('/'), correct, wrong),
    explanation,
  };
}

export function tap(type: TapExerciseType, pattern: string, opts: WithSettings & { prompt?: string } = {}): Authored<TapExercise> {
  return { type, pattern, ...opts };
}
export const tapAlong = (pattern: string, opts?: WithSettings & { prompt?: string }) => tap('tap-along', pattern, opts);
export const tapEcho = (pattern: string, opts?: WithSettings & { prompt?: string }) => tap('tap-echo', pattern, opts);
export const tapRead = (pattern: string, opts?: WithSettings & { prompt?: string }) => tap('tap-read', pattern, opts);

export function playNote(noteName: string, opts: WithSettings = {}): Authored<PlayNoteExercise> {
  return { type: 'play-note', note: n(noteName), ...opts };
}

export function playChord(chord: string, opts: WithSettings = {}): Authored<PlayChordExercise> {
  return { type: 'play-chord', chord, ...opts };
}

/** Notes: playNotes("C4 D4 E4"). */
export function playNotes(names: string, opts: WithSettings & { prompt?: string } = {}): Authored<PlaySequenceExercise> {
  const steps: SequenceStep[] = ns(names).map((note) => ({ kind: 'note', note }));
  return { type: 'play-sequence', steps, ...opts };
}

/** Chords: playChords("C F G C"). */
export function playChords(labels: string, opts: WithSettings & { prompt?: string } = {}): Authored<PlaySequenceExercise> {
  const steps: SequenceStep[] = labels
    .trim()
    .split(/\s+/)
    .map((chord) => ({ kind: 'chord', chord }));
  return { type: 'play-sequence', steps, ...opts };
}

export function postureHold(seconds?: number, prompt?: string): Authored<PostureHoldExercise> {
  return { type: 'posture-hold', prompt, ...(seconds ? { settings: { postureHoldSec: seconds } } : {}) };
}

// ---------------------------------------------------------------------------
// Stages, lessons, units
// ---------------------------------------------------------------------------

export interface AuthoredStage {
  kind: StageKind;
  exercises: AuthoredExercise[];
}

export const learn = (...exercises: AuthoredExercise[]): AuthoredStage => ({ kind: 'learn', exercises });
export const check = (...exercises: AuthoredExercise[]): AuthoredStage => ({ kind: 'check', exercises });
export const rhythm = (...exercises: AuthoredExercise[]): AuthoredStage => ({ kind: 'rhythm', exercises });
export const play = (...exercises: AuthoredExercise[]): AuthoredStage => ({ kind: 'play', exercises });
export const review = (...exercises: AuthoredExercise[]): AuthoredStage => ({ kind: 'review', exercises });

export interface AuthoredLesson {
  title: string;
  description: string;
  stages: AuthoredStage[];
  /** Checkpoints and exams: one review stage, unlocks the next unit. */
  checkpoint?: boolean;
  settings?: SettingsOverride;
}

export interface AuthoredUnit {
  /** = lessons.module_index (1–12). */
  index: number;
  title: string;
  blurb: string;
  settings?: SettingsOverride;
  lessons: AuthoredLesson[];
}

export const lesson = (l: AuthoredLesson): AuthoredLesson => l;
export const checkpoint = (l: Omit<AuthoredLesson, 'checkpoint'>): AuthoredLesson => ({ ...l, checkpoint: true });
export const unit = (u: AuthoredUnit): AuthoredUnit => u;
