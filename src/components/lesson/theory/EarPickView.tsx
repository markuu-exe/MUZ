import { useEffect, useRef, useState } from 'react';
import { gradeChoice } from '../../../lesson/grading';
import type { ExerciseViewProps } from '../../../lesson/registry';
import { playNote } from '../../../lib/theory/playNote';
import type { EarPickExercise } from '../../../types/lesson.types';
import CheckButton from './CheckButton';
import OptionGrid from './OptionGrid';

const GROUP_GAP_MS = 900;

export default function EarPickView({ exercise, submitted, onOutcome }: ExerciseViewProps<EarPickExercise>) {
  const [picked, setPicked] = useState<number | null>(null);
  const [heard, setHeard] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const listen = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = exercise.play.map((group, i) =>
      window.setTimeout(() => group.forEach((n) => playNote(n, 1.1)), i * GROUP_GAP_MS),
    );
    setHeard(true);
  };

  const check = () => {
    const passed = gradeChoice(exercise.correctIndex, picked);
    onOutcome({ passed, score: passed ? 1 : 0 });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">{exercise.prompt}</h2>
      <button
        type="button"
        onClick={listen}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-cyan-400/50 bg-cyan-500/10 px-6 py-6 text-lg font-bold text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.3)] transition hover:bg-cyan-500/20 active:scale-[0.98]"
      >
        <span className="text-2xl">🔊</span> {heard ? 'Play again' : 'Play sound'}
      </button>
      <OptionGrid
        options={exercise.options}
        selected={picked}
        correctIndex={exercise.correctIndex}
        submitted={submitted}
        onSelect={setPicked}
      />
      <CheckButton disabled={picked === null || !heard} hidden={submitted} onClick={check} />
      {!heard && <p className="text-center text-xs text-slate-500">Listen first, then choose.</p>}
    </div>
  );
}
