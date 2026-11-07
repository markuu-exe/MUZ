/**
 * Message contract between the main thread and src/workers/posture.worker.ts.
 * Main thread sends one PROCESS at a time and waits for RESULT/ERROR before sending the next
 * (back-pressure): if inference is slower than the camera, frames are dropped at the source
 * instead of queueing up latency.
 */
import type { CalibrationOptions } from './calibration';
import type { PostureConfigInput, PostureSnapshot } from './types';
import type { VisionErrorCode } from '../errors/VisionError';

export type PostureWorkerRequest =
  | { type: 'INIT'; modelPath?: string; wasmPath?: string; config?: PostureConfigInput }
  /** `frame` must be transferred; the worker closes it. `timestampMs` = monotonic capture time. */
  | { type: 'PROCESS'; frame: ImageBitmap | VideoFrame; timestampMs: number }
  | { type: 'CALIBRATE'; options?: Partial<CalibrationOptions> }
  | { type: 'CLEAR_CALIBRATION' }
  | { type: 'RESTORE_CALIBRATION'; trunkFlexionNeutralDeg: number | null; headForwardNeutralDeg: number | null }
  | { type: 'RESET' }
  | { type: 'STOP' };

/** Per landmark: x, y (normalised image coords, smoothed), usable (1/0). Length 33 * 3. */
export type HudPoints = Float32Array;
export const HUD_STRIDE = 3;

export type PostureWorkerResponse =
  | { type: 'READY'; delegate: 'GPU' | 'CPU' }
  | { type: 'RESULT'; snapshot: PostureSnapshot; hud: HudPoints; inferenceMs: number }
  | { type: 'ERROR'; code: VisionErrorCode; message: string; fatal: boolean }
  | { type: 'STOPPED' };
