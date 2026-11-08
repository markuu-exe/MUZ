/**
 * Single error taxonomy for the vision layer. Raw DOMExceptions never leave
 * the services — UI (KAN-250) switches on `code` only.
 */
export type VisionErrorCode =
  | 'UNSUPPORTED' // no mediaDevices / getUserMedia in this browser
  | 'INSECURE_CONTEXT' // not https / localhost
  | 'PERMISSION_DENIED' // user or browser/OS policy blocked the camera
  | 'NO_DEVICE' // no camera connected (or saved device gone)
  | 'DEVICE_BUSY' // another app holds the camera, or driver failure
  | 'CONSTRAINTS_UNSATISFIED' // camera can't meet even relaxed constraints
  | 'DISCONNECTED' // track ended while running (unplugged, OS revoked)
  | 'MODEL_LOAD_FAILED' // WASM / .task asset failed (used by KAN-251)
  | 'UNKNOWN';

export class VisionError extends Error {
  readonly code: VisionErrorCode;
  /** Whether a plain "Retry" can plausibly succeed without user changing anything external. */
  readonly retryable: boolean;
  readonly cause?: unknown;

  constructor(code: VisionErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'VisionError';
    this.code = code;
    this.cause = cause;
    this.retryable = code !== 'UNSUPPORTED' && code !== 'INSECURE_CONTEXT';
  }
}

/** Map anything thrown by getUserMedia / play() to a VisionError. */
export function toCameraError(err: unknown): VisionError {
  if (err instanceof VisionError) return err;

  const name = (err as { name?: string } | null)?.name ?? '';
  const msg = (err as { message?: string } | null)?.message ?? String(err);

  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError': // legacy Chrome
    case 'SecurityError': // permissions-policy / iframe without allow="camera"
      return new VisionError('PERMISSION_DENIED', 'Camera access was blocked.', err);
    case 'NotFoundError':
    case 'DevicesNotFoundError': // legacy Chrome
      return new VisionError('NO_DEVICE', 'No camera was found.', err);
    case 'NotReadableError':
    case 'TrackStartError': // legacy Chrome
    case 'AbortError':
      return new VisionError('DEVICE_BUSY', 'The camera is in use or failed to start.', err);
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError': // legacy Chrome
      return new VisionError('CONSTRAINTS_UNSATISFIED', 'The camera does not support the requested mode.', err);
    case 'TypeError':
      return new VisionError('UNSUPPORTED', 'Camera capture is not supported here.', err);
    default:
      return new VisionError('UNKNOWN', msg || 'Unknown camera error.', err);
  }
}
