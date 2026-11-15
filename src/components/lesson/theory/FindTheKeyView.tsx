import { useState } from 'react';
import { gradeFindKey } from '../../../lesson/grading';
import type { ExerciseViewProps } from '../../../lesson/registry';
import { midiToName } from '../../../lib/theory/notes';
import type { FindTheKeyExercise } from '../../../types/lesson.types';
import PianoKeyboard from '../../theory/PianoKeyboard';
import CheckButton from './CheckButton';

export default function FindTheKeyView({ exercise, submitted, onOutcome }: ExerciseViewProps<FindTheKeyExercise>) {
  const [pressed, setPressed] = useState<number | null>(null);
  const right = gradeFindKey(exercise, pressed);
  const check = () => onOutcome({ passed: right, score: right ? 1 : 0 });
  // After a wrong answer, show where the key really is.
  const shown = submitted && !right ? [exercise.target] : pressed === null ? [] : [pressed];
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">{exercise.prompt}</h2>
      <div className="flex overflow-x-auto rounded-xl border border-violet-500/20 bg-slate-950/80 p-4">
        <div className="mx-auto">
        <PianoKeyboard
          startMidi={exercise.range[0]}
          endMidi={exercise.range[1]}
          highlighted={shown}
          tone={submitted ? 'correct' : 'neutral'}
          showLabels={submitted}
          onKeyPress={(midi) => {
            if (!submitted) setPressed(midi);
          }}
        />
        </div>
      </div>
      {submitted && !right && pressed !== null && (
        <p className="text-sm text-rose-300">
          You pressed {midiToName(pressed)}. The highlighted key is {midiToName(exercise.target)}.
        </p>
      )}
      <CheckButton disabled={pressed === null} hidden={submitted} onClick={check} />
    </div>
  );
}
