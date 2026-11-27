/**
 * Ruling R1: a short tap test that measures this device's audio delay (speakers,
 * Bluetooth) so rhythm lessons can correct for it. Taps are stamped exactly like in a
 * lesson (useSpacebarTap), so the measurement matches what lessons judge.
 *
 * A 4-beat count-in (the same voice as rhythm lessons) comes first and is not measured;
 * the countdown on screen follows the audio clock, so it changes as each click is heard.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSpacebarTap, type TapEvent } from '../../../hooks/useSpacebarTap';
import { audioTimeAt } from '../../../lib/rhythm/audioClock';
import {
  CALIBRATION_COUNT_IN,
  calibrationCue,
  calibrationSchedule,
  estimateLatencyMs,
  measuredTaps,
  readTapLatencyMs,
  saveTapLatencyMs,
  type CalibrationCue,
  type CalibrationSchedule,
} from '../../../lib/rhythm/calibration';
import { clickVoice } from '../../../lib/rhythm/clickVoice';
import { cn } from '../../../lib/cn';

const CLICKS = 8;
const GAP_SEC = 0.6;
const LEAD_SEC = 0.8;

type Phase =
  | { kind: 'idle' }
  | { kind: 'running'; tapped: number; cue: CalibrationCue }
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

function CountInDots({ cue }: { cue: CalibrationCue }) {
  const beat = cue.kind === 'count' ? cue.beat : cue.kind === 'tap' ? CALIBRATION_COUNT_IN : 0;
  return (
    <span className="flex gap-1.5" aria-hidden="true">
      {Array.from({ length: CALIBRATION_COUNT_IN }, (_, i) => (
        <span
          key={i}
          className={cn('h-2.5 w-2.5 rounded-full border border-violet-300', i < beat ? 'bg-violet-300' : 'bg-transparent')}
        />
      ))}
    </span>
  );
}

export default function TapCalibration({ onSaved }: { onSaved?: (ms: number) => void }) {
  const ctxRef = useRef<AudioContext | null>(null);
  const scheduleRef = useRef<CalibrationSchedule | null>(null);
  const tapsRef = useRef<number[]>([]);
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [stored, setStored] = useState(readTapLatencyMs);

  const close = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    const ctx = ctxRef.current;
    ctxRef.current = null;
    if (ctx && ctx.state !== 'closed') void ctx.close();
  }, []);
  useEffect(() => close, [close]);

  const onTap = useCallback((tap: TapEvent) => {
    tapsRef.current.push(tap.audioTime);
    const s = scheduleRef.current;
    // Only taps after the count-in are counted on screen (and measured).
    if (!s || tap.audioTime < s.measured[0] - GAP_SEC / 2) return;
    setPhase((p) => (p.kind === 'running' ? { ...p, tapped: p.tapped + 1 } : p));
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
    const schedule = calibrationSchedule(ctx.currentTime + LEAD_SEC, GAP_SEC, CLICKS);
    scheduleRef.current = schedule;
    schedule.countIn.forEach((t, i) => scheduleClick(ctx, t, i === 0, true));
    schedule.measured.forEach((t, i) => scheduleClick(ctx, t, i === 0, false));
    tapsRef.current = [];
    setPhase({ kind: 'running', tapped: 0, cue: { kind: 'wait' } });

    // The countdown follows what is audible now (same clock as the taps), not a wall-clock timer.
    const tick = () => {
      if (ctxRef.current !== ctx) return;
      const now = performance.now();
      const cue = calibrationCue(audioTimeAt(ctx, now, now), schedule);
      setPhase((p) =>
        p.kind === 'running' && (p.cue.kind !== cue.kind || (cue.kind === 'count' && p.cue.kind === 'count' && p.cue.beat !== cue.beat))
          ? { ...p, cue }
          : p,
      );
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    const endSec = schedule.measured[schedule.measured.length - 1] + 0.4 - ctx.currentTime;
    timerRef.current = window.setTimeout(() => {
      const ms = estimateLatencyMs(measuredTaps(tapsRef.current, schedule, GAP_SEC), schedule.measured);
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
  }, [close, onSaved]);

  const cue = phase.kind === 'running' ? phase.cue : null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-300">
        Press <strong>Start</strong>. You will hear a count-in of {CALIBRATION_COUNT_IN} bright ticks: just listen. Then tap
        the <strong>spacebar</strong> on each of the next {CLICKS} clicks, as evenly as you can. Use the speakers or
        headphones you will practise with.
      </p>
      {phase.kind === 'running' && cue && (
        <div className="flex items-center gap-4 rounded-xl border border-violet-500/40 bg-violet-950/40 px-4 py-3">
          <span
            className={cn(
              'flex h-12 min-w-12 items-center justify-center rounded-full border-2 px-2 text-xl font-black',
              cue.kind === 'tap' ? 'border-emerald-300 text-emerald-200' : 'border-violet-300 text-white',
            )}
            aria-hidden="true"
          >
            {cue.kind === 'count' ? CALIBRATION_COUNT_IN - cue.beat + 1 : cue.kind === 'tap' ? 'TAP' : '…'}
          </span>
          <div className="space-y-1">
            <p role="status" className="text-sm font-semibold text-violet-100">
              {cue.kind === 'wait' && 'Get ready: listen for the count-in.'}
              {cue.kind === 'count' && `Count-in ${cue.beat} of ${cue.of}. Listen, don't tap yet.`}
              {cue.kind === 'tap' && `Tap now on every click: ${phase.tapped} of ${CLICKS} taps.`}
            </p>
            <CountInDots cue={cue} />
          </div>
        </div>
      )}
      {phase.kind === 'done' && (
        <p role="status" className="text-sm font-semibold text-emerald-300">
          Your device's delay is {phase.ms} ms. Saved: rhythm lessons now correct for it.
        </p>
      )}
      {phase.kind === 'failed' && (
        <p role="status" className="text-sm font-semibold text-amber-300">
          Not enough taps lined up with the clicks. Try again: wait for the count-in, then tap on every click.
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
