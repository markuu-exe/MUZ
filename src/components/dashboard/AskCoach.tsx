/**
 * "Ask the coach" (owner request 2026-11-28) at the top of Lesson Notes: one music question,
 * one short AI answer (Gemini free tier or Claude, guarded in src/lib/coach/ask.ts). When AI
 * is not set up, busy, offline, declines or the question is off-topic, MUZ searches the Lesson
 * Notes on this device instead. The card always says where the answer came from.
 */
import { useMemo, useState, type FormEvent } from 'react';
import { Loader2, MessageCircleQuestion } from 'lucide-react';
import { COURSE_LESSONS, COURSE_UNITS } from '../../content';
import { MAX_QUESTION, MIN_QUESTION, requestAnswer } from '../../lib/coach/ask';
import type { CoachSource } from '../../lib/coach/handler';
import { searchNotes, type NoteMatch } from '../../lib/coach/notesSearch';
import { buildLessonNotes } from '../../lib/dashboard/lessonNotes';

const EXAMPLES = ['What does a dotted note mean?', 'How do I find middle C?', 'Why does a minor chord sound sad?'];

const SOURCE: Record<CoachSource, string> = {
  gemini: 'Answered by Google Gemini (AI).',
  claude: 'Answered by Anthropic Claude (AI).',
};

const WHY: Record<string, string> = {
  not_configured: 'The AI coach is not set up on this version of MUZ.',
  rate_limited: 'The coach needs a short break (a few questions a minute).',
  declined: 'The AI could not answer that one.',
  offline: 'The AI could not be reached.',
};

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ai'; question: string; answer: string; source: CoachSource | null }
  | { kind: 'notes'; question: string; reason: string; matches: NoteMatch[] };

export default function AskCoach() {
  const notes = useMemo(() => buildLessonNotes(COURSE_LESSONS, COURSE_UNITS), []);
  const [question, setQuestion] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });
  const trimmed = question.trim();
  const canAsk = trimmed.length >= MIN_QUESTION && state.kind !== 'loading';

  const ask = async (q: string) => {
    setState({ kind: 'loading' });
    const res = await requestAnswer(q);
    if (res.ok && !res.offTopic) {
      setState({ kind: 'ai', question: q, answer: res.answer, source: res.source });
      return;
    }
    const reason = res.ok ? res.answer : (WHY[res.error] ?? 'The AI could not answer right now.');
    setState({ kind: 'notes', question: q, reason, matches: searchNotes(q, notes) });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (canAsk) void ask(trimmed);
  };

  return (
    <section aria-labelledby="ask-coach-title" className="rounded-2xl border border-violet-500/30 bg-violet-950/30 p-5">
      <h3 id="ask-coach-title" className="flex items-center gap-2 text-sm font-bold text-violet-100">
        <MessageCircleQuestion className="h-4 w-4 text-violet-300" aria-hidden="true" /> Ask the coach
      </h3>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="ask-coach-input" className="sr-only">
          Your music question
        </label>
        <input
          id="ask-coach-input"
          type="text"
          value={question}
          maxLength={MAX_QUESTION}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about notes, chords, rhythm, reading music or practice…"
          className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300/40"
        />
        <button
          type="submit"
          disabled={!canAsk}
          className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-violet-500 disabled:opacity-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
        >
          {state.kind === 'loading' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Ask
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={state.kind === 'loading'}
            onClick={() => {
              setQuestion(ex);
              void ask(ex);
            }}
            className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-violet-400 hover:text-white disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>

      <div aria-live="polite" className="mt-3 space-y-2 text-sm">
        {state.kind === 'loading' && <p className="text-slate-300">Thinking about your question…</p>}
        {state.kind === 'ai' && (
          <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">You asked: {state.question}</p>
            <p className="mt-2 leading-relaxed text-slate-100">{state.answer}</p>
            <p className="mt-2 text-xs text-slate-400">
              {state.source ? SOURCE[state.source] : 'Answered by AI.'} It can be wrong; check it against your Lesson Notes.
            </p>
          </div>
        )}
        {state.kind === 'notes' && (
          <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">You asked: {state.question}</p>
            <p className="mt-2 text-slate-300">{state.reason}</p>
            {state.matches.length > 0 ? (
              <>
                <p className="mt-2 text-xs font-bold uppercase tracking-wider text-violet-300">From your Lesson Notes</p>
                <ul className="mt-1 space-y-2">
                  {state.matches.map((m) => (
                    <li key={`${m.lessonTitle}-${m.card.title}`}>
                      <p className="font-bold text-white">
                        {m.card.title} <span className="font-normal text-slate-400">· {m.lessonTitle}</span>
                      </p>
                      <p className="text-slate-200">{m.card.body}</p>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-slate-400">Nothing in your Lesson Notes matched those words. Try asking with a music word like chord, rhythm or scale.</p>
            )}
            <p className="mt-2 text-xs text-slate-400">Found on this device by MUZ (not AI).</p>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Your question goes to an AI service (Google Gemini’s free tier, which may use it to improve Google’s products, or Anthropic Claude). Please don’t type
        personal details. If AI is unavailable, MUZ searches your Lesson Notes instead.
      </p>
    </section>
  );
}
