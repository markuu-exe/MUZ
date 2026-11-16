import type { ConceptCardExercise } from '../../../types/lesson.types';
import type { ExerciseViewProps } from '../../../lesson/registry';
import NoteFigure from './NoteFigure';

/** A teaching card. Nothing to grade: "Got it" always passes. */
export default function ConceptCardView({ exercise, onOutcome }: ExerciseViewProps<ConceptCardExercise>) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">{exercise.title}</h2>
        <p className="mt-3 text-lg leading-relaxed text-slate-300">{exercise.body}</p>
      </div>
      {exercise.notes && exercise.notes.length > 0 && (
        <NoteFigure notes={exercise.notes} display={exercise.display} chord={exercise.chord} />
      )}
      <button
        type="button"
        onClick={() => onOutcome({ passed: true, score: 1 })}
        className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(168,85,247,0.45)] transition hover:brightness-110 active:scale-[0.98]"
      >
        Got it
      </button>
    </div>
  );
}
