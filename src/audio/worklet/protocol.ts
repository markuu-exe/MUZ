import type { ChromaConfig } from '../config';

export const CHROMA_PROCESSOR_NAME = 'muz-chroma';

export interface ChromaProcessorOptions {
  config?: Partial<ChromaConfig>;
}

/** Worklet → main thread. `time`/`onsetTime` are AudioContext seconds. */
export interface ChromaFrameMessage {
  type: 'frame';
  time: number;
  chroma: Float32Array;
  rmsDb: number;
  noiseDb: number;
  voiced: boolean;
  ringing: boolean;
  flux: number;
  onset: boolean;
  onsetTime: number;
}

/** Main thread → worklet. */
export type ChromaControlMessage = { type: 'reset' } | { type: 'stop' };
