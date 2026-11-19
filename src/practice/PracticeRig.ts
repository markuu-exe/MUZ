/**
 * COURSE-5: the hardware a practice exercise needs, started once and shared by
 * every practice exercise in a lesson: camera → posture worker → FrameLoop, and
 * microphone → chroma worklet. Nothing here knows about lessons or React.
 *
 * Privacy (SRS 3.5.1): video frames go only to the local worker, audio only to the
 * local worklet. Nothing is recorded, stored or sent anywhere. The one exception is
 * AI-3's `debugLandmarks` (`?debug` only): an in-memory log of landmark numbers
 * (never pixels) that stays on the device unless the tester downloads it.
 */
import { AudioInputService, type AudioInputFrame, type AudioInputStatus } from '../audio/input/AudioInputService';
import type { AudioError } from '../audio/errors/AudioError';
import { CameraService } from '../vision/camera/CameraService';
import type { CameraState } from '../vision/camera/types';
import { Emitter } from '../vision/core/Emitter';
import type { VisionErrorCode } from '../vision/errors/VisionError';
import { hudVideoStyle } from '../vision/hud/viewport';
import { LandmarkLog, type LandmarkLogFile } from '../vision/eval/landmarkLog';
import { FrameLoop } from '../vision/pipeline/FrameLoop';
import type { PostureSnapshot } from '../vision/posture/types';
import type { PostureWorkerRequest } from '../vision/posture/workerProtocol';

export const POSE_MODEL_PATH = '/models/pose_landmarker_lite.task';
export const POSE_WASM_PATH = '/models/wasm';

export type PoseModelStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface RigState {
  camera: CameraState;
  model: PoseModelStatus;
  modelError: { code: VisionErrorCode; message: string } | null;
  mic: AudioInputStatus;
  micError: AudioError | null;
}

/** A posture result on the performance.now() clock, the same clock audio frames use. */
export interface PostureSample {
  tMs: number;
  snapshot: PostureSnapshot;
}

export type PracticeRigEvents = {
  state: RigState;
  posture: PostureSample;
  audio: AudioInputFrame;
};

export interface PracticeRigOptions {
  /**
   * AI-3: keep a numbers-only log of the posture analyzer's input for offline
   * evaluation. The caller decides (the app passes isPerfDebug()). Off by default,
   * and when off the worker is not even asked for landmarks.
   */
  debugLandmarks?: boolean;
}

export class PracticeRig extends Emitter<PracticeRigEvents> {
  /** Mount this element inside the practice view; the rig owns it for its whole life. */
  readonly video: HTMLVideoElement;
  readonly frameLoop: FrameLoop;
  /** AI-3 landmark log; null unless created with `debugLandmarks`. */
  readonly landmarkLog: LandmarkLog | null;
  private readonly camera: CameraService;
  private readonly audio: AudioInputService;
  private readonly worker: Worker;
  private readonly offs: Array<() => void> = [];
  private disposed = false;
  private _state: RigState;
  private _posture: PostureSample | null = null;

  constructor(options: PracticeRigOptions = {}) {
    super();
    this.video = document.createElement('video');
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.autoplay = true;
    this.video.className = 'absolute inset-0 h-full w-full';
    Object.assign(this.video.style, hudVideoStyle('cover', true));

    this.camera = new CameraService(this.video);
    this.audio = new AudioInputService();
    this.worker = new Worker(new URL('../workers/posture.worker.ts', import.meta.url), { type: 'module' });
    this.frameLoop = new FrameLoop(this.video, { worker: this.worker });
    this.landmarkLog = options.debugLandmarks ? new LandmarkLog() : null;

    this._state = { camera: this.camera.state, model: 'idle', modelError: null, mic: this.audio.status, micError: null };

    this.offs.push(
      this.camera.on('state', (camera) => {
        this.patch({ camera });
        this.syncLoop();
      }),
      this.audio.on('status', (s) => this.patch({ mic: s.status, micError: s.error ?? null })),
      this.audio.on('frame', (frame) => this.emit('audio', frame)),
      this.frameLoop.on('ready', () => {
        this.patch({ model: 'ready', modelError: null });
        this.syncLoop();
      }),
      this.frameLoop.on('error', (e) => {
        if (e.fatal) {
          this.patch({ model: 'error', modelError: { code: e.code, message: e.message } });
          this.syncLoop();
        }
      }),
      this.frameLoop.on('result', (r) => {
        this._posture = { tMs: r.captureTimeMs || performance.now(), snapshot: r.snapshot };
        this.emit('posture', this._posture);
      }),
    );
    const log = this.landmarkLog;
    if (log) {
      // The analyzer's own clock, so a replay sees exactly the frame intervals it saw.
      this.offs.push(
        this.frameLoop.on('result', (r) => {
          if (r.landmarks) log.push(r.snapshot.timestampMs, r.landmarks);
        }),
      );
    }
  }

  get state(): RigState {
    return this._state;
  }

  /** Latest posture result, or null before the first one. */
  get posture(): PostureSample | null {
    return this._posture;
  }

  get cameraReady(): boolean {
    return this._state.camera.status === 'active' && this._state.model === 'ready';
  }

  get micReady(): boolean {
    return this._state.mic === 'running';
  }

  /** Start the camera and load the pose model. Call from a click (permission prompt). */
  async startCamera(): Promise<void> {
    if (this.disposed) return;
    if (this._state.model === 'idle' || this._state.model === 'error') {
      this.patch({ model: 'loading', modelError: null });
      this.post(
        this.landmarkLog
          ? { type: 'INIT', modelPath: POSE_MODEL_PATH, wasmPath: POSE_WASM_PATH, debugLandmarks: true }
          : { type: 'INIT', modelPath: POSE_MODEL_PATH, wasmPath: POSE_WASM_PATH },
      );
    }
    const status = this._state.camera.status;
    if (status !== 'active' && status !== 'paused' && status !== 'requesting') await this.camera.start();
  }

  /** Start the microphone. Call from a click (AudioContext autoplay policy). */
  async startMic(): Promise<void> {
    if (this.disposed || this.micReady || this._state.mic === 'starting') return;
    await this.audio.start();
  }

  /** Start both. Call from a click. */
  async start(): Promise<void> {
    await Promise.all([this.startCamera(), this.startMic()]);
  }

  /** AI-3: the landmark log as an export file, or null when not recording (no `?debug`). */
  exportLandmarks(): LandmarkLogFile | null {
    return this.landmarkLog?.toJSON() ?? null;
  }

  /** Forget onset and noise history between exercises. */
  resetAudioAnalysis(): void {
    this.audio.resetAnalysis();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const off of this.offs) off();
    this.frameLoop.dispose();
    this.camera.dispose();
    this.audio.dispose();
    this.worker.postMessage({ type: 'STOP' } satisfies PostureWorkerRequest);
    this.worker.terminate();
    this.video.remove();
    this.clearListeners();
  }

  private post(message: Exclude<PostureWorkerRequest, { type: 'PROCESS' }>): void {
    this.frameLoop.post(message);
  }

  /** Frames are sent to the worker only while the camera is live and the model is loaded. */
  private syncLoop(): void {
    if (this.disposed) return;
    if (this.cameraReady) this.frameLoop.start();
    else this.frameLoop.stop();
  }

  private patch(patch: Partial<RigState>): void {
    this._state = { ...this._state, ...patch };
    this.emit('state', this._state);
  }
}
