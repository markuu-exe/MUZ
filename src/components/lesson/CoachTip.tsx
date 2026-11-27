/**
 * "Ask the AI coach" on the results screen. Opt-in: nothing is sent until the learner presses
 * the button, and the note says exactly what is sent (scores only) and to whom.
 */
import { useState } from 'react';
import { Loader2, MessageCircle } from 'lucide-react';
import type { LessonResult } from '../../lesson/types';
import { buildCoachInput } from '../../lib/coach/coach';
import { requestTip } from '../../lib/coach/requestTip';

type State = { kind: 'idle' } | { kind: 'loading' } | { kind: 'tip'; text: string } | { kind: 'error'; message: string };

export default function CoachTip({ result, title }: { result: LessonResult; title: string }) {
  const [state, setState] = useState<State>({ kind: 'idle' });

  const ask = async () => {
    setState({ kind: 'loading' });
    const res = await requestTip(buildCoachInput(result, title));
    setState(res.ok ? { kind: 'tip', text: res.tip } : { kind: 'error', message: res.message });
  };

  return (
    <div className="rounded-2xl border border-violet-500/30 bg-violet-950/30 p-4 text-left">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-bold text-violet-100">
          <MessageCircle className="h-4 w-4 text-violet-300" aria-hidden="true" /> AI coach
        </p>
        {(state.kind === 'idle' || state.kind === 'error') && (
          <button
            type="button"
            onClick={() => void ask()}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-violet-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
          >
            {state.kind === 'error' ? 'Try again' : 'Get a tip'}
          </button>
        )}
      </div>
      <div aria-live="polite" className="mt-2 text-sm">
        {state.kind === 'loading' && (
          <p className="flex items-center gap-2 text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> The coach is reading your scores…
          </p>
        )}
        {state.kind === 'tip' && <p className="leading-relaxed text-slate-100">{state.text}</p>}
        {state.kind === 'error' && <p className="text-amber-200">{state.message}</p>}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        {state.kind === 'tip'
          ? 'Written by Claude (AI) from this lesson’s scores. It can be wrong; your lesson results above are what count.'
          : 'Sends only this lesson’s scores and title to Claude (Anthropic’s AI), never your name, video or audio.'}
      </p>
    </div>
  );
}
