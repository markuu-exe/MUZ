import { LogOut, Presentation } from 'lucide-react';

/**
 * Shown on every dashboard view while the app runs in demo mode (the existing
 * guest mode: a built-in sample learner, no sign-in, no database reads or
 * writes). Makes it obvious the data is not a real account and gives a
 * one-click way out.
 */
export default function DemoBanner({ onExit }: { onExit: () => void }) {
  return (
    <div
      role="status"
      className="flex shrink-0 items-center justify-between gap-4 border-b border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent px-8 py-2"
    >
      <p className="flex items-center gap-2 text-xs text-amber-100">
        <Presentation className="h-4 w-4 text-amber-300" aria-hidden="true" />
        <span className="font-black uppercase tracking-[0.18em] text-amber-300">Demo mode</span>
        <span className="text-amber-100/80">Sample learner with every lesson unlocked. Nothing you do here is saved.</span>
      </p>
      <button
        type="button"
        onClick={onExit}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-200 transition hover:bg-amber-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
      >
        <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
        Exit demo
      </button>
    </div>
  );
}
