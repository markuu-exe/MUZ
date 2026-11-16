/**
 * T-08: ChromaFrameProcessor also reports a pitchy (McLeod) f0 + clarity per hop,
 * so single-note drills can be graded octave-exact (SRS 3.1.6.2). The pass/fail
 * rule (±35 cents, clarity ≥ 0.85) lives in PitchVerifier (T-07), not here.
 */
import { describe, expect, it } from 'vitest';
import { ChromaFrameProcessor } from '../dsp/ChromaFrameProcessor';
import { feed, renderPiano } from './fixtures';

interface PitchSample {
  time: number;
  voiced: boolean;
  pitchHz: number | null | undefined;
  clarity: number | undefined;
}

function analyse(audio: Float32Array, fs: number): PitchSample[] {
  const out: PitchSample[] = [];
  const proc = new ChromaFrameProcessor(fs, (f) =>
    out.push({ time: f.time, voiced: f.voiced, pitchHz: f.pitchHz, clarity: f.clarity }),
  );
  feed(proc, audio, fs);
  return out;
}

function cents(hz: number, ref: number): number {
  return 1200 * Math.log2(hz / ref);
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/** Frames well inside a note struck at t = 0.2 s (after the attack, before the tail). */
function sustain(frames: PitchSample[]): PitchSample[] {
  return frames.filter((f) => f.time > 0.35 && f.time < 0.9 && f.voiced);
}

describe('ChromaFrameProcessor pitch (T-08)', () => {
  it.each([
    [69, 440, 48000],
    [57, 220, 48000],
    [69, 440, 44100],
  ])('finds MIDI %i at %f Hz (fs %i) within 35 cents, with clarity ≥ 0.85', (midi, hz, fs) => {
    const audio = renderPiano([{ midi, at: 0.2 }], { sampleRate: fs, durationSec: 1.2 });
    const frames = sustain(analyse(audio, fs));
    expect(frames.length).toBeGreaterThan(10);
    const pitches = frames.map((f) => f.pitchHz).filter((p): p is number => typeof p === 'number');
    expect(pitches.length).toBe(frames.length);
    expect(Math.abs(cents(median(pitches), hz))).toBeLessThan(35);
    expect(median(frames.map((f) => f.clarity ?? 0))).toBeGreaterThanOrEqual(0.85);
  });

  it('tells A3 from A4, which pitch-class chroma cannot', () => {
    const fs = 48000;
    const a3 = median(sustain(analyse(renderPiano([{ midi: 57, at: 0.2 }], { sampleRate: fs, durationSec: 1.2 }), fs)).map((f) => f.pitchHz ?? 0));
    const a4 = median(sustain(analyse(renderPiano([{ midi: 69, at: 0.2 }], { sampleRate: fs, durationSec: 1.2 }), fs)).map((f) => f.pitchHz ?? 0));
    expect(Math.round(cents(a4, a3) / 100)).toBe(12);
  });

  it('reports no pitch and zero clarity for silence', () => {
    const fs = 48000;
    const frames = analyse(new Float32Array(fs), fs);
    expect(frames.length).toBeGreaterThan(0);
    for (const f of frames) {
      expect(f.pitchHz).toBeNull();
      expect(f.clarity).toBe(0);
    }
  });
});

describe('AudioInputService frame (T-08)', () => {
  it('passes the worklet pitch fields through to the AcousticFrame', async () => {
    const { AudioInputService } = await import('../input/AudioInputService');
    const svc = new AudioInputService();
    const frames: Array<{ pitchHz?: number | null; clarity?: number }> = [];
    svc.on('frame', (f) => frames.push(f));
    const base = { type: 'frame', time: 1, chroma: new Float32Array(12), rmsDb: -20, noiseDb: -60, voiced: true, ringing: false, flux: 0, onset: false, onsetTime: 0 };
    // onWorkletMessage is the worklet port's handler; call it directly (no AudioContext in Node).
    const deliver = (msg: object) => (svc as unknown as { onWorkletMessage(m: object): void }).onWorkletMessage(msg);
    deliver({ ...base, pitchHz: 440.5, clarity: 0.97 });
    deliver({ ...base, voiced: false, pitchHz: null, clarity: 0 });
    expect(frames.map((f) => [f.pitchHz, f.clarity])).toEqual([
      [440.5, 0.97],
      [null, 0],
    ]);
  });
});
