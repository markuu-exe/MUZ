/**
 * P4: a short guided camera check, shown once after placement (before the first practice
 * lesson) and available from Settings. Reuses the lesson camera pieces: the PracticeRig
 * (camera + pose worker, camera only, no microphone), the setup guide, the diagnostics with
 * retry, the video panel with the skeleton, and the drills' FramingTracker.
 * It only confirms the camera can see the arm; it never claims posture is judged accurately.
 * The learner can always skip or close it; the camera is released when it closes.
 */
import { useEffect, useState } from 'react';
import { CheckCircle2, Video } from 'lucide-react';
import { cameraCheckStatus, saveCameraCheck } from '../../practice/cameraCheck';
import { FramingTracker, type FramingState } from '../../practice/framing';
import { NOT_VISIBLE_MESSAGE } from '../../practice/visibilityCue';
import { cn } from '../../lib/cn';
import CameraPanel from '../lesson/practice/CameraPanel';
import CameraSetupGuide from '../lesson/practice/CameraSetupGuide';
import MediaDiagnostics, { mediaProblems } from '../lesson/practice/MediaDiagnostics';
import { PracticeRigProvider, usePracticeRig } from '../lesson/practice/PracticeRigContext';

interface CameraCheckModalProps {
  onClose: () => void;
}

function CameraCheckBody({ onClose }: CameraCheckModalProps) {
  const { rig, state } = usePracticeRig();
  const [framing, setFraming] = useState<FramingState>('searching');
  const [lastCue, setLastCue] = useState<string | null>(null);
  useEffect(() => {
    const tracker = new FramingTracker();
    return rig.on('posture', ({ tMs, snapshot }) => {
      setFraming(tracker.push(tMs, snapshot.compliant));
      setLastCue(snapshot.cues.find((c) => c.gating)?.message ?? null);
    });
  }, [rig]);

  const status = cameraCheckStatus(state, framing);
  const problems = mediaProblems(state, false);
  const passed = status.kind === 'framed';

  const finish = () => {
    saveCameraCheck(passed ? 'passed' : 'skipped');
    onClose();
  };

  let message: { text: string; tone: 'slate' | 'amber' | 'emerald' } | null = null;
  if (status.kind === 'searching')
    message = {
      text: `The camera is on but cannot see your arm yet. ${lastCue ?? 'Move the camera or yourself until the shoulder, elbow and wrist nearest the camera are in view; the lines on the video appear when it can.'}`,
      tone: 'amber',
    };
  else if (status.kind === 'lost') message = { text: `Lost you. ${NOT_VISIBLE_MESSAGE}`, tone: 'amber' };
  else if (status.kind === 'framed')
    message = {
      text: 'The camera can see your arm. You are set up for practice lessons. Posture itself is checked during lessons.',
      tone: 'emerald',
    };

  return (
    <div className="space-y-4">
      {problems.length > 0 ? (
        <MediaDiagnostics problems={problems} onRetry={() => void rig.startCamera()} needsMic={false} />
      ) : status.kind === 'off' || status.kind === 'starting' ? (
        <CameraSetupGuide needsMic={false} starting={status.kind === 'starting'} onStart={() => void rig.startCamera()} />
      ) : null}

      {message && (
        <p
          role="status"
          className={cn(
            'flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-semibold',
            message.tone === 'emerald' && 'border-emerald-500/50 bg-emerald-950/50 text-emerald-100',
            message.tone === 'amber' && 'border-amber-500/40 bg-amber-950/40 text-amber-100',
          )}
        >
          {passed && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
          {message.text}
        </p>
      )}

      {(status.kind === 'searching' || status.kind === 'framed' || status.kind === 'lost') && (
        <div className="mx-auto max-w-xl">
          <CameraPanel rig={rig} state={state} />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={finish}
          className={cn(
            'rounded-xl px-5 py-2.5 text-sm font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300',
            passed
              ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 uppercase tracking-wider text-white hover:brightness-110'
              : 'border border-slate-600 text-slate-200 hover:border-slate-400',
          )}
        >
          {passed ? 'Done' : 'Skip for now'}
        </button>
      </div>
      {!passed && (
        <p className="text-right text-xs text-slate-500">You can run this check again any time from Settings.</p>
      )}
    </div>
  );
}

export default function CameraCheckModal({ onClose }: CameraCheckModalProps) {
  // Escape closes it like "Skip for now", so the learner is never trapped.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      saveCameraCheck('skipped');
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-check-title"
      className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/75 px-4 py-6"
    >
      <div className="muz-rise w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100">
        <h2 id="camera-check-title" className="flex items-center gap-2 text-xl font-black text-white">
          <Video className="h-5 w-5 text-violet-300" aria-hidden="true" /> Camera check
        </h2>
        <p className="mb-4 mt-1 text-sm text-slate-400">
          Practice lessons watch your arm to check your posture. Take a moment to place the camera so it can see your
          shoulder, elbow and wrist before your first practice lesson.
        </p>
        {/* Own rig: released (camera off) as soon as the check closes. */}
        <PracticeRigProvider>
          <CameraCheckBody onClose={onClose} />
        </PracticeRigProvider>
      </div>
    </div>
  );
}
