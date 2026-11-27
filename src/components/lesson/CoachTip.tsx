/**
 * Coach card on the results screen. Opt-in: nothing is sent until the learner presses the
 * button. It asks the AI coach (Gemini free tier or Claude, whichever the site has set up);
 * if that is not set up, busy, offline or declines, it shows MUZ's built-in tip instead.
 * The card always says which one wrote the tip.
 */
import { useState } from 'react';
import { Loader2, MessageCircle } from 'lucide-react';
import type { LessonResult } from '../../lesson/types';
import { builtinTip } from '../../lib/coach/builtinTip';
import { buildCoachInput } from '../../lib/coach/coach';
import type { CoachSource } from '../../lib/coach/handler';
import { requestTip } from '../../lib/coach/requestTip';

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'tip'; text: string; source: CoachSource | null }
  | { kind: 'builtin'; text: string; why: string };

const SOURCE_LABEL: Record<CoachSource, string> = {
  gemini: 'Written by Google Gemini (AI) from this lesson’s scores.',
  claude: 'Written by Anthropic Claude (AI) from this lesson’s scores.',
};

export default function CoachTip({ result, title }: { result: LessonResult; title: string }) {
  const [state, setState] = useState<State>({ kind: 'idle' });

  const ask = async () => {
    setState({ kind: 'loading' });
    const input = buildCoachInput(result, title);
    const res = await requestTip(input);
    setState(res.ok ? { kind: 'tip', text: res.tip, source: res.source } : { kind: 'builtin', text: builtinTip(input), why: res.message });
  };

  return (
    <div className="rounded-2xl border border-violet-500/30 bg-violet-950/30 p-4 text-left">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-bold text-violet-100">
          <MessageCircle className="h-4 w-4 text-violet-300" aria-hidden="true" /> Coach
        </p>
        {state.kind !== 'loading' && (
          <button
            type="button"
            onClick={() => void ask()}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-violet-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
          >
            {state.kind === 'idle' ? 'Get a tip' : 'Another tip'}
          </button>
        )}
      </div>
      <div aria-live="polite" className="mt-2 text-sm">
        {state.kind === 'loading' && (
          <p className="flex items-center gap-2 text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> The coach is reading your scores…
          </p>
        )}
        {(state.kind === 'tip' || state.kind === 'builtin') && <p className="leading-relaxed text-slate-100">{state.text}</p>}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        {state.kind === 'tip'
          ? `${state.source ? SOURCE_LABEL[state.source] : 'Written by AI from this lesson’s scores.'} It can be wrong; your lesson results are what count.`
          : state.kind === 'builtin'
            ? `${state.why} This is MUZ’s built-in tip (rules, not AI); nothing left your device.`
            : 'Sends only this lesson’s scores and title to an AI service (Google Gemini’s free tier, which may use them to improve Google’s products, or Anthropic Claude). Never your name, video or audio. If AI is unavailable, MUZ writes a built-in tip.'}
      </p>
    </div>
  );
}
