/**
 * T-14 / KAN-235: first step for a new learner, shown before placement.
 * Piano is the only instrument (SRS 3.1.1.2–3.1.1.3), so it is shown selected
 * and the others are visibly unavailable. Persistence (U-25, decided 2026-11-21):
 * shown while placement is unfinished, which is already stored on the account.
 */
import { Check, Guitar, Mic2, Piano } from 'lucide-react';

const OTHER_INSTRUMENTS = [
  { label: 'Guitar', icon: Guitar },
  { label: 'Voice', icon: Mic2 },
] as const;

export default function OnboardingWelcome({ onContinue }: { onContinue: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 px-4"
    >
      <div className="muz-rise w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100">
        <h2 id="welcome-title" className="text-xl font-black text-white">
          Welcome to MUZ
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Your course is set up for piano. Next, pick where you want to start.
        </p>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div
            className="relative rounded-xl border border-violet-400 bg-violet-500/15 p-4 text-center shadow-[0_0_14px_rgba(139,92,246,0.4)]"
            aria-label="Piano, selected"
          >
            <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-white">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <Piano className="mx-auto h-8 w-8 text-violet-200" aria-hidden="true" />
            <p className="mt-2 text-sm font-bold text-white">Piano</p>
            <p className="text-[11px] text-violet-200">Selected</p>
          </div>
          {OTHER_INSTRUMENTS.map(({ label, icon: Icon }) => (
            <div
              key={label}
              aria-disabled="true"
              tabIndex={-1}
              className="cursor-not-allowed rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center opacity-50"
            >
              <Icon className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
              <p className="mt-2 text-sm font-bold text-slate-400">{label}</p>
              <p className="text-[11px] text-slate-400">Coming soon</p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onContinue}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:brightness-110"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
