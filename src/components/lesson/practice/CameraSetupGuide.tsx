/**
 * Shown before a camera exercise starts: where to put the camera so the pose
 * model can judge the elbow and wrist. The posture rules measure the arm from
 * the side (SRS 3.1.5.2), so a front-facing laptop camera is the usual
 * reason posture cannot be judged.
 */

interface CameraSetupGuideProps {
  needsMic: boolean;
  starting: boolean;
  onStart: () => void;
}

/** Top-down sketch: keyboard, learner, camera off to the side at arm height. */
function SetupDiagram() {
  return (
    <svg viewBox="0 0 220 150" className="h-36 w-full max-w-[260px]" aria-hidden="true" focusable="false">
      {/* keyboard */}
      <rect x="20" y="18" width="120" height="26" rx="4" fill="#1e293b" stroke="#64748b" />
      {Array.from({ length: 11 }, (_, i) => (
        <line key={i} x1={30 + i * 10} x2={30 + i * 10} y1="18" y2="44" stroke="#475569" />
      ))}
      <text x="80" y="12" textAnchor="middle" fontSize="9" fill="#94a3b8">piano</text>
      {/* learner seen from above */}
      <circle cx="80" cy="92" r="14" fill="#7c3aed" opacity="0.85" />
      <path d="M66 92 L50 58 M94 92 L110 58" stroke="#c4b5fd" strokeWidth="5" strokeLinecap="round" />
      <text x="80" y="124" textAnchor="middle" fontSize="9" fill="#94a3b8">you</text>
      {/* camera to the side, pointing at the learner */}
      <rect x="176" y="82" width="26" height="18" rx="3" fill="#0f172a" stroke="#34d399" strokeWidth="1.5" />
      <circle cx="176" cy="91" r="5" fill="#34d399" />
      <path d="M170 91 L118 70 M170 91 L118 112" stroke="#34d399" strokeDasharray="3 4" />
      <text x="189" y="116" textAnchor="middle" fontSize="9" fill="#6ee7b7">camera</text>
      <text x="146" y="140" textAnchor="middle" fontSize="8" fill="#94a3b8">about 1 m, level with your elbow</text>
    </svg>
  );
}

export default function CameraSetupGuide({ needsMic, starting, onStart }: CameraSetupGuideProps) {
  return (
    <div className="rounded-2xl border border-violet-500/30 bg-violet-950/30 p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-violet-300">Set up your camera first</p>
      <div className="mt-3 flex flex-col items-center gap-5 md:flex-row md:items-start">
        <SetupDiagram />
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-200">
          <li>
            Put the camera <strong>to your left or right side</strong>, not in front of you, about 1 m away and level with
            your elbow. A phone or laptop propped on a chair works.
          </li>
          <li>
            Sit as you play. The camera must see the <strong>shoulder, elbow and wrist</strong> of the arm nearest to it.
          </li>
          <li>
            When the camera can see your arm, the lines on the video turn green or red.{' '}
            {needsMic ? (
              <>
                <strong>The timer only starts then</strong>, and it pauses if the camera loses you, so you never lose a heart
                while getting into position.
              </>
            ) : (
              'The ring only fills while the camera can see your arm.'
            )}
          </li>
        </ol>
      </div>
      <p className="mt-3 text-xs text-slate-400">Video{needsMic ? ' and sound stay' : ' stays'} on this computer. Nothing is recorded or uploaded.</p>
      <button
        type="button"
        disabled={starting}
        onClick={onStart}
        className="mt-4 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(168,85,247,0.45)] transition hover:brightness-110 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
      >
        {starting
          ? needsMic
            ? 'Starting camera and microphone…'
            : 'Starting camera…'
          : needsMic
            ? 'Turn on camera and microphone'
            : 'Turn on camera'}
      </button>
    </div>
  );
}
