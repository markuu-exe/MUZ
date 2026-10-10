import { useEffect, useRef } from 'react';

export function usePostureWorker() {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL('../workers/posture.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.postMessage({ type: 'INIT', modelPath: '/models/pose_landmarker_lite.task' });

    return () => {
      worker.postMessage({ type: 'STOP' });
      worker.terminate();
    };
  }, []);

  return workerRef;
}
