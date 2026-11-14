import { midiToFrequency } from "./notes";

let ctx: AudioContext | null = null;

export function playNote(midi: number, duration: number = 0.8): void {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = midiToFrequency(midi);

  const t = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.4, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}
