import { parseRhythm, type BeatUnit, type ParsedRhythm } from '../lib/rhythm/notation';

/**
 * Rhythm pattern library (COURSE-1). Lessons reference patterns by id, so a
 * pattern fix here fixes every lesson that uses it.
 * Notation reference: src/lib/rhythm/notation.ts.
 */
export interface PatternDef {
  id: string;
  label: string;
  /** Time signature shown to the learner, e.g. "4/4". */
  meter: string;
  /** Metronome clicks per measure (6 for 6/8). */
  beatsPerMeasure: number;
  beatUnit: BeatUnit;
  notation: string;
  /** Suggested tempo; falls back to the tier bpm when omitted. */
  bpm?: number;
}

export interface CompiledPattern extends PatternDef, ParsedRhythm {
  measures: number;
}

const DEFS: PatternDef[] = [
  // Novice
  { id: 'quarters', label: 'Steady quarter notes', meter: '4/4', beatsPerMeasure: 4, beatUnit: 'quarter', notation: 'q q q q' },
  { id: 'half-quarters', label: 'Half and quarters', meter: '4/4', beatsPerMeasure: 4, beatUnit: 'quarter', notation: 'h q q' },
  { id: 'mixed-values', label: 'Half, quarter and whole', meter: '4/4', beatsPerMeasure: 4, beatUnit: 'quarter', notation: 'h q q | w' },
  { id: 'quarters-rest', label: 'Quarter notes with a rest', meter: '4/4', beatsPerMeasure: 4, beatUnit: 'quarter', notation: 'q q rq q' },
  { id: 'waltz', label: 'Waltz pulse', meter: '3/4', beatsPerMeasure: 3, beatUnit: 'quarter', notation: 'q q q' },
  { id: 'waltz-rest', label: 'Waltz with a rest', meter: '3/4', beatsPerMeasure: 3, beatUnit: 'quarter', notation: 'q q rq | h q' },
  { id: 'first-melody', label: 'First melody rhythm', meter: '4/4', beatsPerMeasure: 4, beatUnit: 'quarter', notation: 'q q q q | q q q q' },
  { id: 'chord-changes', label: 'Chord changes on half notes', meter: '4/4', beatsPerMeasure: 4, beatUnit: 'quarter', notation: 'h h | h h' },
  // Proficient
  { id: 'eighths', label: 'Straight eighth notes', meter: '4/4', beatsPerMeasure: 4, beatUnit: 'quarter', notation: 'e e e e e e e e' },
  { id: 'eighth-mix', label: 'Quarters and eighths', meter: '4/4', beatsPerMeasure: 4, beatUnit: 'quarter', notation: 'q e e q q' },
  { id: 'dotted', label: 'Dotted quarter and eighth', meter: '4/4', beatsPerMeasure: 4, beatUnit: 'quarter', notation: 'dq e q q' },
  { id: 'tie', label: 'Tied notes', meter: '4/4', beatsPerMeasure: 4, beatUnit: 'quarter', notation: 'h ~q q' },
  { id: 'six-eight', label: '6/8 lilt', meter: '6/8', beatsPerMeasure: 6, beatUnit: 'eighth', notation: 'q e q e' },
  { id: 'six-eight-dotted', label: '6/8 big beats', meter: '6/8', beatsPerMeasure: 6, beatUnit: 'eighth', notation: 'dq dq' },
  { id: 'pop-rhythm', label: 'Pop progression rhythm', meter: '4/4', beatsPerMeasure: 4, beatUnit: 'quarter', notation: 'dq dq q' },
  // Virtuoso
  { id: 'syncopation', label: 'Off-beat syncopation', meter: '4/4', beatsPerMeasure: 4, beatUnit: 'quarter', notation: 'e q e q q' },
  { id: 'sixteenths', label: 'Sixteenth notes', meter: '4/4', beatsPerMeasure: 4, beatUnit: 'quarter', notation: 's s s s s s s s s s s s s s s s', bpm: 72 },
  { id: 'sixteenth-mix', label: 'Sixteenth figures', meter: '4/4', beatsPerMeasure: 4, beatUnit: 'quarter', notation: 'e s s e s s q q' },
  { id: 'triplets', label: 'Eighth-note triplets', meter: '4/4', beatsPerMeasure: 4, beatUnit: 'quarter', notation: 't t t t t t q q' },
  { id: 'swing', label: 'Swing feel', meter: '4/4', beatsPerMeasure: 4, beatUnit: 'quarter', notation: 'tq t tq t tq t tq t' },
];

function compile(def: PatternDef): CompiledPattern {
  const parsed = parseRhythm(def.notation, def.beatUnit);
  return { ...def, ...parsed, measures: parsed.lengthBeats / def.beatsPerMeasure };
}

export const PATTERNS: Readonly<Record<string, CompiledPattern>> = Object.freeze(
  Object.fromEntries(DEFS.map((d) => [d.id, compile(d)])),
);

export function getPattern(id: string): CompiledPattern {
  const p = PATTERNS[id];
  if (!p) throw new Error(`Unknown rhythm pattern "${id}"`);
  return p;
}
