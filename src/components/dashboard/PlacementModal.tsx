/**
 * COURSE-6: asked once, before a new learner's first lesson. Starting later
 * marks every earlier lesson completed and raises EXP so the start lesson unlocks.
 */
import { useState } from 'react';
import { cn } from '../../lib/cn';
import { PLACEMENT_OPTIONS } from '../../lib/progress/placement';

interface PlacementModalProps {
  onChoose: (startUnit: number) => Promise<void>;
}

export default function PlacementModal({ onChoose }: PlacementModalProps) {
  const [choice, setChoice] = useState(PLACEMENT_OPTIONS[0].startUnit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onChoose(choice);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your choice could not be saved. Try again.');
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="placement-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 px-4"
    >
      <div className="muz-rise w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100">
        <h2 id="placement-title" className="text-xl font-black text-white">
          Where should you start?
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Pick the level that matches how you play today. Lessons before it are marked complete, and you can still
          replay any of them.
        </p>

        <div className="mt-5 space-y-3" role="radiogroup" aria-label="Starting level">
          {PLACEMENT_OPTIONS.map((o) => (
            <button
              key={o.startUnit}
              type="button"
              role="radio"
              aria-checked={choice === o.startUnit}
              disabled={busy}
              onClick={() => setChoice(o.startUnit)}
              className={cn(
                'w-full rounded-xl border px-4 py-3 text-left transition',
                choice === o.startUnit
                  ? 'border-violet-400 bg-violet-500/15 shadow-[0_0_14px_rgba(139,92,246,0.4)]'
                  : 'border-slate-700 hover:border-slate-500',
              )}
            >
              <span className="block text-sm font-bold text-white">
                {o.label} <span className="font-normal text-slate-400">· start at Unit {o.startUnit}</span>
              </span>
              <span className="mt-0.5 block text-xs text-slate-400">{o.blurb}</span>
            </button>
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}

        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {busy ? 'Saving…' : choice === 1 ? 'Start from the beginning' : `Start at Unit ${choice}`}
        </button>
      </div>
    </div>
  );
}
