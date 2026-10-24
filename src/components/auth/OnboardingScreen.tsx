import { useState } from 'react';
import { Loader2, Music2 } from 'lucide-react';
import AuthAtmosphere from './AuthAtmosphere';
import ErrorBanner from './ErrorBanner';
import MuzMark from './MuzMark';
import { cn } from '../../lib/cn';
import type { SkillLevel } from '../../lib/auth/profile';

interface OnboardingScreenProps {
  busy: boolean;
  banner: { tone: 'error' | 'info'; message: string } | null;
  onComplete: (level: SkillLevel) => Promise<void>;
}

const LEVELS: Array<{
  id: SkillLevel;
  title: string;
  detail: string;
  tone: 'violet' | 'violetBright' | 'green';
}> = [
  {
    id: 'absolute_beginner',
    title: 'Absolute Beginner',
    detail: 'Never touched a piano, or just learning where keys are.',
    tone: 'violet',
  },
  {
    id: 'some_experience',
    title: 'Some Experience',
    detail: 'Know a few chords, basic melodies, or played long ago.',
    tone: 'violetBright',
  },
  {
    id: 'early_intermediate',
    title: 'Early Intermediate',
    detail: 'Can read basic sheet music and play hands together fluidly.',
    tone: 'green',
  },
];

const toneClass: Record<(typeof LEVELS)[number]['tone'], string> = {
  violet: 'bg-muz-accent/20 text-muz-accent',
  violetBright: 'bg-muz-accent text-white',
  green: 'bg-emerald-500/20 text-emerald-400',
};

export default function OnboardingScreen({ busy, banner, onComplete }: OnboardingScreenProps) {
  const [level, setLevel] = useState<SkillLevel | null>(null);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muz-bg px-4 py-10 text-muz-text">
      <AuthAtmosphere />

      <div className="relative z-10 w-full max-w-4xl rounded-3xl border border-white/10 bg-muz-panel/95 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-sm sm:p-10">
        <div className="flex justify-center">
          <MuzMark />
        </div>

        <h1 className="mt-7 text-center text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          What&apos;s your piano experience?
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-6 text-muz-muted">
          We&apos;ll tailor your syllabus based on your comfort level.
        </p>

        {banner ? (
          <div className="mx-auto mt-6 max-w-xl">
            <ErrorBanner {...banner} />
          </div>
        ) : null}

        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {LEVELS.map((option) => {
            const selected = level === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setLevel(option.id)}
                className={cn(
                  'rounded-2xl border p-5 text-left transition',
                  selected
                    ? 'border-muz-accent bg-muz-accent/10 shadow-[0_0_28px_rgba(139,108,255,0.22)]'
                    : 'border-white/10 bg-muz-bg/50 hover:border-white/25',
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-10 w-10 items-center justify-center rounded-full',
                    toneClass[option.tone],
                  )}
                >
                  <Music2 className="h-4 w-4" />
                </span>
                <h2 className="mt-4 text-lg font-semibold text-white">{option.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muz-muted">{option.detail}</p>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!level || busy}
          onClick={() => {
            if (!level) return;
            void onComplete(level).catch(() => undefined);
          }}
          className="mx-auto mt-9 flex w-full max-w-md items-center justify-center gap-2 rounded-xl bg-muz-accent px-4 py-3.5 font-semibold text-white transition hover:bg-muz-accentStrong disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Continue
        </button>
      </div>
    </div>
  );
}
