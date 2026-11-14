import { ledgerLines, staffPosition } from "../../lib/theory/notes";

const TOP = 50; 
const STEP = 5; 
const yOf = (diatonic: number) => TOP + (38 - diatonic) * STEP;
const TREBLE = [38, 36, 34, 32, 30];
const BASS = [26, 24, 22, 20, 18];

interface GrandStaffProps {
  notes: number[]; 
  chord?: boolean; 
  color?: string;  
}

export default function GrandStaff({ notes, chord = false, color = "currentColor" }: GrandStaffProps) {
  const startX = 100;
  const gap = 50;
  const width = chord ? 220 : Math.max(220, startX + notes.length * gap + 10);

  return (
    <svg viewBox={`0 0 ${width} 190`} className="w-full max-w-md" role="img" aria-label="Grand staff">
      {[...TREBLE, ...BASS].map((d) => (
        <line key={d} x1={20} x2={width - 10} y1={yOf(d)} y2={yOf(d)} stroke="currentColor" strokeWidth={1.2} />
      ))}
      <line x1={20} x2={20} y1={yOf(38)} y2={yOf(18)} stroke="currentColor" strokeWidth={1.5} />

      <text x={26} y={yOf(30) + 8} fontSize={58} fill="currentColor">{"\u{1D11E}"}</text>
      <text x={26} y={yOf(20) + 2} fontSize={42} fill="currentColor">{"\u{1D122}"}</text>

      {notes.map((midi, i) => {
        const { diatonic, sharp } = staffPosition(midi);
        const x = chord ? startX + 30 : startX + i * gap;
        const y = yOf(diatonic);
        return (
          <g key={`${midi}-${i}`}>
            {ledgerLines(diatonic).map((l) => (
              <line key={l} x1={x - 13} x2={x + 13} y1={yOf(l)} y2={yOf(l)} stroke="currentColor" strokeWidth={1.2} />
            ))}
            {sharp && (
              <text x={x - 24} y={y + 6} fontSize={18} fill={color}>{"\u266F"}</text>
            )}
            <ellipse cx={x} cy={y} rx={7} ry={5} fill="none" stroke={color} strokeWidth={2.2} />
          </g>
        );
      })}
    </svg>
  );
}
