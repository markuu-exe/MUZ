/**
 * COURSE-5: what to show when the camera, the microphone or the pose model is not
 * available (SRS 3.3.1: descriptive diagnostics, practice disabled, no crash).
 */
import type { AudioErrorCode } from '../../../audio/errors/AudioError';
import type { RigState } from '../../../practice/PracticeRig';
import type { VisionErrorCode } from '../../../vision/errors/VisionError';

type Code = VisionErrorCode | AudioErrorCode;

const HELP: Record<Code, { title: string; fix: string }> = {
  PERMISSION_DENIED: {
    title: 'Access was blocked',
    fix: 'Click the camera or lock icon in the address bar, allow access for this site, then press Try again.',
  },
  NO_DEVICE: { title: 'No device found', fix: 'Plug it in or switch it on, then press Try again.' },
  DEVICE_BUSY: {
    title: 'The device is in use',
    fix: 'Close other apps or browser tabs that are using it (video calls, recorders), then press Try again.',
  },
  DISCONNECTED: { title: 'The device was disconnected', fix: 'Reconnect it, then press Try again.' },
  CONSTRAINTS_UNSATISFIED: { title: 'This camera cannot be used', fix: 'Try another camera, then press Try again.' },
  UNSUPPORTED: {
    title: 'This browser cannot run practice',
    fix: 'Use a current version of Chrome, Edge or Firefox on a desktop or laptop.',
  },
  INSECURE_CONTEXT: { title: 'A secure page is required', fix: 'Open MUZ over https (or localhost during development).' },
  MODEL_LOAD_FAILED: {
    title: 'The posture model did not load',
    fix: 'Check your connection and press Try again. If it keeps failing, reload the page.',
  },
  WORKLET_LOAD_FAILED: { title: 'The audio analyser did not load', fix: 'Press Try again. If it keeps failing, reload the page.' },
  UNKNOWN: { title: 'Something went wrong', fix: 'Press Try again. If it keeps failing, reload the page.' },
};

export interface MediaProblem {
  device: 'Camera' | 'Microphone' | 'Posture model';
  code: Code;
}

/** Problems that stop practice, camera first. `needMic` is false for posture-only exercises. */
export function mediaProblems(state: RigState, needMic: boolean): MediaProblem[] {
  const out: MediaProblem[] = [];
  if (state.camera.status === 'error' && state.camera.error) out.push({ device: 'Camera', code: state.camera.error.code });
  if (state.model === 'error') out.push({ device: 'Posture model', code: state.modelError?.code ?? 'MODEL_LOAD_FAILED' });
  if (needMic && state.mic === 'error') out.push({ device: 'Microphone', code: state.micError?.code ?? 'UNKNOWN' });
  return out;
}

interface MediaDiagnosticsProps {
  problems: MediaProblem[];
  onRetry: () => void;
}

export default function MediaDiagnostics({ problems, onRetry }: MediaDiagnosticsProps) {
  const canRetry = problems.some((p) => p.code !== 'UNSUPPORTED' && p.code !== 'INSECURE_CONTEXT');
  return (
    <div role="alert" className="muz-rise space-y-4 rounded-2xl border border-rose-500/40 bg-rose-950/40 p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-rose-300">Practice is paused</p>
        <h3 className="mt-1 text-xl font-bold text-white">MUZ cannot reach your {problems.map((p) => p.device.toLowerCase()).join(' and ')}</h3>
      </div>
      <ul className="space-y-3">
        {problems.map((p) => (
          <li key={`${p.device}-${p.code}`} className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
            <p className="font-semibold text-slate-100">
              {p.device}: {HELP[p.code].title}
            </p>
            <p className="mt-1 text-sm text-slate-300">{HELP[p.code].fix}</p>
            <p className="mt-2 font-mono text-[11px] text-slate-500">{p.code}</p>
          </li>
        ))}
      </ul>
      <p className="text-sm text-slate-400">
        Practice exercises need both. Your video and sound are checked on this computer only and are never recorded or uploaded.
        You can leave the lesson with ✕; theory and rhythm lessons work without a camera or microphone.
      </p>
      {canRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl bg-rose-500 px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-white transition hover:brightness-110"
        >
          Try again
        </button>
      )}
    </div>
  );
}
