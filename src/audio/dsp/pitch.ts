/** Pitch-class helpers shared by the chroma extractor and the chord vocabulary. */

export const PITCH_CLASS_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/** Fractional MIDI note number for a frequency (A4 = 440 Hz = 69). */
export function freqToMidi(freqHz: number): number {
  return 69 + 12 * Math.log2(freqHz / 440);
}

export function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Non-negative modulo 12. */
export function pc(n: number): number {
  return ((n % 12) + 12) % 12;
}
