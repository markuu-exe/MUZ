import { describe, expect, it } from 'vitest';
import { ChromaFrameProcessor, median, type ChromaFrame } from '../dsp/ChromaFrameProcessor';
import { FFT, hannWindow } from '../dsp/fft';
import { PITCH_CLASS_NAMES } from '../dsp/pitch';
import { feed, mulberry32, renderPiano } from './fixtures';

function argmax(a: ArrayLike<number>): number {
  let best = 0;
  for (let i = 1; i < a.length; i++) if (a[i] > a[best]) best = i;
  return best;
}

function collect(audio: Float32Array, fs: number): ChromaFrame[] {
  const frames: ChromaFrame[] = [];
  const proc = new ChromaFrameProcessor(fs, (f) => frames.push({ ...f, chroma: f.chroma.slice() }));
  feed(proc, audio, fs);
  return frames;
}

describe('FFT (KAN-265)', () => {
  it('matches a naive DFT', () => {
    const n = 64;
    const rand = mulberry32(3);
    const x = Array.from({ length: n }, () => rand() - 0.5);
    const re = Float64Array.from(x);
    const im = new Float64Array(n);
    new FFT(n).transform(re, im);
    for (let k = 0; k < n; k++) {
      let sr = 0;
      let si = 0;
      for (let t = 0; t < n; t++) {
        sr += x[t] * Math.cos((2 * Math.PI * k * t) / n);
        si -= x[t] * Math.sin((2 * Math.PI * k * t) / n);
      }
      expect(re[k]).toBeCloseTo(sr, 9);
      expect(im[k]).toBeCloseTo(si, 9);
    }
  });

  it('rejects non power-of-two sizes', () => {
    expect(() => new FFT(1000)).toThrow();
  });

  it('periodic Hann starts at 0 and peaks at 1 in the middle', () => {
    const w = hannWindow(8);
    expect(w[0]).toBeCloseTo(0, 12);
    expect(w[4]).toBeCloseTo(1, 12);
  });
});

describe('median', () => {
  it('agrees with sort for odd and even lengths', () => {
    const rand = mulberry32(9);
    for (let trial = 0; trial < 200; trial++) {
      const len = 1 + Math.floor(rand() * 50);
      const vals = Array.from({ length: len }, () => Math.round(rand() * 20));
      const sorted = [...vals].sort((a, b) => a - b);
      const ref = len % 2 ? sorted[len >> 1] : 0.5 * (sorted[len / 2 - 1] + sorted[len / 2]);
      expect(median(Float64Array.from(vals), len)).toBe(ref);
    }
  });
});

describe('ChromaFrameProcessor (KAN-265)', () => {
  for (const fs of [44100, 48000]) {
    it(`puts a pure A4 in the A bin @ ${fs} Hz`, () => {
      const audio = new Float32Array(fs);
      for (let i = 0; i < audio.length; i++) audio[i] = 0.2 * Math.sin((2 * Math.PI * 440 * i) / fs);
      const frames = collect(audio, fs).filter((f) => f.voiced);
      expect(frames.length).toBeGreaterThan(50);
      for (const f of frames) expect(PITCH_CLASS_NAMES[argmax(f.chroma)]).toBe('A');
    });

    it(`C4-E4-G4 puts C, E, G in the top three bins @ ${fs} Hz`, () => {
      const audio = renderPiano(
        [60, 64, 67].map((midi) => ({ midi, at: 0.1 })),
        { sampleRate: fs, durationSec: 0.8, seed: 5 },
      );
      const f = collect(audio, fs).filter((x) => x.voiced && x.time > 0.3)[0];
      const top = Array.from(f.chroma)
        .map((v, i) => [v, i] as const)
        .sort((a, b) => b[0] - a[0])
        .slice(0, 3)
        .map(([, i]) => PITCH_CLASS_NAMES[i])
        .sort();
      expect(top).toEqual(['C', 'E', 'G']);
    });
  }

  it('returns unvoiced all-zero chroma for silence and low noise', () => {
    const fs = 48000;
    const rand = mulberry32(1);
    const audio = new Float32Array(fs).map(() => (rand() - 0.5) * 1e-4); // ≈ −80 dBFS
    const frames = collect(audio, fs);
    expect(frames.every((f) => !f.voiced && f.chroma.every((v) => v === 0))).toBe(true);
    expect(frames.some((f) => f.onset)).toBe(false);
  });

  it('chroma is L2-normalised when voiced', () => {
    const fs = 48000;
    const audio = renderPiano([{ midi: 57, at: 0 }, { midi: 60, at: 0 }, { midi: 64, at: 0 }], {
      sampleRate: fs,
      durationSec: 0.5,
    });
    for (const f of collect(audio, fs).filter((x) => x.voiced)) {
      expect(Math.hypot(...f.chroma)).toBeCloseTo(1, 5);
    }
  });

  it('detects a single onset per strike, within 25 ms of the true time', () => {
    const fs = 48000;
    const strikes = [0.5, 1.4, 2.1];
    const audio = renderPiano(
      strikes.flatMap((at) => [60, 64, 67].map((midi) => ({ midi, at }))),
      { sampleRate: fs, durationSec: 2.8, seed: 11, decaySec: 0.8 },
    );
    const onsets = collect(audio, fs).filter((f) => f.onset).map((f) => f.onsetTime);
    expect(onsets).toHaveLength(strikes.length);
    onsets.forEach((t, i) => expect(Math.abs(t - strikes[i])).toBeLessThan(0.025));
  });

  it('emits one frame per hop (512 samples)', () => {
    const fs = 48000;
    const frames = collect(new Float32Array(fs), fs);
    // First frame needs a full 4096 window, then one per 512 samples.
    expect(frames.length).toBe(Math.floor((fs - 4096) / 512) + 1);
  });

  it('stays well inside the real-time budget', () => {
    const fs = 48000;
    const audio = renderPiano([60, 64, 67].map((midi) => ({ midi, at: 0 })), {
      sampleRate: fs,
      durationSec: 3,
    });
    const proc = new ChromaFrameProcessor(fs, () => {});
    feed(proc, audio.subarray(0, fs), fs); // warm-up / JIT
    const t0 = performance.now();
    feed(proc, audio, fs, 1);
    const ms = performance.now() - t0;
    const hops = audio.length / 512;
    const perHop = ms / hops;
    // Budget per hop is 10.7 ms of audio; demand < 1 ms (< 10 % of one core).
    expect(perHop).toBeLessThan(1);
    console.log(`    chroma+onset cost: ${(perHop * 1000).toFixed(0)} µs per hop (${((perHop / 10.67) * 100).toFixed(1)} % of real time)`);
  });
});
