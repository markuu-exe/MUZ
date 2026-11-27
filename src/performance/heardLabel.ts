/**
 * "You played X" for a wrong In-time attempt (owner-approved 2026-11-28). Mirrors how the
 * lesson verifiers name a wrong attempt, so the two modes say the same thing:
 * - Note target: the most frequent confident pitch (clarity at or above the grading floor)
 *   within PLAUSIBLE_SEMITONES of the target, like PitchVerifier's "That sounded like".
 *   Further off it is almost always a subharmonic of overlapping notes, so nothing is named.
 * - Chord target: ChordMatcher's closest competing chord for the strike's average chroma.
 */
import { DEFAULT_PITCH_CONFIG } from '../audio/config';
import { midiToNoteName } from '../audio/dsp/pitch';
import { nearestTunedMidi, tunedCentsOff } from '../audio/tuning';
import { chordMatcher } from '../practice/PracticeDrill';
import type { HeardFrameLike } from '../practice/heard';
import type { SongTarget } from './songs';

const PLAUSIBLE_SEMITONES = 14;

export function describeHeard(frames: readonly HeardFrameLike[], target: SongTarget): string | null {
  const voiced = frames.filter((f) => f.voiced);
  if (voiced.length === 0) return null;
  if (target.kind === 'note') {
    const counts = new Map<number, number>();
    for (const f of voiced) {
      if (f.pitchHz == null || !(f.pitchHz > 0) || (f.clarity ?? 0) < DEFAULT_PITCH_CONFIG.minClarity) continue;
      const midi = nearestTunedMidi(f.pitchHz);
      if (Math.abs(midi - target.note) > PLAUSIBLE_SEMITONES) continue;
      // The grader's tolerance: 40 cents off F4 is not "F4".
      if (Math.abs(tunedCentsOff(f.pitchHz, midi)) > DEFAULT_PITCH_CONFIG.centsTolerance) continue;
      counts.set(midi, (counts.get(midi) ?? 0) + 1);
    }
    let best = -1;
    let bestCount = 0;
    for (const [midi, n] of counts) if (n > bestCount) [best, bestCount] = [midi, n];
    // The target itself was clearest but the attempt failed (other notes with it): not "played F4".
    return best >= 0 && best !== target.note ? midiToNoteName(best) : null;
  }
  const avg = new Float64Array(12);
  for (const f of voiced) for (let i = 0; i < 12; i++) avg[i] += (f.chroma[i] ?? 0) / voiced.length;
  const label = chordMatcher.match(avg, target.chord, voiced[voiced.length - 1].ringing ?? false).closest.label;
  return label || null;
}
