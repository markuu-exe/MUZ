import type { NoteDisplay } from '../../../types/lesson.types';
import { playNote } from '../../../lib/theory/playNote';
import GrandStaff from '../../theory/GrandStaff';
import PianoKeyboard from '../../theory/PianoKeyboard';

interface NoteFigureProps {
  notes: number[];
  display?: NoteDisplay;
  chord?: boolean;
  /** Colour for the note heads on the staff (e.g. green/red after checking). */
  color?: string;
}

/** Keyboard range that fits the notes, snapped to whole octaves starting on C. */
export function keyboardRangeFor(notes: number[]): [number, number] {
  const lo = Math.min(...notes);
  const hi = Math.max(...notes);
  const start = Math.min(60, Math.floor(lo / 12) * 12);
  const end = Math.max(start + 11, Math.ceil((hi + 1) / 12) * 12 - 1);
  return [start, end];
}

/** Plays notes: together when `chord`, otherwise one after another. */
export function playNotes(notes: number[], chord = false): void {
  if (chord) {
    notes.forEach((n) => playNote(n, 1.2));
    return;
  }
  notes.forEach((n, i) => window.setTimeout(() => playNote(n), i * 450));
}

/** Staff and/or keyboard picture of some notes, with a Listen button. */
export default function NoteFigure({ notes, display = 'both', chord = false, color }: NoteFigureProps) {
  if (notes.length === 0) return null;
  const [start, end] = keyboardRangeFor(notes);
  return (
    <div className="space-y-3">
      {(display === 'staff' || display === 'both') && (
        <div className="rounded-xl border border-violet-500/20 bg-slate-950/80 p-4 text-slate-200">
          <GrandStaff notes={notes} chord={chord} color={color} />
        </div>
      )}
      {(display === 'keyboard' || display === 'both') && (
        <div className="overflow-x-auto rounded-xl border border-violet-500/20 bg-slate-950/80 p-4">
          <PianoKeyboard startMidi={start} endMidi={end} highlighted={notes} playSound />
        </div>
      )}
      <button
        type="button"
        onClick={() => playNotes(notes, chord)}
        className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.25)] transition hover:bg-cyan-500/20 active:scale-95"
      >
        ▶ Listen
      </button>
    </div>
  );
}
