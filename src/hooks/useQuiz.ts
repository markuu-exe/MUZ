import { useCallback, useState } from "react";
import { buildQuiz, scoreQuiz, type QuizQuestion, type QuizResult } from "../lib/theory/quiz";

export function useQuiz(
  onComplete?: (result: QuizResult) => void,
  customQuestions?: QuizQuestion[]
) {
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    () => customQuestions ?? buildQuiz()
  );
  const [index, setIndex] = useState<number>(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [finished, setFinished] = useState<boolean>(false);

  const current = questions[index];
  const isCorrect = submitted && selected === current.correctIndex;

  const select = useCallback(
    (i: number) => {
      if (!submitted) setSelected(i);
    },
    [submitted]
  );

  const submit = useCallback(() => {
    if (selected === null || submitted) return;
    setAnswers((a) => [...a, selected === current.correctIndex]);
    setSubmitted(true);
  }, [selected, submitted, current]);

  const next = useCallback(() => {
    if (!submitted) return;
    if (index + 1 >= questions.length) {
      setFinished(true);
      onComplete?.(scoreQuiz(answers));
    } else {
      setIndex(index + 1);
      setSelected(null);
      setSubmitted(false);
    }
  }, [submitted, index, questions.length, answers, onComplete]);

  const retry = useCallback(() => {
    setQuestions(customQuestions ?? buildQuiz());
    setIndex(0);
    setSelected(null);
    setSubmitted(false);
    setAnswers([]);
    setFinished(false);
  }, [customQuestions]);

  return {
    current,
    index,
    total: questions.length,
    selected,
    submitted,
    isCorrect,
    correctSoFar: answers.filter(Boolean).length,
    answeredCount: answers.length,
    finished,
    result: finished ? scoreQuiz(answers) : null,
    select,
    submit,
    next,
    retry,
  };
}
