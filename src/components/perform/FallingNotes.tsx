/**
 * Falling-notes view (owner request 2026-11-28): tiles fall toward the keys to play and reach
 * the keyboard on their beat. In time: tiles move with the song clock. Wait for me: the view
 * glides to the step being waited on and holds there until it is played.
 * Drawn on a canvas inside requestAnimationFrame from refs, like BeatHighway; React does not
 * re-render per frame.
 */
import { useEffect, useMemo, useRef } from 'react';
import { midiToNoteName } from '../../audio/dsp/pitch';
import { keyboardLayout, keyboardRange, targetKeys } from '../../performance/falling';
import type { EventResult } from '../../performance/judge';
import type { SongPlan } from '../../performance/plan';
import { targetLabel, type Song } from '../../performance/songs';

interface FallingNotesProps {
  song: Song;
  plan: SongPlan;
  mode: 'time' | 'wait';
  /** Plan seconds (In time), or null when idle. */
  now: () => number | null;
  running: boolean;
  /** Wait for me: the step being waited on. */
  current: number;
  /** In time: judged events so far. */
  results: readonly EventResult[];
  /** Wait for me: wrong attempts per step. */
  wrongs: readonly number[];
  reducedMotion: boolean;
}

const COLORS = {
  lane: 'rgba(15, 23, 42, 0.92)',
  guide: 'rgba(148, 163, 184, 0.10)',
  guideC: 'rgba(148, 163, 184, 0.22)',
  hitLine: '#e879f9',
  pending: '#8b5cf6',
  active: '#c4b5fd',
  perfect: '#34d399',
  good: '#fbbf24',
  miss: '#fb7185',
  retried: '#f59e0b',
  white: '#e2e8f0',
  whiteLit: '#ddd6fe',
  black: '#0f172a',
  text: '#0b1020',
  textLight: '#f8fafc',
};
const KEYBOARD_H = 64;
/** Beats of music visible above the keys. */
const LOOKAHEAD_BEATS = 4;

export default function FallingNotes(props: FallingNotesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef(props);
  live.current = props;
  const keysPerEvent = useMemo(() => props.song.events.map((e) => targetKeys(e.target)), [props.song]);
  const range = useMemo(() => keyboardRange(keysPerEvent.flat()), [keysPerEvent]);
  const geo = useRef({ keysPerEvent, range });
  geo.current = { keysPerEvent, range };

  useEffect(() => {
    const canvas = canvasRef.current;
    const g = canvas?.getContext('2d');
    if (!canvas || !g) return;
    let raf = 0;
    let width = 0;
    let height = 0;
    let waitBeat = 0;
    let last = performance.now();
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
      const p = live.current;
      const { keysPerEvent: evKeys, range: r } = geo.current;
      const nowMs = performance.now();
      const dt = Math.min(0.1, (nowMs - last) / 1000);
      last = nowMs;
      const keys = keyboardLayout(r.lo, r.hi, width);
      const keyAt = new Map(keys.map((k) => [k.midi, k]));
      const hitY = height - KEYBOARD_H;
      const pxPerBeat = hitY / LOOKAHEAD_BEATS;
      const events = p.song.events;

      // Position on the song, in beats from the first note.
      let pos: number;
      if (p.mode === 'time') {
        const t = p.now();
        const countIn = p.plan.targets[0] - (events[0]?.beat ?? 0) * p.plan.beatSec;
        pos = t === null ? -0.6 : (t - countIn) / p.plan.beatSec;
      } else {
        const target = p.running || p.current > 0 ? (events[p.current]?.beat ?? 0) : -0.6;
        waitBeat = p.reducedMotion ? target : waitBeat + (target - waitBeat) * Math.min(1, dt * 9);
        pos = waitBeat;
      }

      g.clearRect(0, 0, width, height);
      g.fillStyle = COLORS.lane;
      g.fillRect(0, 0, width, hitY);
      for (const k of keys) {
        if (k.black) continue;
        g.fillStyle = k.midi % 12 === 0 ? COLORS.guideC : COLORS.guide;
        g.fillRect(Math.round(k.x), 0, 1, hitY);
      }

      const rating = new Map(p.results.map((x) => [x.index, x.rating]));
      const lit = new Map<number, string>();
      events.forEach((e, i) => {
        const yBottom = hitY - (e.beat - pos) * pxPerBeat;
        const yTop = yBottom - e.length * pxPerBeat + 3;
        if (yBottom < -4 || yTop > hitY + 40) return;
        const rt = rating.get(i);
        const sounding = pos >= e.beat - 0.05 && pos < e.beat + e.length;
        let color: string;
        if (p.mode === 'time') color = rt === 'Perfect' ? COLORS.perfect : rt === 'Good' ? COLORS.good : rt === 'Miss' ? COLORS.miss : sounding ? COLORS.active : COLORS.pending;
        else color = i < p.current ? ((p.wrongs[i] ?? 0) > 0 ? COLORS.retried : COLORS.perfect) : i === p.current && p.running ? COLORS.active : COLORS.pending;
        const isNow = p.mode === 'wait' ? i === p.current && p.running : sounding && p.running;
        for (const m of evKeys[i]) {
          const k = keyAt.get(m);
          if (!k) continue;
          const pad = k.black ? 1 : 2;
          const top = Math.max(0, yTop);
          const bottom = Math.min(hitY, yBottom);
          if (bottom > top) {
            g.globalAlpha = rt === 'Miss' ? 0.55 : 1;
            g.fillStyle = color;
            g.shadowColor = color;
            g.shadowBlur = isNow ? 14 : 0;
            g.beginPath();
            g.roundRect(k.x + pad, top, k.w - pad * 2, bottom - top, 5);
            g.fill();
            g.shadowBlur = 0;
            g.globalAlpha = 1;
            if (bottom - top > 16 && k.w > 14) {
              g.font = '800 10px Inter, "Segoe UI", sans-serif';
              g.textAlign = 'center';
              g.textBaseline = 'bottom';
              g.fillStyle = COLORS.text;
              const label = events[i].target.kind === 'note' ? midiToNoteName(m) : m === evKeys[i][0] ? targetLabel(events[i].target) : '';
              if (label) g.fillText(label, k.x + k.w / 2, bottom - 3);
            }
          }
          if (isNow) lit.set(m, color);
        }
      });

      // Hit line
      g.fillStyle = COLORS.hitLine;
      g.shadowColor = COLORS.hitLine;
      g.shadowBlur = 10;
      g.fillRect(0, hitY - 1.5, width, 3);
      g.shadowBlur = 0;

      // Keyboard: whites, then blacks on top; keys to play now are lit.
      for (const k of keys) {
        if (k.black) continue;
        g.fillStyle = lit.get(k.midi) ?? COLORS.white;
        g.fillRect(k.x + 0.5, hitY + 2, k.w - 1, KEYBOARD_H - 2);
        if (k.midi % 12 === 0 && k.w > 16) {
          g.font = '700 9px Inter, "Segoe UI", sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'bottom';
          g.fillStyle = '#64748b';
          g.fillText(midiToNoteName(k.midi), k.x + k.w / 2, height - 3);
        }
      }
      for (const k of keys) {
        if (!k.black) continue;
        g.fillStyle = lit.get(k.midi) ?? COLORS.black;
        g.fillRect(k.x, hitY + 2, k.w, KEYBOARD_H * 0.6);
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  const keyCount = range.hi - range.lo + 1;
  return (
    <canvas
      ref={canvasRef}
      className="block h-72 w-full rounded-2xl border border-slate-800"
      role="img"
      aria-label={`Falling notes on a ${keyCount}-key keyboard from ${midiToNoteName(range.lo)} to ${midiToNoteName(range.hi)}. Tiles reach the keys when it is time to play them.`}
    />
  );
}


