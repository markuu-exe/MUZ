import { Emitter } from '../../vision/core/Emitter';
import type { ChromaConfig } from '../config';
import { AudioError, toMicError } from '../errors/AudioError';
import type { AcousticFrame } from '../practice/ChordVerifier';
import {
  CHROMA_PROCESSOR_NAME,
  type ChromaControlMessage,
  type ChromaFrameMessage,
  type ChromaProcessorOptions,
} from '../worklet/protocol';
// Vite bundles the worklet (and its imports) into one script and returns its URL.
import chromaWorkletUrl from '../worklet/chroma.worklet.ts?worker&url';

export type AudioInputStatus = 'idle' | 'starting' | 'running' | 'stopped' | 'error';

/** A worklet frame converted to the main-thread clock. */
export interface AudioInputFrame extends AcousticFrame {
  rmsDb: number;
  noiseDb: number;
  flux: number;
}

export type AudioInputEvents = {
  status: { status: AudioInputStatus; error?: AudioError };
  frame: AudioInputFrame;
};

export interface AudioInputOptions {
  deviceId?: string;
  chroma?: Partial<ChromaConfig>;
}

/**
 * KAN-265 microphone service (mirrors CameraService). Owns getUserMedia,
 * the AudioContext and the chroma AudioWorklet, and converts worklet times
 * (AudioContext seconds) to performance.now() ms so audio and posture share
 * one clock for the 400 ms latch.
 */
export class AudioInputService extends Emitter<AudioInputEvents> {
  private _status: AudioInputStatus = 'idle';
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private node: AudioWorkletNode | null = null;
  private sink: GainNode | null = null;
  private startToken = 0;

  get status(): AudioInputStatus {
    return this._status;
  }

  get sampleRate(): number | null {
    return this.ctx?.sampleRate ?? null;
  }

  /**
   * Call from a user gesture (click/tap). The AudioContext is created
   * synchronously before the first await so autoplay policy never leaves it suspended.
   */
  async start(options: AudioInputOptions = {}): Promise<void> {
    if (this._status === 'running' || this._status === 'starting') return;
    const token = ++this.startToken;

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      this.fail(new AudioError('INSECURE_CONTEXT', 'Microphone needs HTTPS or localhost.'));
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === 'undefined') {
      this.fail(new AudioError('UNSUPPORTED', 'This browser cannot capture or process microphone audio.'));
      return;
    }

    this.setStatus('starting');
    // Do NOT force a sampleRate: Firefox throws when a MediaStream source and
    // its context run at different rates. The DSP reads the actual rate.
    const ctx = new AudioContext({ latencyHint: 'interactive' });
    this.ctx = ctx;

    try {
      const resumed = ctx.resume();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: options.deviceId ? { exact: options.deviceId } : undefined,
          channelCount: { ideal: 1 },
          // Voice-call processing destroys music: NS removes sustained tones,
          // AGC pumps the envelope (breaks onsets), AEC cancels the piano.
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });
      if (token !== this.startToken) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.stream = stream;
      await resumed;

      try {
        await ctx.audioWorklet.addModule(chromaWorkletUrl);
      } catch (err) {
        throw new AudioError('WORKLET_LOAD_FAILED', 'The audio analysis module failed to load.', err);
      }
      if (token !== this.startToken) return;

      const processorOptions: ChromaProcessorOptions = { config: options.chroma };
      const node = new AudioWorkletNode(ctx, CHROMA_PROCESSOR_NAME, {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        channelCount: 1,
        channelCountMode: 'explicit',
        channelInterpretation: 'speakers',
        processorOptions,
      });
      node.port.onmessage = (e: MessageEvent<ChromaFrameMessage>) => this.onWorkletMessage(e.data);

      const source = ctx.createMediaStreamSource(stream);
      // Keep the graph pulled without making any sound (mic must never reach speakers).
      const sink = ctx.createGain();
      sink.gain.value = 0;
      source.connect(node).connect(sink).connect(ctx.destination);

      this.node = node;
      this.source = source;
      this.sink = sink;

      const track = stream.getAudioTracks()[0];
      track?.addEventListener('ended', this.onTrackEnded);
      this.setStatus('running');
    } catch (err) {
      if (token !== this.startToken) return;
      this.teardown();
      this.fail(toMicError(err));
    }
  }

  /** Clear onset/noise history (e.g. between drills). */
  resetAnalysis(): void {
    this.node?.port.postMessage({ type: 'reset' } satisfies ChromaControlMessage);
  }

  stop(): void {
    this.startToken++;
    this.teardown();
    if (this._status !== 'idle') this.setStatus('stopped');
  }

  dispose(): void {
    this.stop();
    this.clearListeners();
  }

  /** AudioContext seconds → performance.now() ms. */
  toPerfMs(contextSeconds: number): number {
    const ctx = this.ctx;
    if (!ctx) return performance.now();
    const ts = typeof ctx.getOutputTimestamp === 'function' ? ctx.getOutputTimestamp() : null;
    if (ts && ts.contextTime !== undefined && ts.performanceTime !== undefined && ts.performanceTime > 0) {
      return ts.performanceTime + (contextSeconds - ts.contextTime) * 1000;
    }
    return performance.now() - (ctx.currentTime - contextSeconds) * 1000;
  }

  private onWorkletMessage(msg: ChromaFrameMessage): void {
    if (msg.type !== 'frame') return;
    this.emit('frame', {
      tMs: this.toPerfMs(msg.time),
      chroma: msg.chroma,
      voiced: msg.voiced,
      ringing: msg.ringing,
      onset: msg.onset,
      onsetMs: msg.onset ? this.toPerfMs(msg.onsetTime) : 0,
      rmsDb: msg.rmsDb,
      noiseDb: msg.noiseDb,
      flux: msg.flux,
      pitchHz: msg.pitchHz,
      clarity: msg.clarity,
    });
  }

  private onTrackEnded = (): void => {
    this.teardown();
    this.fail(new AudioError('DISCONNECTED', 'The microphone was disconnected.'));
  };

  private teardown(): void {
    if (this.node) {
      this.node.port.postMessage({ type: 'stop' } satisfies ChromaControlMessage);
      this.node.port.onmessage = null;
      this.node.disconnect();
    }
    this.source?.disconnect();
    this.sink?.disconnect();
    if (this.stream) {
      for (const t of this.stream.getTracks()) {
        t.removeEventListener('ended', this.onTrackEnded);
        t.stop();
      }
    }
    if (this.ctx && this.ctx.state !== 'closed') void this.ctx.close();
    this.node = null;
    this.source = null;
    this.sink = null;
    this.stream = null;
    this.ctx = null;
  }

  private fail(error: AudioError): void {
    this._status = 'error';
    this.emit('status', { status: 'error', error });
  }

  private setStatus(status: AudioInputStatus): void {
    if (status === this._status) return;
    this._status = status;
    this.emit('status', { status });
  }
}
