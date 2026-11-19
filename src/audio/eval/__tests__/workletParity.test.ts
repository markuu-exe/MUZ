/**
 * AI-2: the harness must hear a stereo file the way the live worklet hears a
 * stereo microphone. This loads the real, unchanged chroma.worklet.ts with
 * stand-ins for the AudioWorkletGlobalScope members it uses, feeds it two
 * different channels, and compares its posted frames with
 * downmix() → replay() on the same audio.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { renderPiano } from '../../__tests__/fixtures';
import type { ChromaFrameMessage } from '../../worklet/protocol';
import { replay } from '../evaluateClip';
import { downmix } from '../wav';

const FS = 48000;
const scope = globalThis as unknown as Record<string, unknown>;
const STUBS = ['AudioWorkletProcessor', 'registerProcessor', 'sampleRate', 'currentTime'];

type Processor = { process(inputs: Float32Array[][]): boolean };

afterAll(() => {
  for (const k of STUBS) delete scope[k];
});

async function loadWorklet(): Promise<{ proc: Processor; posted: ChromaFrameMessage[] }> {
  const posted: ChromaFrameMessage[] = [];
  let ctor: (new (options: object) => Processor) | null = null;
  scope.AudioWorkletProcessor = class {
    port = { onmessage: null, postMessage: (m: ChromaFrameMessage) => posted.push(m) };
  };
  scope.registerProcessor = (_name: string, c: new (options: object) => Processor) => {
    ctor = c;
  };
  scope.sampleRate = FS;
  scope.currentTime = 0;
  await import('../../worklet/chroma.worklet');
  if (!ctor) throw new Error('worklet did not register a processor');
  return { proc: new (ctor as new (options: object) => Processor)({ processorOptions: {} }), posted };
}

describe('down-mix parity with chroma.worklet.ts', { timeout: 60_000 }, () => {
  it('stereo through the worklet == downmix() + replay()', async () => {
    const left = renderPiano([60, 64, 67].map((midi) => ({ midi, at: 0.3 })), { sampleRate: FS, durationSec: 0.9, seed: 11 });
    const right = renderPiano([{ midi: 57, at: 0.35 }], { sampleRate: FS, durationSec: 0.9, seed: 12, levelDb: -18 });

    const { proc, posted } = await loadWorklet();
    for (let i = 0; i < left.length; i += 128) {
      scope.currentTime = i / FS;
      proc.process([[left.subarray(i, i + 128), right.subarray(i, i + 128)]]);
    }

    const ours: Array<{ tMs: number; onset: boolean; voiced: boolean; pitchHz: number | null; chroma: number[] }> = [];
    replay(downmix([left, right]), FS, (f) =>
      ours.push({ tMs: f.tMs, onset: f.onset, voiced: f.voiced, pitchHz: f.pitchHz ?? null, chroma: Array.from(f.chroma) }),
    );

    expect(posted.length).toBeGreaterThan(50);
    expect(posted.some((m) => m.onset)).toBe(true);
    expect(ours).toEqual(
      posted.map((m) => ({ tMs: m.time * 1000, onset: m.onset, voiced: m.voiced, pitchHz: m.pitchHz, chroma: Array.from(m.chroma) })),
    );
  });
});
