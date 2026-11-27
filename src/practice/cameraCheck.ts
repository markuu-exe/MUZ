/**
 * P4: the one-time camera check after placement (and on demand from Settings).
 *
 * It answers one question only: can the camera see the shoulder, elbow and wrist well enough
 * for the posture rules to be applied at all (PostureAnalyzer reports `compliant !== null`,
 * held for FRAMED_AFTER_MS by the same FramingTracker the drills use). It does NOT claim the
 * posture judgement is accurate; posture itself is judged during lessons.
 * The result is remembered per device (the camera and its placement are per device).
 */
import type { RigState } from './PracticeRig';
import type { FramingState } from './framing';

export const CAMERA_CHECK_KEY = 'muz-camera-check';

export type CameraCheckResult = 'passed' | 'skipped';

export type CameraCheckStatus =
  | { kind: 'off' }
  | { kind: 'starting' }
  | { kind: 'problem' }
  /** Camera and model are live; the arm is not (yet) judgeable. */
  | { kind: 'searching' }
  /** The arm has been judgeable without a break: the check passes. */
  | { kind: 'framed' }
  /** Was framed, then lost for a while. */
  | { kind: 'lost' };

export function cameraCheckStatus(state: RigState, framing: FramingState): CameraCheckStatus {
  if (state.camera.status === 'error' || state.model === 'error') return { kind: 'problem' };
  const live = state.camera.status === 'active' && state.model === 'ready';
  if (!live) {
    return state.camera.status === 'requesting' || state.model === 'loading' || state.camera.status === 'active'
      ? { kind: 'starting' }
      : { kind: 'off' };
  }
  return { kind: framing };
}

export function readCameraCheck(): CameraCheckResult | null {
  try {
    const v = window.localStorage.getItem(CAMERA_CHECK_KEY);
    return v === 'passed' || v === 'skipped' ? v : null;
  } catch {
    return null;
  }
}

export function saveCameraCheck(result: CameraCheckResult): void {
  try {
    // A pass is never downgraded to "skipped" by closing a later re-check.
    if (result === 'skipped' && readCameraCheck() === 'passed') return;
    window.localStorage.setItem(CAMERA_CHECK_KEY, result);
  } catch {
    // Storage unavailable: the check is simply offered again next time.
  }
}
