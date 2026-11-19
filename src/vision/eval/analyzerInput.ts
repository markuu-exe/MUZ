/**
 * AI-3: the exact part of a PoseFrame that PostureAnalyzer reads, packed into one
 * Float32Array so the worker can transfer it (debug builds of a session only).
 *
 * The analyzer only ever reads the TRACKED_LANDMARKS: world x/y/z (angle maths),
 * image x/y (in-frame gate) and visibility (gate + arm confidence), plus `hasPose`.
 * Image z, the untracked landmarks and every pixel are left out on purpose.
 *
 * Layout: [hasPose (1/0), then per tracked landmark: wx, wy, wz, ix, iy, vis].
 * MediaPipe reports float32 landmarks, so float32 storage loses nothing.
 */
import { TRACKED_LANDMARKS, clearPoseFrame, createPoseFrame, type PoseFrame } from '../posture/landmarks';

export const ANALYZER_INPUT_FIELDS = ['wx', 'wy', 'wz', 'ix', 'iy', 'vis'] as const;
export const ANALYZER_INPUT_STRIDE = ANALYZER_INPUT_FIELDS.length;
export const ANALYZER_INPUT_LENGTH = 1 + TRACKED_LANDMARKS.length * ANALYZER_INPUT_STRIDE;

/** Copies the analyzer's input out of `frame`. Call before PostureAnalyzer.process (it smooths in place). */
export function packAnalyzerInput(frame: PoseFrame): Float32Array {
  const out = new Float32Array(ANALYZER_INPUT_LENGTH);
  out[0] = frame.hasPose ? 1 : 0;
  let o = 1;
  for (const lm of TRACKED_LANDMARKS) {
    const p = lm * 3;
    out[o] = frame.world[p];
    out[o + 1] = frame.world[p + 1];
    out[o + 2] = frame.world[p + 2];
    out[o + 3] = frame.image[p];
    out[o + 4] = frame.image[p + 1];
    out[o + 5] = frame.visibility[lm];
    o += ANALYZER_INPUT_STRIDE;
  }
  return out;
}

/** Rebuilds a PoseFrame from packed input. Everything not logged is absent (NaN / visibility 0). */
export function unpackAnalyzerInput(data: ArrayLike<number>, timestampMs: number, out: PoseFrame = createPoseFrame()): PoseFrame {
  if (data.length !== ANALYZER_INPUT_LENGTH) {
    throw new RangeError(`analyzer input must have length ${ANALYZER_INPUT_LENGTH}, got ${data.length}`);
  }
  clearPoseFrame(out);
  out.timestampMs = timestampMs;
  out.hasPose = data[0] === 1;
  let o = 1;
  for (const lm of TRACKED_LANDMARKS) {
    const p = lm * 3;
    out.world[p] = data[o];
    out.world[p + 1] = data[o + 1];
    out.world[p + 2] = data[o + 2];
    out.image[p] = data[o + 3];
    out.image[p + 1] = data[o + 4];
    out.visibility[lm] = data[o + 5];
    o += ANALYZER_INPUT_STRIDE;
  }
  return out;
}
