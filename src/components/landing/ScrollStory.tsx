/**
 * Scroll-driven story: a sticky stage whose picture changes as the visitor scrolls
 * through three beats (watch, listen, climb). One short line of text per beat; the
 * drawings carry the rest.
 *
 * Smoothness (owner feedback 2026-11-28): the beat and a progress bar both come from one
 * scroll progress value (passive listener, rAF-throttled; the bar and the drift are written as
 * CSS variables, so React re-renders only when the beat changes). Nothing animates layout:
 * text keeps one size and the highlight is opacity + transform, and the drawings start
 * reacting within ~0.3 s instead of waiting up to 1.2 s.
 */
import { Camera, Mic, Trophy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { useReducedMotion } from './hooks';

const EASE = 'cubic-bezier(0.22, 0.8, 0.25, 1)';

const BEATS = [
  { icon: Camera, kicker: 'It watches', line: 'Your elbow and wrist, live, from your webcam.', tint: 'text-emerald-300' },
  { icon: Mic, kicker: 'It listens', line: 'Every note and chord you play, right in the browser.', tint: 'text-violet-300' },
  { icon: Trophy, kicker: 'You climb', line: '59 lessons from middle C to seventh chords.', tint: 'text-amber-300' },
] as const;

const PCS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const C_MAJOR_LEVELS = [1, 0.08, 0.12, 0.06, 0.82, 0.1, 0.05, 0.9, 0.07, 0.14, 0.05, 0.11];

function WatchVisual({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 320 220" className="h-full w-full" aria-hidden="true">
      <rect x="196" y="150" width="110" height="14" rx="3" fill="#1e293b" stroke="#475569" />
      <circle cx="90" cy="40" r="9" fill="#e2e8f0" />
      <line x1="90" y1="40" x2="104" y2="140" stroke="#e2e8f0" strokeWidth="10" strokeLinecap="round" />
      <g style={{ transformOrigin: '104px 140px', transform: on ? 'rotate(0deg)' : 'rotate(22deg)', transition: `transform 0.8s ${EASE} 0.1s` }}>
        <line x1="104" y1="140" x2="214" y2="142" stroke={on ? '#34d399' : '#fb7185'} strokeWidth="10" strokeLinecap="round" style={{ transition: 'stroke 0.3s 0.5s' }} />
        <circle cx="214" cy="142" r="7" fill={on ? '#34d399' : '#fb7185'} style={{ transition: 'fill 0.3s 0.5s' }} />
      </g>
      <circle cx="104" cy="140" r="8" fill={on ? '#34d399' : '#fb7185'} style={{ transition: 'fill 0.3s 0.5s' }} />
      <path d="M 100 112 A 28 28 0 0 0 130 140" fill="none" stroke="#a78bfa" strokeWidth="3" />
      <text x="134" y="114" fill="#c4b5fd" fontSize="18" fontWeight="800">{on ? '94° ✓' : '68°'}</text>
      <g opacity="0.8">
        <rect x="248" y="34" width="44" height="30" rx="6" fill="#0f172a" stroke="#34d399" strokeWidth="2" />
        <circle cx="270" cy="49" r="8" fill="none" stroke="#34d399" strokeWidth="2" />
        <path d="M 248 52 L 150 100 M 248 56 L 220 140" stroke="#34d399" strokeDasharray="4 6" opacity="0.6" />
      </g>
    </svg>
  );
}

function ListenVisual({ on }: { on: boolean }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-5">
      <div className="flex h-40 items-end gap-2">
        {C_MAJOR_LEVELS.map((lvl, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div
              className={cn('w-5 rounded-t-md', lvl > 0.5 ? 'bg-gradient-to-t from-violet-600 to-fuchsia-400' : 'bg-slate-700')}
              style={{ height: `${(on ? lvl : 0.08) * 150}px`, transition: `height 0.6s ${EASE} ${0.03 * i}s` }}
            />
            <span className={cn('text-[10px] font-bold', lvl > 0.5 && on ? 'text-white' : 'text-slate-400')}>{PCS[i]}</span>
          </div>
        ))}
      </div>
      <p
        className="rounded-full border border-emerald-500/40 bg-emerald-950/50 px-4 py-1.5 text-sm font-black text-emerald-200"
        style={{ opacity: on ? 1 : 0, transition: 'opacity 0.4s 0.45s' }}
      >
        Hearing: C · E · G — C major ✓
      </p>
    </div>
  );
}

function ClimbVisual({ on }: { on: boolean }) {
  const nodes = [
    { x: 160, y: 30 },
    { x: 230, y: 80 },
    { x: 180, y: 135 },
    { x: 100, y: 180 },
    { x: 150, y: 232 },
  ];
  return (
    <svg viewBox="0 0 320 270" className="h-full w-full" aria-hidden="true">
      {nodes.slice(1).map((n, i) => {
        const a = nodes[i];
        const mid = (n.y - a.y) / 2;
        return (
          <path
            key={i}
            d={`M ${a.x} ${a.y} C ${a.x} ${a.y + mid}, ${n.x} ${n.y - mid}, ${n.x} ${n.y}`}
            fill="none"
            stroke={on && i < 3 ? '#10b981' : '#334155'}
            strokeWidth="7"
            strokeLinecap="round"
            style={{ transition: `stroke 0.3s ${0.15 * (i + 1)}s` }}
          />
        );
      })}
      {nodes.map((n, i) => {
        const done = on && i < 3;
        const current = on && i === 3;
        return (
          <g key={i}>
            <circle
              cx={n.x}
              cy={n.y}
              r={current ? 22 : 18}
              fill={done ? '#10b981' : current ? '#8b5cf6' : '#1e293b'}
              stroke={current ? '#fff' : done ? '#6ee7b7' : '#475569'}
              strokeWidth="4"
              style={{ transition: `fill 0.3s ${0.15 * i}s` }}
            />
            <text x={n.x} y={n.y + 6} textAnchor="middle" fontSize="16" fontWeight="900" fill={done ? '#022c22' : '#e2e8f0'}>
              {done ? '✓' : current ? '♪' : '•'}
            </text>
          </g>
        );
      })}
      <text x="250" y="250" textAnchor="middle" fontSize="16" fontWeight="900" fill="#fbbf24" style={{ opacity: on ? 1 : 0, transition: 'opacity 0.3s 0.6s' }}>
        +60 XP
      </text>
    </svg>
  );
}

const VISUALS = [WatchVisual, ListenVisual, ClimbVisual];

export default function ScrollStory() {
  const [active, setActive] = useState(0);
  const sectionRef = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = section.getBoundingClientRect();
      const range = rect.height - window.innerHeight;
      const progress = range > 0 ? Math.min(1, Math.max(0, -rect.top / range)) : 0;
      section.style.setProperty('--story-progress', progress.toFixed(4));
      const beat = Math.min(BEATS.length - 1, Math.floor(progress * BEATS.length));
      setActive((a) => (a === beat ? a : beat));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const fade = reduced ? 'none' : `opacity 0.5s ${EASE}, transform 0.5s ${EASE}`;

  return (
    // One extra screen of height so the last beat stays pinned as long as the others.
    <section ref={sectionRef} className="relative" style={{ height: `${(BEATS.length + 1) * 100}vh` }} aria-label="How MUZ works">
      <div className="sticky top-0 mx-auto grid h-dvh max-w-6xl items-center gap-10 px-8 md:grid-cols-[1fr_1.1fr]">
        <ol className="space-y-8">
          {BEATS.map((b, i) => {
            const Icon = b.icon;
            const on = i === active;
            return (
              <li
                key={b.kicker}
                aria-current={on ? 'step' : undefined}
                style={{ opacity: on ? 1 : 0.3, transform: on || reduced ? 'none' : 'translateX(-6px)', transition: fade }}
              >
                <p className={cn('flex items-center gap-2 text-xs font-black uppercase tracking-[0.3em]', b.tint)}>
                  <Icon className="h-4 w-4" aria-hidden="true" /> {b.kicker}
                </p>
                <p className="mt-2 text-3xl font-black leading-tight text-white">{b.line}</p>
              </li>
            );
          })}
          <li aria-hidden="true" className="pt-2">
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full w-full origin-left rounded-full bg-gradient-to-r from-emerald-400 via-violet-400 to-amber-300"
                style={{ transform: 'scaleX(var(--story-progress, 0))' }}
              />
            </div>
          </li>
        </ol>

        <div
          className="relative h-[360px] rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-6 shadow-2xl"
          // A slow, continuous drift across the whole story (no jump at a beat change).
          style={reduced ? undefined : { transform: 'translate3d(0, calc((var(--story-progress, 0) - 0.5) * -32px), 0)' }}
        >
          {VISUALS.map((Visual, i) => (
            <div
              key={i}
              className="absolute inset-6"
              style={{
                opacity: i === active ? 1 : 0,
                transform: i === active || reduced ? 'none' : `translateY(${i < active ? -16 : 16}px) scale(0.98)`,
                transition: fade,
              }}
              aria-hidden={i !== active}
            >
              <Visual on={i === active} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
