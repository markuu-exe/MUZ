import { Activity, ArrowRight, Camera, Check, GitBranch, Lock, Mic, Music, Piano, Presentation, ShieldCheck, Trophy } from 'lucide-react';
import { COURSE_LESSONS, COURSE_UNITS, TIERS } from '../../content';

interface LandingPageProps {
  onSignIn: () => void;
  onSignUp: () => void;
  onDemo: () => void;
}

const FEATURES = [
  {
    icon: GitBranch,
    title: 'A guided learning path',
    body: `${COURSE_UNITS.length} units and ${COURSE_LESSONS.length} lessons in three tiers. Each step unlocks the next, from finding middle C to seventh chords.`,
  },
  {
    icon: Camera,
    title: 'Posture coaching on camera',
    body: 'A live skeleton overlay checks your elbow and wrist angles while you play, and tells you what to fix.',
  },
  {
    icon: Mic,
    title: 'It listens to your piano',
    body: 'Single notes are checked to within 35 cents, and chords are matched from what your microphone hears.',
  },
  {
    icon: Activity,
    title: 'Rhythm drills',
    body: 'Tap along on the spacebar. Every beat is rated Perfect, Good or Miss.',
  },
  {
    icon: Trophy,
    title: 'Progress you can see',
    body: 'EXP, daily streaks, hearts, badges, and charts of your pitch, rhythm and posture over time.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by design',
    body: 'Camera and microphone are processed on your own device. No video or audio is recorded or uploaded.',
  },
] as const;

const TIER_LIST = [TIERS.novice, TIERS.proficient, TIERS.virtuoso];

/** A small, static picture of the Skill Tree path for the hero. Decorative. */
function PathPreview() {
  const nodes = [
    { x: 120, y: 40, state: 'done' },
    { x: 190, y: 120, state: 'done' },
    { x: 140, y: 205, state: 'current' },
    { x: 70, y: 290, state: 'locked' },
  ] as const;
  return (
    <div className="relative h-[340px] w-[260px]" aria-hidden="true">
      <svg className="absolute inset-0" width={260} height={340}>
        {nodes.slice(1).map((n, i) => {
          const a = nodes[i];
          const mid = (n.y - a.y) / 2;
          const lit = a.state === 'done';
          return (
            <path
              key={i}
              d={`M ${a.x} ${a.y} C ${a.x} ${a.y + mid}, ${n.x} ${n.y - mid}, ${n.x} ${n.y}`}
              fill="none"
              stroke={lit ? '#10b981' : '#334155'}
              strokeWidth={lit ? 6 : 4}
              strokeDasharray={lit ? undefined : '2 12'}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      {nodes.map((n, i) => (
        <div
          key={i}
          className={
            'absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 ' +
            (n.state === 'done'
              ? 'h-16 w-16 border-emerald-300/60 bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 shadow-[0_6px_0_#065f46]'
              : n.state === 'current'
                ? 'h-20 w-20 border-white/70 bg-gradient-to-b from-violet-500 to-fuchsia-600 text-white shadow-[0_6px_0_#5b21b6] ring-8 ring-violet-400/40'
                : 'h-16 w-16 border-slate-700 bg-slate-800 text-slate-500 shadow-[0_6px_0_#0f172a]')
          }
          style={{ left: n.x, top: n.y }}
        >
          {n.state === 'done' ? <Check className="h-7 w-7" strokeWidth={3} /> : n.state === 'current' ? <Piano className="h-8 w-8" /> : <Lock className="h-6 w-6" />}
        </div>
      ))}
    </div>
  );
}

export default function LandingPage({ onSignIn, onSignUp, onDemo }: LandingPageProps) {
  return (
    <div className="min-h-dvh w-full overflow-y-auto bg-muz-bg text-muz-text">
      {/* Top bar */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muz-accent/15 text-muz-accent">
            <Music className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className="text-sm font-extrabold uppercase tracking-[0.28em] text-white">MUZ</span>
        </div>
        <nav className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSignIn}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800/80 hover:text-white"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={onSignUp}
            className="rounded-xl bg-muz-accent px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-muz-accentStrong"
          >
            Create account
          </button>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-8 pb-16 pt-8 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-muz-accent/30 bg-muz-accent/10 px-3 py-1 text-xs font-semibold text-muz-accent">
            <Piano className="h-3.5 w-3.5" aria-hidden="true" /> Piano for beginners to early intermediate
          </span>
          <h1 className="mt-5 text-5xl font-black leading-[1.05] tracking-tight text-white">
            Learn piano with a coach that <span className="text-muz-accent">watches</span> and{' '}
            <span className="text-violet-400">listens</span>.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-300">
            MUZ teaches music theory, rhythm and real playing on your own keyboard. It checks your posture through
            your webcam and the notes you play through your microphone, right in the browser.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onSignUp}
              className="inline-flex items-center gap-2 rounded-2xl bg-muz-accent px-6 py-3 text-sm font-bold text-slate-950 shadow-glow transition hover:bg-muz-accentStrong"
            >
              Start learning free <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onDemo}
              className="inline-flex items-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-6 py-3 text-sm font-bold text-amber-200 transition hover:bg-amber-500/20"
            >
              <Presentation className="h-4 w-4" aria-hidden="true" /> Try Demo Mode
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Demo Mode opens a sample learner with every lesson unlocked. Nothing is saved.
          </p>
        </div>
        <div className="flex justify-center">
          <div className="rounded-[2rem] border border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-950 px-10 py-6 shadow-2xl">
            <PathPreview />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-8 pb-16">
        <h2 className="text-2xl font-bold text-white">What you get</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-slate-800 bg-muz-panel/80 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-base font-bold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tiers */}
      <section className="mx-auto max-w-6xl px-8 pb-16">
        <h2 className="text-2xl font-bold text-white">Start where you are</h2>
        <p className="mt-1 text-sm text-slate-400">Pick a starting tier when you join. Earlier lessons are marked complete for you.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {TIER_LIST.map((tier) => (
            <div key={tier.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muz-accent">
                {tier.label} · Units {tier.units[0]}–{tier.units[1]}
              </p>
              <p className="mt-1 text-sm font-semibold text-white">{tier.level}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{tier.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What you need */}
      <section className="mx-auto max-w-6xl px-8 pb-20">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-slate-800 bg-gradient-to-r from-violet-950/50 to-slate-900/60 p-8 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-bold text-white">What you need</h2>
            <p className="mt-1 text-sm text-slate-300">
              A desktop or laptop browser (1280 × 720 or larger), a webcam, a microphone and a piano or keyboard.
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <button
              type="button"
              onClick={onSignIn}
              className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={onSignUp}
              className="rounded-xl bg-muz-accent px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-muz-accentStrong"
            >
              Create account
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        MUZ · DAWGZ · CIT-U Capstone 2026
      </footer>
    </div>
  );
}
