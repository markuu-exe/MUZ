/**
 * "Continue where I left off" (UX 2026-11-27): one button at the top of the Skill Tree (and
 * Profile) that opens the next lesson straight away, with the same checks as the Start button.
 */
import { Play } from 'lucide-react';
import type { CurriculumNode } from '../../lib/dashboard/curriculum';

interface ContinueCardProps {
  lesson: Pick<CurriculumNode, 'title' | 'description' | 'kind'>;
  onContinue: () => void;
  compact?: boolean;
}

const KIND_LABEL: Record<string, string> = { theory: 'Theory', practice: 'Practice', rhythm: 'Rhythm' };

export default function ContinueCard({ lesson, onContinue, compact = false }: ContinueCardProps) {
  return (
    <section
      aria-label="Continue where you left off"
      className="mx-auto mb-6 flex w-full max-w-3xl flex-wrap items-center justify-between gap-4 rounded-2xl border border-violet-500/40 bg-violet-950/40 px-5 py-4"
    >
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-300">
          Continue · {KIND_LABEL[lesson.kind] ?? 'Lesson'}
        </p>
        <p className="truncate text-lg font-black text-white">{lesson.title}</p>
        {!compact && lesson.description && <p className="truncate text-sm text-slate-400">{lesson.description}</p>}
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition hover:brightness-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
      >
        <Play className="h-4 w-4 fill-white" aria-hidden="true" /> Continue
      </button>
    </section>
  );
}
