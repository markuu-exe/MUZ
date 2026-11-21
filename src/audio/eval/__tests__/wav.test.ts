/**
 * AI-2: WAV reading for the offline audio evaluation harness.
 * Files are built byte by byte here so the parser is not tested against itself.
 */
import { describe, expect, it } from 'vitest';
import { downmix, encodeWav, readWav } from '../wav';

const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));
const u16 = (n: number) => [n & 0xff, (n >> 8) & 0xff];
const u32 = (n: number) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];

function chunk(id: string, body: number[]): number[] {
  const pad = body.length & 1 ? [0] : [];
  return [...ascii(id), ...u32(body.length), ...body, ...pad];
}

function riff(chunks: number[][]): Uint8Array {
  const body = [...ascii('WAVE'), ...chunks.flat()];
  return new Uint8Array([...ascii('RIFF'), ...u32(body.length), ...body]);
}

function fmt(tag: number, channels: number, rate: number, bits: number): number[] {
  const block = channels * (bits / 8);
  return chunk('fmt ', [...u16(tag), ...u16(channels), ...u32(rate), ...u32(rate * block), ...u16(block), ...u16(bits)]);
}

function pcm16(values: number[]): number[] {
  return values.flatMap((v) => u16(v & 0xffff));
}

describe('readWav', () => {
  it('reads PCM 16-bit mono 48 kHz within 1/32768', () => {
    const want = [0, 0.5, -0.5, 0.999, -1, 0.25];
    const ints = want.map((v) => Math.max(-32768, Math.min(32767, Math.round(v * 32768))));
    const wav = readWav(riff([fmt(1, 1, 48000, 16), chunk('data', pcm16(ints))]));
    expect(wav.sampleRate).toBe(48000);
    expect(wav.channels).toHaveLength(1);
    expect(wav.channels[0]).toHaveLength(want.length);
    want.forEach((v, i) => expect(Math.abs(wav.channels[0][i] - v)).toBeLessThanOrEqual(1 / 32768));
    expect(wav.channels[0][4]).toBe(-1);
  });

  it('reads float 32-bit stereo into two channels', () => {
    const frames = [
      [0.1, -0.2],
      [0.3, 0.4],
      [-1, 1],
    ];
    const bytes = new Uint8Array(frames.length * 8);
    const dv = new DataView(bytes.buffer);
    frames.flat().forEach((v, i) => dv.setFloat32(i * 4, v, true));
    const wav = readWav(riff([fmt(3, 2, 44100, 32), chunk('data', Array.from(bytes))]));
    expect(wav.sampleRate).toBe(44100);
    expect(wav.channels).toHaveLength(2);
    expect(Array.from(wav.channels[0])).toEqual(frames.map((f) => Math.fround(f[0])));
    expect(Array.from(wav.channels[1])).toEqual(frames.map((f) => Math.fround(f[1])));
  });

  it('reads PCM 24-bit, including negative full scale', () => {
    const ints = [0, 4194304, -8388608, 8388607, -1];
    const bytes = ints.flatMap((v) => [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff]);
    const wav = readWav(riff([fmt(1, 1, 48000, 24), chunk('data', bytes)]));
    expect(Array.from(wav.channels[0])).toEqual(ints.map((v) => Math.fround(v / 8388608)));
  });

  it('reads WAVE_FORMAT_EXTENSIBLE (PCM sub-format)', () => {
    const guidTail = [0x00, 0x00, 0x00, 0x00, 0x10, 0x00, 0x80, 0x00, 0x00, 0xaa, 0x00, 0x38, 0x9b, 0x71];
    const fmtExt = chunk('fmt ', [
      ...u16(0xfffe), ...u16(2), ...u32(48000), ...u32(48000 * 4), ...u16(4), ...u16(16),
      ...u16(22), ...u16(16), ...u32(3), ...u16(1), ...guidTail,
    ]);
    const wav = readWav(riff([fmtExt, chunk('data', pcm16([16384, -16384, 8192, -8192]))]));
    expect(wav.sampleRate).toBe(48000);
    expect(Array.from(wav.channels[0])).toEqual([0.5, 0.25]);
    expect(Array.from(wav.channels[1])).toEqual([-0.5, -0.25]);
  });

  it('skips unknown chunks, including odd-sized ones with a pad byte, before and after fmt', () => {
    const list = chunk('LIST', [...ascii('INFO'), ...ascii('ISFT'), ...u32(3), ...ascii('ab'), 0]); // 15 bytes + pad
    expect(list.length % 2).toBe(0);
    const wav = readWav(riff([chunk('JUNK', [1, 2, 3]), fmt(1, 1, 48000, 16), list, chunk('data', pcm16([16384]))]));
    expect(Array.from(wav.channels[0])).toEqual([0.5]);
  });

  it('accepts a data chunk that comes before fmt', () => {
    const wav = readWav(riff([chunk('data', pcm16([-16384])), fmt(1, 1, 44100, 16)]));
    expect(wav.sampleRate).toBe(44100);
    expect(Array.from(wav.channels[0])).toEqual([-0.5]);
  });

  it('clamps a data size larger than the file (streaming writers) to whole frames', () => {
    const bytes = riff([fmt(1, 1, 48000, 16), chunk('data', pcm16([16384, 8192]))]);
    const dataSizeAt = bytes.length - 4 - 4; // 'data' size field
    new DataView(bytes.buffer).setUint32(dataSizeAt, 0xffffffff, true);
    expect(Array.from(readWav(bytes).channels[0])).toEqual([0.5, 0.25]);
  });

  it('throws /not a WAV/ on non-RIFF input', () => {
    expect(() => readWav(new Uint8Array(ascii('ID3\u0004 not audio at all, really')))).toThrow(/not a WAV/);
    expect(() => readWav(new Uint8Array(4))).toThrow(/not a WAV/);
    const aiff = new Uint8Array([...ascii('FORM'), ...u32(4), ...ascii('AIFF')]);
    expect(() => readWav(aiff)).toThrow(/not a WAV/);
  });

  it('names unsupported formats clearly', () => {
    expect(() => readWav(riff([fmt(2, 1, 48000, 4), chunk('data', [0, 0])]))).toThrow(/format tag 2.*PCM.*float/i);
    expect(() => readWav(riff([fmt(1, 1, 48000, 8), chunk('data', [0, 0])]))).toThrow(/8-bit PCM/);
    expect(() => readWav(riff([fmt(3, 1, 48000, 64), chunk('data', new Array(8).fill(0))]))).toThrow(/64-bit float/);
    expect(() => readWav(riff([chunk('data', [0, 0])]))).toThrow(/no fmt chunk/);
    expect(() => readWav(riff([fmt(1, 1, 48000, 16)]))).toThrow(/no data chunk/);
  });
});

describe('encodeWav (test and demo helper)', () => {
  it('round-trips PCM 16, PCM 24 and float 32 through readWav', () => {
    const ch = [new Float32Array([0, 0.5, -0.5, 0.123456, -0.999]), new Float32Array([1, -1, 0.25, 0, 0.75])];
    for (const [format, tol] of [['pcm16', 1 / 32768], ['pcm24', 1 / 8388608], ['float32', 0]] as const) {
      const wav = readWav(encodeWav(ch, 44100, format));
      expect(wav.sampleRate).toBe(44100);
      expect(wav.channels).toHaveLength(2);
      for (let c = 0; c < 2; c++)
        for (let i = 0; i < 5; i++) expect(Math.abs(wav.channels[c][i] - ch[c][i])).toBeLessThanOrEqual(tol);
    }
  });
});

describe('downmix', () => {
  it('returns a mono channel unchanged', () => {
    const m = new Float32Array([0.1, 0.2]);
    expect(downmix([m])).toBe(m);
  });

  it('averages channels: sum in float32, then times 1/n (chroma.worklet.ts rule)', () => {
    const a = new Float32Array([0.1, 0.7, -1, 0.3]);
    const b = new Float32Array([0.2, -0.7, -1, 0.6]);
    const c = new Float32Array([0.4, 0.1, 1, 0.9]);
    const m = new Float32Array(4);
    for (const ch of [a, b, c]) for (let i = 0; i < 4; i++) m[i] += ch[i];
    for (let i = 0; i < 4; i++) m[i] *= 1 / 3;
    expect(Array.from(downmix([a, b, c]))).toEqual(Array.from(m));
  });
});
