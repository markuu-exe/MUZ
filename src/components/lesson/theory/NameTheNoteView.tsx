import { useState } from 'react';
import { gradeChoice } from '../../../lesson/grading';
import type { ExerciseViewProps } from '../../../lesson/registry';
import { playNote } from '../../../lib/theory/playNote';
import type { NameTheNoteExercise } from '../../../types/lesson.types';
import GrandStaff from '../../theory/GrandStaff';
import CheckButton from './CheckButton';
import OptionGrid from './OptionGrid';

export default function NameTheNoteView({ exercise, submitted, onOutcome }: ExerciseViewProps<NameTheNoteExercise>) {
  const [picked, setPicked] = useState<number | null>(null);
  const right = gradeChoice(exercise.correctIndex, picked);
  const check = () => onOutcome({ passed: right, score: right ? 1 : 0 });
  const color = !submitted ? '#c4b5fd' : right ? '#34d399' : '#fb7185';
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">{exercise.prompt}</h2>
      <div className="flex flex-col items-center gap-3 rounded-xl border border-violet-500/20 bg-slate-950/80 p-4 text-slate-200">
        <GrandStaff notes={[exercise.note]} color={color} />
        <button
          type="button"
          onClick={() => playNote(exercise.note)}
          className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.25)] transition hover:bg-cyan-500/20 active:scale-95"
        >
          ▶ Listen
        </button>
      </div>
      <OptionGrid
        options={exercise.options}
        selected={picked}
        correctIndex={exercise.correctIndex}
        submitted={submitted}
        onSelect={setPicked}
      />
      <CheckButton disabled={picked === null} hidden={submitted} onClick={check} />
    </div>
  );
}
