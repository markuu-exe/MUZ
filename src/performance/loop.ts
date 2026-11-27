/**
 * "Loop the bars you missed" (owner-approved 2026-11-28): after a run, replay only the bars
 * where notes were missed (In time) or needed retries (Wait for me), pass after pass.
 * A slice is an ordinary Song, so the plan, judge, highway and falling notes work unchanged.
 */
import { songLengthBeats, type Song } from './songs';

/** Longest loop offered, in bars: long enough for a phrase, short enough to drill. */
export const MAX_LOOP_BARS = 4;

/** Bars (0-based) in which the given events start, ascending and unique. */
export function barsOf(song: Song, eventIndices: readonly number[]): number[] {
  const bars = new Set<number>();
  for (const i of eventIndices) {
    const e = song.events[i];
    if (e) bars.add(Math.floor(e.beat / song.beatsPerMeasure + 1e-9));
  }
  return [...bars].sort((a, b) => a - b);
}

/** The first run of missed bars, up to `maxBars` long (gaps inside it are kept). */
export function loopRange(bars: readonly number[], maxBars = MAX_LOOP_BARS): { from: number; to: number } | null {
  if (bars.length === 0) return null;
  const from = bars[0];
  const to = Math.max(...bars.filter((b) => b < from + maxBars));
  return { from, to };
}

/** Bars `from`…`to` (inclusive) as a song starting at beat 0. Notes held past the end are cut there. */
export function sliceSong(song: Song, from: number, to: number): Song {
  const start = from * song.beatsPerMeasure;
  const end = Math.min((to + 1) * song.beatsPerMeasure, songLengthBeats(song));
  const events = song.events
    .filter((e) => e.beat >= start - 1e-9 && e.beat < end - 1e-9)
    .map((e) => ({ ...e, beat: e.beat - start, length: Math.min(e.length, end - e.beat) }));
  return { ...song, id: `${song.id}@${from}-${to}`, events };
}
