/** Placeholder for the Skill Tree while the learner's own progress is loading. */
export default function SkillTreeSkeleton() {
  return (
    <div role="status" aria-label="Loading your progress" className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 pb-32">
      <div className="h-36 w-full rounded-3xl border border-slate-800 bg-slate-900/60 motion-safe:animate-pulse" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex w-full max-w-[360px] items-center gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4 motion-safe:animate-pulse">
          <div className="h-11 w-11 rounded-xl bg-slate-800" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 rounded bg-slate-800" />
            <div className="h-2.5 w-1/3 rounded bg-slate-800/80" />
          </div>
        </div>
      ))}
      <p className="text-xs text-slate-500">Loading your progress…</p>
    </div>
  );
}
