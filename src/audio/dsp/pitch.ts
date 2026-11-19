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

/** Distance in cents from `hz` to the exact pitch of MIDI note `midi` (positive = sharp). */
export function centsOff(hz: number, midi: number): number {
  return 1200 * Math.log2(hz / midiToFreq(midi));
}

/** Scientific pitch name: 60 → "C4", 61 → "C#4", 57 → "A3". */
export function midiToNoteName(midi: number): string {
  return PITCH_CLASS_NAMES[pc(midi)] + (Math.floor(midi / 12) - 1);
}
