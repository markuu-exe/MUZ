import { useQuiz } from "../../hooks/useQuiz";
import type { QuizQuestion, QuizResult } from "../../lib/theory/quiz";
import { playNote } from "../../lib/theory/playNote";
import GrandStaff from "./GrandStaff";
import PianoKeyboard from "./PianoKeyboard";

interface QuizProps {
  questions?: QuizQuestion[];
  onComplete?: (result: QuizResult) => void;
}

const GREEN = "#34d399";
const RED = "#f87171";

export default function Quiz({ questions, onComplete }: QuizProps) {
  const quiz = useQuiz(onComplete, questions);
  const { current } = quiz;

  if (quiz.finished && quiz.result) {
    const r = quiz.result;
    return (
      <div className="max-w-xl rounded-xl bg-slate-900 p-8 space-y-4">
        <h2 className="text-3xl font-bold">
          {r.correct} / {r.total} correct ({r.percent}%)
        </h2>
        <p>
          {r.allCorrect
            ? "All answers correct. The next lesson is unlocked."
            : "You need every answer correct to continue. Try again."}
        </p>
        {r.restoresHeart && <p className="text-emerald-400">80% or more: a heart is restored.</p>}
        <button onClick={quiz.retry} className="rounded-lg bg-violet-500 px-6 py-3 font-semibold">
          Try again
        </button>
      </div>
    );
  }

  const listen = () => current.notes?.forEach((n) => playNote(n));

  const tone = !quiz.submitted ? "neutral" : quiz.isCorrect ? "correct" : "wrong";
  const noteColor = !quiz.submitted ? "currentColor" : quiz.isCorrect ? GREEN : RED;

  const optionClass = (i: number): string => {
    if (!quiz.submitted) {
      return quiz.selected === i
        ? "border-violet-400 bg-violet-500/20"
        : "border-slate-700 bg-slate-950 hover:bg-slate-800";
    }
    if (i === current.correctIndex) return "border-emerald-400 bg-emerald-500/20 muz-pop";
    if (i === quiz.selected) return "border-red-400 bg-red-500/20 muz-shake";
    return "border-slate-800 bg-slate-950 opacity-50";
  };

  const optionMark = (i: number): string => {
    if (!quiz.submitted) return "";
    if (i === current.correctIndex) return "✓ ";
    if (i === quiz.selected) return "✗ ";
    return "";
  };

  return (
    <div className="max-w-3xl rounded-xl bg-slate-900 p-8 space-y-5">
      <style>{`
        @keyframes muz-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        @keyframes muz-pop { 0%{transform:scale(0.96)} 60%{transform:scale(1.03)} 100%{transform:scale(1)} }
        .muz-shake { animation: muz-shake 0.4s ease; }
        .muz-pop { animation: muz-pop 0.3s ease; }
        @media (prefers-reduced-motion: reduce) { .muz-shake, .muz-pop { animation: none; } }
      `}</style>

      <div className="flex justify-between text-sm text-slate-400">
        <span>
          Question {quiz.index + 1} of {quiz.total}
        </span>
        <span>
          {quiz.correctSoFar}/{quiz.answeredCount} correct so far
        </span>
      </div>

      <h2 className="text-2xl font-bold">{current.prompt}</h2>
      {current.hint && <p className="text-sm text-slate-400">{current.hint}</p>}

      {current.display === "staff" && current.notes && (
        <div className="rounded-lg bg-slate-950 p-4">
          <GrandStaff notes={current.notes} color={noteColor} />
        </div>
      )}

      {current.display === "keyboard" && current.notes && (
        <div className="overflow-x-auto rounded-lg bg-slate-950 p-4">
          <PianoKeyboard startMidi={60} endMidi={88} highlighted={current.notes} tone={tone} />
        </div>
      )}

      {current.notes && (
        <button onClick={listen} className="rounded bg-slate-800 px-4 py-2 hover:bg-slate-700">
          Listen
        </button>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {current.options.map((option, i) => (
          <button
            key={option}
            onClick={() => quiz.select(i)}
            disabled={quiz.submitted}
            className={`rounded-lg border px-4 py-3 text-left ${optionClass(i)}`}
          >
            {optionMark(i)}
            {option}
          </button>
        ))}
      </div>

      {quiz.submitted && (
        <div
          role="status"
          aria-live="polite"
          className={`muz-pop rounded-lg border p-4 ${
            quiz.isCorrect
              ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
              : "border-red-400 bg-red-500/10 text-red-200"
          }`}
        >
          <p className="text-xl font-bold">
            {quiz.isCorrect ? "Correct!" : "Not quite."}
          </p>
          {!quiz.isCorrect && (
            <p className="mt-1">
              The correct answer is <b>{current.options[current.correctIndex]}</b>.
            </p>
          )}
          <p className="mt-1 text-slate-200">{current.explanation}</p>
        </div>
      )}

      {!quiz.submitted ? (
        <button
          onClick={quiz.submit}
          disabled={quiz.selected === null}
          className="rounded-lg bg-violet-500 px-6 py-3 font-semibold disabled:opacity-40"
        >
          Submit answer
        </button>
      ) : (
        <button onClick={quiz.next} className="rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-black">
          {quiz.index + 1 >= quiz.total ? "See results" : "Next question"}
        </button>
      )}
    </div>
  );
}
