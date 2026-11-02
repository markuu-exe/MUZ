type WorkerMessage =
  | { type: 'INIT'; modelPath?: string }
  | { type: 'PROCESS'; frame: ImageBitmap | VideoFrame }
  | { type: 'STOP' };

let landmarker: any = null;

async function initializeLandmarker(modelPath = '/models/pose_landmarker_lite.task') {
  if (landmarker) {
    return;
  }

  const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
  const vision = await FilesetResolver.forVisionTasks('/models/wasm');

  landmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: modelPath,
    },
    runningMode: 'VIDEO',
    numPoses: 1,
    delegate: 'GPU',
  });
}

function extractPoseKeypoints(landmarks: Array<{ x: number; y: number; z: number }>) {
  const shoulderLeft = landmarks[11] ?? { x: 0, y: 0, z: 0 };
  const shoulderRight = landmarks[12] ?? { x: 0, y: 0, z: 0 };
  const elbowLeft = landmarks[13] ?? { x: 0, y: 0, z: 0 };
  const elbowRight = landmarks[14] ?? { x: 0, y: 0, z: 0 };
  const wristLeft = landmarks[15] ?? { x: 0, y: 0, z: 0 };
  const wristRight = landmarks[16] ?? { x: 0, y: 0, z: 0 };
  const indexRootLeft = landmarks[17] ?? { x: 0, y: 0, z: 0 };
  const indexRootRight = landmarks[18] ?? { x: 0, y: 0, z: 0 };

  return {
    shoulders: { left: shoulderLeft, right: shoulderRight },
    elbows: { left: elbowLeft, right: elbowRight },
    wrists: { left: wristLeft, right: wristRight },
    indexRoots: { left: indexRootLeft, right: indexRootRight },
  };
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  if (message.type === 'INIT') {
    await initializeLandmarker(message.modelPath);
    self.postMessage({ type: 'READY' });
    return;
  }

  if (message.type === 'STOP') {
    if (landmarker) {
      landmarker.close();
      landmarker = null;
    }
    self.postMessage({ type: 'STOPPED' });
    return;
  }

  if (message.type === 'PROCESS') {
    if (!landmarker) {
      self.postMessage({ type: 'ERROR', message: 'Landmarker not initialized' });
      if (typeof message.frame.close === 'function') {
        message.frame.close();
      }
      return;
    }

    try {
      const startedAt = performance.now();
      const result = landmarker.detectForVideo(message.frame, performance.now());
      const landmarks = result.landmarks?.[0] ?? [];
      self.postMessage({
        type: 'RESULT',
        pose: extractPoseKeypoints(landmarks),
        inferenceMs: performance.now() - startedAt,
      });
    } catch (error) {
      self.postMessage({
        type: 'ERROR',
        message: error instanceof Error ? error.message : 'Pose detection failed',
      });
    } finally {
      if (typeof message.frame.close === 'function') {
        message.frame.close();
      }
    }
  }
};
