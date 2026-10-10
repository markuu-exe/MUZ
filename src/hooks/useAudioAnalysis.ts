import { useEffect, useRef, useState } from 'react';
import * as pitchy from 'pitchy';

export function useAudioAnalysis() {
  const [isListening, setIsListening] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    };
  }, []);

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 4096;
    source.connect(analyser);

    analyserRef.current = analyser;
    audioContextRef.current = context;
    mediaStreamRef.current = stream;
    setIsListening(true);

    const data = new Float32Array(analyser.fftSize);
    const timeDomain = new Uint8Array(analyser.fftSize);
    const detector = pitchy.PitchDetector.forFloat32Array(analyser.fftSize);

    const tick = () => {
      if (!analyserRef.current || !audioContextRef.current) {
        return;
      }

      analyserRef.current.getFloatTimeDomainData(data);
      analyserRef.current.getByteTimeDomainData(timeDomain);
      const detected = detector.findPitch(data, audioContextRef.current.sampleRate);

      if (detected && detected[1] > 0.85) {
        console.debug('Pitch detected', detected[0], detected[1]);
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  const stop = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    setIsListening(false);
  };

  return { isListening, start, stop };
}
