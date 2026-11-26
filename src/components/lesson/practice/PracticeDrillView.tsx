/**
 * COURSE-5: the wait-state practice view (SDD 6.3) for play-note, play-chord and
 * play-sequence. The learner must play the target AND hold a compliant posture
 * within the 400 ms latch (SRS 3.1.6.5). Hearts, the 15 s timeout and the
 * three-wrong-notes rule are enforced by PracticeDrill / WaitStateMachine.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePracticeDrill } from '../../../hooks/usePracticeDrill';
import type { ExerciseViewProps } from '../../../lesson/registry';
import { cn } from '../../../lib/cn';
import { drillTargets, targetLabel, type DrillStats, type DrillTarget } from '../../../practice/PracticeDrill';
import { FramingTracker, type FramingState } from '../../../practice/framing';
import { NOT_VISIBLE_MESSAGE } from '../../../practice/visibilityCue';
import type { PlayChordExercise, PlayNoteExercise, PlaySequenceExercise } from '../../../types/lesson.types';
import GrandStaff from '../../theory/GrandStaff';
import { exampleVoicing } from '../theory/BuildTheChordView';
import CameraPanel from './CameraPanel';
import CameraSetupGuide from './CameraSetupGuide';
import MediaDiagnostics, { mediaProblems } from './MediaDiagnostics';
import { usePracticeRig } from './PracticeRigContext';
import { HeartRow, MicMeter, Ring, TargetKeyboard } from './PracticeWidgets';

type DrillExercise = PlayNoteExercise | PlayChordExercise | PlaySequenceExercise;

const SUCCESS_PAUSE_MS = 900;
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

  const drill = usePracticeDrill({
    rig,
    targets,
    hearts,
    timeoutSec: settings.timeoutSec,
    suspended: !canRun,
    onComplete: (stats) => setEnded({ passed: true, stats }),
    onLocked: (stats) => setEnded({ passed: false, stats }),
  });

  // Arm once the camera, the pose model and the microphone are live AND the camera can see the arm.
  const { start, running } = drill;
  useEffect(() => {
    if (canRun && !running) start();
  }, [canRun, running, start]);

  // Tell the player about every heart as it is lost, so quitting mid-drill
  // (or during the outcome pause below) cannot refund it (T-06).
  const { heartsLost } = drill;
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
  const seconds = Math.ceil(drill.remainingMs / 1000);

  let status: { text: string; tone: 'slate' | 'cyan' | 'emerald' | 'amber' | 'rose' };
  if (ended?.passed) status = { text: 'Locked in. Well played!', tone: 'emerald' };
  else if (ended) status = { text: 'Out of hearts. Practice is paused until a heart comes back.', tone: 'rose' };
  else if (framing === 'searching')
    status = {
      text: 'Camera is on. Move until it can see your shoulder, elbow and wrist from the side. The timer starts when it can.',
      tone: 'amber',
    };
  else if (framing === 'lost') status = { text: `Paused: ${NOT_VISIBLE_MESSAGE} No heart is lost while paused.`, tone: 'amber' };
  else if (!running) status = { text: 'Get ready…', tone: 'slate' };
  else if (drill.state === 'paused') status = { text: 'Paused', tone: 'slate' };
  else if (drill.state === 'latching') status = { text: 'That is the right sound. Hold your posture to lock it in.', tone: 'amber' };
  else if (drill.postureBlocked)
    status = { text: 'Right sound, but your posture was off. Fix what the camera shows in red and play it again.', tone: 'amber' };
  else if (drill.state === 'verifying') status = { text: 'Listening…', tone: 'cyan' };
  else if (drill.lastAttempt === 'miss')
    status = {
      text: `${drill.lastHeard ? `That sounded like ${drill.lastHeard}. ` : 'Not quite. '}Try again (${drill.consecutiveMisses} of 3 wrong tries before a heart is lost).`,
      tone: 'rose',
    };
  else status = { text: 'Play it on your piano now.', tone: 'slate' };

  const TONE = {
    slate: 'border-slate-700 bg-slate-900/70 text-slate-200',
    cyan: 'border-cyan-500/40 bg-cyan-950/40 text-cyan-100',
    emerald: 'border-emerald-500/50 bg-emerald-950/50 text-emerald-100',
    amber: 'border-amber-500/40 bg-amber-950/40 text-amber-100',
    rose: 'border-rose-500/40 bg-rose-950/40 text-rose-100',
  } as const;

  return (
    <div className="space-y-5">
      {'prompt' in exercise && exercise.prompt && <h2 className="text-2xl font-bold text-white">{exercise.prompt}</h2>}

      {problems.length > 0 ? (
        <MediaDiagnostics problems={problems} onRetry={() => void rig.start()} />
      ) : ready || ended ? (
        <p role="status" className={cn('rounded-xl border px-5 py-3 text-sm font-semibold', TONE[status.tone])}>
          {status.text}
        </p>
      ) : (
        <CameraSetupGuide needsMic starting={starting} onStart={() => void rig.start()} />
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <CameraPanel rig={rig} state={state} />

        <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-violet-300">
                {targets.length > 1 ? `Step ${Math.min(drill.stepIndex + 1, targets.length)} of ${targets.length}` : 'Target'}
              </p>
              <p className="truncate text-3xl font-black text-white">{targetTitle(target)}</p>
            </div>
            <Ring
              fraction={ended?.passed ? 1 : drill.timeoutMs > 0 ? drill.remainingMs / drill.timeoutMs : 0}
              label={ended?.passed ? '✓' : String(seconds)}
              tone={ended?.passed ? 'emerald' : seconds <= 5 ? 'rose' : 'violet'}
            />
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
            <div className="flex justify-center text-slate-200">
              <GrandStaff notes={[target.note]} color="#c4b5fd" />
            </div>
          )}
          <TargetKeyboard notes={targetNotes(target)} />
          <p className="text-center text-xs text-slate-500">
            {target.kind === 'chord' ? 'Any octave and any inversion counts.' : 'Play this exact key: the octave counts.'}
          </p>

          <div className="mt-auto flex items-center justify-between">
            <HeartRow hearts={drill.hearts} />
            <MicMeter rmsDb={drill.rmsDb} />
          </div>
        </div>
      </div>

    </div>
  );
}
