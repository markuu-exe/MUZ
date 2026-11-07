import type { VisionError } from '../errors/VisionError';

export type CameraStatus = 'idle' | 'requesting' | 'active' | 'paused' | 'error';

export interface CameraSettings {
  deviceId: string;
  label: string;
  width: number;
  height: number;
  frameRate: number;
}

/** Why frames have stopped while a stream is still held. */
export type CameraPauseReason = 'hidden' | 'muted';

export interface CameraState {
  status: CameraStatus;
  error: VisionError | null;
  /** Set only when status is 'paused'. 'muted' = OS/driver stopped delivering frames (lid closed, privacy shutter, etc.). */
  pauseReason: CameraPauseReason | null;
  /** Populated only while status is 'active' or 'paused'. */
  settings: CameraSettings | null;
}

export interface CameraOptions {
  /** Ideal capture size. Soft constraint — cameras that can't match fall back gracefully. */
  idealWidth?: number;
  idealHeight?: number;
  idealFrameRate?: number;
  /** Pause the <video> (and therefore all downstream inference) when the tab is hidden. */
  pauseWhenHidden?: boolean;
  /** localStorage key for remembering the chosen camera. Set to null to disable. */
  storageKey?: string | null;
}

export type CameraEvents = {
  state: CameraState;
  /** Fired on navigator.mediaDevices 'devicechange' with the current video inputs. */
  devices: MediaDeviceInfo[];
};
