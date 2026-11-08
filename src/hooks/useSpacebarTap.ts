import { useEffect, useRef } from "react";

export interface TapEvent {
  audioTime: number; 
  perfTime: number;  
}

export function useSpacebarTap(
  ctxRef: { current: AudioContext | null },
  onTap: (tap: TapEvent) => void,
  enabled: boolean = true
) {
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return; 
      e.preventDefault(); 
      const ctx = ctxRef.current;
      if (!ctx) return;

      const ts = ctx.getOutputTimestamp();
      const contextTime = ts.contextTime ?? ctx.currentTime;
      const performanceTime = ts.performanceTime ?? performance.now();
      const audioTime = contextTime + (e.timeStamp - performanceTime) / 1000;

      onTapRef.current({ audioTime, perfTime: e.timeStamp });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [ctxRef, enabled]);
}
