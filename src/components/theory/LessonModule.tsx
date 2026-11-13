import { useState } from "react";
import type { Lesson } from "../../lib/theory/lesson";
import type { QuizResult } from "../../lib/theory/quiz";
import { playNote } from "../../lib/theory/playNote";
import GrandStaff from "./GrandStaff";
import PianoKeyboard from "./PianoKeyboard";
import Quiz from "./Quiz";

interface LessonModuleProps {
  lesson: Lesson;
  onComplete?: (result: QuizResult) => void;
}

export default function LessonModule({ lesson, onComplete }: LessonModuleProps) {
  const [step, setStep] = useState<number>(0);
  const total = lesson.cards.length;
  const inQuiz = step >= total;
  const card = lesson.cards[step];

  const progress = Math.round((Math.min(step, total) / total) * 100);

  return (
    <div className="max-w-3xl space-y-5">
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-slate-400">
          <span>{lesson.title}</span>
          <span>{inQuiz ? "Quiz" : `Card ${step + 1} of ${total}`}</span>
        </div>
        <div className="h-2 rounded bg-slate-800">
          <div className="h-2 rounded bg-violet-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {inQuiz ? (
        <>
          <Quiz questions={lesson.quiz} onComplete={onComplete} />
          <button
            onClick={() => setStep(total - 1)}
            className="rounded-lg border border-slate-700 px-5 py-2 hover:bg-slate-800"
          >
            Back to the cards
          </button>
        </>
      ) : (
        <div className="rounded-xl bg-slate-900 p-8 space-y-5">
          <h2 className="text-2xl font-bold">{card.title}</h2>
          <p className="text-slate-300">{card.body}</p>

          {card.notes && (card.display === "staff" || card.display === "both") && (
            <div className="rounded-lg bg-slate-950 p-4">
              <GrandStaff notes={card.notes} chord={card.notes.length > 1} />
            </div>
          )}

          {card.notes && (card.display === "keyboard" || card.display === "both") && (
            <div className="overflow-x-auto rounded-lg bg-slate-950 p-4">
              <PianoKeyboard startMidi={60} endMidi={83} highlighted={card.notes} />
            </div>
          )}

          {card.notes && (
            <button
              onClick={() => card.notes?.forEach((n) => playNote(n))}
              className="rounded bg-slate-800 px-4 py-2 hover:bg-slate-700"
            >
              Listen
            </button>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
              className="rounded-lg border border-slate-700 px-5 py-3 disabled:opacity-40"
            >
              Back
            </button>
            <button
              onClick={() => setStep(step + 1)}
              className="rounded-lg bg-violet-500 px-6 py-3 font-semibold"
            >
              {step + 1 >= total ? "Start quiz" : "Next card"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
