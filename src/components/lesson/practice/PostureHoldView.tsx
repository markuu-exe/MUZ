/**
 * COURSE-5: posture-hold exercise. Camera only: hold a compliant playing posture
 * for settings.postureHoldSec seconds. No microphone, no hearts, no time limit.
 */
import { useEffect, useRef, useState } from 'react';
import type { ExerciseViewProps } from '../../../lesson/registry';
import { PostureHold } from '../../../practice/PostureHold';
import type { PostureHoldExercise } from '../../../types/lesson.types';
import CameraPanel from './CameraPanel';
import MediaDiagnostics, { mediaProblems } from './MediaDiagnostics';
import { usePracticeRig } from './PracticeRigContext';
import { Ring } from './PracticeWidgets';

const DONE_PAUSE_MS = 900;

export default function PostureHoldView({ exercise, settings, onOutcome }: ExerciseViewProps<PostureHoldExercise>) {
  const { rig, state } = usePracticeRig();
  const holdRef = useRef<PostureHold | null>(null);
  if (!holdRef.current) holdRef.current = new PostureHold({ holdMs: settings.postureHoldSec * 1000 });
  const onOutcomeRef = useRef(onOutcome);
  onOutcomeRef.current = onOutcome;

  const [view, setView] = useState<{ progress: number; cue: string | null; visible: boolean; done: boolean }>({
    progress: 0,
    cue: null,
    visible: true,
    done: false,
  });

  const problems = mediaProblems(state, false);
  const ready = state.camera.status === 'active' && state.model === 'ready';
  const starting = !ready && problems.length === 0 && (state.camera.status === 'requesting' || state.model === 'loading');

  useEffect(() => {
    const hold = holdRef.current!;
    let lastUi = 0;
    let finishTimer: number | null = null;
    const off = rig.on('posture', ({ tMs, snapshot }) => {
      if (hold.done) return;
      const finished = hold.push(tMs, snapshot.compliant, snapshot.inBandStrict);
      if (finished || tMs - lastUi >= 100) {
        lastUi = tMs;
        setView({
          progress: hold.progress,
          cue: snapshot.cues.find((c) => c.gating)?.message ?? null,
          visible: snapshot.compliant !== null,
          done: hold.done,
        });
      }
      if (finished) {
        finishTimer = window.setTimeout(
          () => onOutcomeRef.current({ passed: true, score: 1, metrics: { postureScore: hold.postureScore } }),
          DONE_PAUSE_MS,
        );
      }
    });
    return () => {
      off();
      if (finishTimer !== null) window.clearTimeout(finishTimer);
    };
  }, [rig]);

  const secondsLeft = Math.ceil((1 - view.progress) * settings.postureHoldSec);
  let message: string;
  if (view.done) message = 'Great posture. That is how to sit every time you play.';
  else if (!view.visible) message = 'Move so the camera can see your arm and hand from the side.';
  else if (view.cue) message = view.cue;
  else if (view.progress > 0) message = 'Good. Keep holding…';
  else message = 'Sit tall, forearms level with the keys, wrists straight.';

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-white">
        {exercise.prompt ?? `Hold a good playing posture for ${settings.postureHoldSec} seconds`}
      </h2>
      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <CameraPanel rig={rig} state={state} />
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-6 text-center">
          <Ring fraction={view.progress} label={view.done ? '✓' : String(secondsLeft)} tone={view.done ? 'emerald' : 'violet'} />
          <p className="text-sm font-semibold text-slate-200">{message}</p>
          <ul className="space-y-1 text-left text-xs text-slate-500">
            <li>Elbow angle between 80° and 110°</li>
            <li>Wrist straight (150° to 180°)</li>
            <li>Green lines mean good, red lines need fixing</li>
          </ul>
        </div>
      </div>

      {problems.length > 0 ? (
        <MediaDiagnostics problems={problems} onRetry={() => void rig.startCamera()} />
      ) : (
        !ready && (
          <div className="rounded-2xl border border-violet-500/30 bg-violet-950/30 p-5">
            <p className="text-sm text-slate-300">
              This exercise uses your camera to check your posture. The video stays on this computer.
            </p>
            <button
              type="button"
              disabled={starting}
              onClick={() => void rig.startCamera()}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(168,85,247,0.45)] transition hover:brightness-110 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
            >
              {starting ? 'Starting camera…' : 'Turn on camera'}
            </button>
          </div>
        )
      )}
    </div>
  );
}
