import { Emitter } from '../core/Emitter';
import type { PostureWorkerRequest, PostureWorkerResponse } from '../posture/workerProtocol';

export type FrameLoopEvents = {
  /**
   * Display time of the analysed video frame on the performance clock, captured
   * from requestVideoFrameCallback for HUD interpolation.
   */
  result: Extract<PostureWorkerResponse, { type: 'RESULT' }> & { captureTimeMs: number };
  error: Extract<PostureWorkerResponse, { type: 'ERROR' }>;
  ready: Extract<PostureWorkerResponse, { type: 'READY' }>;
  stopped: Extract<PostureWorkerResponse, { type: 'STOPPED' }>;
};

export interface FrameLoopOptions {
  worker: Worker;
  timestamp?: () => number;
}

/**
 * Captures video frames with requestVideoFrameCallback and sends at most one frame
 * to the worker at a time. This keeps inference latency bounded when the camera
 * produces frames faster than the model can process them.
 */
export class FrameLoop extends Emitter<FrameLoopEvents> {
  private readonly video: HTMLVideoElement;
  private readonly worker: Worker;
  private readonly now: () => number;
  private running = false;
  private awaitingResult = false;
  private inFlightCaptureMs = 0;
  private callbackId: number | null = null;
  private disposed = false;

  constructor(video: HTMLVideoElement, options: FrameLoopOptions) {
    super();
    this.video = video;
    this.worker = options.worker;
    this.now = options.timestamp ?? (() => performance.now());
    this.worker.addEventListener('message', this.onWorkerMessage);
    this.worker.addEventListener('error', this.onWorkerError);
  }

  start(): void {
    this.assertAlive();
    if (this.running) return;
    this.running = true;
    this.schedule();
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.awaitingResult = false;
    if (this.callbackId !== null) {
      this.video.cancelVideoFrameCallback(this.callbackId);
      this.callbackId = null;
    }
  }

  post(message: Exclude<PostureWorkerRequest, { type: 'PROCESS' }>): void {
    this.assertAlive();
    this.worker.postMessage(message);
  }

  dispose(): void {
    if (this.disposed) return;
    this.stop();
    this.worker.removeEventListener('message', this.onWorkerMessage);
    this.worker.removeEventListener('error', this.onWorkerError);
    this.clearListeners();
    this.disposed = true;
  }

  private schedule(): void {
    if (!this.running) return;
    this.callbackId = this.video.requestVideoFrameCallback(this.onVideoFrame);
  }

  private onVideoFrame = async (now: number, metadata: VideoFrameCallbackMetadata): Promise<void> => {
    this.callbackId = null;
    if (!this.running) return;
    this.schedule();
    if (this.awaitingResult) return;

    const frame = await createImageBitmap(this.video);
    if (!this.running) {
      frame.close();
      return;
    }

    this.awaitingResult = true;
    this.inFlightCaptureMs = metadata.expectedDisplayTime || now;
    const message: Extract<PostureWorkerRequest, { type: 'PROCESS' }> = {
      type: 'PROCESS',
      frame,
      timestampMs: metadata.mediaTime * 1000 || this.now(),
    };
    this.worker.postMessage(message, [frame]);
  };

  private onWorkerMessage = (event: MessageEvent<PostureWorkerResponse>): void => {
    const message = event.data;
    if (message.type === 'RESULT' || message.type === 'ERROR') {
      this.awaitingResult = false;
    }
    switch (message.type) {
      case 'RESULT':
        this.emit('result', Object.assign(message, { captureTimeMs: this.inFlightCaptureMs }));
        break;
      case 'ERROR':
        this.emit('error', message);
        break;
      case 'READY':
        this.emit('ready', message);
        break;
      case 'STOPPED':
        this.emit('stopped', message);
        break;
    }
  };

  private onWorkerError = (event: ErrorEvent): void => {
    this.awaitingResult = false;
    this.emit('error', {
      type: 'ERROR',
      code: 'UNKNOWN',
      message: event.message || 'Pose worker failed.',
      fatal: true,
    });
  };

  private assertAlive(): void {
    if (this.disposed) throw new Error('FrameLoop has been disposed.');
  }
}
