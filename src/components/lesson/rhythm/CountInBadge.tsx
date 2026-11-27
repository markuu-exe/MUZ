/**
 * Accessible count-in readout shown under the beat highway (the highway itself is a canvas).
 * The number is the beat inside the bar ("1 2 3 4" in 4/4, "1 2 3 | 1 2 3" in 3/4); filled
 * dots show the beats heard so far in this bar, so it does not rely on colour. The status
 * line is a polite live region for screen readers.
 */
import { cn } from '../../../lib/cn';
import { rhythmCueText, type RhythmCue } from '../../../lib/rhythm/plan';
import type { TapExerciseType } from '../../../types/lesson.types';

interface CountInBadgeProps {
  cue: RhythmCue;
  mode?: TapExerciseType;
  /** Replaces the default "Tap now." line (e.g. with a tap counter). */
  tapText?: string;
}

export default function CountInBadge({ cue, mode = 'tap-along', tapText }: CountInBadgeProps) {
  const counting = cue.kind === 'count';
  const beatsPerBar = counting ? cue.beatsPerMeasure : 0;
  const text = cue.kind === 'play' && tapText ? tapText : rhythmCueText(cue, mode);
  return (
    <div className="flex items-center gap-4 rounded-xl border border-violet-500/40 bg-violet-950/40 px-4 py-3">
      <span
        aria-hidden="true"
        className={cn(
          'flex h-12 min-w-12 items-center justify-center rounded-full border-2 px-2 text-xl font-black',
          cue.kind === 'play' ? 'border-emerald-300 text-emerald-200' : 'border-violet-300 text-white',
        )}
      >
        {counting ? cue.measureBeat : cue.kind === 'play' ? 'TAP' : cue.kind === 'listen' ? '♪' : '…'}
      </span>
      <div className="space-y-1">
        <p role="status" aria-live="polite" className="text-sm font-semibold text-violet-100">
          {text}
        </p>
        {counting && (
          <span className="flex gap-1.5" aria-hidden="true">
            {Array.from({ length: beatsPerBar }, (_, i) => (
              <span
                key={i}
                className={cn('h-2.5 w-2.5 rounded-full border border-violet-300', i < cue.measureBeat ? 'bg-violet-300' : 'bg-transparent')}
              />
            ))}
          </span>
        )}
      </div>
    </div>
  );
}
