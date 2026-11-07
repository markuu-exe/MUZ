import { useCallback, useEffect, useRef, useState } from "react";

function playClick(ctx: AudioContext, time: number, accent: boolean): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = accent ? 1000 : 800;
  gain.gain.setValueAtTime(0.4, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.06);
}

export function useMetronome(bpm: number = 80, beatsPerMeasure: number = 4) {
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const nextBeatTimeRef = useRef<number>(0);
  const runningRef = useRef<boolean>(false);
  const beatCountRef = useRef<number>(0);

  const beatTimesRef = useRef<number[]>([]);
  const bpmRef = useRef<number>(bpm);
  const beatsRef = useRef<number>(beatsPerMeasure);

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [beatInMeasure, setBeatInMeasure] = useState<number>(0); 
  const [measure, setMeasure] = useState<number>(0); 

  bpmRef.current = bpm;
  beatsRef.current = beatsPerMeasure;

  const scheduler = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const interval = 60 / bpmRef.current;

    while (nextBeatTimeRef.current < ctx.currentTime + 0.1) {
      const time = nextBeatTimeRef.current;
      const beats = beatsRef.current;
      const index = beatCountRef.current;
      const beatNum = (index % beats) + 1;
      const measureNum = Math.floor(index / beats) + 1;

      playClick(ctx, time, beatNum === 1);
      beatTimesRef.current.push(time);
      beatCountRef.current += 1;

      const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
      window.setTimeout(() => {
        if (!runningRef.current) return;
        setBeatInMeasure(beatNum);
        setMeasure(measureNum);
      }, delayMs);

      nextBeatTimeRef.current += interval;
    }
  }, []);

  const start = useCallback(async () => {
    if (runningRef.current) return;
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    const ctx = ctxRef.current;
    await ctx.resume();

    beatTimesRef.current = [];
    beatCountRef.current = 0;
    nextBeatTimeRef.current = ctx.currentTime + 0.1;
    runningRef.current = true;
    timerRef.current = window.setInterval(scheduler, 25);
    setIsRunning(true);
  }, [scheduler]);

  const stop = useCallback(() => {
    runningRef.current = false;
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
    setBeatInMeasure(0);
    setMeasure(0);
  }, []);

  useEffect(() => {
    return () => {
      runningRef.current = false;
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      ctxRef.current?.close();
    };
  }, []);

  return { start, stop, isRunning, beatInMeasure, measure, beatTimesRef, ctxRef };
}
