/**
 * Deterministic synthetic piano for tests. Not a piano model for listening —
 * it reproduces the properties that break chroma matching:
 *  - register-dependent harmonic richness (bass rich, treble nearly pure),
 *  - weak fundamental below C3,
 *  - inharmonicity (stretched partials),
 *  - ±4 dB random per-partial level (soundboard / room), ±3 dB per-key velocity,
 *  - exponential decay, optional laptop-mic 150 Hz high-pass, white noise at a set SNR.
 */
import { midiToFreq } from '../dsp/pitch';

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export interface NoteEvent {
  midi: number;
  /** Start time in seconds. */
  at: number;
  /** Level offset in dB (velocity). */
  gainDb?: number;
}

export interface RenderOptions {
  sampleRate: number;
  durationSec: number;
  seed?: number;
  /** Signal-to-noise ratio in dB relative to the loudest note's RMS. Default 30. */
  snrDb?: number;
  /** Apply a 2nd-order 150 Hz high-pass (laptop microphone). Default true. */
  laptopMic?: boolean;
  /** Overall peak level in dBFS. Default −12. */
  levelDb?: number;
  /** Amplitude decay time constant in seconds. Default 1.5. */
  decaySec?: number;
}

export function renderPiano(notes: NoteEvent[], opts: RenderOptions): Float32Array {
  const fs = opts.sampleRate;
  const rand = mulberry32(opts.seed ?? 1);
  const len = Math.round(opts.durationSec * fs);
  const out = new Float64Array(len);
  const decay = opts.decaySec ?? 1.5;

  for (const n of notes) {
    const f0 = midiToFreq(n.midi);
    const B = 0.00008 * 2 ** ((n.midi - 48) / 12);
    const k = 0.25 + (0.5 * Math.max(0, n.midi - 48)) / 36;
    const vel = 10 ** (((n.gainDb ?? 0) + gaussian(rand) * 3) / 20);
    const start = Math.round(n.at * fs);
    for (let h = 1; h <= 15; h++) {
      const fh = h * f0 * Math.sqrt(1 + B * h * h);
      if (fh > fs / 2 - 1000) break;
      let a = Math.exp(-(h - 1) * k);
      if (n.midi < 48 && h === 1) a *= 0.35;
      a *= 10 ** ((gaussian(rand) * 4) / 20);
      const phase = rand() * 2 * Math.PI;
      const w = (2 * Math.PI * fh) / fs;
      const hd = decay / (1 + 0.15 * (h - 1)); // upper partials die faster
      for (let i = start; i < len; i++) {
        const t = (i - start) / fs;
        // 3 ms attack ramp avoids an unrealistic click.
        const env = Math.min(1, t / 0.003) * Math.exp(-t / hd);
        out[i] += vel * a * env * Math.sin(w * (i - start) + phase);
      }
    }
  }

  let peak = 0;
  let sig = 0;
  for (let i = 0; i < len; i++) {
    peak = Math.max(peak, Math.abs(out[i]));
    sig += out[i] * out[i];
  }
  const level = 10 ** ((opts.levelDb ?? -12) / 20);
  const g = peak > 0 ? level / peak : 1;
  const sigRms = peak > 0 ? Math.sqrt(sig / len) * g : 10 ** (-50 / 20);
  const noiseRms = sigRms / 10 ** ((opts.snrDb ?? 30) / 20);

  const res = new Float32Array(len);
  for (let i = 0; i < len; i++) res[i] = out[i] * g + noiseRms * gaussian(rand);
  if (opts.laptopMic ?? true) highpassInPlace(res, fs, 150);
  return res;
}

/** RBJ biquad high-pass, Q = 0.707, applied in place. */
export function highpassInPlace(x: Float32Array, fs: number, fc: number): void {
  const w0 = (2 * Math.PI * fc) / fs;
  const alpha = Math.sin(w0) / (2 * Math.SQRT1_2);
  const cosw = Math.cos(w0);
  const a0 = 1 + alpha;
  const b0 = (1 + cosw) / 2 / a0;
  const b1 = -(1 + cosw) / a0;
  const b2 = b0;
  const a1 = (-2 * cosw) / a0;
  const a2 = (1 - alpha) / a0;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xi = x[i];
    const yi = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = xi;
    y2 = y1;
    y1 = yi;
    x[i] = yi;
  }
}

/** Notes of a chord voicing. `inversion` 0/1/2; `open` spreads root down an octave. */
export function voicing(pcs: readonly number[], octave: number, inversion: 0 | 1 | 2 | 'open'): number[] {
  const root = 12 * (octave + 1) + pcs[0];
  const tones = pcs.map((p) => root + ((p - pcs[0] + 12) % 12));
  if (inversion === 'open') return [tones[0] - 12, tones[2], tones[1] + 12];
  const v = tones.slice();
  for (let i = 0; i < inversion; i++) v.push(v.shift()! + 12);
  return v;
}

/** Feed audio through a processor in 128-sample render quanta, like the worklet does. */
export function feed(
  proc: { process(block: Float32Array, t: number): void },
  audio: Float32Array,
  sampleRate: number,
  startTime = 0,
): void {
  for (let i = 0; i < audio.length; i += 128) {
    proc.process(audio.subarray(i, Math.min(i + 128, audio.length)), startTime + i / sampleRate);
  }
}
