/**
 * Live "what the microphone hears" feedback for practice drills. Display only:
 * grading still happens in PitchVerifier / ChordVerifier. Uses the same
 * clarity floor as single-note grading (SRS 3.1.6.2) so the display never
 * claims a note the verifier would reject for low confidence.
 */
import { DEFAULT_PITCH_CONFIG } from '../audio/config';
import { PITCH_CLASS_NAMES, freqToMidi, midiToNoteName } from '../audio/dsp/pitch';

export interface HeardFrameLike {
  voiced: boolean;
  pitchHz?: number | null;
  clarity?: number;
  chroma: ArrayLike<number>;
}

export interface Heard {
  /** Single pitch the pitch tracker is confident about, as MIDI, or null. */
  midi: number | null;
  /** Strongest pitch classes (0 = C … 11 = B), strongest first; at most 4. */
  pitchClasses: number[];
}

export const NOTHING_HEARD: Heard = Object.freeze({ midi: null, pitchClasses: [] }) as Heard;

/** Share of the strongest chroma bin a pitch class needs to count as heard. */
export const CHROMA_SHARE = 0.55;

export function heardFromFrame(frame: HeardFrameLike, minClarity = DEFAULT_PITCH_CONFIG.minClarity): Heard {
  if (!frame.voiced) return NOTHING_HEARD;
  const midi =
    frame.pitchHz != null && frame.pitchHz > 0 && (frame.clarity ?? 0) >= minClarity ? Math.round(freqToMidi(frame.pitchHz)) : null;
  let max = 0;
  for (let i = 0; i < 12; i++) max = Math.max(max, frame.chroma[i] ?? 0);
  const pitchClasses: number[] = [];
  if (max > 0) {
    const ranked = Array.from({ length: 12 }, (_, i) => i)
      .filter((i) => (frame.chroma[i] ?? 0) >= max * CHROMA_SHARE)
      .sort((a, b) => (frame.chroma[b] ?? 0) - (frame.chroma[a] ?? 0));
    pitchClasses.push(...ranked.slice(0, 4));
  }
  return { midi, pitchClasses };
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
