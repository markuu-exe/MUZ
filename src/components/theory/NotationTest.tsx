import { useState } from "react";
import GrandStaff from "./GrandStaff";
import PianoKeyboard from "./PianoKeyboard";
import { midiToName } from "../../lib/theory/notes";

const PRESETS = [
  { label: "Middle C", notes: [60] },
  { label: "C major chord", notes: [60, 64, 67] },
  { label: "F# (sharp)", notes: [66] },
  { label: "A5 (ledger above)", notes: [81] },
  { label: "E2 (ledger below)", notes: [40] },
];

export default function NotationTest() {
  const [notes, setNotes] = useState<number[]>([60]);

  return (
    <div className="bg-slate-950 text-white p-10 space-y-6">
      <p className="text-sm text-emerald-400">Grand Staff / Piano Roll test</p>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => setNotes(p.notes)}
            className="rounded bg-slate-800 px-3 py-2 hover:bg-slate-700"
          >
            {p.label}
          </button>
        ))}
      </div>

      <GrandStaff notes={notes} chord={notes.length > 1} />
      <p className="text-lg">Notes: {notes.map(midiToName).join(", ")}</p>

      <p className="text-slate-400">Click a key to hear it and see it on the staff:</p>
      <PianoKeyboard
        startMidi={60}
        endMidi={83}
        highlighted={notes}
        onKeyPress={(midi) => setNotes([midi])}
      />
    </div>
  );
}
