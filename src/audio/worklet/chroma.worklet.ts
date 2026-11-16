/**
 * KAN-265 AudioWorklet: framing, FFT, chroma and onset detection off the main
 * thread. Loaded by AudioInputService via Vite's `?worker&url` import, which
 * bundles this file and its imports into one self-contained script.
 *
 * Cost per 128-sample render quantum: ~0 on 3 of 4 quanta, one 4096-pt + one
 * 1024-pt FFT on the 4th (hop 512) ≈ 0.1–0.2 ms, against a 2.67 ms budget.
 * Raw audio never leaves this scope (SRS 3.5.1): only 12 floats + scalars are posted.
 */
import { ChromaFrameProcessor, type ChromaFrame } from '../dsp/ChromaFrameProcessor';
import {
  CHROMA_PROCESSOR_NAME,
  type ChromaControlMessage,
  type ChromaFrameMessage,
  type ChromaProcessorOptions,
} from './protocol';

// AudioWorkletGlobalScope members (not in lib.dom). Declared module-locally so
// they do not leak into main-thread code as fake globals.
declare const sampleRate: number;
declare const currentTime: number;
declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor(options?: AudioWorkletNodeOptions);
  abstract process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean;
}
declare function registerProcessor(
  name: string,
  ctor: new (options: AudioWorkletNodeOptions) => AudioWorkletProcessor,
): void;

class ChromaWorkletProcessor extends AudioWorkletProcessor {
  private readonly proc: ChromaFrameProcessor;
  private mono = new Float32Array(128);
  private alive = true;

  constructor(options: AudioWorkletNodeOptions) {
    super();
    const opts = (options.processorOptions ?? {}) as ChromaProcessorOptions;
    this.proc = new ChromaFrameProcessor(sampleRate, (f) => this.post(f), opts.config);
    this.port.onmessage = (e: MessageEvent<ChromaControlMessage>) => {
      if (e.data.type === 'reset') this.proc.reset();
      else if (e.data.type === 'stop') this.alive = false;
    };
  }

  process(inputs: Float32Array[][]): boolean {
    const channels = inputs[0];
    if (channels && channels.length > 0) {
      let block = channels[0];
      if (channels.length > 1) {
        // Down-mix (some devices ignore channelCount: 1).
        if (this.mono.length !== block.length) this.mono = new Float32Array(block.length);
        const m = this.mono;
        m.fill(0);
        for (const ch of channels) for (let i = 0; i < ch.length; i++) m[i] += ch[i];
        const g = 1 / channels.length;
        for (let i = 0; i < m.length; i++) m[i] *= g;
        block = m;
      }
      this.proc.process(block, currentTime);
    }
    return this.alive;
  }

  private post(f: ChromaFrame): void {
    const msg: ChromaFrameMessage = {
      type: 'frame',
      time: f.time,
      chroma: f.chroma.slice(),
      rmsDb: f.rmsDb,
      noiseDb: f.noiseDb,
      voiced: f.voiced,
      ringing: f.ringing,
      flux: f.flux,
      onset: f.onset,
      onsetTime: f.onsetTime,
      pitchHz: f.pitchHz,
      clarity: f.clarity,
    };
    this.port.postMessage(msg, [msg.chroma.buffer]);
  }
}

registerProcessor(CHROMA_PROCESSOR_NAME, ChromaWorkletProcessor);
