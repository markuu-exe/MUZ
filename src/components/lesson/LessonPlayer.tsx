/**
 * COURSE-3: full-screen lesson player.
 *
 * It owns no lesson rules: every decision (order, retries, hearts, pass marks)
 * comes from src/lesson/runner.ts, and every exercise is drawn by the view in
 * the registry. The player only shows the current exercise, the feedback for
 * answer-type exercises, and the results screen.
 */
import { playSfx } from '../../lib/sfx';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Heart, X } from 'lucide-react';
import { exerciseSettings } from '../../content';
import type { ExerciseRegistry } from '../../lesson/registry';
import {
  buildLessonResult,
  createLessonRun,
  currentItem,
  lessonProgress,
  quitLesson,
  submitOutcome,
  type LessonRunState,
} from '../../lesson/runner';
import type { ExerciseOutcome, LessonResult } from '../../lesson/types';
import { cn } from '../../lib/cn';
import type { Exercise, LessonPayload, StageKind } from '../../types/lesson.types';
import { EXERCISE_REGISTRY } from './exerciseRegistry';
import LessonResults from './LessonResults';
import { PracticeRigProvider } from './practice/PracticeRigContext';
import './lesson.css';

/** What a saved run reports back: a note for the results screen and the EXP actually granted. */
export interface LessonSaveFeedback {
  note?: string | null;
  expAwarded?: number;
  /** false: the run was NOT saved (and not queued); the results screen offers to try again. */
  saved?: boolean;
}

type LessonCompleteReturn = void | string | LessonSaveFeedback;

export interface LessonPlayerProps {
  lessonId: string;
  title: string;
  payload: LessonPayload;
  /** The learner's hearts when the lesson opens (profiles.hearts). */
  hearts: number;
  registry?: ExerciseRegistry;
  /**
   * Called once each time a run ends (passed, failed, out of hearts, or quit).
   * COURSE-6 saves the result here. May return a short note, or a note plus the EXP
   * actually granted (EXP is only given on first mastery), for the results screen.
   */
  onComplete?: (result: LessonResult) => LessonCompleteReturn | Promise<LessonCompleteReturn>;
  onClose: () => void;
  /** D1: this run is developer test data (lesson opened while locked); results never show EXP. */
  testRun?: boolean;
}

const STAGE_LABEL: Record<StageKind, string> = {
  learn: 'Learn',
  check: 'Check',
  rhythm: 'Rhythm',
  play: 'Play',
  review: 'Checkpoint',
};

function explanationOf(exercise: Exercise): string | null {
  return 'explanation' in exercise ? exercise.explanation : null;
}

export default function LessonPlayer({
  lessonId,
  title,
  payload,
  hearts,
  registry = EXERCISE_REGISTRY,
  onComplete,
  onClose,
  testRun = false,
}: LessonPlayerProps) {
  const [run, setRun] = useState<LessonRunState>(() => createLessonRun(lessonId, payload, hearts, Date.now()));
  /** Outcome of an answer-type exercise, waiting for the learner to press Continue. */
  const [pending, setPending] = useState<ExerciseOutcome | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // UX 2026-11-27: a run whose save failed is not silently dropped; the learner can try again.
  const [unsaved, setUnsaved] = useState(false);
  const [retryingSave, setRetryingSave] = useState(false);
  const [savedExp, setSavedExp] = useState<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const reported = useRef<LessonRunState | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const item = currentItem(run);
  const progress = lessonProgress(run);
  const result = useMemo(() => (run.status === 'running' ? null : buildLessonResult(run)), [run]);

  const saveRun = useCallback((finished: LessonResult) =>
    Promise.resolve(onCompleteRef.current?.(finished)).then(
      (feedback) => {
        if (!mounted.current) return;
        setUnsaved(typeof feedback === 'object' && feedback !== null && feedback.saved === false);
        if (!feedback) return;
        if (typeof feedback === 'string') {
          setNote(feedback);
          return;
        }
        if (feedback.note) setNote(feedback.note);
        if (typeof feedback.expAwarded === 'number') setSavedExp(feedback.expAwarded);
      },
      () => {
        if (!mounted.current) return;
        setNote('Your result could not be saved.');
        setUnsaved(true);
      },
    ), []);

  // Report each finished run exactly once (a retry after a failed save reuses the same run id).
  useEffect(() => {
    if (!result || reported.current === run) return;
    reported.current = run;
    void saveRun(result);
  }, [result, run, saveRun]);

  const retrySave = useCallback(() => {
    if (!result || retryingSave) return;
    setRetryingSave(true);
    setNote(null);
    void saveRun(result).finally(() => {
      if (mounted.current) setRetryingSave(false);
    });
  }, [result, retryingSave, saveRun]);

  /** Hearts the current exercise has spent but not yet reported (T-06). */
  const inFlightHeartsLost = useRef(0);
  const reportHeartsSpent = useCallback((heartsLostSoFar: number) => {
    inFlightHeartsLost.current = heartsLostSoFar;
  }, []);

  const advance = useCallback((outcome: ExerciseOutcome) => {
    // The outcome carries the exercise's hearts, so drop the in-flight count or it would be charged twice.
    inFlightHeartsLost.current = 0;
    setPending(null);
    setRun((s) => submitOutcome(s, outcome, Date.now()));
  }, []);

  const handleOutcome = useCallback(
    (outcome: ExerciseOutcome) => {
      if (!item) return;
      if (registry[item.exercise.type].feedback === 'answer') {
        // Answer feedback only (theory): never during a microphone drill.
        playSfx(outcome.passed ? 'correct' : 'wrong');
        setPending(outcome);
      }
      else advance(outcome);
    },
    [advance, item, registry],
  );

  // Enter = Continue on the feedback bar. (Space is reserved for the rhythm game.)
  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        advance(pending);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, pending]);

  const quit = () => {
    if (run.status !== 'running') {
      onClose();
      return;
    }
    const ended = quitLesson(run, Date.now(), inFlightHeartsLost.current);
    reported.current = ended;
    void Promise.resolve(onCompleteRef.current?.(buildLessonResult(ended))).catch(() => undefined);
    onClose();
  };

  const retry = () => {
    inFlightHeartsLost.current = 0;
    setNote(null);
    setUnsaved(false);
    setSavedExp(null);
    setPending(null);
    setRun(createLessonRun(lessonId, payload, result?.heartsEnd ?? hearts, Date.now()));
  };

  const stages = payload.stages.map((s) => s.kind);
  const entry = item ? registry[item.exercise.type] : null;
  const View = entry?.View;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex flex-col bg-muz-bg text-slate-100"
      style={{
        backgroundImage:
          'radial-gradient(circle at 15% 0%, rgba(139,92,246,0.14), transparent 40%), radial-gradient(circle at 90% 100%, rgba(34,211,238,0.10), transparent 45%)',
      }}
    >
      {/* Top bar */}
      <header className="flex items-center gap-4 border-b border-slate-800/80 px-6 py-4">
        <button
          type="button"
          aria-label="Close lesson"
          onClick={() => (run.status === 'running' ? setConfirmQuit(true) : onClose())}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 shadow-[0_0_12px_rgba(168,85,247,0.7)] transition-[width] duration-300"
            style={{ width: `${Math.round(progress.fraction * 100)}%` }}
          />
        </div>
        <div className="flex items-center gap-1.5 text-sm font-bold text-rose-300" aria-label={`${run.hearts} hearts`}>
          <Heart className="h-5 w-5 fill-rose-500 text-rose-500" />
          {run.hearts}
        </div>
      </header>

      {/* Stage steps */}
      {run.status === 'running' && item && (
        <nav className="flex items-center justify-center gap-2 px-6 pt-4 text-[11px] font-bold uppercase tracking-widest">
          {stages.map((kind, i) => (
            <span
              key={`${kind}-${i}`}
              className={cn(
                'rounded-full border px-3 py-1',
                i === item.stageIndex && 'border-violet-400 bg-violet-500/20 text-violet-100 shadow-[0_0_12px_rgba(139,92,246,0.5)]',
                i < item.stageIndex && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
                i > item.stageIndex && 'border-slate-800 text-slate-600',
              )}
            >
              {STAGE_LABEL[kind]}
            </span>
          ))}
        </nav>
      )}

      {/* Body */}
      <main className="flex-1 overflow-y-auto px-6 py-8">
        {result ? (
          <LessonResults
            title={title}
            result={savedExp === null ? result : { ...result, expAwarded: savedExp }}
            note={note}
            unsaved={unsaved}
            savingAgain={retryingSave}
            onRetrySave={retrySave}
            onRetry={retry}
            onClose={onClose}
            testRun={testRun}
          />
        ) : (
          item &&
          entry &&
          View && (
            <div className={cn('mx-auto w-full', entry.camera ? 'max-w-screen-2xl' : entry.wide ? 'max-w-5xl' : 'max-w-2xl')}>
              <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-widest text-slate-500">
                <span className="font-bold text-cyan-300">{entry.label}</span>
                <span>
                  {progress.done + 1} / {progress.total}
                  {item.attempt > 1 ? ` · try ${item.attempt}` : ''}
                </span>
              </div>
              {/* COURSE-5: the provider keeps one camera + microphone rig alive across exercises
                  and releases both as soon as the last exercise ends. */}
              <PracticeRigProvider>
                {/* The key remounts the view for every exercise and every retry, so no state leaks. */}
                <div key={`${item.exercise.id}-${item.attempt}`} className="muz-rise">
                  <View
                    exercise={item.exercise}
                    payload={payload}
                    settings={exerciseSettings(payload, item.exercise)}
                    hearts={run.hearts}
                    submitted={pending !== null}
                    onOutcome={handleOutcome}
                    onHeartsSpent={reportHeartsSpent}
                  />
                </div>
              </PracticeRigProvider>
            </div>
          )
        )}
      </main>

      {/* Answer feedback */}
      {pending && item && (
        <footer
          className={cn(
            'muz-rise border-t px-6 py-5',
            pending.passed ? 'border-emerald-500/40 bg-emerald-950/60' : 'border-rose-500/40 bg-rose-950/60',
          )}
        >
          <div className={cn('mx-auto flex w-full items-center gap-6', entry?.camera ? 'max-w-screen-2xl' : entry?.wide ? 'max-w-5xl' : 'max-w-2xl')}>
            <div className="min-w-0 flex-1">
              <p className={cn('text-lg font-black', pending.passed ? 'text-emerald-300' : 'text-rose-300')}>
                {pending.passed ? 'Correct!' : item.stage === 'review' ? 'Not quite' : 'Not quite. You will see this one again.'}
              </p>
              {explanationOf(item.exercise) && <p className="mt-1 text-sm text-slate-200">{explanationOf(item.exercise)}</p>}
            </div>
            <button
              type="button"
              autoFocus
              onClick={() => advance(pending)}
              className={cn(
                'rounded-xl px-8 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:brightness-110 active:scale-[0.98]',
                pending.passed
                  ? 'bg-emerald-500 shadow-[0_0_20px_rgba(52,211,153,0.5)]'
                  : 'bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.45)]',
              )}
            >
              Continue
            </button>
          </div>
        </footer>
      )}

      {/* Quit confirmation */}
      {confirmQuit && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 px-4">
          <div className="muz-rise w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center">
            <h3 className="text-lg font-bold text-white">Leave this lesson?</h3>
            <p className="mt-2 text-sm text-slate-400">Your progress in this lesson will not be saved.</p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmQuit(false)}
                className="flex-1 rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-slate-800"
              >
                Keep going
              </button>
              <button
                type="button"
                onClick={quit}
                className="flex-1 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white hover:brightness-110"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
