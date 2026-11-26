import { useCallback, useRef, useState } from "react";
import {
  SRS_WINDOWS,
  captureWindowMs,
  classifyDelta,
  summarize,
  type JudgedTap,
  type RhythmSummary,
  type RhythmWindows,
} from "../lib/rhythm/timing";
import type { TapEvent } from "./useSpacebarTap";

export function useRhythmJudge(
  ctxRef: { current: AudioContext | null },
  beatTimesRef: { current: number[] },
  latencyOffsetMs: number = 0,
  windows: RhythmWindows = SRS_WINDOWS
) {
  const tapsRef = useRef<JudgedTap[]>([]);
  const [taps, setTaps] = useState<JudgedTap[]>([]);

  const judgeTap = useCallback(
    (tap: TapEvent) => {
      const beats = beatTimesRef.current;
      const claimed = new Set<number>();
      for (const t of tapsRef.current) {
        if (t.beatIndex !== null) claimed.add(t.beatIndex);
      }

      let bestIndex = -1;
      let bestDelta = Infinity;
      beats.forEach((beatTime, i) => {
        if (claimed.has(i)) return;
        const delta = (tap.audioTime - beatTime) * 1000 - latencyOffsetMs;
        if (Math.abs(delta) < Math.abs(bestDelta)) {
          bestDelta = delta;
          bestIndex = i;
        }
      });

      let judged: JudgedTap;
      // Within the capture window the tap belongs to the beat (a Miss if outside Good);
      // beyond it, it is an extra tap.
      if (bestIndex >= 0 && Math.abs(bestDelta) <= captureWindowMs(beats, windows)) {
        judged = {
          rating: classifyDelta(bestDelta, windows),
          deltaMs: Math.round(bestDelta),
          beatIndex: bestIndex,
        };
      } else {
        judged = {
          rating: "Miss",
          deltaMs: bestIndex >= 0 ? Math.round(bestDelta) : 0,
          beatIndex: null,
        };
      }

      tapsRef.current = [...tapsRef.current, judged];
      setTaps(tapsRef.current);
    },
    [beatTimesRef, latencyOffsetMs, windows]
  );

  const getSummary = useCallback((): RhythmSummary => {
    const ctx = ctxRef.current;
    const now = ctx ? ctx.currentTime : 0;
    const passed = beatTimesRef.current.filter((t) => t < now - windows.goodMs / 1000).length;
    return summarize(tapsRef.current, passed, windows);
  }, [ctxRef, beatTimesRef, windows]);

  const reset = useCallback(() => {
    tapsRef.current = [];
    setTaps([]);
  }, []);

  return { judgeTap, getSummary, reset, taps };
}
