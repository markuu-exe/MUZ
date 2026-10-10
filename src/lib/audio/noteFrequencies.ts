export const noteFrequencies: Record<string, number> = {
  C2: 65.41,
  Db2: 69.3,
  D2: 73.42,
  Eb2: 77.78,
  E2: 82.41,
  F2: 87.31,
  Gb2: 92.5,
  G2: 98,
  Ab2: 103.83,
  A2: 110,
  Bb2: 116.54,
  B2: 123.47,
};

export function midiToFrequency(midiNumber: number) {
  return 440 * 2 ** ((midiNumber - 69) / 12);
}

export function isWithinThirtyFiveCents(targetFrequency: number, observedFrequency: number) {
  const cents = 1200 * Math.log2(observedFrequency / targetFrequency);
  return Math.abs(cents) <= 35;
}
