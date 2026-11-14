import { useState } from "react";
import Quiz from "./Quiz";
import type { QuizResult } from "../../lib/theory/quiz";

export default function QuizTest() {
  const [last, setLast] = useState<QuizResult | null>(null);

  return (
    <div className="bg-slate-950 text-white p-10 space-y-6">
      <p className="text-sm text-emerald-400">Theory quiz test</p>
      <Quiz onComplete={setLast} />
      {last && (
        <pre className="rounded bg-slate-900 p-4 text-sm">
          onComplete result: {JSON.stringify(last, null, 2)}
        </pre>
      )}
    </div>
  );
}
