/**
 * Tiny rhythm notation used by src/content/patterns.ts (COURSE-1).
 *
 * Tokens (space separated, `|` is an optional bar line and is ignored):
 *   w = whole (4)   h = half (2)   q = quarter (1)   e = eighth (1/2)   s = sixteenth (1/4)
 *   dh = dotted half (3)   dq = dotted quarter (3/2)   de = dotted eighth (3/4)
 *   t  = eighth-note triplet (1/3)   tq = quarter-note triplet (2/3)
 *   prefix `r` = rest (no tap)        prefix `~` = tied to the previous note (no tap)
 *
 * Durations are in quarter-note beats. When a pattern's beatUnit is 'eighth'
 * (6/8), every duration is doubled so one metronome click = one eighth note.
 */

export type BeatUnit = 'quarter' | 'eighth';

export type NoteValue = 'w' | 'h' | 'q' | 'e' | 's' | 'dh' | 'dq' | 'de' | 't' | 'tq';

export interface RhythmToken {
  value: NoteValue;
  rest: boolean;
  tie: boolean;
  /** Start, in clicks from the start of the pattern. */
  start: number;
  /** Length, in clicks. */
  length: number;
}

export interface ParsedRhythm {
  tokens: RhythmToken[];
  /** Click offsets that expect a tap. */
  hits: number[];
  /** Total length in clicks. */
  lengthBeats: number;
}

const QUARTER_BEATS: Readonly<Record<NoteValue, number>> = Object.freeze({
  w: 4,
  h: 2,
  q: 1,
  e: 1 / 2,
  s: 1 / 4,
  dh: 3,
  dq: 3 / 2,
  de: 3 / 4,
  t: 1 / 3,
  tq: 2 / 3,
});

const TOKEN_RE = /^([r~]?)(dh|dq|de|tq|w|h|q|e|s|t)$/;

export class RhythmNotationError extends Error {
  constructor(source: string, token: string) {
    super(`Bad rhythm token "${token}" in "${source}"`);
    this.name = 'RhythmNotationError';
  }
}

/** Round to 1e-6 so triplet sums compare cleanly. */
function tidy(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

export function parseRhythm(source: string, beatUnit: BeatUnit = 'quarter'): ParsedRhythm {
  const scale = beatUnit === 'eighth' ? 2 : 1;
  const tokens: RhythmToken[] = [];
  const hits: number[] = [];
  let cursor = 0;
  for (const raw of source.trim().split(/\s+/)) {
    if (raw === '|' || raw === '') continue;
    const m = TOKEN_RE.exec(raw);
    if (!m) throw new RhythmNotationError(source, raw);
    const prefix = m[1];
    const value = m[2] as NoteValue;
    const rest = prefix === 'r';
    const tie = prefix === '~';
    if (tie && tokens.length === 0) throw new RhythmNotationError(source, raw);
    const exact = QUARTER_BEATS[value] * scale;
    const start = tidy(cursor);
    tokens.push({ value, rest, tie, start, length: tidy(exact) });
    if (!rest && !tie) hits.push(start);
    cursor += exact; // accumulate unrounded so triplets sum to whole beats
  }
  return { tokens, hits, lengthBeats: tidy(cursor) };
}

/** Unicode glyphs for the tap-read notation strip. */
export const NOTE_GLYPH: Readonly<Record<NoteValue, string>> = Object.freeze({
  w: '𝅝',
  h: '𝅗𝅥',
  q: '♩',
  e: '♪',
  s: '𝅘𝅥𝅯',
  dh: '𝅗𝅥.',
  dq: '♩.',
  de: '♪.',
  t: '♪³',
  tq: '♩³',
});

export const REST_GLYPH: Readonly<Record<NoteValue, string>> = Object.freeze({
  w: '𝄻',
  h: '𝄼',
  q: '𝄽',
  e: '𝄾',
  s: '𝄿',
  dh: '𝄼.',
  dq: '𝄽.',
  de: '𝄾.',
  t: '𝄾³',
  tq: '𝄽³',
});

export function tokenGlyph(token: RhythmToken): string {
  if (token.rest) return REST_GLYPH[token.value];
  return (token.tie ? '‿' : '') + NOTE_GLYPH[token.value];
}
