/**
 * The posture worker's per-frame step after inference, kept out of the worker
 * module so it can be unit-tested: PoseFrame → PostureAnalyzer → RESULT message.
 */
import { packAnalyzerInput } from '../eval/analyzerInput';
import { isUsable, POSE_LANDMARK_COUNT, type PoseFrame } from './landmarks';
import type { PostureAnalyzer } from './PostureAnalyzer';
import { HUD_STRIDE, type PostureWorkerResponse } from './workerProtocol';

export type ResultMessage = Extract<PostureWorkerResponse, { type: 'RESULT' }>;

/**
 * Analyses `frame` (smoothed in place) and posts the RESULT message.
 * With `debugLandmarks` (AI-3) the raw analyzer input is copied out first and added;
 * without it the message, its transfer list and its allocations are exactly what
 * they were before AI-3.
 */
export function analyseFrame(
  analyzer: PostureAnalyzer,
  frame: PoseFrame,
  inferenceMs: number,
  debugLandmarks: boolean,
  post: (message: ResultMessage, transfer: Transferable[]) => void,
): void {
  const landmarks = debugLandmarks ? packAnalyzerInput(frame) : null;
  const snapshot = analyzer.process(frame);

  const hud = new Float32Array(POSE_LANDMARK_COUNT * HUD_STRIDE);
  for (let i = 0; i < POSE_LANDMARK_COUNT; i++) {
    const o = i * HUD_STRIDE;
    hud[o] = frame.image[i * 3];
    hud[o + 1] = frame.image[i * 3 + 1];
    hud[o + 2] = isUsable(frame, i, analyzer.config.gate) ? 1 : 0;
  }
  if (landmarks) post({ type: 'RESULT', snapshot, hud, inferenceMs, landmarks }, [hud.buffer, landmarks.buffer]);
  else post({ type: 'RESULT', snapshot, hud, inferenceMs }, [hud.buffer]);
}
