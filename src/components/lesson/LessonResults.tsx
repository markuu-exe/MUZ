import { useEffect, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { playSfx } from '../../lib/sfx';
import { OFFLINE_NOTE } from '../../lib/sync/syncLoop';
import { Heart, RotateCcw, Sparkles, Target, Timer } from 'lucide-react';
import type { LessonResult } from '../../lesson/types';
import { cn } from '../../lib/cn';
import CoachTip from './CoachTip';

interface LessonResultsProps {
  title: string;
  result: LessonResult;
  /** Shown under the headline, e.g. "Saved" / "Could not save" (COURSE-6). */
  note?: string | null;
  onRetry: () => void;
  onClose: () => void;
  /** D1: a developer test run (lesson opened while locked); never shown as learner progress. */
  testRun?: boolean;
}

const HEADLINE: Record<LessonResult['status'], { title: string; body: string }> = {
  passed: { title: 'Lesson complete', body: 'Nice work. The next lesson is ready when you are.' },
  failed: { title: 'Not quite there', body: 'You did not reach the pass mark this time. Review and try again.' },
  'out-of-hearts': {
    title: 'Out of hearts',
    body: 'Practice needs hearts. Wait for one to come back, or score 80% or more on a theory lesson.',
  },
  quit: { title: 'Lesson closed', body: '' },
};

const TEST_RUN_HEADLINE: Partial<Record<LessonResult['status'], { title: string; body: string }>> = {
  passed: { title: 'Test run passed', body: 'Saved as developer test data. Your learner progress, EXP and streak did not change.' },
  failed: { title: 'Test run failed', body: 'Saved as developer test data. Your learner progress, EXP and streak did not change.' },
};

/** Headline and EXP tile for the results screen. Pure, so D1's test-run copy is testable. */
export function resultSummary(
  result: Pick<LessonResult, 'status' | 'expAwarded'>,
  { testRun }: { testRun: boolean },
): { title: string; body: string; expLabel: string; expValue: string } {
  const head = (testRun && TEST_RUN_HEADLINE[result.status]) || HEADLINE[result.status];
  return testRun
    ? { ...head, expLabel: 'EXP (test run)', expValue: '0' }
    : { ...head, expLabel: 'EXP earned', expValue: `+${result.expAwarded}` };
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
}

/** Star burst around the result badge on a pass (12 dots on a ring, staggered). */
const BURST = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2;
  const r = 56 + (i % 3) * 10;
  return {
    dx: Math.round(Math.cos(a) * r),
    dy: Math.round(Math.sin(a) * r),
    delay: (i % 4) * 40,
    color: ['#34d399', '#a78bfa', '#fbbf24', '#f472b6'][i % 4],
  };
});

/** Counts the first number in `text` up from 0 (e.g. "+20", "85%"), keeping the rest. */
function CountUp({ text, animate }: { text: string; animate: boolean }) {
  const match = /^(\D*)(\d+)(.*)$/.exec(text);
  const target = match ? Number(match[2]) : 0;
  const [shown, setShown] = useState(animate && match ? 0 : target);
  useEffect(() => {
    if (!animate || !match) {
      setShown(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / 700);
      setShown(Math.round(target * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [animate, target]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!match) return <>{text}</>;
  return (
    <>
      {match[1]}
      {shown}
      {match[3]}
    </>
  );
}

export default function LessonResults({ title, result, note, onRetry, onClose, testRun = false }: LessonResultsProps) {
  const head = resultSummary(result, { testRun });
  const reduced = useReducedMotion();
  // One chime when the results appear (the lesson, and any microphone, has finished).
  useEffect(() => {
    if (result.passed) playSfx('complete');
  }, [result.passed]);
  const used = (engine: 'rhythm' | 'practice') => result.records.some((r) => r.engine === engine);
  const stats: Array<{ label: string; value: string; icon: typeof Target; tone: string }> = [
    { label: 'First-try accuracy', value: `${Math.round(result.accuracy)}%`, icon: Target, tone: 'text-cyan-300' },
    { label: head.expLabel, value: head.expValue, icon: Sparkles, tone: 'text-violet-300' },
    { label: 'Hearts', value: `${result.heartsEnd} / 5`, icon: Heart, tone: 'text-rose-300' },
    { label: 'Time', value: formatDuration(result.durationSec), icon: Timer, tone: 'text-slate-300' },
  ];

  return (
    <div className="muz-rise mx-auto w-full max-w-xl space-y-6 text-center">
      <div
        className={cn(
          'relative mx-auto flex h-20 w-20 items-center justify-center rounded-full border text-4xl',
          result.passed
            ? 'border-emerald-400/60 bg-emerald-500/15 shadow-[0_0_40px_rgba(52,211,153,0.45)]'
            : 'border-rose-400/60 bg-rose-500/15 shadow-[0_0_40px_rgba(244,63,94,0.35)]',
        )}
      >
        {result.passed ? '★' : result.status === 'out-of-hearts' ? '♡' : '↻'}
        {result.passed && !reduced && (
          <span className="pointer-events-none absolute inset-0" aria-hidden="true">
            {BURST.map((b, i) => (
              <span
                key={i}
                className="muz-burst absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
                style={{ background: b.color, ['--dx' as string]: `${b.dx}px`, ['--dy' as string]: `${b.dy}px`, animationDelay: `${b.delay}ms` }}
              />
            ))}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-violet-300">{title}</p>
        <h2 className="mt-1 text-3xl font-black text-white">{head.title}</h2>
        <p className="mt-2 text-sm text-slate-400">{head.body}</p>
        {note &&
          (note.startsWith(OFFLINE_NOTE) ? (
            <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-950/40 px-3 py-2 text-sm font-semibold text-amber-100">
              {note}
            </p>
          ) : (
            <p className="mt-2 text-xs text-slate-500">{note}</p>
          ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-left">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500">
              <Icon className={cn('h-3.5 w-3.5', tone)} />
              {label}
            </div>
            <p className={cn('mt-1 text-2xl font-bold tabular-nums', tone)}>
              <CountUp text={value} animate={!reduced} />
            </p>
          </div>
        ))}
      </div>

      {(used('rhythm') || used('practice')) && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-left text-sm text-slate-300">
          {used('rhythm') && <p>Rhythm consistency: {Math.round(result.metrics.rhythmConsistency)}%</p>}
          {used('practice') && <p>Pitch accuracy: {Math.round(result.metrics.pitchAccuracy)}%</p>}
          {used('practice') && <p>Posture score: {Math.round(result.metrics.postureScore)}%</p>}
        </div>
      )}

      {result.status !== 'quit' && !testRun && <CoachTip result={result} title={title} />}

      {result.heartRestored && (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
          ♥ One heart restored for scoring {Math.round(result.theoryScore ?? 0)}% on theory.
        </p>
      )}

      <div className="flex gap-3">
        {!result.passed && result.status !== 'out-of-hearts' && (
          <button
            type="button"
            onClick={onRetry}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-violet-500/50 bg-violet-500/10 px-6 py-3 text-sm font-bold uppercase tracking-wider text-violet-200 transition hover:bg-violet-500/20"
          >
            <RotateCcw className="h-4 w-4" /> Try again
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(168,85,247,0.45)] transition hover:brightness-110 active:scale-[0.98]"
        >
          {result.passed ? 'Continue' : 'Back to skill tree'}
        </button>
      </div>
    </div>
  );
}
