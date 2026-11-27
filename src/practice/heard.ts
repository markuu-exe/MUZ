/**
 * Live "what the microphone hears" feedback for practice drills. Display only:
 * grading still happens in PitchVerifier / ChordVerifier, but this module uses the
 * SAME per-frame analysis they use, so the display cannot silently disagree:
 *
 * - Notes: the pitch is shown only above the grading clarity floor (0.85), and it
 *   only counts as "matching" within the grading tolerance (±35 cents, SRS 3.1.6.2).
 * - Chords: pitch classes are read from the harmonic-compensated chroma that
 *   ChordMatcher grades (compensateHarmonics), with the matcher's own tone-coverage
 *   floor; "matching" is the matcher's own per-frame decision (all SRS 3.1.6.4 rules).
 *
 * What still differs, by design: grading needs the match to hold for ≥ 80 % of the
 * 200 ms window after an onset (ChordVerifier), and the latch needs posture; the
 * display shows one moment. The uncompensated pitch classes are kept as `rawPitchClasses`
 * for the ?debug view.
 */
import { compensateHarmonics, type ChordMatcher } from '../audio/chords/ChordMatcher';
import { DEFAULT_MATCHER_CONFIG, DEFAULT_PITCH_CONFIG } from '../audio/config';
import { PITCH_CLASS_NAMES, centsOff, freqToMidi, midiToNoteName } from '../audio/dsp/pitch';

export interface HeardFrameLike {
  voiced: boolean;
  pitchHz?: number | null;
  clarity?: number;
  chroma: ArrayLike<number>;
  ringing?: boolean;
}

export interface Heard {
  /** Single pitch the pitch tracker is confident about, as MIDI, or null. */
  midi: number | null;
  /** Pitch classes (0 = C … 11 = B) sounding after overtone compensation, strongest first; at most 6. */
  pitchClasses: number[];
  /** Strongest pitch classes of the uncompensated chroma (debug only), strongest first; at most 6. */
  rawPitchClasses: number[];
}

export const NOTHING_HEARD: Heard = Object.freeze({ midi: null, pitchClasses: [], rawPitchClasses: [] }) as Heard;

/** Share of the strongest RAW chroma bin a pitch class needs to be listed in `rawPitchClasses`. */
export const CHROMA_SHARE = 0.55;
const MAX_LISTED = 6;

function ranked(values: ArrayLike<number>, floor: number): number[] {
  return Array.from({ length: 12 }, (_, i) => i)
    .filter((i) => (values[i] ?? 0) > 0 && (values[i] ?? 0) >= floor)
    .sort((a, b) => (values[b] ?? 0) - (values[a] ?? 0))
    .slice(0, MAX_LISTED);
}

/** MIDI note of a confident pitch (clarity at or above the grading floor), else null. */
function confidentMidi(frame: HeardFrameLike, minClarity: number): number | null {
  return frame.pitchHz != null && frame.pitchHz > 0 && (frame.clarity ?? 0) >= minClarity ? Math.round(freqToMidi(frame.pitchHz)) : null;
}

export function heardFromFrame(
  frame: HeardFrameLike,
  minClarity = DEFAULT_PITCH_CONFIG.minClarity,
  matcher: { harmonicDecay: number; minToneCoverage: number } = DEFAULT_MATCHER_CONFIG,
): Heard {
  if (!frame.voiced) return NOTHING_HEARD;
  let rawMax = 0;
  for (let i = 0; i < 12; i++) rawMax = Math.max(rawMax, frame.chroma[i] ?? 0);
  if (rawMax <= 0) return { midi: confidentMidi(frame, minClarity), pitchClasses: [], rawPitchClasses: [] };
  const comp = new Float64Array(12);
  const compMax = compensateHarmonics(frame.chroma, matcher.harmonicDecay, comp);
  return {
    midi: confidentMidi(frame, minClarity),
    pitchClasses: compMax > 0 ? ranked(comp, compMax * matcher.minToneCoverage) : [],
    rawPitchClasses: ranked(frame.chroma, rawMax * CHROMA_SHARE),
  };
}

export type HeardTarget = { kind: 'note'; note: number } | { kind: 'chord'; chord: string };

/**
 * Whether this frame, on its own, passes the grader's per-frame test for the target.
 * Notes: confident pitch within ±centsTolerance of the exact note (octave included).
 * Chords: ChordMatcher.match(...).passes on the same chroma the verifier sees.
 */
export function frameMatchesTarget(
  frame: HeardFrameLike,
  target: HeardTarget,
  chordMatcher: Pick<ChordMatcher, 'match'>,
  pitch = DEFAULT_PITCH_CONFIG,
): boolean {
  if (!frame.voiced) return false;
  if (target.kind === 'note') {
    const hz = frame.pitchHz;
    if (hz == null || !(hz > 0) || (frame.clarity ?? 0) < pitch.minClarity) return false;
    return Math.abs(centsOff(hz, target.note)) <= pitch.centsTolerance;
  }
  return chordMatcher.match(frame.chroma, target.chord, frame.ringing ?? false).passes;
}

/** Text for the drill card, e.g. "A3" for a note target or "C · E · G" for a chord target. */
export function heardLabel(heard: Heard, chordTarget: boolean): string | null {
  if (chordTarget) return heard.pitchClasses.length ? heard.pitchClasses.map((p) => PITCH_CLASS_NAMES[p]).join(' · ') : null;
  return heard.midi !== null ? midiToNoteName(heard.midi) : null;
}

/** Keys to light as "heard" on a keyboard drawn from `start` to `end`. */
export function heardKeys(heard: Heard, chordTarget: boolean, start: number, end: number): number[] {
  if (!chordTarget) return heard.midi !== null && heard.midi >= start && heard.midi <= end ? [heard.midi] : [];
  const keys: number[] = [];
  for (let m = start; m <= end; m++) if (heard.pitchClasses.includes(((m % 12) + 12) % 12)) keys.push(m);
  return keys;
}
