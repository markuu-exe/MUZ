/**
 * Posture inference worker (SRS 3.4, SDD C-05).
 * MediaPipe PoseLandmarker (lite, SRS 3.6.2) → PostureAnalyzer (KAN-248) → RESULT.
 *
 * Fixes over the previous worker:
 * - reads `worldLandmarks` (metres) for the angle maths, not normalised `landmarks`;
 * - index finger root is landmark 19/20 (17/18 are the pinky);
 * - missing landmarks are NaN + visibility 0, never {0,0,0} (the hip origin);
 * - `delegate` lives in `baseOptions`, with CPU fallback;
 * - every received frame is closed (GPU memory leak otherwise);
 * - init failures are reported as MODEL_LOAD_FAILED instead of an unhandled rejection.
 */
import { createPoseFrame, extractPoseFrame } from '../vision/posture/landmarks';
import { PostureAnalyzer } from '../vision/posture/PostureAnalyzer';
import type { PostureWorkerRequest, PostureWorkerResponse } from '../vision/posture/workerProtocol';
import { analyseFrame } from '../vision/posture/workerResult';

// Typed view of the worker global without pulling in the "webworker" lib (it conflicts with "DOM").
const ctx = self as unknown as {
  postMessage(message: PostureWorkerResponse, transfer: Transferable[]): void;
  onmessage: ((event: MessageEvent<PostureWorkerRequest>) => void) | null;
  import?: (url: string) => Promise<void>;
};

// MediaPipe loads its wasm loader with importScripts, which throws in a module
// worker; its fallback then import()s the loader, but the loader is a UMD
// script whose top-level `var ModuleFactory` stays module-scoped that way, so
// `self.ModuleFactory` is never set ("ModuleFactory not set.", KAN-248). The
// resolver checks for a `self.import` hook before falling back, so give it one
// that evaluates the loader in the worker's global scope. Indirect eval is
// required: only global-scope evaluation turns the loader's `var` declarations
// into the globals MediaPipe reads.
ctx.import = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  (0, eval)(await res.text());
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let landmarker: any = null;
let analyzer: PostureAnalyzer | null = null;
let activeDelegate: 'GPU' | 'CPU' = 'GPU';
/** AI-3: return the analyzer input with each RESULT (`?debug` sessions only). */
let debugLandmarks = false;
/** Must keep increasing for the landmarker's whole lifetime (MediaPipe rejects older timestamps). */
let lastDetectTs = -Infinity;
const frame = createPoseFrame();

function post(msg: PostureWorkerResponse, transfer: Transferable[] = []): void {
  ctx.postMessage(msg, transfer);
}

async function init(msg: Extract<PostureWorkerRequest, { type: 'INIT' }>): Promise<void> {
  analyzer = new PostureAnalyzer(msg.config);
  debugLandmarks = msg.debugLandmarks === true;
  if (landmarker) {
    post({ type: 'READY', delegate: activeDelegate });
    return;
  }
  const modelAssetPath = msg.modelPath ?? '/models/pose_landmarker_lite.task';
  const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
  const fileset = await FilesetResolver.forVisionTasks(msg.wasmPath ?? '/models/wasm');

  for (const delegate of ['GPU', 'CPU'] as const) {
    try {
      landmarker = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath, delegate },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputSegmentationMasks: false,
      });
      activeDelegate = delegate;
      post({ type: 'READY', delegate });
      return;
    } catch (err) {
      if (delegate === 'CPU') throw err;
      console.warn('[posture.worker] GPU delegate failed, falling back to CPU', err);
    }
  }
}

function process(msg: Extract<PostureWorkerRequest, { type: 'PROCESS' }>): void {
  const { frame: image } = msg;
  try {
    if (!landmarker || !analyzer) {
      post({ type: 'ERROR', code: 'UNKNOWN', message: 'Posture worker not initialised', fatal: false });
      return;
    }
    // detectForVideo requires strictly increasing timestamps.
    const ts = Math.max(msg.timestampMs, lastDetectTs + 1);
    lastDetectTs = ts;

    const t0 = performance.now();
    const result = landmarker.detectForVideo(image, ts);
    const inferenceMs = performance.now() - t0;

    extractPoseFrame(result, ts, frame);
    analyseFrame(analyzer, frame, inferenceMs, debugLandmarks, post);
  } catch (err) {
    post({ type: 'ERROR', code: 'UNKNOWN', message: err instanceof Error ? err.message : 'Pose detection failed', fatal: false });
  } finally {
    image.close();
  }
}

ctx.onmessage = async (event: MessageEvent<PostureWorkerRequest>) => {
  const msg = event.data;
  switch (msg.type) {
    case 'INIT':
      try {
        await init(msg);
      } catch (err) {
        post({
          type: 'ERROR',
          code: 'MODEL_LOAD_FAILED',
          message: err instanceof Error ? err.message : 'Failed to load the pose model',
          fatal: true,
        });
      }
      return;
    case 'PROCESS':
      process(msg);
      return;
    case 'CALIBRATE':
      analyzer?.startCalibration(msg.options);
      return;
    case 'CLEAR_CALIBRATION':
      analyzer?.clearCalibration();
      return;
    case 'RESTORE_CALIBRATION':
      analyzer?.restoreCalibration({
        trunkFlexionNeutralDeg: msg.trunkFlexionNeutralDeg,
        headForwardNeutralDeg: msg.headForwardNeutralDeg,
      });
      return;
    case 'RESET':
      analyzer?.reset();
      return;
    case 'STOP':
      landmarker?.close();
      landmarker = null;
      analyzer = null;
      debugLandmarks = false;
      lastDetectTs = -Infinity;
      post({ type: 'STOPPED' });
      return;
  }
};
