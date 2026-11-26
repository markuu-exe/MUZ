/**
 * Placeholder for the Skill Tree while the learner's own progress is loading.
 * Mirrors SkillTreeView's boxes (container, unit card, node rows and gaps) so
 * nothing jumps when the real tree replaces it.
 */
const NODES = 5;

export default function SkillTreeSkeleton() {
  return (
    <div role="status" aria-label="Loading your progress" className="mx-auto flex w-full max-w-2xl flex-col items-center gap-12 pb-32">
      <section className="w-full">
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-center justify-between">
            <div className="h-6 w-24 rounded-full bg-slate-800 motion-safe:animate-pulse" />
            <span className="text-xs font-semibold text-slate-400">Loading your progress…</span>
          </div>
          <div className="mt-3 h-8 w-2/3 rounded bg-slate-800 motion-safe:animate-pulse" />
          <div className="mt-1 h-5 w-5/6 rounded bg-slate-800/80" />
          <div className="mt-4 h-1.5 w-full rounded-full bg-slate-800" />
        </div>

        <div className="relative mx-auto mt-8 flex w-full max-w-md flex-col items-center">
          {Array.from({ length: NODES }, (_, i) => (
            <div key={i} className="relative flex w-full flex-col items-center">
              <div className="flex w-full max-w-[360px] items-center gap-3.5 rounded-2xl border border-slate-800/90 bg-slate-950/70 p-4 motion-safe:animate-pulse">
                <div className="h-11 w-11 shrink-0 rounded-xl bg-slate-800" />
                <div className="flex-1">
                  <div className="h-5 w-2/3 rounded bg-slate-800" />
                  <div className="mt-0.5 h-4 w-1/3 rounded bg-slate-800/80" />
                </div>
                <div className="h-6 w-16 shrink-0 rounded-full bg-slate-800" />
              </div>
              <div className="h-10" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
