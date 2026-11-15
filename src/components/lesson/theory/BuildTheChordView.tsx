import { useState } from 'react';
import { chordPitchClasses, gradeBuildChord } from '../../../lesson/grading';
import type { ExerciseViewProps } from '../../../lesson/registry';
import type { BuildTheChordExercise } from '../../../types/lesson.types';
import PianoKeyboard from '../../theory/PianoKeyboard';
import CheckButton from './CheckButton';
import { playNotes } from './NoteFigure';

/** One voicing of the chord inside the keyboard range, used to show the answer. */
export function exampleVoicing(chord: string, range: [number, number]): number[] {
  const pcs = chordPitchClasses(chord);
  const out: number[] = [];
  let from = Math.max(range[0], 60 - 12);
  for (const p of pcs) {
    let m = from;
    while (m <= range[1] && ((m % 12) + 12) % 12 !== p) m++;
    if (m > range[1]) continue;
    out.push(m);
    from = m + 1;
  }
  return out;
}

export default function BuildTheChordView({ exercise, submitted, onOutcome }: ExerciseViewProps<BuildTheChordExercise>) {
  const [selected, setSelected] = useState<number[]>([]);
  const right = gradeBuildChord(exercise, selected);
  const check = () => onOutcome({ passed: right, score: right ? 1 : 0 });
  const toggle = (midi: number) => {
    if (submitted) return;
    setSelected((s) => (s.includes(midi) ? s.filter((m) => m !== midi) : [...s, midi]));
  };
  const shown = submitted && !right ? exampleVoicing(exercise.chord, exercise.range) : selected;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">{exercise.prompt}</h2>
        <p className="mt-1 text-sm text-slate-400">Click keys to add or remove them. Any octave works.</p>
      </div>
      <div className="flex overflow-x-auto rounded-xl border border-violet-500/20 bg-slate-950/80 p-4">
        <div className="mx-auto">
        <PianoKeyboard
          startMidi={exercise.range[0]}
          endMidi={exercise.range[1]}
          highlighted={shown}
          tone={!submitted ? 'neutral' : 'correct'}
          showLabels={submitted}
          onKeyPress={toggle}
        />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={shown.length === 0}
          onClick={() => playNotes([...shown].sort((a, b) => a - b), true)}
          className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20 active:scale-95 disabled:opacity-40"
        >
          ▶ Hear it
        </button>
        {!submitted && selected.length > 0 && (
          <button type="button" onClick={() => setSelected([])} className="text-sm text-slate-400 hover:text-white">
            Clear
          </button>
        )}
        {submitted && !right && <span className="text-sm text-rose-300">One way to play it is highlighted.</span>}
      </div>
      <CheckButton disabled={selected.length === 0} hidden={submitted} onClick={check} />
    </div>
  );
}
