/**
 * COURSE-4: the scrolling beat highway (SDD 6.3 "Rhythm Tapping View").
 * Notes travel right → left and should be tapped as they cross the hit line.
 * Drawn on a canvas from refs inside requestAnimationFrame; React never re-renders per frame.
 */
import { useEffect, useRef } from 'react';
import { rhythmCue, segmentAt, type RhythmPlan } from '../../../lib/rhythm/plan';
import { GOOD_MS, type JudgedTap } from '../../../lib/rhythm/timing';

interface BeatHighwayProps {
  plan: RhythmPlan;
  /** Seconds since the plan started, or null when idle. */
  now: () => number | null;
  taps: JudgedTap[];
  /** Text drawn above each target (performance mode: note or chord name). */
  labels?: readonly string[];
}

const COLORS = {
  lane: 'rgba(15, 23, 42, 0.9)',
  grid: 'rgba(148, 163, 184, 0.16)',
  gridAccent: 'rgba(148, 163, 184, 0.4)',
  hitLine: '#e879f9',
  pending: '#a78bfa',
  listen: '#22d3ee',
  perfect: '#34d399',
  good: '#fbbf24',
  miss: '#fb7185',
  text: '#e2e8f0',
  textDim: '#64748b',
};

const HIT_X = 0.2;
/** Clicks of travel visible ahead of the hit line. */
const LOOKAHEAD_BEATS = 4;

export default function BeatHighway({ plan, now, taps, labels }: BeatHighwayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({ plan, now, taps, labels });
  live.current = { plan, now, taps, labels };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = canvas.getContext('2d');
    if (!g) return;
    let raf = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const { plan: p, now: getNow, taps: judged, labels: names } = live.current;
      const t = getNow() ?? -0.0001;
      const hitX = width * HIT_X;
      const pxPerSec = (width * (1 - HIT_X)) / (LOOKAHEAD_BEATS * p.beatSec);
      const xOf = (time: number) => hitX + (time - t) * pxPerSec;
      const midY = height / 2;

      g.clearRect(0, 0, width, height);
      g.fillStyle = COLORS.lane;
      g.fillRect(0, 0, width, height);

      // Beat grid
      for (const c of p.clicks) {
        const x = xOf(c.time);
        if (x < -4 || x > width + 4) continue;
        g.strokeStyle = c.accent ? COLORS.gridAccent : COLORS.grid;
        g.lineWidth = c.accent ? 2 : 1;
        g.beginPath();
        g.moveTo(x, c.accent ? 8 : 24);
        g.lineTo(x, height - (c.accent ? 8 : 24));
        g.stroke();
      }

      // Listen notes (tap-echo demo)
      if (p.mode === 'tap-echo') {
        g.lineWidth = 3;
        g.strokeStyle = COLORS.listen;
        for (const time of p.tones) {
          const x = xOf(time);
          if (x < -20 || x > width + 20) continue;
          g.globalAlpha = time < t ? 0.25 : 0.9;
          g.beginPath();
          g.arc(x, midY, 12, 0, Math.PI * 2);
          g.stroke();
        }
        g.globalAlpha = 1;
      }

      // Targets
      const rating = new Map<number, JudgedTap['rating']>();
      for (const tap of judged) if (tap.beatIndex !== null) rating.set(tap.beatIndex, tap.rating);
      // tap-along shows the notes coming; echo and read reveal them only once judged.
      const showUpcoming = p.mode === 'tap-along';
      p.targets.forEach((time, i) => {
        const x = xOf(time);
        if (x < -24 || x > width + 24) return;
        const r = rating.get(i);
        const passed = t > time + GOOD_MS / 1000;
        if (!r && !passed && !showUpcoming) return;
        const color = r === 'Perfect' ? COLORS.perfect : r === 'Good' ? COLORS.good : passed ? COLORS.miss : COLORS.pending;
        g.shadowColor = color;
        g.shadowBlur = r || !passed ? 18 : 0;
        g.globalAlpha = passed && !r ? 0.45 : 1;
        g.fillStyle = color;
        g.beginPath();
        g.arc(x, midY, 14, 0, Math.PI * 2);
        g.fill();
        g.shadowBlur = 0;
        const name = names?.[i];
        if (name) {
          g.font = '800 13px Inter, "Segoe UI", sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'bottom';
          g.fillStyle = COLORS.text;
          g.fillText(name, x, midY - 18);
        }
        g.globalAlpha = 1;
      });

      // Hit line
      g.shadowColor = COLORS.hitLine;
      g.shadowBlur = 16;
      g.strokeStyle = COLORS.hitLine;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(hitX, 6);
      g.lineTo(hitX, height - 6);
      g.stroke();
      g.beginPath();
      g.arc(hitX, midY, 20, 0, Math.PI * 2);
      g.stroke();
      g.shadowBlur = 0;

      // Status text
      const seg = t >= 0 ? segmentAt(p, t) : p.segments[0];
      g.textBaseline = 'top';
      g.font = '700 12px Inter, "Segoe UI", sans-serif';
      g.textAlign = 'right';
      if (seg?.kind === 'count-in') {
        // Count the bar the way a musician counts in: "1 2 3 4" in 4/4, "1 2 3 | 1 2 3" in 3/4.
        const cue = rhythmCue(p, Math.max(0, t));
        const beat = cue.kind === 'count' ? cue.measureBeat : 1;
        g.fillStyle = COLORS.textDim;
        g.fillText(cue.kind === 'count' && cue.of > cue.beatsPerMeasure ? `COUNT-IN · BAR ${Math.ceil(cue.beat / cue.beatsPerMeasure)}` : 'COUNT-IN', width - 16, 12);
        g.fillStyle = COLORS.text;
        g.font = '900 44px Inter, "Segoe UI", sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(String(beat), width * 0.6, midY);
      } else if (seg?.kind === 'listen') {
        g.fillStyle = COLORS.listen;
        g.fillText('LISTEN', width - 16, 12);
      } else if (seg?.kind === 'play') {
        g.fillStyle = COLORS.hitLine;
        g.fillText(p.mode === 'tap-echo' ? 'YOUR TURN' : 'TAP', width - 16, 12);
      }
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="block h-40 w-full rounded-2xl border border-violet-500/30 shadow-[0_0_30px_rgba(139,92,246,0.2)]"
      role="img"
      aria-label="Beat highway"
    />
  );
}
