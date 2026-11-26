/**
 * Small decorative line drawings for the Skill Tree unit banners. Original MUZ
 * art drawn with SVG primitives; purely decorative (aria-hidden). The UI never
 * depends on them for meaning.
 */

export type UnitMotif = 'keys' | 'staff' | 'chord' | 'metronome' | 'stage';

const MOTIF_BY_UNIT: Record<number, UnitMotif> = {
  1: 'keys',
  2: 'staff',
  3: 'keys',
  4: 'chord',
  5: 'metronome',
  6: 'staff',
  7: 'chord',
  8: 'staff',
  9: 'metronome',
  10: 'chord',
  11: 'keys',
  12: 'stage',
};

export function motifForUnit(unit: number): UnitMotif {
  return MOTIF_BY_UNIT[unit] ?? 'keys';
}

function Keys() {
  const whites = [0, 1, 2, 3, 4, 5, 6];
  const blacks = [0, 1, 3, 4, 5];
  return (
    <g>
      {whites.map((i) => (
        <rect key={`w${i}`} x={8 + i * 15} y={18} width={14} height={50} rx={2.5} fill="currentColor" fillOpacity={0.14} stroke="currentColor" strokeOpacity={0.55} />
      ))}
      {blacks.map((i) => (
        <rect key={`b${i}`} x={17 + i * 15} y={18} width={9} height={30} rx={2} fill="currentColor" fillOpacity={0.7} />
      ))}
      <circle cx={30} cy={60} r={3.5} fill="currentColor" />
    </g>
  );
}

function Staff() {
  return (
    <g>
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={6} x2={114} y1={20 + i * 10} y2={20 + i * 10} stroke="currentColor" strokeOpacity={0.45} strokeWidth={1.5} />
      ))}
      <path d="M22 66 C14 56 30 46 26 34 C23 24 16 22 18 14 C20 8 28 10 26 18 C24 28 14 34 16 46 C18 56 32 56 32 46 C32 38 22 38 22 44" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
      {[
        [52, 45],
        [70, 40],
        [88, 35],
      ].map(([x, y]) => (
        <g key={x}>
          <ellipse cx={x} cy={y} rx={5.5} ry={4} fill="currentColor" transform={`rotate(-18 ${x} ${y})`} />
          <line x1={x + 5} x2={x + 5} y1={y} y2={y - 24} stroke="currentColor" strokeWidth={1.8} />
        </g>
      ))}
    </g>
  );
}

function Chord() {
  return (
    <g>
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={10} x2={110} y1={20 + i * 10} y2={20 + i * 10} stroke="currentColor" strokeOpacity={0.35} strokeWidth={1.5} />
      ))}
      {[55, 45, 35].map((y) => (
        <ellipse key={y} cx={46} cy={y} rx={6} ry={4.2} fill="currentColor" transform={`rotate(-18 46 ${y})`} />
      ))}
      <line x1={52} x2={52} y1={55} y2={14} stroke="currentColor" strokeWidth={1.8} />
      {[50, 40, 30].map((y) => (
        <ellipse key={y} cx={82} cy={y} rx={6} ry={4.2} fill="currentColor" fillOpacity={0.55} transform={`rotate(-18 82 ${y})`} />
      ))}
      <line x1={88} x2={88} y1={50} y2={10} stroke="currentColor" strokeOpacity={0.55} strokeWidth={1.8} />
    </g>
  );
}

function Metronome() {
  return (
    <g>
      <path d="M44 70 L56 12 L64 12 L76 70 Z" fill="currentColor" fillOpacity={0.14} stroke="currentColor" strokeOpacity={0.6} strokeWidth={1.6} strokeLinejoin="round" />
      <line x1={60} y1={62} x2={74} y2={18} stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
      <rect x={66} y={30} width={8} height={6} rx={1.5} fill="currentColor" transform="rotate(18 70 33)" />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${86 + i * 8} ${28 + i * 3} q6 10 0 20`} fill="none" stroke="currentColor" strokeOpacity={0.6 - i * 0.15} strokeWidth={1.6} strokeLinecap="round" />
      ))}
    </g>
  );
}

function Stage() {
  return (
    <g>
      <path d="M60 6 L28 70 L92 70 Z" fill="currentColor" fillOpacity={0.12} />
      <ellipse cx={60} cy={70} rx={40} ry={5} fill="currentColor" fillOpacity={0.3} />
      <path d="M60 24 l5 10 11 1.6 -8 7.8 1.9 11 -9.9 -5.2 -9.9 5.2 1.9 -11 -8 -7.8 11 -1.6 Z" fill="currentColor" />
    </g>
  );
}

const MOTIFS: Record<UnitMotif, () => JSX.Element> = {
  keys: Keys,
  staff: Staff,
  chord: Chord,
  metronome: Metronome,
  stage: Stage,
};

export default function UnitArt({ unit, className }: { unit: number; className?: string }) {
  const Motif = MOTIFS[motifForUnit(unit)];
  return (
    <svg viewBox="0 0 120 80" className={className} aria-hidden="true" focusable="false">
      <Motif />
    </svg>
  );
}
