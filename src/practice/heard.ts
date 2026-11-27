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
import { DEFAULT_MATCHER_CONFIG, DEFAULT_PITCH_CONFIG, DEFAULT_VERIFIER_CONFIG, type MatcherConfig } from '../audio/config';
import { PITCH_CLASS_NAMES, freqToMidi, midiToNoteName } from '../audio/dsp/pitch';
import { tunedCentsOff } from '../audio/tuning';

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

/**
 * Pitch classes to list for a chord target, read like the grader reads them: a chord tone
 * counts when it reaches the matcher's coverage floor (minToneCoverage, 25 %), but a note
 * that is NOT in the chord is only listed when it is loud enough for the grader to reject
 * the chord for it (maxExtraTone, 35 %; 50 % while a previous sound is still ringing).
 * Without a target, every pitch class must clear the extra-tone bar.
 * Listing every class above 25 % showed overtones and room noise as notes you never played.
 */
export function heardFromFrame(
  frame: HeardFrameLike,
  minClarity = DEFAULT_PITCH_CONFIG.minClarity,
  matcher: Pick<MatcherConfig, 'harmonicDecay' | 'minToneCoverage' | 'maxExtraTone' | 'maxExtraToneRinging'> = DEFAULT_MATCHER_CONFIG,
  targetPcs: readonly number[] = [],
): Heard {
  if (!frame.voiced) return NOTHING_HEARD;
  let rawMax = 0;
  for (let i = 0; i < 12; i++) rawMax = Math.max(rawMax, frame.chroma[i] ?? 0);
  if (rawMax <= 0) return { midi: confidentMidi(frame, minClarity), pitchClasses: [], rawPitchClasses: [] };
  const comp = new Float64Array(12);
  const compMax = compensateHarmonics(frame.chroma, matcher.harmonicDecay, comp);
  const extraBar = frame.ringing ? matcher.maxExtraToneRinging : matcher.maxExtraTone;
  const listed =
    compMax > 0
      ? Array.from({ length: 12 }, (_, i) => i)
          .filter((i) => comp[i] > 0 && (targetPcs.includes(i) ? comp[i] >= compMax * matcher.minToneCoverage : comp[i] > compMax * extraBar))
          .sort((a, b) => comp[b] - comp[a])
          .slice(0, MAX_LISTED)
      : [];
  return {
    midi: confidentMidi(frame, minClarity),
    pitchClasses: listed,
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
    return Math.abs(tunedCentsOff(hz, target.note)) <= pitch.centsTolerance;
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

interface WindowFrame {
  tMs: number;
  voiced: boolean;
  chroma: Float64Array;
  ringing: boolean;
  midi: number | null;
  passes: boolean;
}

/**
 * The Hearing display's short memory: like ChordVerifier, it looks at a window of frames
 * (150 ms, about 14 analysis hops) instead of one ~10 ms frame.
 * - Listed notes come from the window's average chroma, so a note must sound for a while
 *   to appear (single-frame noise and attack transients no longer flash up as notes).
 * - "Matches" (green) needs the grader's per-frame test to pass on at least minPassRatio
 *   (80 %) of the voiced frames, the same ratio the grader requires over its 200 ms window.
 * - A single note shows the most frequent confident pitch in the window.
 */
export class HearingWindow {
  private frames: WindowFrame[] = [];

  constructor(
    private readonly windowMs = 150,
    private readonly minPassRatio = DEFAULT_VERIFIER_CONFIG.minPassRatio,
    private readonly minFrames = 3,
  ) {}

  push(frame: HeardFrameLike & { tMs: number }, target: HeardTarget, chordMatcher: Pick<ChordMatcher, 'match'>): void {
    const chroma = new Float64Array(12);
    for (let i = 0; i < 12; i++) chroma[i] = frame.chroma[i] ?? 0;
    this.frames.push({
      tMs: frame.tMs,
      voiced: frame.voiced,
      chroma,
      ringing: frame.ringing ?? false,
      midi: confidentMidi(frame, DEFAULT_PITCH_CONFIG.minClarity),
      passes: frameMatchesTarget(frame, target, chordMatcher),
    });
    const cutoff = frame.tMs - this.windowMs;
    while (this.frames.length > 0 && this.frames[0].tMs < cutoff) this.frames.shift();
  }

  clear(): void {
    this.frames = [];
  }

  read(targetPcs: readonly number[] = []): { heard: Heard; matches: boolean } {
    const voiced = this.frames.filter((f) => f.voiced);
    // Mostly silence in the window: nothing is being played right now.
    if (voiced.length < this.minFrames || voiced.length * 2 < this.frames.length) return { heard: NOTHING_HEARD, matches: false };
    const avg = new Float64Array(12);
    for (const f of voiced) for (let i = 0; i < 12; i++) avg[i] += f.chroma[i] / voiced.length;
    const counts = new Map<number, number>();
    for (const f of voiced) if (f.midi !== null) counts.set(f.midi, (counts.get(f.midi) ?? 0) + 1);
    let midi: number | null = null;
    let best = 0;
    for (const [m, n] of counts) if (n > best) [midi, best] = [m, n];
    // A pitch heard on only a few frames is not shown.
    if (best * 2 < voiced.length) midi = null;
    const heard = heardFromFrame({ voiced: true, chroma: avg, ringing: voiced[voiced.length - 1].ringing }, undefined, undefined, targetPcs);
    const passes = voiced.filter((f) => f.passes).length;
    return { heard: { ...heard, midi }, matches: passes / voiced.length >= this.minPassRatio };
  }
}
