import { Music2 } from 'lucide-react';
import { cn } from '../../lib/cn';

interface MuzMarkProps {
  className?: string;
  size?: 'sm' | 'md';
}

export default function MuzMark({ className, size = 'md' }: MuzMarkProps) {
  const box = size === 'sm' ? 'h-9 w-9 rounded-xl' : 'h-11 w-11 rounded-2xl';
  const icon = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'flex items-center justify-center bg-muz-accent text-white shadow-[0_0_24px_rgba(139,108,255,0.35)]',
          box,
        )}
      >
        <Music2 className={icon} />
      </div>
      <span className="text-lg font-bold tracking-[0.18em] text-white">MUZ</span>
    </div>
  );
}
