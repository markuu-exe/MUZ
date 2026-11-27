import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RigState } from '../PracticeRig';
import { CAMERA_CHECK_KEY, cameraCheckStatus, readCameraCheck, saveCameraCheck } from '../cameraCheck';

const rig = (camera: string, model: string): RigState =>
  ({ camera: { status: camera }, model, modelError: null, mic: 'idle', micError: null }) as unknown as RigState;

describe('camera check status (P4)', () => {
  it('asks to turn the camera on until it is started', () => {
    expect(cameraCheckStatus(rig('idle', 'idle'), 'searching')).toEqual({ kind: 'off' });
  });
  it('shows starting while permission or the pose model is pending', () => {
    expect(cameraCheckStatus(rig('requesting', 'idle'), 'searching')).toEqual({ kind: 'starting' });
    expect(cameraCheckStatus(rig('active', 'loading'), 'searching')).toEqual({ kind: 'starting' });
  });
  it('reports a problem (denied camera, model failed) so the learner gets diagnostics and a retry', () => {
    expect(cameraCheckStatus(rig('error', 'idle'), 'searching')).toEqual({ kind: 'problem' });
    expect(cameraCheckStatus(rig('active', 'error'), 'framed')).toEqual({ kind: 'problem' });
  });
  it('passes only when the drills’ framing tracker says the arm is judgeable', () => {
    expect(cameraCheckStatus(rig('active', 'ready'), 'searching')).toEqual({ kind: 'searching' });
    expect(cameraCheckStatus(rig('active', 'ready'), 'framed')).toEqual({ kind: 'framed' });
    expect(cameraCheckStatus(rig('active', 'ready'), 'lost')).toEqual({ kind: 'lost' });
  });
});

describe('camera check memory (per device)', () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubStorage() {
    const store = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) },
    });
    return store;
  }

  it('is offered when never run, and remembers a pass or a skip', () => {
    const store = stubStorage();
    expect(readCameraCheck()).toBeNull();
    saveCameraCheck('skipped');
    expect(readCameraCheck()).toBe('skipped');
    saveCameraCheck('passed');
    expect(store.get(CAMERA_CHECK_KEY)).toBe('passed');
  });

  it('closing a later re-check never downgrades a pass', () => {
    stubStorage();
    saveCameraCheck('passed');
    saveCameraCheck('skipped');
    expect(readCameraCheck()).toBe('passed');
  });

  it('works without storage (private mode): just offers it again', () => {
    vi.stubGlobal('window', {});
    expect(readCameraCheck()).toBeNull();
    expect(() => saveCameraCheck('passed')).not.toThrow();
  });
});
