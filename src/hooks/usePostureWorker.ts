import { useCallback, useEffect, useRef, useState } from 'react';
import type { CameraStatus } from '../vision/camera/types';
import type { VisionErrorCode } from '../vision/errors/VisionError';
import type { CalibrationOptions } from '../vision/posture/calibration';
import type { HudPoints, PostureWorkerResponse } from '../vision/posture/workerProtocol';
import type { PostureConfigInput, PostureSnapshot } from '../vision/posture/types';

interface UsePostureWorkerOptions {
  cameraStatus?: CameraStatus;
  config?: PostureConfigInput;
}

export function usePostureWorker(options: UsePostureWorkerOptions = {}) {
  const workerRef = useRef<Worker | null>(null);
  const inFlightRef = useRef(false);
  const snapshotRef = useRef<PostureSnapshot | null>(null);
  const hudRef = useRef<HudPoints | null>(null);
  const inferenceMsRef = useRef<number | null>(null);
  const previousCameraStatusRef = useRef<CameraStatus | undefined>(options.cameraStatus);
  const [fatalErrorCode, setFatalErrorCode] = useState<VisionErrorCode | null>(null);

  const reset = useCallback(() => {
    workerRef.current?.postMessage({ type: 'RESET' });
    snapshotRef.current = null;
    hudRef.current = null;
    inferenceMsRef.current = null;
  }, []);

  useEffect(() => {
    const worker = new Worker(new URL('../workers/posture.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<PostureWorkerResponse>) => {
      const message = event.data;
      if (message.type === 'RESULT') {
        inFlightRef.current = false;
        snapshotRef.current = message.snapshot;
        hudRef.current = message.hud;
        inferenceMsRef.current = message.inferenceMs;
      } else if (message.type === 'ERROR') {
        inFlightRef.current = false;
        if (message.fatal) setFatalErrorCode(message.code);
      }
    };
    worker.postMessage({
      type: 'INIT',
      modelPath: '/models/pose_landmarker_lite.task',
      wasmPath: '/models/wasm',
      config: options.config,
    });

    return () => {
      worker.postMessage({ type: 'STOP' });
      worker.terminate();
      workerRef.current = null;
      inFlightRef.current = false;
    };
  }, [options.config]);

  useEffect(() => {
    const previous = previousCameraStatusRef.current;
    if (previous === 'paused' && options.cameraStatus === 'active') reset();
    previousCameraStatusRef.current = options.cameraStatus;
  }, [options.cameraStatus, reset]);

  const send = useCallback(async (video: HTMLVideoElement, timestampMs: number) => {
    const worker = workerRef.current;
    if (!worker || inFlightRef.current) return false;

    inFlightRef.current = true;
    try {
      const frame = await createImageBitmap(video);
      worker.postMessage({ type: 'PROCESS', frame, timestampMs }, [frame]);
      return true;
    } catch (error) {
      inFlightRef.current = false;
      throw error;
    }
  }, []);

  const calibrate = useCallback((calibrationOptions?: Partial<CalibrationOptions>) => {
    workerRef.current?.postMessage({ type: 'CALIBRATE', options: calibrationOptions });
  }, []);

  const clearCalibration = useCallback(() => {
    workerRef.current?.postMessage({ type: 'CLEAR_CALIBRATION' });
  }, []);

  return {
    workerRef,
    inFlightRef,
    snapshotRef,
    hudRef,
    inferenceMsRef,
    fatalErrorCode,
    send,
    calibrate,
    clearCalibration,
    reset,
  };
}
