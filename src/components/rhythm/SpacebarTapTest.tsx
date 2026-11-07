import { useState } from "react";
import { useMetronome } from "../../hooks/useMetronome";
import { useSpacebarTap } from "../../hooks/useSpacebarTap";

export default function SpacebarTapTest() {
  const [bpm, setBpm] = useState<number>(80);
  const [beats, setBeats] = useState<number>(4);
  const [lastOffset, setLastOffset] = useState<number | null>(null);
  const { start, stop, isRunning, beatInMeasure, measure, beatTimesRef, ctxRef } =
    useMetronome(bpm, beats);

  useSpacebarTap(
    ctxRef,
    (tap) => {
      let best = Infinity;
      for (const t of beatTimesRef.current) {
        const diff = (tap.audioTime - t) * 1000;
        if (Math.abs(diff) < Math.abs(best)) best = diff;
      }
      if (best !== Infinity) setLastOffset(Math.round(best));
    },
    isRunning
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white p-10 space-y-6">
        <p className="text-sm text-emerald-400">Spacebar tap test</p>
      <h1 className="text-5xl font-bold">
        Measure {measure} · Beat {beatInMeasure}
      </h1>

      <div>
        <label className="block mb-2">BPM: {bpm}</label>
        <input
          type="range"
          min={40}
          max={200}
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="w-80"
        />
      </div>

      <div>
        <label className="block mb-2">Beats per measure</label>
        <select
          value={beats}
          onChange={(e) => setBeats(Number(e.target.value))}
          className="rounded bg-slate-800 px-3 py-2"
        >
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
          <option value={6}>6</option>
        </select>
      </div>

      <button
        onClick={isRunning ? stop : start}
        className="rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-black"
      >
        {isRunning ? "Stop" : "Start"}
      </button>

      <p className="text-2xl">
        Last tap:{" "}
        {lastOffset === null
          ? "press SPACE on the beat"
          : `${lastOffset > 0 ? "+" : ""}${lastOffset} ms from the beat`}
      </p>
    </div>
  );
}
