import { useEffect, useRef, useState } from 'react';
import * as pitchy from 'pitchy';

export function useAudioAnalysis() {
  const [isListening, setIsListening] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const dataBufferRef = useRef<Float32Array | null>(null);
  const timeDomainBufferRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  const start = async () => {
    if (isListening) {
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 4096;
    source.connect(analyser);

    analyserRef.current = analyser;
    audioContextRef.current = context;
    sourceNodeRef.current = source;
    mediaStreamRef.current = stream;
    setIsListening(true);

    const data = new Float32Array(analyser.fftSize);
    const timeDomain = new Uint8Array(analyser.fftSize);
    dataBufferRef.current = data;
    timeDomainBufferRef.current = timeDomain;
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

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);
  };

  const stop = () => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (dataBufferRef.current) {
      dataBufferRef.current.fill(0);
      dataBufferRef.current = null;
    }

    if (timeDomainBufferRef.current) {
      timeDomainBufferRef.current.fill(0);
      timeDomainBufferRef.current = null;
    }

    sourceNodeRef.current?.disconnect();
    sourceNodeRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;

    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsListening(false);
  };

  return { isListening, start, stop };
}
