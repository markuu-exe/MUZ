/**
 * T-09: live posture-pipeline figures for the T-19 hardware benchmark (SRS 3.4).
 * Shown only with `?debug` in the URL. It re-renders every 500 ms; the HUD canvas
 * itself stays outside React, so the overlay does not touch the HUD's frame budget.
 */
import { useEffect, useRef, useState } from 'react';
import type { HudEngine, HudStats } from '../../../vision/hud/HudEngine';
import { InferenceStats, type InferenceSummary } from '../../../vision/pipeline/inferenceStats';
import type { FrameLoop } from '../../../vision/pipeline/FrameLoop';

const REFRESH_MS = 500;

/** True when the page URL asks for the performance overlay (`?debug` or `?debug=perf`). */
export function isPerfDebug(search: string = typeof window === 'undefined' ? '' : window.location.search): boolean {
  return new URLSearchParams(search).has('debug');
}

interface PerfOverlayProps {
  frameLoop: FrameLoop;
  engine: HudEngine | null;
}

function fmt(value: number | null | undefined, digits = 1): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—';
}

export default function PerfOverlay({ frameLoop, engine }: PerfOverlayProps) {
  const stats = useRef(new InferenceStats());
  const [view, setView] = useState<{ worker: InferenceSummary; hud: HudStats | null } | null>(null);

  useEffect(
    () => frameLoop.on('result', (r) => stats.current.record(r.inferenceMs, performance.now())),
    [frameLoop],
  );

  useEffect(() => {
    const id = window.setInterval(() => setView({ worker: stats.current.summary(), hud: engine?.getStats() ?? null }), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [engine]);

  const w = view?.worker;
  const h = view?.hud;
  const rows: Array<[string, string]> = [
    ['delegate', frameLoop.delegate ?? '—'],
    ['worker Hz', fmt(w?.hz)],
    ['interval p50/p95 ms', `${fmt(w?.intervalP50)} / ${fmt(w?.intervalP95)}`],
    ['inference p50/p95 ms', `${fmt(w?.inferenceP50)} / ${fmt(w?.inferenceP95)}`],
    ['HUD fps', fmt(h?.rafFps)],
    ['HUD cost p95 ms', fmt(h?.p95CostMs, 2)],
    ['HUD interval ms', fmt(h?.inferenceIntervalMs)],
    ['samples', String(w?.samples ?? 0)],
  ];

  return (
    <div
      data-testid="perf-overlay"
      className="pointer-events-none absolute left-2 top-2 z-10 rounded-lg bg-black/75 px-2 py-1 font-mono text-[11px] leading-4 text-emerald-300"
    >
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3">
          <span className="text-slate-400">{label}</span>
          <span>{value}</span>
        </div>
      ))}
    </div>
  );
}
