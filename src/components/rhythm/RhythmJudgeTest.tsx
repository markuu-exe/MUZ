import { useState } from "react";
import { useMetronome } from "../../hooks/useMetronome";
import { useSpacebarTap } from "../../hooks/useSpacebarTap";
import { useRhythmJudge } from "../../hooks/useRhythmJudge";
import { classifyDelta, type RhythmSummary } from "../../lib/rhythm/timing";

export default function RhythmJudgeTest() {
  const [bpm, setBpm] = useState<number>(80);
  const [beats, setBeats] = useState<number>(4);
  const [latency, setLatency] = useState<number>(0);
  const [summary, setSummary] = useState<RhythmSummary | null>(null);
  const [boundary, setBoundary] = useState<number>(25);

  const { start, stop, isRunning, beatInMeasure, measure, beatTimesRef, ctxRef } =
    useMetronome(bpm, beats);
  const { judgeTap, getSummary, reset, taps } = useRhythmJudge(ctxRef, beatTimesRef, latency);

  useSpacebarTap(ctxRef, judgeTap, isRunning);

  const handleButton = () => {
    if (isRunning) {
      setSummary(getSummary()); 
      stop();
    } else {
      reset();
      setSummary(null);
      start();
    }
  };

  const last = taps[taps.length - 1];

  return (
    <div className="bg-slate-950 text-white p-10 space-y-6">
      <p className="text-sm text-emerald-400">KAN-244 · Timing window test</p>
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
        <label className="block mb-2">Latency offset: {latency} ms</label>
        <input
          type="range"
          min={0}
          max={200}
          value={latency}
          onChange={(e) => setLatency(Number(e.target.value))}
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
        onClick={handleButton}
        className="rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-black"
      >
        {isRunning ? "Stop and show results" : "Start"}
      </button>

      <p className="text-4xl font-bold">
        {last
          ? `${last.rating.toUpperCase()} (${last.deltaMs > 0 ? "+" : ""}${last.deltaMs} ms)`
          : "Press SPACE on the beat"}
      </p>

      {summary && (
        <div className="rounded-lg bg-slate-800 p-5 space-y-1 text-lg">
          <p>Perfect: {summary.perfect}</p>
          <p>Good: {summary.good}</p>
          <p>Miss: {summary.miss}</p>
          <p>Beats played: {summary.passedBeats}</p>
          <p>Score: {summary.score}</p>
          <p>Accuracy: {summary.accuracy}%</p>
          <p>Average deviation: {summary.avgDeviation} ms</p>
          <p>Consistency: {summary.consistency}%</p>
        </div>
      )}

      <div className="rounded-lg bg-slate-900 p-5 space-y-2">
        <p className="font-semibold">Boundary check (no metronome needed)</p>
        <input
          type="number"
          value={boundary}
          onChange={(e) => setBoundary(Number(e.target.value))}
          className="rounded bg-slate-800 px-3 py-2 w-32"
        />{" "}
        ms off the beat → <b>{classifyDelta(boundary)}</b>
      </div>
    </div>
  );
}
