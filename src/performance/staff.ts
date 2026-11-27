/**
 * Layout for the sheet-music view (owner request 2026-11-28: a staff to sight-read from). Pure,
 * so it is tested without a DOM: where each note sits on the staff, which note values and rests
 * spell each length, how the piece splits into bars, and which accidentals a bar needs.
 *
 * - One staff: treble clef, or bass clef when most notes lie below middle C. Ledger lines cover
 *   the rest (middle C sits on one below the treble staff).
 * - Key of C (MUZ pieces have no key signature), so every black key gets an accidental the first
 *   time it appears in a bar; a later plain note on the same line or space in that bar gets a
 *   natural. Single notes are spelled C# Eb F# Ab Bb; chord tones follow the chord's own root
 *   letter (Bb chord: Bb D F, A major: A C# E).
 * - Lengths are split into whole, half, quarter, eighth and sixteenth notes (plain or dotted),
 *   tied across bar lines and wherever one value cannot spell the length. Gaps are rests; an
 *   empty bar is one whole rest, in any meter.
 * Chord voicings are the falling-notes view's (targetKeys): root position around middle C.
 */
import { parseChord } from '../audio/chords/vocabulary';
import { targetKeys } from './falling';
import { songLengthBeats, type Song, type SongTarget } from './songs';

export type Clef = 'treble' | 'bass';
export type Accidental = 'sharp' | 'flat' | 'natural';
export type NoteValue = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';

export interface Glyph {
  value: NoteValue;
  dots: 0 | 1;
  /** Length in beats (quarter notes). */
  beats: number;
}

const EPS = 1e-6;

/** Longest first, so a length is spelled with as few tied values as possible. */
const GLYPHS: readonly Glyph[] = [
  { value: 'whole', dots: 0, beats: 4 },
  { value: 'half', dots: 1, beats: 3 },
  { value: 'half', dots: 0, beats: 2 },
  { value: 'quarter', dots: 1, beats: 1.5 },
  { value: 'quarter', dots: 0, beats: 1 },
  { value: 'eighth', dots: 1, beats: 0.75 },
  { value: 'eighth', dots: 0, beats: 0.5 },
  { value: 'sixteenth', dots: 1, beats: 0.375 },
  { value: 'sixteenth', dots: 0, beats: 0.25 },
];

/**
 * Note values that add up to `beats`, longest first (2.5 → half + eighth). A remainder shorter
 * than a sixteenth (a sheet may say :0.3) is dropped; anything shorter is one sixteenth.
 */
export function splitDuration(beats: number): Glyph[] {
  const out: Glyph[] = [];
  let left = beats;
  for (const g of GLYPHS) {
    while (left >= g.beats - EPS) {
      out.push(g);
      left -= g.beats;
    }
  }
  return out.length ? out : [GLYPHS[GLYPHS.length - 1]];
}

/** Letters C D E F G A B as 0–6, and their pitch classes. */
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11] as const;
const LETTER_INDEX: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
/** Spelling of each pitch class for a single note: [letter, alteration]. */
const DEFAULT_SPELLING: readonly (readonly [number, -1 | 0 | 1])[] = [
  [0, 0], [0, 1], [1, 0], [2, -1], [2, 0], [3, 0], [3, 1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0],
];

export interface SpelledNote {
  midi: number;
  letter: number;
  /** -1 flat, 0 natural, +1 sharp. */
  alter: -1 | 0 | 1;
  /** Diatonic number: octave × 7 + letter (C4 = 28, E4 = 30). */
  diatonic: number;
}

/** `midi` written with `letter`; null when that would need a double sharp or flat. */
function spellAs(midi: number, letter: number): SpelledNote | null {
  const base = Math.floor(midi / 12) - 1;
  for (const octave of [base, base - 1, base + 1]) {
    const alter = midi - ((octave + 1) * 12 + LETTER_PC[letter]);
    if (alter >= -1 && alter <= 1) return { midi, letter, alter: alter as -1 | 0 | 1, diatonic: octave * 7 + letter };
  }
  return null;
}

export function spellMidi(midi: number): SpelledNote {
  const pc = ((midi % 12) + 12) % 12;
  return spellAs(midi, DEFAULT_SPELLING[pc][0])!;
}

/** Interval in semitones above the root → scale degree (0 root, 2 third, 4 fifth, 6 seventh). */
function degreeOf(semitones: number): number {
  const s = ((semitones % 12) + 12) % 12;
  return [0, 1, 1, 2, 2, 3, 4, 4, 4, 5, 6, 6][s];
}

/** The notes of a target as they are written, low to high. */
export function spellTarget(target: SongTarget): SpelledNote[] {
  const keys = targetKeys(target);
  if (target.kind === 'note') return keys.map(spellMidi);
  const letterMatch = /^\s*([A-Ga-g])/.exec(target.chord);
  const { root } = parseChord(target.chord);
  const rootLetter = letterMatch ? LETTER_INDEX[letterMatch[1].toUpperCase()] : DEFAULT_SPELLING[root][0];
  const rootKey = keys[0];
  return keys.map((k) => spellAs(k, (rootLetter + degreeOf(k - rootKey)) % 7) ?? spellMidi(k));
}

/** A chord symbol spelled from its written root ("B♭", not the "A#" the graders' label uses). */
export function chordSymbol(chord: string): string {
  const { label } = parseChord(chord);
  const suffix = label.slice(label[1] === '#' ? 2 : 1);
  const m = /^\s*([A-Ga-g])([#b♯♭]?)/.exec(chord);
  if (!m) return label;
  const acc = m[2] === '#' || m[2] === '♯' ? '♯' : m[2] ? '♭' : '';
  return `${m[1].toUpperCase()}${acc}${suffix}`;
}

/** Diatonic number of each clef's bottom line: E4 (treble), G2 (bass). */
const BOTTOM_LINE: Record<Clef, number> = { treble: 4 * 7 + 2, bass: 2 * 7 + 4 };

/** Staff position: 0 bottom line, 1 the space above it, … 8 top line; negative below the staff. */
export function staffStep(diatonic: number, clef: Clef): number {
  return diatonic - BOTTOM_LINE[clef];
}

/** Ledger lines a head at `step` needs (their steps), nearest the staff first. */
export function ledgerSteps(step: number): number[] {
  const out: number[] = [];
  for (let s = -2; s >= step; s -= 2) out.push(s);
  for (let s = 10; s <= step; s += 2) out.push(s);
  return out;
}

/** Treble unless most notes lie below middle C. */
export function chooseClef(song: Song): Clef {
  const keys = song.events.flatMap((e) => targetKeys(e.target));
  const low = keys.filter((k) => k < 60).length;
  return keys.length > 0 && low * 2 > keys.length ? 'bass' : 'treble';
}

export interface StaffHead {
  midi: number;
  step: number;
  alter: -1 | 0 | 1;
  /** Shown before the head (null: the bar already says so). */
  accidental: Accidental | null;
  /** Column for the accidental, 0 nearest the head, so stacked accidentals do not collide. */
  accidentalColumn: number;
}

export interface StaffItem {
  kind: 'note' | 'rest';
  /** Start, in beats from the start of the piece. */
  beat: number;
  glyph: Glyph;
  /** Index into song.events (notes only). */
  event: number | null;
  /** Low to high. Empty for a rest. */
  heads: StaffHead[];
  stemUp: boolean;
  /** Tied to the next item (the same event continues). */
  tieToNext: boolean;
  /** A whole-bar rest (drawn centred, whatever the meter). */
  wholeBarRest?: boolean;
}

export interface StaffBar {
  index: number;
  /** First beat of the bar. */
  start: number;
  items: StaffItem[];
}

export interface StaffLayout {
  clef: Clef;
  /** Time signature as written ("6/8" → 6 over 8). */
  meterTop: number;
  meterBottom: number;
  beatsPerBar: number;
  bars: StaffBar[];
  /** Lowest and highest head steps in the piece (0 and 8 for an empty one). */
  minStep: number;
  maxStep: number;
}

function meterParts(song: Song): [number, number] {
  const m = /^(\d+)\s*\/\s*(\d+)$/.exec(song.meter);
  return m ? [Number(m[1]), Number(m[2])] : [song.beatsPerMeasure, 4];
}

/** Accidentals top-down; each takes the first column where it clears the ones above by a sixth. */
function placeAccidentals(heads: StaffHead[]): void {
  const placed: StaffHead[] = [];
  for (const h of [...heads].reverse()) {
    if (!h.accidental) continue;
    let col = 0;
    while (placed.some((p) => p.accidentalColumn === col && p.step - h.step < 6)) col++;
    h.accidentalColumn = col;
    placed.push(h);
  }
}

export function layoutStaff(song: Song): StaffLayout {
  const clef = chooseClef(song);
  const [meterTop, meterBottom] = meterParts(song);
  const perBar = song.beatsPerMeasure > 0 ? song.beatsPerMeasure : 4;
  const barCount = Math.max(1, Math.ceil(songLengthBeats(song) / perBar - EPS));
  const total = barCount * perBar;

  // The piece as spans: notes (one per event, cut at the next event) and rests in the gaps.
  type Span = { start: number; end: number; event: number | null };
  const spans: Span[] = [];
  let cursor = 0;
  song.events.forEach((e, i) => {
    if (e.beat > cursor + EPS) spans.push({ start: cursor, end: e.beat, event: null });
    const next = song.events[i + 1]?.beat ?? Infinity;
    const end = Math.min(e.beat + e.length, next, total);
    if (end > e.beat + EPS) spans.push({ start: e.beat, end, event: i });
    cursor = Math.max(cursor, end);
  });
  if (total > cursor + EPS) spans.push({ start: cursor, end: total, event: null });

  const spelled = song.events.map((e) => spellTarget(e.target));
  const bars: StaffBar[] = Array.from({ length: barCount }, (_, i) => ({ index: i, start: i * perBar, items: [] }));
  let minStep = Infinity;
  let maxStep = -Infinity;

  for (const span of spans) {
    // Cut at bar lines, then spell each piece with note values.
    let at = span.start;
    const pieces: { bar: number; beat: number; glyph: Glyph; whole?: boolean }[] = [];
    while (at < span.end - EPS) {
      const bar = Math.min(barCount - 1, Math.floor(at / perBar + EPS));
      const barEnd = (bar + 1) * perBar;
      const end = Math.min(span.end, barEnd);
      if (span.event === null && Math.abs(at - bar * perBar) < EPS && Math.abs(end - barEnd) < EPS) {
        pieces.push({ bar, beat: at, glyph: { value: 'whole', dots: 0, beats: perBar }, whole: true });
      } else {
        let b = at;
        for (const g of splitDuration(end - at)) {
          pieces.push({ bar, beat: b, glyph: g });
          b += g.beats;
        }
      }
      at = end;
    }
    pieces.forEach((p, k) => {
      if (span.event === null) {
        bars[p.bar].items.push({ kind: 'rest', beat: p.beat, glyph: p.glyph, event: null, heads: [], stemUp: true, tieToNext: false, ...(p.whole ? { wholeBarRest: true } : {}) });
        return;
      }
      const heads: StaffHead[] = spelled[span.event].map((s) => ({
        midi: s.midi,
        step: staffStep(s.diatonic, clef),
        alter: s.alter,
        accidental: null,
        accidentalColumn: 0,
      }));
      const lo = heads[0].step;
      const hi = heads[heads.length - 1].step;
      minStep = Math.min(minStep, lo);
      maxStep = Math.max(maxStep, hi);
      const stemUp = (lo + hi) / 2 < 4;
      bars[p.bar].items.push({ kind: 'note', beat: p.beat, glyph: p.glyph, event: span.event, heads, stemUp, tieToNext: k < pieces.length - 1 });
    });
  }

  // Accidentals, bar by bar (key of C: a bar starts with every line and space natural). The far
  // end of a tie repeats no accidental, even across a bar line.
  let tiedIn = false;
  for (const bar of bars) {
    const inForce = new Map<number, number>();
    for (const item of bar.items) {
      if (item.kind !== 'note') {
        tiedIn = false;
        continue;
      }
      for (const h of item.heads) {
        const was = inForce.get(h.step) ?? 0;
        if (!tiedIn && h.alter !== was) h.accidental = h.alter === 1 ? 'sharp' : h.alter === -1 ? 'flat' : 'natural';
        inForce.set(h.step, h.alter);
      }
      placeAccidentals(item.heads);
      tiedIn = item.tieToNext;
    }
  }

  return {
    clef,
    meterTop,
    meterBottom,
    beatsPerBar: perBar,
    bars,
    minStep: Number.isFinite(minStep) ? minStep : 0,
    maxStep: Number.isFinite(maxStep) ? maxStep : 8,
  };
}

/** Room an accidental column takes, in staff spaces. */
const ACCIDENTAL_SPACE = 0.9;

function accidentalRoom(item: StaffItem | undefined): number {
  const cols = item?.heads.filter((h) => h.accidental).map((h) => h.accidentalColumn) ?? [];
  return cols.length ? 0.6 + ACCIDENTAL_SPACE * (Math.max(...cols) + 1) : 0;
}

/**
 * Horizontal room after an item's start, in staff spaces: longer values get more (as in printed
 * music, by the square root of the length), plus room for a dot, an up-flag and the next item's
 * accidentals, so nothing collides however short the notes.
 */
export function itemSpace(item: StaffItem, next?: StaffItem): number {
  if (item.wholeBarRest) return 6;
  let w = 1.4 + 2.4 * Math.sqrt(item.glyph.beats);
  if (item.glyph.dots) w += 0.6;
  if (item.kind === 'note' && item.stemUp && (item.glyph.value === 'eighth' || item.glyph.value === 'sixteenth')) w += 0.6;
  return w + accidentalRoom(next);
}

export interface BarSpacing {
  /** Start of each item from the bar line, in staff spaces. */
  offsets: number[];
  /** The bar's natural width, in staff spaces. */
  width: number;
}

/** Where each item of a bar starts at its natural width (before a page stretches it). */
export function spaceBar(bar: StaffBar): BarSpacing {
  let x = 1.2 + accidentalRoom(bar.items[0]);
  const offsets = bar.items.map((item, i) => {
    const at = x;
    x += itemSpace(item, bar.items[i + 1]);
    return at;
  });
  return { offsets, width: x + 0.4 };
}

/** The event sounding at `beat` (start ≤ beat < start + length), or -1 in a rest or outside. */
export function soundingEvent(song: Song, beat: number): number {
  return song.events.findIndex((e) => beat >= e.beat - EPS && beat < e.beat + e.length - EPS);
}

/** The bar holding `beat`, clamped to the piece. */
export function barAt(layout: StaffLayout, beat: number): number {
  return Math.max(0, Math.min(layout.bars.length - 1, Math.floor(beat / layout.beatsPerBar + EPS)));
}
