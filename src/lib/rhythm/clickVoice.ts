/**
 * Metronome voices. The count-in uses a bright woodblock-like tick, clearly
 * different from the soft beat click heard while the learner taps, so it is
 * obvious when to start (owner request 2026-11-27).
 */
export interface ClickVoice {
  type: OscillatorType;
  freq: number;
  gain: number;
  decaySec: number;
}

export function clickVoice(accent: boolean, countIn: boolean): ClickVoice {
  if (countIn) return { type: 'square', freq: accent ? 2093 : 1568, gain: accent ? 0.22 : 0.16, decaySec: 0.035 };
  return { type: 'sine', freq: accent ? 1000 : 800, gain: 0.3, decaySec: 0.05 };
}
