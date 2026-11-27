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

/** Build events from [target, length] pairs placed one after another. */
function seq(items: Array<[SongTarget, number]>): SongEvent[] {
  let beat = 0;
  return items.map(([target, length]) => {
    const e = { beat, length, target };
    beat += length;
    return e;
  });
}
const n = (note: number, len = 1): [SongTarget, number] => [{ kind: 'note', note }, len];
const c = (chord: string, len: number): [SongTarget, number] => [{ kind: 'chord', chord }, len];
const C4 = 60, D4 = 62, E4 = 64, F4 = 65, G4 = 67, A4 = 69;

export const SONGS: readonly Song[] = [
  {
    id: 'twinkle',
    title: 'Twinkle, Twinkle, Little Star',
    credit: 'Traditional',
    kind: 'melody',
    level: 'novice',
    bpm: 72,
    beatsPerMeasure: 4,
    meter: '4/4',
    description: 'Right hand in C position. One note per beat, long notes at the end of each line.',
    events: seq([n(C4), n(C4), n(G4), n(G4), n(A4), n(A4), n(G4, 2), n(F4), n(F4), n(E4), n(E4), n(D4), n(D4), n(C4, 2)]),
  },
  {
    id: 'ode-to-joy',
    title: 'Ode to Joy',
    credit: 'Beethoven (public domain)',
    kind: 'melody',
    level: 'novice',
    bpm: 72,
    beatsPerMeasure: 4,
    meter: '4/4',
    description: 'The C-position melody from Unit 3, now in time. Watch the dotted rhythm at the end.',
    events: seq([n(E4), n(E4), n(F4), n(G4), n(G4), n(F4), n(E4), n(D4), n(C4), n(C4), n(D4), n(E4), n(E4, 1.5), n(D4, 0.5), n(D4, 2)]),
  },
  {
    id: 'four-chords',
    title: 'Four-Chord Groove',
    credit: 'MUZ original',
    kind: 'chords',
    level: 'novice',
    bpm: 80,
    beatsPerMeasure: 4,
    meter: '4/4',
    description: 'I–V–vi–IV in C: C, G, Am, F, one bar each, twice. Change on beat 1.',
    events: seq([c('C', 4), c('G', 4), c('Am', 4), c('F', 4), c('C', 4), c('G', 4), c('Am', 4), c('F', 4)]),
  },
  {
    id: 'gentle-waltz',
    title: 'Gentle Waltz',
    credit: 'MUZ original',
    kind: 'chords',
    level: 'proficient',
    bpm: 90,
    beatsPerMeasure: 3,
    meter: '3/4',
    description: 'Three beats per bar: C, F, G7, C, then again with Am and Dm. Count 1-2-3.',
    events: seq([c('C', 3), c('F', 3), c('G7', 3), c('C', 3), c('Am', 3), c('Dm', 3), c('G7', 3), c('C', 3)]),
  },
  {
    id: 'turnaround',
    title: 'Jazz Turnaround',
    credit: 'MUZ original',
    kind: 'chords',
    level: 'virtuoso',
    bpm: 76,
    beatsPerMeasure: 4,
    meter: '4/4',
    description: 'ii–V–I in C with sevenths: Dm7, G7, Cmaj7. Two beats each for the first two, then hold.',
    events: seq([c('Dm7', 2), c('G7', 2), c('Cmaj7', 4), c('Dm7', 2), c('G7', 2), c('Cmaj7', 4)]),
  },
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
