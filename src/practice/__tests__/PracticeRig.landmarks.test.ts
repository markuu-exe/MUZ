import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PostureWorkerRequest, PostureWorkerResponse } from '../../vision/posture/workerProtocol';
import { ANALYZER_INPUT_LENGTH } from '../../vision/eval/analyzerInput';

// The rig's camera and microphone need a browser; only the worker side matters here.
vi.mock('../../vision/camera/CameraService', () => ({
  CameraService: class {
    state = { status: 'idle' };
    on() {
      return () => undefined;
    }
    async start() {}
    dispose() {}
  },
}));
vi.mock('../../audio/input/AudioInputService', () => ({
  AudioInputService: class {
    status = 'idle';
    on() {
      return () => undefined;
    }
    dispose() {}
  },
}));

const { PracticeRig } = await import('../PracticeRig');

class FakeWorker {
  static last: FakeWorker;
  readonly sent: PostureWorkerRequest[] = [];
  private listeners: Array<(e: MessageEvent<PostureWorkerResponse>) => void> = [];
  constructor() {
    FakeWorker.last = this;
  }
  addEventListener(type: string, fn: (e: MessageEvent<PostureWorkerResponse>) => void): void {
    if (type === 'message') this.listeners.push(fn);
  }
  removeEventListener(): void {}
  postMessage(msg: PostureWorkerRequest): void {
    this.sent.push(msg);
  }
  terminate(): void {}
  result(timestampMs: number, landmarks?: Float32Array): void {
    const data = {
      type: 'RESULT',
      snapshot: { timestampMs },
      hud: new Float32Array(0),
      inferenceMs: 10,
      ...(landmarks ? { landmarks } : {}),
    } as unknown as PostureWorkerResponse;
    for (const l of this.listeners) l({ data } as MessageEvent<PostureWorkerResponse>);
  }
}

beforeEach(() => {
  vi.stubGlobal('Worker', FakeWorker);
  vi.stubGlobal('document', { createElement: () => ({ style: {}, remove() {} }) });
});

afterEach(() => vi.unstubAllGlobals());

function input(): Float32Array {
  const d = new Float32Array(ANALYZER_INPUT_LENGTH).fill(0.25);
  d[0] = 1;
  return d;
}

describe('PracticeRig landmark export (AI-3)', () => {
  it('by default: INIT is unchanged and nothing is recorded', async () => {
    const rig = new PracticeRig();
    await rig.startCamera();
    const init = FakeWorker.last.sent.find((m) => m.type === 'INIT');
    expect(init).toEqual({ type: 'INIT', modelPath: '/models/pose_landmarker_lite.task', wasmPath: '/models/wasm' });
    expect(init && 'debugLandmarks' in init).toBe(false);
    FakeWorker.last.result(100, input());
    expect(rig.landmarkLog).toBeNull();
    expect(rig.exportLandmarks()).toBeNull();
    rig.dispose();
  });

  it('with debugLandmarks: asks the worker for landmarks and logs them on the session clock', async () => {
    const rig = new PracticeRig({ debugLandmarks: true });
    await rig.startCamera();
    expect(FakeWorker.last.sent.find((m) => m.type === 'INIT')).toMatchObject({ debugLandmarks: true });
    FakeWorker.last.result(5000, input());
    FakeWorker.last.result(5033, undefined); // a RESULT without landmarks is skipped
    FakeWorker.last.result(5066, input());
    expect(rig.landmarkLog?.length).toBe(2);
    const file = rig.exportLandmarks();
    expect(file?.frames.map((f) => f.t)).toEqual([0, 66]);
    expect(file?.model).toBe('pose_landmarker_lite');
    rig.dispose();
  });
});
