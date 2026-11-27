/**
 * MUZ sheets (owner request 2026-11-28: "a system that makes making sheets easy"). A piece is
 * plain text, quick to type and to read back:
 *
 *   title: Twinkle, Twinkle, Little Star
 *   credit: Traditional              (optional)
 *   meter: 4/4                       (2/4, 3/4, 4/4, 6/8 …)
 *   bpm: 72
 *   level: novice                    (optional: novice | proficient | virtuoso)
 *   description: Right hand in C.   (optional)
 *
 *   C4 C4 G4 G4 | A4 A4 G4:h | F4 F4 E4 E4 | D4 D4 C4:h
 *
 * - Note: letter, optional # or b, octave: C4, F#4, Bb3 (middle C is C4).
 * - Chord: in brackets, any chord the lessons know: [C] [Am] [G7] [Cmaj7] [F#m].
 *   (Brackets keep the chord G7 apart from the note G in octave 7.)
 * - Length: after a colon, in beats (:2, :1.5, :0.5) or as a note value: :w whole, :h half,
 *   :q quarter, :e eighth, :s sixteenth; a trailing dot adds half (:h. = 3, :q. = 1.5).
 *   No length means one beat. Beats are quarter notes (as in every MUZ song).
 * - Rest: r, r:2, r:h.
 * - Bar line |: optional, but each bar is checked against the meter, which catches most typos.
 * - # starts a comment; blank lines are ignored; all music lines form one piece.
 * Errors come back with line and column and say how to fix them.
 */
import { parseChord } from '../audio/chords/vocabulary';
import type { Tier } from '../types/lesson.types';
import type { Song, SongEvent, SongTarget } from './songs';

export interface SheetError {
  line: number;
  col: number;
  message: string;
}

export type SheetResult = { ok: true; song: Song } | { ok: false; errors: SheetError[] };

const LETTERS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const VALUES: Record<string, number> = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25 };
const LEVELS: readonly Tier[] = ['novice', 'proficient', 'virtuoso'];
/** Lowest and highest notes the microphone graders handle well (C2 … C7). */
export const SHEET_MIN_NOTE = 36;
export const SHEET_MAX_NOTE = 96;

const NOTE_RE = /^([A-Ga-g])([#b]?)(-?\d)$/;
const TOKEN_RE = /^(\[[^\]]+\]|[^:\s]+)(?::(.+))?$/;

function parseLength(raw: string | undefined): number | null {
  if (raw === undefined) return 1;
  const dotted = raw.endsWith('.');
  const core = dotted ? raw.slice(0, -1) : raw;
  let beats: number | undefined = VALUES[core];
  if (beats === undefined && /^\d+(\.\d+)?$/.test(core)) beats = Number(core);
  if (beats === undefined || !(beats > 0) || beats > 16) return null;
  return dotted ? beats * 1.5 : beats;
}

function slug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'piece';
}

export function parseSheet(text: string, opts: { idPrefix?: string } = {}): SheetResult {
  const errors: SheetError[] = [];
  const header: Record<string, { value: string; line: number }> = {};
  const events: SongEvent[] = [];
  let beat = 0;
  let barStart = 0;
  let barNumber = 1;
  let barLine = 0;
  let barCol = 0;
  let beatsPerMeasure = 0;
  /** Last line with music on it: end-of-piece errors point there, not at a trailing blank line. */
  let lastMusicLine = 1;
  const lines = text.split(/\r?\n/);

  const checkMeter = (): boolean => {
    if (beatsPerMeasure > 0) return true;
    const m = header.meter?.value.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (!m) return false;
    const [top, bottom] = [Number(m[1]), Number(m[2])];
    if (![2, 4, 8].includes(bottom) || top < 1 || top > 12) return false;
    beatsPerMeasure = (top * 4) / bottom; // beats are quarter notes
    return true;
  };

  lines.forEach((rawLine, li) => {
    const lineNo = li + 1;
    const hash = rawLine.indexOf('#');
    // '#' is a comment unless it is a sharp inside a token (C#4, [F#m]).
    const commentAt = hash >= 0 && (hash === 0 || /\s/.test(rawLine[hash - 1])) ? hash : -1;
    const line = commentAt >= 0 ? rawLine.slice(0, commentAt) : rawLine;
    if (!line.trim()) return;
    const head = line.match(/^\s*([a-zA-Z]+)\s*:\s*(.*)$/);
    if (head && ['title', 'credit', 'meter', 'bpm', 'level', 'description'].includes(head[1].toLowerCase())) {
      header[head[1].toLowerCase()] = { value: head[2].trim(), line: lineNo };
      return;
    }
    if (!checkMeter()) {
      errors.push({ line: lineNo, col: 1, message: 'Write the header first: a meter line such as "meter: 4/4" (also 2/4, 3/4, 6/8).' });
      return;
    }
    const re = /\S+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      const tok = m[0];
      const col = m.index + 1;
      lastMusicLine = lineNo;
      if (barLine === 0) [barLine, barCol] = [lineNo, col];
      if (tok === '|') {
        const got = beat - barStart;
        if (Math.abs(got - beatsPerMeasure) > 1e-6) {
          errors.push({ line: barLine, col: barCol, message: `Bar ${barNumber} has ${+got.toFixed(3)} beats; ${header.meter.value} needs ${beatsPerMeasure}.` });
        }
        barStart = beat;
        barNumber++;
        barLine = 0;
        continue;
      }
      const parts = TOKEN_RE.exec(tok);
      const len = parseLength(parts?.[2]);
      if (!parts || len === null) {
        errors.push({ line: lineNo, col, message: `"${tok}": a length is a number of beats (:2, :1.5) or :w :h :q :e :s, with an optional dot (:h.).` });
        continue;
      }
      const body = parts[1];
      let target: SongTarget | null = null;
      if (body === 'r' || body === 'R') {
        beat += len;
        continue;
      }
      if (body.startsWith('[')) {
        const name = body.slice(1, -1).trim();
        try {
          parseChord(name);
          target = { kind: 'chord', chord: name };
        } catch {
          errors.push({ line: lineNo, col, message: `"${body}" is not a chord MUZ knows. Try [C], [Am], [G7], [Cmaj7], [F#m], [Bbsus4].` });
          continue;
        }
      } else {
        const n = NOTE_RE.exec(body);
        if (!n) {
          errors.push({ line: lineNo, col, message: `"${tok}" is not a note. Write a letter A-G, optional # or b, and an octave: C4, F#4, Bb3. Chords go in brackets: [Am].` });
          continue;
        }
        const pc = LETTERS[n[1].toUpperCase()] + (n[2] === '#' ? 1 : n[2] === 'b' ? -1 : 0);
        const midi = (Number(n[3]) + 1) * 12 + pc;
        if (midi < SHEET_MIN_NOTE || midi > SHEET_MAX_NOTE) {
          errors.push({ line: lineNo, col, message: `"${body}" is out of range; use notes from C2 to C7.` });
          continue;
        }
        target = { kind: 'note', note: midi };
      }
      events.push({ beat, length: len, target });
      beat += len;
    }
  });

  const title = header.title?.value;
  if (!title) errors.unshift({ line: 1, col: 1, message: 'Give the piece a title: "title: My Piece".' });
  if (!checkMeter()) errors.unshift({ line: header.meter?.line ?? 1, col: 1, message: 'The meter must look like "meter: 4/4" (also 2/4, 3/4, 6/8).' });
  const bpm = Number(header.bpm?.value);
  if (!header.bpm || !Number.isFinite(bpm) || bpm < 30 || bpm > 240) {
    errors.push({ line: header.bpm?.line ?? 1, col: 1, message: 'Set a tempo between 30 and 240: "bpm: 80".' });
  }
  const level = (header.level?.value.toLowerCase() ?? 'novice') as Tier;
  if (!LEVELS.includes(level)) errors.push({ line: header.level!.line, col: 1, message: 'level is novice, proficient or virtuoso.' });
  if (events.length === 0 && errors.length === 0) errors.push({ line: lines.length, col: 1, message: 'The piece has no notes yet. Add a line such as: C4 D4 E4 F4' });
  if (beatsPerMeasure > 0 && events.length > 0 && Math.abs(beat / beatsPerMeasure - Math.round(beat / beatsPerMeasure)) > 1e-6) {
    errors.push({ line: lastMusicLine, col: 1, message: `The piece is ${+beat.toFixed(3)} beats long; end on whole bars of ${beatsPerMeasure} (add a rest such as r:${+(beatsPerMeasure - (beat % beatsPerMeasure)).toFixed(3)}).` });
  }
  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    song: {
      id: `${opts.idPrefix ?? ''}${slug(title!)}`,
      title: title!,
      credit: header.credit?.value || 'Your piece',
      kind: events.every((e) => e.target.kind === 'chord') ? 'chords' : 'melody',
      level,
      bpm: Math.round(bpm),
      beatsPerMeasure,
      meter: header.meter.value.replace(/\s/g, ''),
      description: header.description?.value ?? '',
      events,
    },
  };
}
