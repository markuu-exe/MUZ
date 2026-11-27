import { useEffect, useRef } from "react";
import { audioTimeAt } from "../lib/rhythm/audioClock";

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

      // Guarded: getOutputTimestamp is missing in some browsers and reports 0 before output starts.
      onTapRef.current({ audioTime: audioTimeAt(ctx, e.timeStamp), perfTime: e.timeStamp });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [ctxRef, enabled]);
}
