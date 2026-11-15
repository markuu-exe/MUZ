import { useState } from 'react';
import { gradeChoice } from '../../../lesson/grading';
import type { ExerciseViewProps } from '../../../lesson/registry';
import type { ChooseAnswerExercise } from '../../../types/lesson.types';
import CheckButton from './CheckButton';
import NoteFigure from './NoteFigure';
import OptionGrid from './OptionGrid';

export default function ChooseAnswerView({ exercise, submitted, onOutcome }: ExerciseViewProps<ChooseAnswerExercise>) {
  const [picked, setPicked] = useState<number | null>(null);
  const check = () => {
    const passed = gradeChoice(exercise.correctIndex, picked);
    onOutcome({ passed, score: passed ? 1 : 0 });
  };
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">{exercise.prompt}</h2>
      {exercise.notes && exercise.notes.length > 0 && <NoteFigure notes={exercise.notes} display={exercise.display} />}
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
