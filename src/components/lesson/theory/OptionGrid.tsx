import { cn } from '../../../lib/cn';

interface OptionGridProps {
  options: string[];
  selected: number | null;
  correctIndex: number;
  submitted: boolean;
  onSelect: (index: number) => void;
}

/** Answer buttons shared by every multiple-choice style exercise. */
export default function OptionGrid({ options, selected, correctIndex, submitted, onSelect }: OptionGridProps) {
  return (
    <div className={cn('grid gap-3', options.length > 2 ? 'sm:grid-cols-2' : 'grid-cols-2')}>
      {options.map((label, i) => {
        const isPicked = selected === i;
        const isRight = i === correctIndex;
        return (
          <button
            key={label}
            type="button"
            disabled={submitted}
            onClick={() => onSelect(i)}
            className={cn(
              'rounded-xl border px-5 py-4 text-left text-base font-semibold transition active:scale-[0.98]',
              !submitted && isPicked && 'border-violet-400 bg-violet-500/20 shadow-[0_0_16px_rgba(139,92,246,0.45)]',
              !submitted && !isPicked && 'border-slate-700 bg-slate-900 hover:border-violet-500/50 hover:bg-slate-800',
              submitted && isRight && 'muz-pop border-emerald-400 bg-emerald-500/20 text-emerald-100',
              submitted && isPicked && !isRight && 'muz-shake border-rose-400 bg-rose-500/20 text-rose-100',
              submitted && !isPicked && !isRight && 'border-slate-800 bg-slate-950 opacity-50',
            )}
          >
            {submitted && isRight ? '✓ ' : submitted && isPicked ? '✗ ' : ''}
            {label}
          </button>
        );
      })}
    </div>
  );
}
