/**
 * Ruling R1: a short tap test that measures this device's audio delay (speakers,
 * Bluetooth) so rhythm lessons can correct for it. Taps are stamped exactly like in a
 * lesson (useSpacebarTap), so the measurement matches what lessons judge.
 *
 * It runs on a 4/4 rhythm plan built like a lesson's: a one-bar count-in (not measured),
 * then 8 measured clicks, shown on the same beat highway (notes moving to the hit line).
 * The count shown on screen follows the audio clock, so it changes as each click is heard.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSpacebarTap, type TapEvent } from '../../../hooks/useSpacebarTap';
import { audioTimeAt } from '../../../lib/rhythm/audioClock';
import {
  CALIBRATION_CLICKS,
  calibrationMarks,
  calibrationPlan,
  calibrationSchedule,
  estimateLatencyMs,
  measuredTaps,
  readTapLatencyMs,
  saveTapLatencyMs,
  type CalibrationSchedule,
} from '../../../lib/rhythm/calibration';
import { clickVoice } from '../../../lib/rhythm/clickVoice';
import { rhythmCue, type RhythmCue } from '../../../lib/rhythm/plan';
import type { JudgedTap } from '../../../lib/rhythm/timing';
import BeatHighway from './BeatHighway';
import CountInBadge from './CountInBadge';

/** Delay between pressing Start and the first count-in click. */
const LEAD_SEC = 0.8;

type Phase =
  | { kind: 'idle' }
  | { kind: 'running'; cue: RhythmCue }
  | { kind: 'done'; ms: number }
  | { kind: 'failed' };

function scheduleClick(ctx: AudioContext, time: number, accent: boolean, countIn: boolean): void {
  const v = clickVoice(accent, countIn);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = v.type;
  osc.frequency.value = v.freq;
  gain.gain.setValueAtTime(v.gain, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + v.decaySec);
  osc.connect(gain).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + v.decaySec + 0.01);
}

const sameCue = (a: RhythmCue, b: RhythmCue) => a.kind === b.kind && (a.kind !== 'count' || (b.kind === 'count' && a.beat === b.beat));

export default function TapCalibration({ onSaved }: { onSaved?: (ms: number) => void }) {
  const plan = useMemo(calibrationPlan, []);
  const ctxRef = useRef<AudioContext | null>(null);
  const t0Ref = useRef<number | null>(null);
  const scheduleRef = useRef<CalibrationSchedule | null>(null);
  const tapsRef = useRef<number[]>([]);
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [marks, setMarks] = useState<JudgedTap[]>([]);
  const [stored, setStored] = useState(readTapLatencyMs);

  const close = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    const ctx = ctxRef.current;
    ctxRef.current = null;
    t0Ref.current = null;
    if (ctx && ctx.state !== 'closed') void ctx.close();
  }, []);
  useEffect(() => close, [close]);

  /** Seconds since plan t = 0 on the audible clock (same clock as the taps), or null when idle. */
  const now = useCallback((): number | null => {
    const ctx = ctxRef.current;
    const t0 = t0Ref.current;
    if (!ctx || t0 === null) return null;
    const p = performance.now();
    return audioTimeAt(ctx, p, p) - t0;
  }, []);

  const onTap = useCallback((tap: TapEvent) => {
    tapsRef.current.push(tap.audioTime);
    const s = scheduleRef.current;
    if (s) setMarks(calibrationMarks(tapsRef.current, s));
  }, []);
  useSpacebarTap(ctxRef, onTap, phase.kind === 'running');

  const start = useCallback(async () => {
    close();
    // Spacebar taps must not re-press the focused Start button.
    (document.activeElement as HTMLElement | null)?.blur();
    const ctx = new AudioContext({ latencyHint: 'interactive' });
    ctxRef.current = ctx;
    await ctx.resume();
    if (ctxRef.current !== ctx) return;
    const t0 = ctx.currentTime + LEAD_SEC;
    const schedule = calibrationSchedule(plan, t0);
    t0Ref.current = t0;
    scheduleRef.current = schedule;
    // Clicks only: the count-in voice first, then the beat click on every measured target.
    for (const c of plan.clicks) scheduleClick(ctx, t0 + c.time, c.accent, c.countIn);
    tapsRef.current = [];
    setMarks([]);
    setPhase({ kind: 'running', cue: { kind: 'wait' } });

    const tick = () => {
      if (ctxRef.current !== ctx) return;
      const t = now();
      if (t !== null) {
        const cue = rhythmCue(plan, t);
        setPhase((p) => (p.kind === 'running' && !sameCue(p.cue, cue) ? { kind: 'running', cue } : p));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    const endSec = schedule.measured[schedule.measured.length - 1] + 0.4 - ctx.currentTime;
    timerRef.current = window.setTimeout(() => {
      const ms = estimateLatencyMs(measuredTaps(tapsRef.current, schedule, plan.beatSec), schedule.measured);
      close();
      if (ms === null) {
        setPhase({ kind: 'failed' });
        return;
      }
      saveTapLatencyMs(ms);
      setStored(ms);
      setPhase({ kind: 'done', ms });
      onSaved?.(ms);
    }, endSec * 1000);
  }, [close, now, onSaved, plan]);

  const tapped = marks.length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-300">
        Press <strong>Start</strong>. First comes a one-bar count-in (bright ticks, {plan.beatsPerMeasure} beats): just listen.
        Then tap the <strong>spacebar</strong> each time a note reaches the line, on each of the next {CALIBRATION_CLICKS} clicks.
        Use the speakers or headphones you will practise with.
      </p>
      {phase.kind === 'running' && (
        <>
          <BeatHighway plan={plan} now={now} taps={marks} />
          <CountInBadge cue={phase.cue} tapText={`Tap on every click: ${tapped} of ${CALIBRATION_CLICKS}.`} />
        </>
      )}
      {phase.kind === 'done' && (
        <p role="status" className="text-sm font-semibold text-emerald-300">
          Your device's delay is {phase.ms} ms. Saved: rhythm lessons now correct for it.
        </p>
      )}
      {phase.kind === 'failed' && (
        <p role="status" className="text-sm font-semibold text-amber-300">
          Not enough taps lined up with the clicks. Try again: wait for the count-in, then tap as each note reaches the line.
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={phase.kind === 'running'}
          onClick={() => void start()}
          className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-violet-500 disabled:opacity-60"
        >
          {phase.kind === 'idle' ? 'Start tap test' : phase.kind === 'running' ? 'Tap along…' : 'Run it again'}
        </button>
        <span className="text-xs text-slate-500">Current correction: {stored} ms</span>
      </div>
    </div>
  );
}
