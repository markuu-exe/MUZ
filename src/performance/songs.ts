/**
 * Performance mode songs (owner request 2026-11-27): play a melody or a chord progression
 * in time with a count-in and a click. Only public-domain melodies (traditional / Beethoven)
 * and MUZ's own progressions; no copyrighted songs.
 *
 * Beats are quarter notes; `beat` is where the event starts from the first beat of the song.
 */
import { parseChord } from '../audio/chords/vocabulary';
import { midiToNoteName } from '../audio/dsp/pitch';
import type { Tier } from '../types/lesson.types';
import { parseSheet } from './sheet';

export type SongTarget = { kind: 'note'; note: number } | { kind: 'chord'; chord: string };

export interface SongEvent {
  beat: number;
  /** Length in beats (to the next event, or to the end). */
  length: number;
  target: SongTarget;
}

export interface Song {
  id: string;
  title: string;
  credit: string;
  kind: 'melody' | 'chords';
  level: Tier;
  bpm: number;
  beatsPerMeasure: number;
  meter: string;
  description: string;
  events: SongEvent[];
}

/** A built-in song, written as a MUZ sheet (performance/sheet.ts). A typo fails at load and in tests. */
function fromSheet(id: string, text: string): Song {
  const r = parseSheet(text);
  if (!r.ok) throw new Error(`Song ${id}: ${r.errors.map((e) => `line ${e.line}:${e.col} ${e.message}`).join('; ')}`);
  return { ...r.song, id };
}

export const SONGS: readonly Song[] = [
  fromSheet('twinkle', `
    title: Twinkle, Twinkle, Little Star
    credit: Traditional
    meter: 4/4
    bpm: 72
    level: novice
    description: Right hand in C position. One note per beat, long notes at the end of each line.
    C4 C4 G4 G4 | A4 A4 G4:h | F4 F4 E4 E4 | D4 D4 C4:h
  `),
  fromSheet('ode-to-joy', `
    title: Ode to Joy
    credit: Beethoven (public domain)
    meter: 4/4
    bpm: 72
    level: novice
    description: The C-position melody from Unit 3, now in time. Watch the dotted rhythm at the end.
    E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4:q. D4:e D4:h
  `),
  fromSheet('four-chords', `
    title: Four-Chord Groove
    credit: MUZ original
    meter: 4/4
    bpm: 80
    level: novice
    description: I–V–vi–IV in C: C, G, Am, F, one bar each, twice. Change on beat 1.
    [C]:w | [G]:w | [Am]:w | [F]:w | [C]:w | [G]:w | [Am]:w | [F]:w
  `),
  fromSheet('gentle-waltz', `
    title: Gentle Waltz
    credit: MUZ original
    meter: 3/4
    bpm: 90
    level: proficient
    description: Three beats per bar: C, F, G7, C, then again with Am and Dm. Count 1-2-3.
    [C]:h. | [F]:h. | [G7]:h. | [C]:h. | [Am]:h. | [Dm]:h. | [G7]:h. | [C]:h.
  `),
  fromSheet('turnaround', `
    title: Jazz Turnaround
    credit: MUZ original
    meter: 4/4
    bpm: 76
    level: virtuoso
    description: ii–V–I in C with sevenths: Dm7, G7, Cmaj7. Two beats each for the first two, then hold.
    [Dm7]:h [G7]:h | [Cmaj7]:w | [Dm7]:h [G7]:h | [Cmaj7]:w
  `),
];

export function targetLabel(t: SongTarget): string {
  return t.kind === 'note' ? midiToNoteName(t.note) : parseChord(t.chord).label;
}

export function songLengthBeats(song: Song): number {
  const last = song.events[song.events.length - 1];
  return last ? last.beat + last.length : 0;
}

export function getSong(id: string): Song | undefined {
  return SONGS.find((s) => s.id === id);
}
