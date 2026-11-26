/**
 * Placeholder for the Skill Tree while the learner's own progress is loading.
 * Uses the same container, tier header, unit banner and path geometry as
 * SkillTreeView (pathLayout.ts), so nothing jumps when the real tree appears.
 */
import { PATH_WIDTH, pathHeight, pathPoints, segmentPath } from '../../lib/dashboard/pathLayout';

const NODES = 5;
const NODE_SIZE = 68;

export default function SkillTreeSkeleton() {
  const points = pathPoints(NODES, 0);
  return (
    <div role="status" aria-label="Loading your progress" className="mx-auto flex w-full max-w-3xl flex-col items-center gap-10 pb-40">
      <section className="w-full">
        <div className="mb-6 flex items-center gap-3" aria-hidden="true">
          <div className="h-px flex-1 bg-slate-800" />
          <div className="h-[26px] w-40 rounded-full bg-slate-800 motion-safe:animate-pulse" />
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="max-w-[70%]">
            <div className="flex items-center gap-2">
              <div className="h-[22px] w-16 rounded-full bg-slate-800 motion-safe:animate-pulse" />
              <span className="text-[11px] font-semibold text-slate-400">Loading your progress…</span>
            </div>
            <div className="mt-2 h-8 w-2/3 rounded bg-slate-800 motion-safe:animate-pulse" />
            <div className="mt-1 h-5 w-full rounded bg-slate-800/80" />
            <div className="mt-4 flex items-center gap-3">
              <div className="h-2 w-48 rounded-full bg-slate-800" />
              <div className="h-4 w-8 rounded bg-slate-800" />
            </div>
          </div>
        </div>

        <div className="relative mx-auto mt-6" style={{ width: PATH_WIDTH, height: pathHeight(NODES) }} aria-hidden="true">
          <svg className="absolute inset-0" width={PATH_WIDTH} height={pathHeight(NODES)} focusable="false">
            {points.slice(1).map((p, i) => (
              <path key={i} d={segmentPath(points[i], p)} fill="none" stroke="#1e293b" strokeWidth={14} strokeLinecap="round" />
            ))}
          </svg>
          {points.map((p, i) => (
            <div
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-slate-800 bg-slate-800/80 motion-safe:animate-pulse"
              style={{ left: p.x, top: p.y, width: NODE_SIZE, height: NODE_SIZE }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
