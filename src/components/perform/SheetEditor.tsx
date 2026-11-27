/**
 * "Write a piece": type a MUZ sheet (performance/sheet.ts), see it checked as you type and
 * previewed as falling notes, then save it on this device. Saved pieces play like the built-in
 * ones (In time, Wait for me, loops, falling notes).
 */
import { useId, useMemo, useState } from 'react';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { songLengthBeats } from '../../performance/songs';
import { songPlan } from '../../performance/plan';
import { parseSheet } from '../../performance/sheet';
import FallingNotes from './FallingNotes';

export const NEW_SHEET = `title: My piece
meter: 4/4
bpm: 80
# Notes: C4 D4 E4 … (middle C is C4). Chords in brackets: [C] [Am] [G7].
# Lengths: :w whole, :h half, :q quarter, :e eighth, or beats (:2). Rest: r
C4 D4 E4 F4 | G4:h G4:h | A4 A4 A4 A4 | G4:w
`;

const FOCUS = 'focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300';

interface SheetEditorProps {
  initialText: string;
  /** Editing a saved piece (it can be deleted). */
  existing: boolean;
  onSave: (text: string) => void;
  onDelete: () => void;
  onCancel: () => void;
}

export default function SheetEditor({ initialText, existing, onSave, onDelete, onCancel }: SheetEditorProps) {
  const [text, setText] = useState(initialText);
  const result = useMemo(() => parseSheet(text), [text]);
  const plan = useMemo(() => (result.ok ? songPlan(result.song) : null), [result]);
  const reducedMotion = useReducedMotion();
  const helpId = useId();
  const statusId = useId();

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onCancel}
          className={`flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-200 hover:border-slate-500 ${FOCUS}`}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Songs
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {existing && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Delete this piece from this device? This cannot be undone.')) onDelete();
              }}
              className={`flex items-center gap-2 rounded-xl border border-rose-500/40 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-rose-200 hover:bg-rose-500/10 ${FOCUS}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
            </button>
          )}
          <button
            type="button"
            disabled={!result.ok}
            onClick={() => onSave(text)}
            className={`flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] transition hover:brightness-110 disabled:opacity-50 disabled:shadow-none ${FOCUS}`}
          >
            <Save className="h-4 w-4" aria-hidden="true" /> Save on this device
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-black text-white">{existing ? 'Edit your piece' : 'Write a piece'}</h2>
        <p className="text-sm text-slate-400">Type notes and chords as text. It is checked as you type, and you can play it right after saving.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-2">
          <label htmlFor={`${helpId}-text`} className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Sheet
          </label>
          <textarea
            id={`${helpId}-text`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            rows={14}
            aria-describedby={`${statusId} ${helpId}`}
            className="w-full resize-y rounded-2xl border border-slate-700 bg-slate-950/80 p-4 font-mono text-sm leading-relaxed text-slate-100 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          />
          <div id={statusId} aria-live="polite">
            {result.ok ? (
              <p className="text-sm font-semibold text-emerald-300">
                Ready: {result.song.events.length} {result.song.kind === 'chords' ? 'chords' : 'notes'} ·{' '}
                {songLengthBeats(result.song) / result.song.beatsPerMeasure} bars · {result.song.meter} · {result.song.bpm} BPM
              </p>
            ) : (
              <ul className="space-y-1 text-sm text-rose-200">
                {result.errors.slice(0, 4).map((e, i) => (
                  <li key={i}>
                    <span className="font-mono text-rose-300">
                      line {e.line}:{e.col}
                    </span>{' '}
                    {e.message}
                  </li>
                ))}
                {result.errors.length > 4 && <li className="text-rose-300/80">…and {result.errors.length - 4} more.</li>}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Preview</p>
          {result.ok && plan ? (
            <FallingNotes song={result.song} plan={plan} mode="time" now={() => null} running={false} current={0} results={[]} wrongs={[]} reducedMotion={reducedMotion} />
          ) : (
            <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-slate-700 text-sm text-slate-400">
              Fix the lines marked on the left to see the preview.
            </div>
          )}
          <details id={helpId} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-300" open={!existing}>
            <summary className="cursor-pointer font-bold text-white">How to write a sheet</summary>
            <ul className="mt-2 space-y-1">
              <li>
                <b>Header:</b> <code>title:</code>, <code>meter: 4/4</code> (3/4, 6/8 …), <code>bpm: 80</code>; optional <code>credit:</code>,{' '}
                <code>level:</code>, <code>description:</code>.
              </li>
              <li>
                <b>Notes:</b> letter, optional # or b, octave: <code>C4</code> (middle C), <code>F#4</code>, <code>Bb3</code>.
              </li>
              <li>
                <b>Chords:</b> in brackets: <code>[C]</code> <code>[Am]</code> <code>[G7]</code> <code>[Cmaj7]</code>.
              </li>
              <li>
                <b>Lengths:</b> <code>:w</code> 4 beats, <code>:h</code> 2, <code>:q</code> 1 (default), <code>:e</code> ½, <code>:s</code> ¼; a dot adds half (
                <code>:h.</code> = 3); or beats: <code>:1.5</code>.
              </li>
              <li>
                <b>Rests:</b> <code>r</code>, <code>r:h</code>. <b>Bars:</b> <code>|</code> (checked against the meter). <b>Comments:</b>{' '}
                <code># …</code>
              </li>
            </ul>
          </details>
        </div>
      </div>
    </div>
  );
}
