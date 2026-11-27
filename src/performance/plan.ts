/**
 * A song as a timeline with the same shape as a rhythm lesson's plan (src/lib/rhythm/plan.ts),
 * so the beat highway, the count-in cue (rhythmCue) and CountInBadge work unchanged.
 * Count-in follows the meter exactly like rhythm lessons: at least 4 clicks, rounded up to
 * whole bars (4/4 counts 4, 3/4 counts 6).
 */
import type { RhythmClick, RhythmPlan } from '../lib/rhythm/plan';
import { songLengthBeats, targetLabel, type Song } from './songs';

export const COUNT_IN_MIN_BEATS = 4;

export interface SongPlan extends RhythmPlan {
  /** Text drawn on each target in the highway (note or chord name). */
  labels: string[];
}

export function songPlan(song: Song, bpm: number = song.bpm): SongPlan {
  const tempo = Math.max(30, Math.min(240, bpm));
  const beatSec = 60 / tempo;
  const perMeasure = song.beatsPerMeasure;
  const countInClicks = Math.ceil(COUNT_IN_MIN_BEATS / perMeasure) * perMeasure;
  const countInSec = countInClicks * beatSec;
  const totalBeats = Math.ceil(songLengthBeats(song));
  const r = (t: number) => Math.round(t * 1e6) / 1e6;

  const clicks: RhythmClick[] = [];
  for (let i = 0; i < countInClicks + totalBeats; i++) {
    const inCount = i < countInClicks;
    const inMeasure = (inCount ? i : i - countInClicks) % perMeasure;
    clicks.push({ time: r(i * beatSec), accent: inMeasure === 0, countIn: inCount });
  }
  const endSec = r(countInSec + totalBeats * beatSec);
  return {
    mode: 'tap-along',
    bpm: tempo,
    beatSec,
    beatsPerMeasure: perMeasure,
    clicks,
    tones: [],
    targets: song.events.map((e) => r(countInSec + e.beat * beatSec)),
    segments: [
      { kind: 'count-in', start: 0, end: r(countInSec) },
      { kind: 'play', start: r(countInSec), end: endSec },
    ],
    endSec,
    labels: song.events.map((e) => targetLabel(e.target)),
  };
}
