/**
 * Landing "wow" object: a playable keyboard drawn in CSS 3D (no 3D library).
 * Tilts toward the pointer, plays notes on click or on the computer keyboard
 * (A S D F … for white keys, W E T Y U … for black keys) and releases a floating
 * note per press. Before the visitor interacts it silently "plays" a phrase as a
 * hint. Reduced motion: no tilt, no idle phrase, no floating notes.
 */
import { MuzMark } from '../brand/MuzLogo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { isBlackKey, midiToName } from '../../lib/theory/notes';
import { playNote } from '../../lib/theory/playNote';
import { useReducedMotion } from './hooks';

const START = 60; // C4
const END = 76; // E5
const WHITE_W = 46;
const BLACK_W = 28;

const WHITE_KEYS = 'asdfghjkl;'.split('');
const BLACK_KEYS: Record<number, string> = { 61: 'w', 63: 'e', 66: 't', 68: 'y', 70: 'u', 73: 'o', 75: 'p' };

/** Ode to Joy, opening phrase: the idle hint (lights only, no sound). */
const IDLE_PHRASE = [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62];
const GLYPHS = ['♪', '♫', '♩', '♬'];

interface Floater {
  id: number;
  x: number;
  glyph: string;
  hue: number;
}

export default function HeroKeyboard() {
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [down, setDown] = useState<Set<number>>(new Set());
  const [idleKey, setIdleKey] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const nextId = useRef(0);

  const whites: number[] = [];
  const blacks: Array<{ midi: number; left: number }> = [];
  for (let m = START; m <= END; m++) {
    if (isBlackKey(m)) blacks.push({ midi: m, left: whites.length * WHITE_W - BLACK_W / 2 });
    else whites.push(m);
  }
  const keyOf = new Map<string, number>();
  whites.forEach((m, i) => WHITE_KEYS[i] && keyOf.set(WHITE_KEYS[i], m));
  for (const [m, k] of Object.entries(BLACK_KEYS)) keyOf.set(k, Number(m));
  const xOf = (midi: number) => {
    const b = blacks.find((k) => k.midi === midi);
    return b ? b.left + BLACK_W / 2 : whites.indexOf(midi) * WHITE_W + WHITE_W / 2;
  };

  const press = useCallback(
    (midi: number) => {
      setTouched(true);
      playNote(midi, 1.1);
      setDown((s) => new Set(s).add(midi));
      window.setTimeout(() => setDown((s) => {
        const n = new Set(s);
        n.delete(midi);
        return n;
      }), 180);
      if (reduced) return;
      const id = nextId.current++;
      setFloaters((f) => [...f.slice(-14), { id, x: xOf(midi), glyph: GLYPHS[id % GLYPHS.length], hue: (midi - START) * 14 }]);
      window.setTimeout(() => setFloaters((f) => f.filter((p) => p.id !== id)), 1400);
    },
    // xOf depends only on constants
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reduced],
  );

  // Computer keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const midi = keyOf.get(e.key.toLowerCase());
      if (midi === undefined) return;
      press(midi);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Idle hint: light up a phrase until the visitor plays a key.
  useEffect(() => {
    if (reduced || touched) {
      setIdleKey(null);
      return;
    }
    let i = 0;
    const timer = window.setInterval(() => {
      setIdleKey(i < IDLE_PHRASE.length ? IDLE_PHRASE[i] : null);
      i = (i + 1) % (IDLE_PHRASE.length + 4);
    }, 420);
    return () => window.clearInterval(timer);
  }, [reduced, touched]);

  const onPointerMove = (e: React.PointerEvent) => {
    if (reduced || !stageRef.current) return;
    const r = stageRef.current.getBoundingClientRect();
    setTilt({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 });
  };

  const width = whites.length * WHITE_W;
  const lit = (m: number) => down.has(m) || idleKey === m;

  return (
    <div
      ref={stageRef}
      onPointerMove={onPointerMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      className="relative flex w-full flex-col items-center"
      style={{ perspective: 1100 }}
    >
      <div
        className="relative rounded-[26px] border border-white/10 bg-gradient-to-b from-slate-800 to-slate-950 p-4 pt-10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8),0_0_60px_rgba(139,92,246,0.18)] transition-transform duration-200 ease-out"
        style={{ transform: reduced ? 'rotateX(14deg)' : `rotateX(${16 - tilt.y * 10}deg) rotateY(${tilt.x * 14}deg)`, transformStyle: 'preserve-3d' }}
      >
        <div className="absolute left-5 top-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
          <MuzMark size={14} variant="flat" className="text-slate-300" /> MUZ
        </div>

        {/* floating notes */}
        <div className="pointer-events-none absolute inset-x-4 top-0 h-0" aria-hidden="true">
          {floaters.map((f) => (
            <span
              key={f.id}
              className="muz-float-note absolute -top-2 text-2xl font-black"
              style={{ left: f.x + 16, color: `hsl(${260 + f.hue} 90% 72%)` }}
            >
              {f.glyph}
            </span>
          ))}
        </div>

        <div className="relative select-none" style={{ width, height: 170 }}>
          <div className="flex">
            {whites.map((m, i) => (
              <button
                key={m}
                type="button"
                aria-label={`Play ${midiToName(m)}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  press(m);
                }}
                className={
                  'relative flex flex-col items-center justify-end rounded-b-lg border border-slate-400/60 pb-2 text-[10px] font-semibold transition-all duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ' +
                  (lit(m)
                    ? 'translate-y-1 bg-gradient-to-b from-violet-200 to-violet-400 text-violet-900 shadow-[0_2px_0_#6d28d9,0_0_24px_rgba(167,139,250,0.7)]'
                    : 'bg-gradient-to-b from-white to-slate-200 text-slate-400 shadow-[0_6px_0_#94a3b8]')
                }
                style={{ width: WHITE_W, height: 170 }}
              >
                <span className="uppercase opacity-70">{WHITE_KEYS[i]}</span>
              </button>
            ))}
          </div>
          {blacks.map(({ midi, left }) => (
            <button
              key={midi}
              type="button"
              aria-label={`Play ${midiToName(midi)}`}
              onPointerDown={(e) => {
                e.preventDefault();
                press(midi);
              }}
              className={
                'absolute top-0 z-10 flex items-end justify-center rounded-b-md pb-1.5 text-[9px] font-semibold uppercase transition-all duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ' +
                (lit(midi)
                  ? 'translate-y-0.5 bg-gradient-to-b from-violet-500 to-fuchsia-600 text-white shadow-[0_0_20px_rgba(217,70,239,0.7)]'
                  : 'bg-gradient-to-b from-slate-700 to-slate-950 text-slate-500 shadow-[0_5px_0_#020617]')
              }
              style={{ left, width: BLACK_W, height: 104 }}
            >
              {BLACK_KEYS[midi]}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-6 text-xs text-slate-400">
        {touched ? 'Nice. That is the sound of your first lesson.' : 'Go on, play it: click the keys or type A S D F G…'}
      </p>
    </div>
  );
}
