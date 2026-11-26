import { isBlackKey, midiToName } from "../../lib/theory/notes";
import { playNote } from "../../lib/theory/playNote";

const WHITE_W = 48;
const BLACK_W = 30;

type Tone = "neutral" | "correct" | "wrong";

const WHITE_HIGHLIGHT: Record<Tone, string> = {
  neutral: "bg-violet-400 text-white",
  correct: "bg-emerald-400 text-black",
  wrong: "bg-red-400 text-black",
};
const BLACK_HIGHLIGHT: Record<Tone, string> = {
  neutral: "bg-violet-500",
  correct: "bg-emerald-500",
  wrong: "bg-red-500",
};

interface PianoKeyboardProps {
  startMidi?: number;      
  endMidi?: number;        
  highlighted?: number[];  
  tone?: Tone;            
  /** Keys the microphone currently hears (practice drills). Amber; green when also a target key. */
  heard?: number[];
  showLabels?: boolean;
  playSound?: boolean;
  onKeyPress?: (midi: number) => void;
}

export default function PianoKeyboard({
  startMidi = 60,
  endMidi = 71,
  highlighted = [],
  tone = "neutral",
  heard = [],
  showLabels = true,
  playSound = true,
  onKeyPress,
}: PianoKeyboardProps) {
  const press = (midi: number) => {
    if (playSound) playNote(midi);
    onKeyPress?.(midi);
  };

  const whites: number[] = [];
  const blacks: { midi: number; left: number }[] = [];
  for (let m = startMidi; m <= endMidi; m++) {
    if (isBlackKey(m)) blacks.push({ midi: m, left: whites.length * WHITE_W - BLACK_W / 2 });
    else whites.push(m);
  }

  return (
    <div className="relative inline-block select-none" style={{ width: whites.length * WHITE_W, height: 160 }}>
      <div className="flex">
        {whites.map((midi) => (
          <button
            key={midi}
            type="button"
            aria-label={midiToName(midi)}
            onClick={() => press(midi)}
            style={{ width: WHITE_W, height: 160 }}
            className={`flex items-end justify-center pb-2 rounded-b-md border border-slate-600 text-xs font-semibold ${
              heard.includes(midi)
                ? highlighted.includes(midi)
                  ? WHITE_HIGHLIGHT.correct
                  : "bg-amber-300 text-black"
                : highlighted.includes(midi)
                  ? WHITE_HIGHLIGHT[tone]
                  : "bg-white text-slate-700 hover:bg-slate-200"
            }`}
          >
            {showLabels ? midiToName(midi) : ""}
          </button>
        ))}
      </div>

      {blacks.map(({ midi, left }) => (
        <button
          key={midi}
          type="button"
          aria-label={midiToName(midi)}
          onClick={() => press(midi)}
          style={{ left, width: BLACK_W, height: 96 }}
          className={`absolute top-0 z-10 rounded-b-md border border-slate-700 ${
            heard.includes(midi)
              ? highlighted.includes(midi)
                ? BLACK_HIGHLIGHT.correct
                : "bg-amber-400"
              : highlighted.includes(midi)
                ? BLACK_HIGHLIGHT[tone]
                : "bg-slate-900 hover:bg-slate-700"
          }`}
        />
      ))}
    </div>
  );
}
