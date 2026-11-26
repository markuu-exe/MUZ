/**
 * Plain-language reasons a chord attempt did not count, from the matcher's own
 * numbers (ChordMatch) and the verifier's pass ratio. Shown to the learner after
 * a miss and, with ?debug, after every attempt. Pure, so it is unit-tested; it
 * never changes grading.
 */
import { DEFAULT_MATCHER_CONFIG, DEFAULT_VERIFIER_CONFIG, type MatcherConfig } from '../audio/config';
import type { ChordMatch } from '../audio/chords/ChordMatcher';
import { PITCH_CLASS_NAMES } from '../audio/dsp/pitch';

export interface ChordCheck {
  detail: ChordMatch | null;
  /** Share of judged frames in the 200 ms window that passed the matcher. */
  passRatio: number;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

/**
 * One line per failed check, most useful first. `targetPcs` are the chord's pitch
 * classes in the order the matcher uses (root first), so `weakestTone` can be named.
 */
export function chordCheckReasons(
  check: ChordCheck,
  targetPcs: readonly number[],
  matcher: MatcherConfig = DEFAULT_MATCHER_CONFIG,
  minPassRatio = DEFAULT_VERIFIER_CONFIG.minPassRatio,
): string[] {
  const d = check.detail;
  if (!d) return ['No clear chord was heard. Play all the notes together and let them ring.'];
  const out: string[] = [];
  if (d.toneCoverage < matcher.minToneCoverage) {
    const name = PITCH_CLASS_NAMES[targetPcs[d.weakestTone] ?? targetPcs[0]] ?? 'one note';
    out.push(`${name} was too quiet (${pct(d.toneCoverage)} of the loudest note, needs ${pct(matcher.minToneCoverage)}).`);
  }
  if (d.extraTone > matcher.maxExtraTone) {
    out.push(`An extra note was ringing (${pct(d.extraTone)}, allowed ${pct(matcher.maxExtraTone)}). Lift other keys and the pedal.`);
  }
  if (d.similarity < matcher.minSimilarity) {
    out.push(`Overall match ${d.similarity.toFixed(2)}, needs ${matcher.minSimilarity.toFixed(2)}.`);
  }
  if (d.fullChordMargin < matcher.minFullChordMargin) {
    out.push(`It sounded closer to ${d.closest.label}.`);
  }
  if (d.partialMargin < matcher.minPartialMargin) {
    out.push('Only part of the chord came through.');
  }
  if (check.passRatio < minPassRatio) {
    out.push(`The chord held for ${pct(check.passRatio)} of the check window (needs ${pct(minPassRatio)}). Hold it a moment longer.`);
  }
  return out;
}
