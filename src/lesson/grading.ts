/** COURSE-3: pure graders for the theory exercises. UI components call these; tests cover them. */
import { parseChord } from '../audio/chords/vocabulary';
import type { BuildTheChordExercise, FindTheKeyExercise } from '../types/lesson.types';

const pc = (m: number) => ((m % 12) + 12) % 12;

export function gradeChoice(correctIndex: number, picked: number | null): boolean {
  return picked !== null && picked === correctIndex;
}

export function gradeFindKey(ex: Pick<FindTheKeyExercise, 'target' | 'anyOctave'>, pressed: number | null): boolean {
  if (pressed === null) return false;
  return ex.anyOctave ? pc(pressed) === pc(ex.target) : pressed === ex.target;
}

/**
 * Any voicing/inversion passes; every chord tone is required and no other
 * pitch class may be added (same rule as the audio verifier, KAN-260 Q3).
 */
export function gradeBuildChord(ex: Pick<BuildTheChordExercise, 'chord'>, selected: readonly number[]): boolean {
  const want = new Set(parseChord(ex.chord).pcs);
  const got = new Set(selected.map(pc));
  if (got.size !== want.size) return false;
  for (const p of got) if (!want.has(p)) return false;
  return true;
}

/** Pitch classes of a chord label, for hints and highlighting. */
export function chordPitchClasses(chord: string): number[] {
  return [...parseChord(chord).pcs];
}
