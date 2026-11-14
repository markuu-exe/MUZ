export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function midiToName(midi: number): string {
  return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
}

export function isBlackKey(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(midi % 12);
}

const PITCH_CLASS_TO_STEP = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];

export function staffPosition(midi: number): { diatonic: number; sharp: boolean } {
  const octave = Math.floor(midi / 12) - 1;
  return {
    diatonic: octave * 7 + PITCH_CLASS_TO_STEP[midi % 12],
    sharp: isBlackKey(midi),
  };
}

export function ledgerLines(diatonic: number): number[] {
  const lines: number[] = [];
  if (diatonic >= 40) {
    for (let l = 40; l <= diatonic; l += 2) lines.push(l);
  } else if (diatonic === 28) {
    lines.push(28); // middle C
  } else if (diatonic <= 16) {
    for (let l = 16; l >= diatonic; l -= 2) lines.push(l);
  }
  return lines;
}
