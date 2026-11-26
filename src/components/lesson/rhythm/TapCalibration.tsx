/**
 * Ruling R1: a 10-second tap test that measures this device's audio delay (speakers,
 * Bluetooth) so rhythm lessons can correct for it. Taps are stamped exactly like in a
 * lesson (useSpacebarTap), so the measurement matches what lessons judge.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSpacebarTap, type TapEvent } from '../../../hooks/useSpacebarTap';
import { estimateLatencyMs, readTapLatencyMs, saveTapLatencyMs } from '../../../lib/rhythm/calibration';

const CLICKS = 8;
const GAP_SEC = 0.6;
const LEAD_SEC = 0.8;

type Phase = { kind: 'idle' } | { kind: 'running'; tapped: number } | { kind: 'done'; ms: number } | { kind: 'failed' };

function scheduleClick(ctx: AudioContext, time: number, accent: boolean): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = accent ? 1500 : 1000;
  gain.gain.setValueAtTime(0.35, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
  osc.connect(gain).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.06);
}

export default function TapCalibration({ onSaved }: { onSaved?: (ms: number) => void }) {
  const ctxRef = useRef<AudioContext | null>(null);
  const clicksRef = useRef<number[]>([]);
  const tapsRef = useRef<number[]>([]);
  const timerRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [stored, setStored] = useState(readTapLatencyMs);

  const close = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    const ctx = ctxRef.current;
    ctxRef.current = null;
    if (ctx && ctx.state !== 'closed') void ctx.close();
  }, []);
  useEffect(() => close, [close]);

  const onTap = useCallback((tap: TapEvent) => {
    tapsRef.current.push(tap.audioTime);
    setPhase((p) => (p.kind === 'running' ? { kind: 'running', tapped: p.tapped + 1 } : p));
  }, []);
  useSpacebarTap(ctxRef, onTap, phase.kind === 'running');

  const start = useCallback(async () => {
    close();
    // Spacebar taps must not re-press the focused Start button.
    (document.activeElement as HTMLElement | null)?.blur();
    const ctx = new AudioContext({ latencyHint: 'interactive' });
    ctxRef.current = ctx;
    await ctx.resume();
    const t0 = ctx.currentTime + LEAD_SEC;
    clicksRef.current = Array.from({ length: CLICKS }, (_, i) => t0 + i * GAP_SEC);
    clicksRef.current.forEach((t, i) => scheduleClick(ctx, t, i === 0));
    tapsRef.current = [];
    setPhase({ kind: 'running', tapped: 0 });
    timerRef.current = window.setTimeout(() => {
      const ms = estimateLatencyMs(tapsRef.current, clicksRef.current);
      close();
      if (ms === null) {
        setPhase({ kind: 'failed' });
        return;
      }
      saveTapLatencyMs(ms);
      setStored(ms);
      setPhase({ kind: 'done', ms });
      onSaved?.(ms);
    }, (LEAD_SEC + CLICKS * GAP_SEC + 0.4) * 1000);
  }, [close, onSaved]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-300">
        Press <strong>Start</strong>, then tap the <strong>spacebar</strong> on each of the {CLICKS} clicks, as evenly as you
        can. Use the speakers or headphones you will practise with.
      </p>
      {phase.kind === 'running' && (
        <p role="status" className="text-sm font-semibold text-violet-200">
          Listening… {phase.tapped} of {CLICKS} taps
        </p>
      )}
      {phase.kind === 'done' && (
        <p role="status" className="text-sm font-semibold text-emerald-300">
          Your device's delay is {phase.ms} ms. Saved: rhythm lessons now correct for it.
        </p>
      )}
      {phase.kind === 'failed' && (
        <p role="status" className="text-sm font-semibold text-amber-300">
          Not enough taps lined up with the clicks. Try again and tap on every click.
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
