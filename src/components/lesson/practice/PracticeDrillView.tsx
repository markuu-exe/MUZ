/**
 * COURSE-5: the wait-state practice view (SDD 6.3) for play-note, play-chord and
 * play-sequence. The learner must play the target AND hold a compliant posture
 * within the 400 ms latch (SRS 3.1.6.5). Hearts, the 15 s timeout and the
 * three-wrong-notes rule are enforced by PracticeDrill / WaitStateMachine.
 */
import { parseChord } from '../../../audio/chords/vocabulary';
import { chordCheckReasons } from '../../../practice/chordReport';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useCountIn } from '../../../hooks/useCountIn';
import { usePracticeDrill } from '../../../hooks/usePracticeDrill';
import CountInBadge from '../rhythm/CountInBadge';
import type { ExerciseViewProps } from '../../../lesson/registry';
import { cn } from '../../../lib/cn';
import { PITCH_CLASS_NAMES } from '../../../audio/dsp/pitch';
import { chordMatcher, drillTargets, targetLabel, type DrillStats, type DrillTarget } from '../../../practice/PracticeDrill';
import { FramingTracker, type FramingState } from '../../../practice/framing';
import { INITIAL_DRILL_PHASE, drillPhaseReducer, practiceDrillOptions } from '../../../practice/practicePhase';
import { HearingWindow, NOTHING_HEARD, heardKeys, heardLabel, type Heard } from '../../../practice/heard';
import { NOT_VISIBLE_MESSAGE } from '../../../practice/visibilityCue';
import type { PlayChordExercise, PlayNoteExercise, PlaySequenceExercise } from '../../../types/lesson.types';
import GrandStaff from '../../theory/GrandStaff';
import { exampleVoicing } from '../theory/BuildTheChordView';
import CameraPanel from './CameraPanel';
import { isPerfDebug } from './PerfOverlay';
import CameraSetupGuide from './CameraSetupGuide';
import MediaDiagnostics, { mediaProblems } from './MediaDiagnostics';
import { usePracticeRig } from './PracticeRigContext';
import { HeartRow, MicMeter, Ring, TargetKeyboard } from './PracticeWidgets';

type DrillExercise = PlayNoteExercise | PlayChordExercise | PlaySequenceExercise;

const SUCCESS_PAUSE_MS = 900;
/** Keep showing the last heard key this long after the sound stops, so it can be read. */
const HEARD_HOLD_MS = 700;
const LOCKED_PAUSE_MS = 1800;

function targetNotes(target: DrillTarget): number[] {
  return target.kind === 'note' ? [target.note] : exampleVoicing(target.chord, [48, 71]);
}

function targetTitle(target: DrillTarget): string {
  return target.kind === 'note' ? `Play ${targetLabel(target)}` : `Play the ${targetLabel(target)} chord`;
}

export default function PracticeDrillView({ exercise, settings, hearts, onOutcome, onHeartsSpent }: ExerciseViewProps<DrillExercise>) {
  const { rig, state } = usePracticeRig();
  const targets = useMemo(() => drillTargets(exercise), [exercise]);
  const [ended, setEnded] = useState<{ passed: boolean; stats: DrillStats } | null>(null);
  const onOutcomeRef = useRef(onOutcome);
  onOutcomeRef.current = onOutcome;
  const onHeartsSpentRef = useRef(onHeartsSpent);
  onHeartsSpentRef.current = onHeartsSpent;

  const problems = mediaProblems(state, true);
  const ready = state.camera.status === 'active' && state.model === 'ready' && state.mic === 'running';
  const starting =
    !ready && problems.length === 0 && (state.camera.status === 'requesting' || state.model === 'loading' || state.mic === 'starting');

  // The camera must see the arm before the drill runs, and the drill pauses whenever it loses the
  // learner, so no heart is lost while getting into position (SRS 3.3.1 spirit; AI-1 cue).
  const [framing, setFraming] = useState<FramingState>('searching');
  useEffect(() => {
    const tracker = new FramingTracker();
    return rig.on('posture', ({ tMs, snapshot }) => setFraming(tracker.push(tMs, snapshot.compliant)));
  }, [rig]);
  const canRun = ready && framing === 'framed';

  // Live feedback: which key or chord the microphone is hearing right now (display only). It uses
  // the grader's own analysis over a short window (src/practice/heard.ts HearingWindow): only
  // notes the grader would count are listed, and green means the grader's test passed on most
  // of the last 150 ms. Grading itself still needs the match to hold for its 200 ms window.
  const [heard, setHeard] = useState<{ heard: Heard; matches: boolean }>({ heard: NOTHING_HEARD, matches: false });
  const liveTargetRef = useRef<DrillTarget>(targets[0]);
  useEffect(() => {
    let lastUi = 0;
    let lastHeardAt = 0;
    const hearing = new HearingWindow();
    let windowTarget = liveTargetRef.current;
    return rig.on('audio', (frame) => {
      const target = liveTargetRef.current;
      if (target !== windowTarget) {
        hearing.clear(); // a new step: do not carry the last chord over
        windowTarget = target;
      }
      hearing.push(frame, target, chordMatcher);
      const now = performance.now();
      if (now - lastUi < 100) return;
      lastUi = now;
      const next = hearing.read(target.kind === 'chord' ? parseChord(target.chord).pcs : []);
      const something = next.heard.midi !== null || next.heard.pitchClasses.length > 0;
      if (something) {
        lastHeardAt = now;
        setHeard(next);
      } else if (now - lastHeardAt > HEARD_HOLD_MS) setHeard({ heard: NOTHING_HEARD, matches: false });
    });
  }, [rig]);

  // P5: every drill opens in an ungraded practice run: the same PracticeDrill (same verifiers,
  // posture latch and feedback) with heartCost 0, never reported to the lesson. "Start graded
  // attempt" discards it and arms the graded drill, whose timer only starts then.
  const [phase, dispatchPhase] = useReducer(drillPhaseReducer, INITIAL_DRILL_PHASE);
  const practicing = phase.kind === 'practice';
  const practice = usePracticeDrill({
    rig,
    targets,
    ...practiceDrillOptions(settings.timeoutSec),
    suspended: !canRun || !practicing,
    onComplete: () => dispatchPhase({ type: 'practice-passed' }),
    onLocked: () => undefined, // cannot happen: heartCost 0
  });
  const graded = usePracticeDrill({
    rig,
    targets,
    hearts,
    timeoutSec: settings.timeoutSec,
    heartCost: settings.drillHeartCost ?? 1,
    suspended: !canRun || practicing,
    onComplete: (stats) => setEnded({ passed: true, stats }),
    onLocked: (stats) => setEnded({ passed: false, stats }),
  });
  const drill = practicing ? practice : graded;

  // Arm once the camera, the pose model and the microphone are live AND the camera can see the arm.
  const { start: startPractice, running: practiceRunning, reset: resetPractice } = practice;
  const justPassed = phase.kind === 'practice' && phase.justPassed;
  useEffect(() => {
    if (canRun && practicing && !justPassed && !practiceRunning) startPractice();
  }, [canRun, practicing, justPassed, practiceRunning, startPractice]);
  const { start: startGraded, running: gradedRunning } = graded;
  useEffect(() => {
    if (canRun && !practicing && !gradedRunning) startGraded();
  }, [canRun, practicing, gradedRunning, startGraded]);
  const practiseAgain = () => {
    resetPractice();
    dispatchPhase({ type: 'retry-practice' });
  };
  const startGradedAttempt = () => {
    resetPractice();
    dispatchPhase({ type: 'start-graded' });
  };
  const running = drill.running;

  // Hands-free (owner request 2026-11-27): after a practice pass the graded attempt counts itself
  // in with the one-bar metronome (lesson tempo) and starts, so the learner can stay at the piano.
  // "Keep practising" cancels; Enter starts at once for anyone at the computer.
  const countIn = useCountIn(settings.bpm, () => startGradedAttempt());
  const { start: startCountIn, cancel: cancelCountIn, counting } = countIn;
  useEffect(() => {
    if (justPassed) void startCountIn();
  }, [justPassed, startCountIn]);
  const keepPractising = () => {
    cancelCountIn();
    practiseAgain();
  };
  const startNowRef = useRef<() => void>(() => undefined);
  startNowRef.current = () => {
    if (!practicing || ended) return;
    cancelCountIn();
    startGradedAttempt();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat) return;
      e.preventDefault();
      startNowRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Tell the player about every heart as it is lost, so quitting mid-drill
  // (or during the outcome pause below) cannot refund it (T-06). Only the graded run can lose one.
  const { heartsLost } = graded;
  useEffect(() => {
    onHeartsSpentRef.current?.(heartsLost);
  }, [heartsLost]);


  // Show the outcome for a moment, then hand it to the lesson player.
  useEffect(() => {
    if (!ended) return;
    const timer = window.setTimeout(
      () =>
        onOutcomeRef.current({
          passed: ended.passed,
          score: ended.passed ? 1 : 0,
          heartsLost: ended.stats.heartsLost,
          metrics: { pitchAccuracy: ended.stats.pitchAccuracy, postureScore: ended.stats.postureScore },
        }),
      ended.passed ? SUCCESS_PAUSE_MS : LOCKED_PAUSE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [ended]);

  const target = targets[Math.min(drill.stepIndex, targets.length - 1)];
  liveTargetRef.current = target;
  const seconds = Math.ceil(drill.remainingMs / 1000);

  let status: { text: string; tone: 'slate' | 'cyan' | 'emerald' | 'amber' | 'rose' };
  if (ended?.passed) status = { text: 'Locked in. Well played!', tone: 'emerald' };
  else if (ended) status = { text: 'Out of hearts. Practice is paused until a heart comes back.', tone: 'rose' };
  else if (framing === 'searching')
    status = {
      text: 'Camera is on. Move until it can see your shoulder, elbow and wrist (a three-quarter view works best). The timer starts when it can.',
      tone: 'amber',
    };
  else if (framing === 'lost') status = { text: `Paused: ${NOT_VISIBLE_MESSAGE} No heart is lost while paused.`, tone: 'amber' };
  else if (justPassed)
    status = {
      text: 'That counted: the right sound with good posture. Stay at the piano: the graded attempt starts after a 4-beat count-in.',
      tone: 'emerald',
    };
  else if (!running) status = { text: 'Get ready…', tone: 'slate' };
  else if (drill.state === 'paused') status = { text: 'Paused', tone: 'slate' };
  else if (drill.state === 'latching') status = { text: 'That is the right sound. Hold your posture to lock it in.', tone: 'amber' };
  else if (drill.postureBlocked)
    status = { text: 'Right sound, but your posture was off. Fix what the camera shows in red and play it again.', tone: 'amber' };
  else if (drill.state === 'verifying') status = { text: 'Listening…', tone: 'cyan' };
  else if (drill.lastAttempt === 'miss')
    status = {
      text: `${drill.lastHeard ? `That sounded like ${drill.lastHeard}. ` : 'Not quite. '}Try again${
        practicing
          ? '. Practice: no timer and no hearts.'
          : settings.drillHeartCost === 0
            ? '. Warm-up lesson: no hearts are lost.'
            : ` (${drill.consecutiveMisses} of 3 wrong tries before a heart is lost).`
      }`,
      tone: 'rose',
    };
  else if (practicing)
    status = { text: 'Practice: play it as often as you like. Nothing is graded, there is no timer and no heart is lost.', tone: 'slate' };
  else status = { text: 'Graded attempt: play it on your piano now.', tone: 'slate' };

  const TONE = {
    slate: 'border-slate-700 bg-slate-900/70 text-slate-200',
    cyan: 'border-cyan-500/40 bg-cyan-950/40 text-cyan-100',
    emerald: 'border-emerald-500/50 bg-emerald-950/50 text-emerald-100',
    amber: 'border-amber-500/40 bg-amber-950/40 text-amber-100',
    rose: 'border-rose-500/40 bg-rose-950/40 text-rose-100',
  } as const;

  const chordTarget = target.kind === 'chord';
  // After a missed chord (or every attempt with ?debug), say which check failed, in plain words.
  const chordReasons =
    chordTarget && drill.lastCheck && (drill.lastAttempt === 'miss' || isPerfDebug())
      ? chordCheckReasons(drill.lastCheck, parseChord(target.chord).pcs)
      : [];
  const heardText = heardLabel(heard.heard, chordTarget);
  const heardMatches = heardText !== null && heard.matches;
  const rawText = isPerfDebug() && chordTarget && heard.heard.rawPitchClasses.length > 0
    ? heard.heard.rawPitchClasses.map((p) => PITCH_CLASS_NAMES[p]).join(' · ')
    : null;

  return (
    <div className="space-y-5">
      {'prompt' in exercise && exercise.prompt && <h2 className="text-2xl font-bold text-white">{exercise.prompt}</h2>}

      {problems.length > 0 ? (
        <MediaDiagnostics problems={problems} onRetry={() => void rig.start()} />
      ) : ready || ended ? (
        <div className="space-y-3">
          <p role="status" className={cn('rounded-xl border px-5 py-3 text-base font-semibold', TONE[status.tone])}>
            {status.text}
          </p>
          {practicing && !ended && counting && countIn.cue && (
            <CountInBadge
              cue={countIn.cue}
              countText={(c) => `Graded attempt in: ${c.measureBeat} of ${c.beatsPerMeasure}. Get your hands ready.`}
              tapText="Graded attempt starting…"
            />
          )}
          {practicing && !ended && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => startNowRef.current()}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-white transition hover:brightness-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
              >
                {counting ? 'Start now (Enter)' : 'Start graded attempt (Enter)'}
              </button>
              {justPassed && (
                <button
                  type="button"
                  onClick={keepPractising}
                  className="rounded-xl border border-slate-600 px-5 py-2.5 text-sm font-bold text-slate-200 transition hover:border-slate-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
                >
                  Keep practising
                </button>
              )}
              <span className="text-xs text-slate-400">
                {justPassed
                  ? 'No need to come back to the computer: the graded attempt starts by itself.'
                  : `Play it right once and the graded attempt (hearts and a ${settings.timeoutSec}-second timer) starts by itself after a count-in.`}
              </span>
            </div>
          )}
        </div>
      ) : (
        <CameraSetupGuide needsMic starting={starting} onStart={() => void rig.start()} />
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(300px,1fr)]">
        <CameraPanel rig={rig} state={state} />

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-violet-300">
                {practicing ? 'Practice · not graded' : 'Graded attempt'}
                {targets.length > 1 ? ` · Step ${Math.min(drill.stepIndex + 1, targets.length)} of ${targets.length}` : ''}
              </p>
              <p className="truncate text-3xl font-black text-white">{targetTitle(target)}</p>
            </div>
            {practicing ? (
              <span className="shrink-0 rounded-full border border-slate-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-300">
                No timer
              </span>
            ) : (
              <Ring
                fraction={ended?.passed ? 1 : drill.timeoutMs > 0 ? drill.remainingMs / drill.timeoutMs : 0}
                label={ended?.passed ? '✓' : String(seconds)}
                tone={ended?.passed ? 'emerald' : seconds <= 5 ? 'rose' : 'violet'}
              />
            )}
          </div>

          {targets.length > 1 && (
            <ol className="flex flex-wrap gap-1.5">
              {targets.map((t, i) => (
                <li
                  key={i}
                  className={cn(
                    'rounded-lg border px-2.5 py-1 text-sm font-bold',
                    (i < drill.stepIndex || ended?.passed) && 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200',
                    i === drill.stepIndex && !ended?.passed && 'border-violet-400 bg-violet-500/25 text-white shadow-[0_0_12px_rgba(139,92,246,0.5)]',
                    i > drill.stepIndex && 'border-slate-700 text-slate-500',
                  )}
                >
                  {targetLabel(t)}
                </li>
              ))}
            </ol>
          )}

          {target.kind === 'note' && (
            <div className="flex h-24 justify-center text-slate-200 [&>svg]:h-full [&>svg]:w-auto">
              <GrandStaff notes={[target.note]} color="#c4b5fd" />
            </div>
          )}
          <TargetKeyboard notes={targetNotes(target)} maxWidth={420} heard={(start, end) => heardKeys(heard.heard, chordTarget, start, end)} />
          <div
            aria-live="polite"
            data-matches={heardMatches ? 'true' : 'false'}
            className={cn(
              'rounded-xl border px-4 py-2 text-center text-lg font-black',
              !heardText && 'border-slate-800 text-slate-500',
              heardText && heardMatches && 'border-emerald-500/50 bg-emerald-950/40 text-emerald-200',
              heardText && !heardMatches && 'border-amber-500/50 bg-amber-950/40 text-amber-200',
            )}
          >
            {heardText ? `Hearing: ${heardText}${heardMatches ? ' (matches)' : ''}` : 'Hearing: nothing yet'}
          </div>
          {rawText && <p className="text-center text-xs text-slate-500">Raw chroma (debug): {rawText}</p>}
          {chordReasons.length > 0 && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 px-4 py-2 text-left text-sm text-rose-100">
              <p className="font-bold">Why that chord did not count:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {chordReasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-center text-xs text-slate-500">
            {target.kind === 'chord' ? 'Any octave and any inversion counts.' : 'Play this exact key: the octave counts.'} Amber keys
            are what the microphone hears; green means it matches.
          </p>

          <div className="mt-auto flex items-center justify-between">
            <HeartRow hearts={practicing ? hearts : graded.hearts} />
            <MicMeter rmsDb={drill.rmsDb} />
          </div>
        </div>
      </div>

    </div>
  );
}
