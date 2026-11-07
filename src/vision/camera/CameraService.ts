import { Emitter } from '../core/Emitter';
import { VisionError, toCameraError } from '../errors/VisionError';
import type {
  CameraEvents,
  CameraOptions,
  CameraPauseReason,
  CameraSettings,
  CameraState,
} from './types';

const DEFAULTS: Required<CameraOptions> = {
  idealWidth: 1280,
  idealHeight: 720,
  idealFrameRate: 30,
  pauseWhenHidden: true,
  storageKey: 'muz.camera.deviceId',
};

/**
 * KAN-252 — Local webcam capture.
 *
 * Owns exactly one MediaStream and one <video> element. All async work is guarded by a
 * generation counter, so overlapping start()/stop()/switchDevice() calls can never leak a
 * stream or apply stale state.
 *
 * start()/switchDevice() never reject: failures land in `state.error` as a VisionError, so the
 * UI (KAN-250) can be driven purely by the 'state' event.
 */
export class CameraService extends Emitter<CameraEvents> {
  private readonly video: HTMLVideoElement;
  private readonly opts: Required<CameraOptions>;

  private stream: MediaStream | null = null;
  private track: MediaStreamTrack | null = null;
  private generation = 0;
  private disposed = false;
  private hidden = typeof document !== 'undefined' && document.hidden;
  private muted = false;

  private _state: CameraState = { status: 'idle', error: null, pauseReason: null, settings: null };

  constructor(video: HTMLVideoElement, options: CameraOptions = {}) {
    super();
    this.video = video;
    this.opts = { ...DEFAULTS, ...options };
    prepareVideoElement(video);

    navigator.mediaDevices?.addEventListener?.('devicechange', this.onDeviceChange);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  /** Cheap capability check for gating UI before the user clicks "Start camera". */
  static checkEnvironment(): VisionError | null {
    if (typeof window === 'undefined' || !window.isSecureContext) {
      return new VisionError('INSECURE_CONTEXT', 'The camera needs a secure (https or localhost) page.');
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      return new VisionError('UNSUPPORTED', 'This browser does not support camera capture.');
    }
    return null;
  }

  get state(): CameraState {
    return this._state;
  }

  get videoElement(): HTMLVideoElement {
    return this.video;
  }

  /**
   * Start (or restart) capture. With no argument, uses the remembered camera if it still
   * exists, otherwise any camera. With an explicit deviceId, uses only that camera.
   */
  async start(deviceId?: string): Promise<CameraState> {
    this.assertAlive();
    const gen = ++this.generation;
    this.releaseStream();

    const envError = CameraService.checkEnvironment();
    if (envError) return this.fail(envError, gen);

    this.setState({ status: 'requesting', error: null, pauseReason: null, settings: null });

    let stream: MediaStream;
    try {
      stream = await this.acquire(deviceId ?? this.loadDeviceId(), deviceId !== undefined);
    } catch (err) {
      return this.fail(toCameraError(err), gen);
    }

    if (gen !== this.generation) {
      // stop()/start() was called while the permission prompt was open.
      stopTracks(stream);
      return this._state;
    }

    try {
      await this.attach(stream);
    } catch (err) {
      return this.fail(toCameraError(err), gen);
    }
    if (gen !== this.generation) return this._state;

    const settings = this.readSettings();
    this.saveDeviceId(settings.deviceId);
    this.setActiveOrPaused(settings);
    return this._state;
  }

  switchDevice(deviceId: string): Promise<CameraState> {
    return this.start(deviceId);
  }

  stop(): void {
    this.generation++;
    this.releaseStream();
    this.setState({ status: 'idle', error: null, pauseReason: null, settings: null });
  }

  /** Video inputs. Labels are empty strings until permission has been granted once. */
  async listDevices(): Promise<MediaDeviceInfo[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const all = await navigator.mediaDevices.enumerateDevices();
    return all.filter((d) => d.kind === 'videoinput');
  }

  dispose(): void {
    if (this.disposed) return;
    this.stop();
    navigator.mediaDevices?.removeEventListener?.('devicechange', this.onDeviceChange);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.clearListeners();
    this.disposed = true;
  }

  // ───────────────────────────── internals ─────────────────────────────

  private async acquire(deviceId: string | null, explicit: boolean): Promise<MediaStream> {
    const md = navigator.mediaDevices;
    const base: MediaTrackConstraints = {
      width: { ideal: this.opts.idealWidth },
      height: { ideal: this.opts.idealHeight },
      frameRate: { ideal: this.opts.idealFrameRate },
      aspectRatio: { ideal: this.opts.idealWidth / this.opts.idealHeight },
    };

    if (deviceId) {
      try {
        return await md.getUserMedia({ audio: false, video: { ...base, deviceId: { exact: deviceId } } });
      } catch (err) {
        const name = (err as { name?: string }).name;
        const deviceGone = name === 'OverconstrainedError' || name === 'NotFoundError';
        // A user-picked camera must not silently become a different one.
        if (explicit || !deviceGone) throw err;
        this.saveDeviceId(null);
      }
    }

    try {
      return await md.getUserMedia({ audio: false, video: base });
    } catch (err) {
      // Some virtual / old UVC cameras reject even 'ideal' combos. Last resort: anything.
      if ((err as { name?: string }).name === 'OverconstrainedError') {
        return md.getUserMedia({ audio: false, video: true });
      }
      throw err;
    }
  }

  private async attach(stream: MediaStream): Promise<void> {
    // Assign before any await so a concurrent stop() can release it.
    this.stream = stream;
    const track = stream.getVideoTracks()[0];
    if (!track) throw new VisionError('NO_DEVICE', 'The camera returned no video track.');

    this.track = track;
    track.addEventListener('ended', this.onTrackEnded);
    track.addEventListener('mute', this.onTrackMute);
    track.addEventListener('unmute', this.onTrackUnmute);
    this.muted = track.muted;

    this.video.srcObject = stream;
    if (this.video.readyState < HTMLMediaElement.HAVE_METADATA) {
      await once(this.video, 'loadedmetadata');
    }
    if (!(this.opts.pauseWhenHidden && this.hidden)) {
      await this.video.play();
    }
  }

  private readSettings(): CameraSettings {
    const s = this.track?.getSettings() ?? {};
    return {
      deviceId: s.deviceId ?? '',
      label: this.track?.label ?? '',
      width: s.width ?? this.video.videoWidth,
      height: s.height ?? this.video.videoHeight,
      frameRate: s.frameRate ?? this.opts.idealFrameRate,
    };
  }

  private releaseStream(): void {
    const track = this.track;
    if (track) {
      track.removeEventListener('ended', this.onTrackEnded);
      track.removeEventListener('mute', this.onTrackMute);
      track.removeEventListener('unmute', this.onTrackUnmute);
    }
    if (this.stream) stopTracks(this.stream);
    this.stream = null;
    this.track = null;
    this.muted = false;
    this.video.pause();
    this.video.srcObject = null;
  }

  private fail(error: VisionError, gen: number): CameraState {
    if (gen !== this.generation) return this._state; // superseded; don't clobber newer state
    this.releaseStream();
    this.setState({ status: 'error', error, pauseReason: null, settings: null });
    return this._state;
  }

  private setActiveOrPaused(settings: CameraSettings | null = this._state.settings): void {
    const pauseReason: CameraPauseReason | null =
      this.opts.pauseWhenHidden && this.hidden ? 'hidden' : this.muted ? 'muted' : null;
    this.setState({
      status: pauseReason ? 'paused' : 'active',
      error: null,
      pauseReason,
      settings,
    });
  }

  private setState(next: CameraState): void {
    this._state = next;
    this.emit('state', next);
  }

  private assertAlive(): void {
    if (this.disposed) throw new Error('CameraService has been disposed.');
  }

  // ───────────────────────────── event handlers ─────────────────────────────

  private onTrackEnded = (): void => {
    // Fires on unplug / OS revocation — NOT on our own track.stop().
    const gen = ++this.generation;
    this.fail(new VisionError('DISCONNECTED', 'The camera was disconnected.'), gen);
  };

  private onTrackMute = (): void => {
    this.muted = true;
    if (this.stream) this.setActiveOrPaused();
  };

  private onTrackUnmute = (): void => {
    this.muted = false;
    if (this.stream) this.setActiveOrPaused();
  };

  private onVisibilityChange = (): void => {
    this.hidden = document.hidden;
    if (!this.opts.pauseWhenHidden || !this.stream) return;
    if (this._state.status !== 'active' && this._state.status !== 'paused') return;

    // Pausing the <video> also stops requestVideoFrameCallback, so inference halts for free.
    if (this.hidden) this.video.pause();
    else this.video.play().catch(() => { /* resumes on next user gesture if blocked */ });
    this.setActiveOrPaused();
  };

  private onDeviceChange = (): void => {
    this.listDevices()
      .then((devices) => this.emit('devices', devices))
      .catch(() => { /* enumerate can fail transiently during hot-plug */ });
  };

  // ───────────────────────────── persistence ─────────────────────────────

  private loadDeviceId(): string | null {
    if (!this.opts.storageKey) return null;
    try {
      return localStorage.getItem(this.opts.storageKey);
    } catch {
      return null;
    }
  }

  private saveDeviceId(id: string | null): void {
    if (!this.opts.storageKey) return;
    try {
      if (id) localStorage.setItem(this.opts.storageKey, id);
      else localStorage.removeItem(this.opts.storageKey);
    } catch {
      /* storage disabled (private mode / policy) — non-fatal */
    }
  }
}

// ───────────────────────────── helpers ─────────────────────────────

function prepareVideoElement(video: HTMLVideoElement): void {
  // muted + playsinline are required for autoplay without a gesture (Safari/iOS, Chrome policy).
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.setAttribute('playsinline', '');
  video.disablePictureInPicture = true;
}

function stopTracks(stream: MediaStream): void {
  for (const t of stream.getTracks()) t.stop();
}

/**
 * Resolve on `type`; reject if the element is emptied (srcObject cleared by stop()) or errors,
 * so a superseded start() never hangs forever.
 */
function once(target: HTMLMediaElement, type: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ac = new AbortController();
    const opts = { once: true, signal: ac.signal };
    target.addEventListener(type, () => { ac.abort(); resolve(); }, opts);
    target.addEventListener('emptied', () => {
      ac.abort();
      reject(new DOMException('Video source was cleared.', 'AbortError'));
    }, opts);
    target.addEventListener('error', () => {
      ac.abort();
      reject(new DOMException('Video element failed to load the stream.', 'NotReadableError'));
    }, opts);
  });
}
