/**
 * Short feedback sounds, synthesised with the Web Audio API (no audio files).
 * Played only on answer feedback (theory exercises) and on the results screen,
 * never while a microphone drill is listening. On by default; the learner can
 * switch them off in Settings (stored per device).
 */

export type SfxKind = 'correct' | 'wrong' | 'complete';

const KEY = 'muz-sfx';
let ctx: AudioContext | null = null;

export function isSfxEnabled(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSfxEnabled(on: boolean): void {
  try {
    window.localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    // Storage unavailable: the choice lasts for this page only.
  }
}

/** Notes (MIDI), start offsets (s) and lengths (s) for each sound. */
export const SFX: Readonly<Record<SfxKind, ReadonlyArray<{ midi: number; at: number; len: number }>>> = {
  correct: [
    { midi: 76, at: 0, len: 0.12 },
    { midi: 83, at: 0.08, len: 0.2 },
  ],
  wrong: [
    { midi: 55, at: 0, len: 0.14 },
    { midi: 52, at: 0.1, len: 0.22 },
  ],
  complete: [
    { midi: 72, at: 0, len: 0.16 },
    { midi: 76, at: 0.1, len: 0.16 },
    { midi: 79, at: 0.2, len: 0.16 },
    { midi: 84, at: 0.3, len: 0.45 },
  ],
};

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export function playSfx(kind: SfxKind): void {
  if (!isSfxEnabled() || typeof AudioContext === 'undefined') return;
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const t0 = ctx.currentTime + 0.01;
    for (const n of SFX[kind]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = kind === 'wrong' ? 'triangle' : 'sine';
      osc.frequency.value = hz(n.midi);
      const t = t0 + n.at;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(kind === 'wrong' ? 0.12 : 0.18, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + n.len);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + n.len + 0.05);
    }
  } catch {
    // Audio unavailable: feedback stays visual.
  }
}
