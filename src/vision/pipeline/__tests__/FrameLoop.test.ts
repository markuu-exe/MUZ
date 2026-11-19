import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FrameLoop } from '../FrameLoop';
import type { PostureWorkerRequest, PostureWorkerResponse } from '../../posture/workerProtocol';

type FrameCallback = (now: number, metadata: VideoFrameCallbackMetadata) => void | Promise<void>;

/** Video element stand-in: frames arrive only when the test calls `frame()`. */
class FakeVideo {
  private next: FrameCallback | null = null;
  requestVideoFrameCallback(cb: FrameCallback): number {
    this.next = cb;
    return 1;
  }
  cancelVideoFrameCallback(): void {
    this.next = null;
  }
  /** Deliver one camera frame; resolves once FrameLoop has finished handling it. */
  async frame(mediaTimeSec: number, now = 0): Promise<void> {
    const cb = this.next;
    if (!cb) throw new Error('FrameLoop is not waiting for a frame');
    await cb(now, { mediaTime: mediaTimeSec, expectedDisplayTime: now } as VideoFrameCallbackMetadata);
  }
}

/** Worker stand-in: records PROCESS messages; the test replies with `respond()`. */
class FakeWorker {
  readonly processed: Array<Extract<PostureWorkerRequest, { type: 'PROCESS' }>> = [];
  private listeners: Array<(e: MessageEvent<PostureWorkerResponse>) => void> = [];
  addEventListener(type: string, fn: (e: MessageEvent<PostureWorkerResponse>) => void): void {
    if (type === 'message') this.listeners.push(fn);
  }
  removeEventListener(type: string, fn: (e: MessageEvent<PostureWorkerResponse>) => void): void {
    if (type === 'message') this.listeners = this.listeners.filter((l) => l !== fn);
  }
  postMessage(msg: PostureWorkerRequest): void {
    if (msg.type === 'PROCESS') this.processed.push(msg);
  }
  ready(delegate: 'GPU' | 'CPU'): void {
    const data = { type: 'READY', delegate } as PostureWorkerResponse;
    for (const l of this.listeners) l({ data } as MessageEvent<PostureWorkerResponse>);
  }
  respond(): void {
    const data = { type: 'RESULT', snapshot: {}, hud: new Float32Array(0), inferenceMs: 12 } as unknown as PostureWorkerResponse;
    for (const l of this.listeners) l({ data } as MessageEvent<PostureWorkerResponse>);
  }
}

function bitmap() {
  return { close: vi.fn() } as unknown as ImageBitmap;
}

let clock = 0;
let video: FakeVideo;
let worker: FakeWorker;
let loop: FrameLoop;

beforeEach(() => {
  clock = 0;
  video = new FakeVideo();
  worker = new FakeWorker();
  vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap()));
  loop = new FrameLoop(video as unknown as HTMLVideoElement, {
    worker: worker as unknown as Worker,
    timestamp: () => clock,
  });
  loop.start();
});

afterEach(() => {
  loop.dispose();
  vi.unstubAllGlobals();
});

describe('FrameLoop (T-09)', () => {
  it('stamps frames with the main-thread clock, even when mediaTime restarts near 0', async () => {
    clock = 1000;
    await video.frame(50); // long-running stream: mediaTime 50 s
    worker.respond();
    clock = 1040;
    await video.frame(0.01); // camera restarted: mediaTime back near 0
    expect(worker.processed.map((m) => m.timestampMs)).toEqual([1000, 1040]);
  });

  it('never has two frames in flight while one is still being captured', async () => {
    const pending: Array<(b: ImageBitmap) => void> = [];
    vi.stubGlobal('createImageBitmap', vi.fn(() => new Promise<ImageBitmap>((r) => pending.push(r))));
    const first = video.frame(1, 0); // capture pending
    clock = 40;
    const second = video.frame(1.04, 40); // arrives during the capture: must be skipped
    for (const finish of pending) finish(bitmap());
    await Promise.all([first, second]);
    expect(worker.processed).toHaveLength(1);
    expect(createImageBitmap).toHaveBeenCalledTimes(1);
  });

  it('caps frames sent to the worker at one per 30 ms', async () => {
    clock = 0;
    await video.frame(0.0);
    worker.respond();
    clock = 17; // 60 fps camera: next frame 17 ms later is dropped
    await video.frame(0.017);
    clock = 33;
    await video.frame(0.033);
    expect(worker.processed.map((m) => m.timestampMs)).toEqual([0, 33]);
  });

  it('remembers which delegate the pose model loaded on, for late subscribers', () => {
    expect(loop.delegate).toBeNull();
    worker.ready('CPU');
    expect(loop.delegate).toBe('CPU');
  });

  it('reports a failed capture as a non-fatal error and keeps processing frames', async () => {
    const errors: unknown[] = [];
    loop.on('error', (e) => errors.push(e));
    vi.stubGlobal('createImageBitmap', vi.fn(async () => Promise.reject(new Error('video not ready'))));
    await video.frame(0);
    expect(errors).toEqual([expect.objectContaining({ type: 'ERROR', code: 'UNKNOWN', fatal: false })]);

    vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap()));
    clock = 40;
    await video.frame(0.04);
    expect(worker.processed).toHaveLength(1);
  });
});
