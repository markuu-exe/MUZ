import { useCallback, useRef, useState } from "react";
import {
  GOOD_MS,
  classifyDelta,
  summarize,
  type JudgedTap,
  type RhythmSummary,
} from "../lib/rhythm/timing";
import type { TapEvent } from "./useSpacebarTap";

export function useRhythmJudge(
  ctxRef: { current: AudioContext | null },
  beatTimesRef: { current: number[] },
  latencyOffsetMs: number = 0
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
      if (bestIndex >= 0 && Math.abs(bestDelta) <= GOOD_MS) {
        judged = {
          rating: classifyDelta(bestDelta),
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
    [beatTimesRef, latencyOffsetMs]
  );

  const getSummary = useCallback((): RhythmSummary => {
    const ctx = ctxRef.current;
    const now = ctx ? ctx.currentTime : 0;
    const passed = beatTimesRef.current.filter((t) => t < now - 0.05).length;
    return summarize(tapsRef.current, passed);
  }, [ctxRef, beatTimesRef]);

  const reset = useCallback(() => {
    tapsRef.current = [];
    setTaps([]);
  }, []);

  return { judgeTap, getSummary, reset, taps };
}
