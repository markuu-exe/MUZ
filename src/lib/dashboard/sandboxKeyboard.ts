import { fullVocabulary } from '../../audio/chords/vocabulary';
import { pc } from '../../audio/dsp/pitch';

export const MIN_SANDBOX_OCTAVE = 2;
export const MAX_SANDBOX_OCTAVE = 5;
export const DEFAULT_SANDBOX_OCTAVE = 4;
/** Number of semitones shown on the interactive 2-octave keyboard (C .. C+2). */
export const SANDBOX_SPAN_SEMITONES = 24;

/** Semitone offset from base C -> computer key label. Covers 1.5 octaves (C..F+1). */
export const KEY_BINDINGS: ReadonlyArray<{ offset: number; key: string; label: string }> = Object.freeze([
  { offset: 0, key: 'a', label: 'A' },
  { offset: 1, key: 'w', label: 'W' },
  { offset: 2, key: 's', label: 'S' },
  { offset: 3, key: 'e', label: 'E' },
  { offset: 4, key: 'd', label: 'D' },
  { offset: 5, key: 'f', label: 'F' },
  { offset: 6, key: 't', label: 'T' },
  { offset: 7, key: 'g', label: 'G' },
  { offset: 8, key: 'y', label: 'Y' },
  { offset: 9, key: 'h', label: 'H' },
  { offset: 10, key: 'u', label: 'U' },
  { offset: 11, key: 'j', label: 'J' },
  { offset: 12, key: 'k', label: 'K' },
  { offset: 13, key: 'o', label: 'O' },
  { offset: 14, key: 'l', label: 'L' },
  { offset: 15, key: 'p', label: 'P' },
  { offset: 16, key: ';', label: ';' },
  { offset: 17, key: "'", label: "'" },
]);

const VOCABULARY = fullVocabulary();

export function baseMidiForOctave(octave: number): number {
  const clamped = Math.max(MIN_SANDBOX_OCTAVE, Math.min(MAX_SANDBOX_OCTAVE, octave));
  return (clamped + 1) * 12;
}

/** Maps lowercase keyboard `event.key` values to MIDI note numbers for the given base octave. */
export function buildKeyToMidiMap(octave: number): Map<string, number> {
  const base = baseMidiForOctave(octave);
  const map = new Map<string, number>();
  for (const { offset, key } of KEY_BINDINGS) {
    map.set(key, base + offset);
  }
  return map;
}

/** Maps MIDI note numbers to display keycap hints for the given base octave. */
export function buildMidiToKeyLabelMap(octave: number): Map<number, string> {
  const base = baseMidiForOctave(octave);
  const map = new Map<number, string>();
  for (const { offset, label } of KEY_BINDINGS) {
    map.set(base + offset, label);
  }
  return map;
}

/**
 * Identifies a chord from currently sounding MIDI notes using the MUZ chord vocabulary.
 * Prefers root-position matches (bass note == chord root), otherwise formats as a slash chord.
 */
export function identifyChord(midis: readonly number[]): string | null {
  if (midis.length < 3) return null;
  const sorted = [...midis].sort((a, b) => a - b);
  const bassPc = pc(sorted[0]);
  const playedPcs = new Set(sorted.map((m) => pc(m)));
  if (playedPcs.size < 3) return null;

  const exactMatches = VOCABULARY.filter(
    (spec) => spec.pcs.length === playedPcs.size && spec.pcs.every((p) => playedPcs.has(p)),
  );
  if (exactMatches.length === 0) return null;

  const rootMatch = exactMatches.find((spec) => spec.root === bassPc);
  if (rootMatch) return rootMatch.label;

  const first = exactMatches[0];
  const bassName = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][bassPc];
  return `${first.label}/${bassName}`;
}
