import { MuzLogo, MuzMark } from '../brand/MuzLogo';
import { useEffect, useState } from 'react';
import { ArrowRight, ChevronDown, Presentation } from 'lucide-react';
import { COURSE_LESSONS, COURSE_UNITS } from '../../content';
import { cn } from '../../lib/cn';
import HeroKeyboard from './HeroKeyboard';
import ScrollStory from './ScrollStory';
import { useInView, useReducedMotion } from './hooks';

interface LandingPageProps {
  onSignIn: () => void;
  onSignUp: () => void;
  onDemo: () => void;
}

/** Counts up to `value` the first time it scrolls into view. */
function Stat({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
  const reduced = useReducedMotion();
  const { ref, seen } = useInView<HTMLDivElement>(0.6);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!seen) return;
    if (reduced) {
      setShown(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / 900);
      setShown(Math.round(value * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [seen, value, reduced]);
  return (
    <div ref={ref} className="text-center">
      <p className="bg-gradient-to-b from-white to-slate-400 bg-clip-text text-6xl font-black tabular-nums text-transparent">
        {shown}
        {suffix}
      </p>
      <p className="mt-2 text-xs font-bold uppercase tracking-[0.25em] text-slate-400">{label}</p>
    </div>
  );
}

function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const { ref, seen } = useInView<HTMLDivElement>(0.2);
  return (
    <div ref={ref} className={cn('muz-reveal', seen && 'is-in', className)}>
      {children}
    </div>
  );
}

export default function LandingPage({ onSignIn, onSignUp, onDemo }: LandingPageProps) {
  return (
    <div className="relative min-h-dvh w-full overflow-x-clip bg-muz-bg text-muz-text">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[900px] bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.22),transparent_60%)]" aria-hidden="true" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-8 py-6">
        <MuzLogo size={36} />
        <nav className="flex items-center gap-3">
          <button type="button" onClick={onSignIn} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800/80 hover:text-white">
            Sign in
          </button>
          <button type="button" onClick={onSignUp} className="rounded-xl bg-muz-accent px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-muz-accentStrong">
            Create account
          </button>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid min-h-[calc(100dvh-88px)] max-w-6xl items-center gap-12 px-8 pb-16 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h1 className="text-5xl font-black leading-[0.95] tracking-tight text-white xl:text-6xl">
            Piano lessons that <span className="text-muz-accent">see</span> and <span className="text-violet-400">hear</span> you.
          </h1>
          <p className="mt-6 max-w-md text-lg text-slate-300">Sit at your keyboard. MUZ coaches the rest.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onSignUp}
              className="group inline-flex items-center gap-2 rounded-2xl bg-muz-accent px-6 py-3.5 text-sm font-bold text-slate-950 shadow-glow transition hover:bg-muz-accentStrong"
            >
              Start learning free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onDemo}
              className="inline-flex items-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-6 py-3.5 text-sm font-bold text-amber-200 transition hover:bg-amber-500/20"
            >
              <Presentation className="h-4 w-4" aria-hidden="true" /> Try Demo Mode
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">Demo Mode: every lesson unlocked, nothing saved.</p>
        </div>
        <HeroKeyboard />
        <a
          href="#how"
          className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 flex-col items-center text-xs text-slate-500 transition hover:text-white lg:flex"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          Scroll
          <ChevronDown className="h-4 w-4 motion-safe:animate-bounce" aria-hidden="true" />
        </a>
      </section>

      {/* Scroll story */}
      <div id="how" className="relative z-10">
        <ScrollStory />
      </div>

      {/* Numbers */}
      <section className="relative z-10 mx-auto max-w-5xl px-8 py-24">
        <Reveal className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <Stat value={COURSE_LESSONS.length} label="Lessons" />
          <Stat value={COURSE_UNITS.length} label="Units" />
          <Stat value={3} label="Levels" />
          <Stat value={0} label="Uploads of you" />
        </Reveal>
        <Reveal className="mt-10 text-center">
          <p className="text-sm text-slate-400">Camera and microphone are processed on your computer. Nothing is recorded or uploaded.</p>
        </Reveal>
      </section>

      {/* Closing call */}
      <section className="relative z-10 mx-auto max-w-6xl px-8 pb-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-violet-500/30 bg-gradient-to-br from-violet-950 via-slate-950 to-emerald-950/60 p-12 text-center">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-500/30 blur-3xl" aria-hidden="true" />
            <h2 className="relative text-4xl font-black text-white">Your first lesson takes just a few minutes.</h2>
            <p className="relative mt-3 text-sm text-slate-300">Desktop or laptop, webcam, microphone, and a keyboard or piano.</p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={onSignUp} className="rounded-2xl bg-muz-accent px-7 py-3.5 text-sm font-bold text-slate-950 shadow-glow transition hover:bg-muz-accentStrong">
                Create a free account
              </button>
              <button type="button" onClick={onSignIn} className="rounded-2xl border border-slate-600 px-7 py-3.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800">
                I have an account
              </button>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="relative z-10 flex items-center justify-center gap-2 border-t border-slate-800/80 py-6 text-xs text-slate-500">
        <MuzMark size={18} /> MUZ · DAWGZ · CIT-U Capstone 2026
      </footer>
    </div>
  );
}
