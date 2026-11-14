/**
 * Error taxonomy for the audio layer, mirroring VisionError (KAN-249) so the UI
 * can show one diagnostic modal per code (SRS 3.3.1). Raw DOMExceptions never
 * leave the services.
 */
export type AudioErrorCode =
  | 'UNSUPPORTED' // no getUserMedia / AudioWorklet in this browser
  | 'INSECURE_CONTEXT' // not https / localhost
  | 'PERMISSION_DENIED' // user or policy blocked the microphone
  | 'NO_DEVICE' // no microphone connected
  | 'DEVICE_BUSY' // another app holds the mic, or driver failure
  | 'DISCONNECTED' // track ended while running (unplugged, OS revoked)
  | 'WORKLET_LOAD_FAILED' // chroma worklet module failed to load
  | 'UNKNOWN';

export class AudioError extends Error {
  readonly code: AudioErrorCode;
  readonly retryable: boolean;
  readonly cause?: unknown;

  constructor(code: AudioErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'AudioError';
    this.code = code;
    this.cause = cause;
    this.retryable = code !== 'UNSUPPORTED' && code !== 'INSECURE_CONTEXT';
  }
}

/** Map anything thrown by getUserMedia / AudioContext / addModule to an AudioError. */
export function toMicError(err: unknown): AudioError {
  if (err instanceof AudioError) return err;
  const name = (err as { name?: string } | null)?.name ?? '';
  const msg = (err as { message?: string } | null)?.message ?? String(err);
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return new AudioError('PERMISSION_DENIED', 'Microphone access was blocked.', err);
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return new AudioError('NO_DEVICE', 'No usable microphone was found.', err);
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return new AudioError('DEVICE_BUSY', 'The microphone is in use or failed to start.', err);
    case 'TypeError':
      return new AudioError('UNSUPPORTED', 'Microphone capture is not supported here.', err);
    default:
      return new AudioError('UNKNOWN', msg || 'Unknown microphone error.', err);
  }
}
