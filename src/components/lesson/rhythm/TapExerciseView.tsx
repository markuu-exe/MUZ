/**
 * COURSE-4: the rhythm game. One view serves tap-along, tap-echo and tap-read;
 * the only differences are in the plan (src/lib/rhythm/plan.ts) and the copy below.
 */
import { hasTapCalibration } from '../../../lib/rhythm/calibration';
import TapCalibration from './TapCalibration';
import { meanSignedOffsetMs } from '../../../lib/rhythm/timing';
import { TIERS } from '../../../content';
import { useEffect, useMemo, useRef, useState } from 'react';
import { exerciseBpm, getPattern } from '../../../content';
import { useRhythmSession, type RhythmSessionResult } from '../../../hooks/useRhythmSession';
import type { ExerciseViewProps } from '../../../lesson/registry';
import { cn } from '../../../lib/cn';
import { buildRhythmPlan, scoreRhythm, type RhythmScore } from '../../../lib/rhythm/plan';
import { POINTS } from '../../../lib/rhythm/timing';
import type { TapExercise, TapExerciseType } from '../../../types/lesson.types';
import BeatHighway from './BeatHighway';
import RhythmNotation from './RhythmNotation';

const COPY: Record<TapExerciseType, { title: string; how: string; showNotation: boolean }> = {
  'tap-along': {
    title: 'Tap along',
    how: 'Press SPACE each time a note crosses the line. You will hear the rhythm as you tap.',
    showNotation: true,
  },
  'tap-echo': {
    title: 'Echo the rhythm',
    how: 'Listen to the rhythm first. When it says YOUR TURN, tap it back with SPACE from memory.',
    showNotation: false,
  },
  'tap-read': {
    title: 'Read and tap',
    how: 'Read the rhythm below and tap it with SPACE after the count-in. Only the click plays.',
    showNotation: true,
  },
};

/** Show the 'you tend to be early/late' hint from this average drift (ms). */
const DRIFT_HINT_MS = 20;

const RATING_STYLE = { Perfect: 'text-emerald-300', Good: 'text-amber-300', Miss: 'text-rose-300' } as const;

export default function TapExerciseView({ exercise, payload, settings, onOutcome }: ExerciseViewProps<TapExercise>) {
  const pattern = getPattern(exercise.pattern);
  const bpm = exerciseBpm(payload, exercise);
  const plan = useMemo(
    () =>
      buildRhythmPlan(pattern, {
        mode: exercise.type,
        bpm,
        countInBeats: settings.countInBeats,
        repeats: settings.rhythmRepeats,
      }),
    [pattern, exercise.type, bpm, settings.countInBeats, settings.rhythmRepeats],
  );
  const [done, setDone] = useState<(RhythmSessionResult & { score: RhythmScore }) | null>(null);

  // Ruling R1: timing windows grow stricter with the tier (Virtuoso = SRS 25 / 50 ms).
  const windows = TIERS[payload.tier].rhythm;
  const session = useRhythmSession(
    plan,
    (result) => {
      setDone({ ...result, score: scoreRhythm(result.summary, result.taps, plan.targets.length, settings.passMark) });
    },
    windows,
  );
  const copy = COPY[exercise.type];
  const [needsCalibration, setNeedsCalibration] = useState(() => !hasTapCalibration());
  const last = session.taps[session.taps.length - 1];
  const drift = done ? meanSignedOffsetMs(done.taps) : null;
  const counts = {
    Perfect: session.taps.filter((t) => t.beatIndex !== null && t.rating === 'Perfect').length,
    Good: session.taps.filter((t) => t.beatIndex !== null && t.rating === 'Good').length,
  };

  const finish = () => {
    if (!done) return;
    onOutcome({
      passed: done.score.passed,
      score: done.score.score,
      metrics: { rhythmAccuracy: Math.round(done.score.score * 100), rhythmConsistency: done.summary.consistency },
    });
  };

  // Enter starts the exercise and continues from the result. Space is the tap key, so no
  // button is ever focused here: a late tap must not press "Continue" by accident.
  const keyAction = useRef<() => void>(() => undefined);
  keyAction.current = () => {
    if (done) finish();
    else if (session.phase === 'idle') void session.start();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat) return;
      e.preventDefault();
      keyAction.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">{exercise.prompt ?? copy.title}</h2>
          <p className="mt-1 text-sm text-slate-400">{copy.how}</p>
        </div>
        <div className="flex gap-2 text-xs font-bold uppercase tracking-wider">
          <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-slate-300">{pattern.meter}</span>
          <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-slate-300">{plan.bpm} BPM</span>
          <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-cyan-200">
            Pass {Math.round(settings.passMark * 100)}%
          </span>
        </div>
      </div>

      {copy.showNotation && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-2">
          <RhythmNotation pattern={pattern} />
        </div>
      )}

      <div className="relative">
        <BeatHighway plan={plan} now={session.now} taps={session.taps} />
        {session.phase === 'running' && last && (
          <p
            key={session.taps.length}
            className={cn('muz-float-up pointer-events-none absolute left-[20%] top-2 -translate-x-1/2 text-lg font-black', RATING_STYLE[last.rating])}
          >
            {last.rating}
            {last.beatIndex === null
              ? ' · extra tap'
              : last.rating !== 'Perfect'
                ? ` · ${Math.abs(last.deltaMs)} ms ${last.deltaMs < 0 ? 'early' : 'late'}`
                : ''}
          </p>
        )}
      </div>

      {session.phase === 'idle' && !done && needsCalibration && (
        <details className="rounded-xl border border-cyan-500/30 bg-cyan-950/30 p-4 text-sm text-cyan-100" open>
          <summary className="cursor-pointer font-semibold">
            First rhythm exercise on this device? Take the 10-second tap test first.
          </summary>
          <p className="mt-2 text-xs text-cyan-100/80">
            Speakers and especially Bluetooth headphones delay the clicks you hear, which makes every tap look late. The tap
            test measures that delay once and corrects for it. You can redo it later in Settings.
          </p>
          <div className="mt-3">
            <TapCalibration onSaved={() => setNeedsCalibration(false)} />
          </div>
        </details>
      )}

      {session.phase === 'idle' && !done && (
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            void session.start();
          }}
          className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(168,85,247,0.45)] transition hover:brightness-110 active:scale-[0.98]"
        >
          Start (Enter)
        </button>
      )}

      {session.phase === 'running' && (
        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-5 py-3 text-sm">
          <span className="text-slate-400">
            <kbd className="rounded border border-slate-600 bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-200">SPACE</kbd> to tap
          </span>
          <span className="flex gap-4 font-bold">
            <span className="text-emerald-300">Perfect {counts.Perfect}</span>
            <span className="text-amber-300">Good {counts.Good}</span>
            <span className="text-slate-200">
              Score {counts.Perfect * POINTS.Perfect + counts.Good * POINTS.Good}
            </span>
            <span className="text-slate-500">of {plan.targets.length}</span>
          </span>
        </div>
      )}

      {done && (
        <div
          className={cn(
            'muz-rise space-y-4 rounded-2xl border p-5',
            done.score.passed ? 'border-emerald-500/40 bg-emerald-950/40' : 'border-rose-500/40 bg-rose-950/40',
          )}
        >
          <div className="flex items-center justify-between">
            <p className={cn('text-xl font-black', done.score.passed ? 'text-emerald-300' : 'text-rose-300')}>
              {done.score.passed ? 'In time!' : 'Not quite in time'}
            </p>
            <p className="text-3xl font-black text-white">{Math.round(done.score.score * 100)}%</p>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-sm">
            <div className="rounded-lg bg-slate-900/80 p-2">
              <p className="text-lg font-bold text-emerald-300">{done.summary.perfect}</p>
              <p className="text-xs text-slate-500">Perfect</p>
            </div>
            <div className="rounded-lg bg-slate-900/80 p-2">
              <p className="text-lg font-bold text-amber-300">{done.summary.good}</p>
              <p className="text-xs text-slate-500">Good</p>
            </div>
            <div className="rounded-lg bg-slate-900/80 p-2">
              <p className="text-lg font-bold text-rose-300">{plan.targets.length - done.summary.perfect - done.summary.good}</p>
              <p className="text-xs text-slate-500">Missed</p>
            </div>
            <div className="rounded-lg bg-slate-900/80 p-2">
              <p className="text-lg font-bold text-slate-200">{done.score.extraTaps}</p>
              <p className="text-xs text-slate-500">Extra taps</p>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            At this level Perfect is within {windows.perfectMs} ms and Good within {windows.goodMs} ms. Average offset:{' '}
            {done.summary.avgDeviation} ms.
            {drift !== null && Math.abs(drift) >= DRIFT_HINT_MS &&
              ` You tended to tap ${Math.abs(drift)} ms ${drift > 0 ? 'late' : 'early'}${
                drift > 0 ? '. If every tap feels late, run the tap test in Settings to correct for your speakers or headphones.' : '.'
              }`}
            {!done.score.passed && !payload.isCheckpoint && ' You will try this rhythm again.'}
          </p>
          <button
            type="button"
            onClick={finish}
            className={cn(
              'w-full rounded-xl px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:brightness-110 active:scale-[0.98]',
              done.score.passed ? 'bg-emerald-500' : 'bg-rose-500',
            )}
          >
            Continue (Enter)
          </button>
        </div>
      )}
    </div>
  );
}
