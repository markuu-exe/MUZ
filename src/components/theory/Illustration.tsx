/**
 * Small explanatory diagrams for concept cards that would otherwise be text only.
 * Original SVG line art; the card text still carries the meaning (aria-hidden).
 */
import type { IllustrationId } from '../../types/lesson.types';

const INK = '#e2e8f0';
const GOOD = '#34d399';
const BAD = '#fb7185';
const ACCENT = '#a78bfa';
const MUTED = '#64748b';

function NoteHead({ x, y, open = false, stem = true, stemLen = 30 }: { x: number; y: number; open?: boolean; stem?: boolean; stemLen?: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={7} ry={5} transform={`rotate(-20 ${x} ${y})`} fill={open ? 'none' : INK} stroke={INK} strokeWidth={2} />
      {stem && <line x1={x + 6} x2={x + 6} y1={y} y2={y - stemLen} stroke={INK} strokeWidth={2} />}
    </g>
  );
}

function BeatTicks({ count, x0, gap, y }: { count: number; x0: number; gap: number; y: number }) {
  return (
    <g>
      <line x1={x0 - 10} x2={x0 + gap * count - 10} y1={y} y2={y} stroke={MUTED} strokeWidth={1.5} />
      {Array.from({ length: count }, (_, i) => (
        <g key={i}>
          <line x1={x0 + i * gap} x2={x0 + i * gap} y1={y - 5} y2={y + 5} stroke={MUTED} strokeWidth={1.5} />
          <text x={x0 + i * gap} y={y + 18} textAnchor="middle" fontSize="10" fill={MUTED}>
            {i + 1}
          </text>
        </g>
      ))}
    </g>
  );
}

function ElbowAngle() {
  return (
    <g>
      <rect x="150" y="78" width="80" height="10" rx="2" fill="#1e293b" stroke={MUTED} />
      <text x="190" y="104" textAnchor="middle" fontSize="10" fill={MUTED}>keys</text>
      <line x1="70" y1="18" x2="78" y2="76" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <line x1="78" y1="76" x2="160" y2="74" stroke={GOOD} strokeWidth="6" strokeLinecap="round" />
      <circle cx="70" cy="18" r="6" fill={INK} />
      <circle cx="78" cy="76" r="6" fill={GOOD} />
      <path d="M 76 56 A 20 20 0 0 0 98 75" fill="none" stroke={ACCENT} strokeWidth="2" />
      <text x="104" y="58" fontSize="12" fill={ACCENT} fontWeight="700">80–110°</text>
      <text x="80" y="16" fontSize="10" fill={MUTED}>shoulder</text>
      <text x="44" y="94" fontSize="10" fill={MUTED}>elbow</text>
    </g>
  );
}

function WristNeutral() {
  return (
    <g>
      <line x1="20" y1="60" x2="120" y2="60" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <circle cx="120" cy="60" r="5" fill={GOOD} />
      <line x1="120" y1="60" x2="190" y2="64" stroke={GOOD} strokeWidth="6" strokeLinecap="round" />
      <line x1="120" y1="60" x2="178" y2="95" stroke={BAD} strokeWidth="3" strokeDasharray="5 4" strokeLinecap="round" />
      <line x1="120" y1="60" x2="178" y2="25" stroke={BAD} strokeWidth="3" strokeDasharray="5 4" strokeLinecap="round" />
      <text x="196" y="68" fontSize="11" fill={GOOD} fontWeight="700">straight</text>
      <text x="182" y="104" fontSize="10" fill={BAD}>dropped</text>
      <text x="182" y="22" fontSize="10" fill={BAD}>raised</text>
      <text x="30" y="90" fontSize="12" fill={ACCENT} fontWeight="700">140–180°</text>
      <text x="40" y="50" fontSize="10" fill={MUTED}>forearm</text>
    </g>
  );
}

function CurvedFingers() {
  return (
    <g>
      <circle cx="120" cy="58" r="26" fill="none" stroke={ACCENT} strokeWidth="2" strokeDasharray="4 4" />
      <path d="M 40 40 Q 90 22 120 30 Q 160 40 162 84" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <circle cx="162" cy="86" r="4" fill={GOOD} />
      <rect x="30" y="92" width="190" height="10" rx="2" fill="#1e293b" stroke={MUTED} />
      <text x="122" y="62" textAnchor="middle" fontSize="10" fill={ACCENT}>small ball</text>
      <text x="170" y="80" fontSize="10" fill={GOOD}>fingertip</text>
    </g>
  );
}

function FingerNumbers() {
  const hand = (cx: number, flip: boolean) => {
    const order = flip ? [5, 4, 3, 2, 1] : [1, 2, 3, 4, 5];
    const lengths = flip ? [24, 32, 36, 32, 20] : [20, 32, 36, 32, 24];
    return (
      <g>
        <rect x={cx - 30} y={58} width={60} height={40} rx={14} fill="none" stroke={INK} strokeWidth={2} />
        {order.map((n, i) => {
          const x = cx - 24 + i * 12;
          const isThumb = n === 1;
          return (
            <g key={n}>
              <rect x={x - 4} y={58 - lengths[i]} width={8} height={lengths[i] + 4} rx={4} fill={isThumb ? ACCENT : 'none'} stroke={isThumb ? ACCENT : INK} strokeWidth={2} />
              <text x={x} y={58 - lengths[i] - 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={isThumb ? ACCENT : INK}>
                {n}
              </text>
            </g>
          );
        })}
      </g>
    );
  };
  return (
    <g>
      {hand(70, true)}
      {hand(170, false)}
      <text x="70" y="114" textAnchor="middle" fontSize="10" fill={MUTED}>left hand</text>
      <text x="170" y="114" textAnchor="middle" fontSize="10" fill={MUTED}>right hand</text>
    </g>
  );
}

function Pulse() {
  return (
    <g>
      {Array.from({ length: 8 }, (_, i) => (
        <circle key={i} cx={28 + i * 26} cy={56} r={i % 4 === 0 ? 9 : 7} fill={i % 4 === 0 ? ACCENT : INK} opacity={i % 4 === 0 ? 1 : 0.8} />
      ))}
      <text x="120" y="96" textAnchor="middle" fontSize="11" fill={MUTED}>click · click · click · click — evenly spaced</text>
    </g>
  );
}

function QuarterNotes() {
  return (
    <g>
      {[0, 1, 2, 3].map((i) => (
        <NoteHead key={i} x={48 + i * 48} y={58} />
      ))}
      <BeatTicks count={4} x0={48} gap={48} y={78} />
      <text x="120" y="20" textAnchor="middle" fontSize="11" fill={ACCENT}>one tap per beat</text>
    </g>
  );
}

function NoteValues() {
  const row = (y: number, beats: number, label: string, open: boolean, stem: boolean) => (
    <g>
      <NoteHead x={40} y={y} open={open} stem={stem} stemLen={20} />
      <rect x={62} y={y - 5} width={beats * 30} height={10} rx={5} fill={ACCENT} opacity={0.75} />
      <text x={68 + beats * 30} y={y + 4} fontSize="10" fill={INK}>{label}</text>
    </g>
  );
  return (
    <g>
      {row(28, 4, '4 beats', true, false)}
      {row(68, 2, '2 beats', true, true)}
      {row(106, 1, '1 beat', false, true)}
    </g>
  );
}

function HoldThenMove() {
  return (
    <g>
      <BeatTicks count={4} x0={40} gap={50} y={84} />
      <circle cx="40" cy="54" r="9" fill={ACCENT} />
      <rect x="40" y="49" width="100" height="10" rx="5" fill={ACCENT} opacity="0.5" />
      <circle cx="140" cy="54" r="9" fill={ACCENT} />
      <text x="40" y="34" textAnchor="middle" fontSize="10" fill={INK}>tap</text>
      <text x="90" y="34" textAnchor="middle" fontSize="10" fill={MUTED}>hold…</text>
      <text x="140" y="34" textAnchor="middle" fontSize="10" fill={INK}>next tap</text>
    </g>
  );
}

function Rests() {
  return (
    <g>
      <NoteHead x={48} y={58} />
      <NoteHead x={96} y={58} />
      <path d="M 140 34 L 150 46 L 141 56 L 151 68 Q 138 62 144 76" fill="none" stroke={ACCENT} strokeWidth="3" strokeLinejoin="round" />
      <NoteHead x={192} y={58} />
      <BeatTicks count={4} x0={48} gap={48} y={88} />
      <text x="146" y="22" textAnchor="middle" fontSize="10" fill={ACCENT}>rest: count, don't tap</text>
    </g>
  );
}

function ThreeFour() {
  return (
    <g>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const strong = i % 3 === 0;
        return (
          <g key={i}>
            <circle cx={30 + i * 36} cy={56} r={strong ? 12 : 7} fill={strong ? ACCENT : INK} />
            <text x={30 + i * 36} y={88} textAnchor="middle" fontSize={strong ? 12 : 10} fontWeight={strong ? 700 : 400} fill={strong ? ACCENT : MUTED}>
              {strong ? 'ONE' : i % 3 === 1 ? 'two' : 'three'}
            </text>
          </g>
        );
      })}
      <line x1="120" x2="120" y1="38" y2="74" stroke={MUTED} strokeWidth="1.5" />
    </g>
  );
}

function ChangingChords() {
  const chord = (x: number, label: string, lit: number[]) => (
    <g>
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} x={x + i * 8} y={40} width={8} height={36} fill={lit.includes(i) ? ACCENT : '#f8fafc'} stroke="#334155" strokeWidth={0.8} />
      ))}
      <text x={x + 28} y={96} textAnchor="middle" fontSize="12" fontWeight="700" fill={INK}>{label}</text>
    </g>
  );
  return (
    <g>
      {chord(14, 'C', [0, 2, 4])}
      <text x="80" y="62" fontSize="16" fill={MUTED}>→</text>
      {chord(94, 'F', [0, 3, 5])}
      <text x="160" y="62" fontSize="16" fill={MUTED}>→</text>
      {chord(174, 'G', [1, 4, 6])}
      <text x="120" y="24" textAnchor="middle" fontSize="10" fill={MUTED}>same hand shape, slide it</text>
    </g>
  );
}

/** Two beats split into `per` equal notes, beamed, with the count under each. */
function Subdivision({ per, counts, triplet = false }: { per: number; counts: string[]; triplet?: boolean }) {
  const beatW = 100;
  const x0 = 30;
  return (
    <g>
      {[0, 1].map((beat) => {
        const xs = Array.from({ length: per }, (_, i) => x0 + beat * beatW + 8 + (i * (beatW - 30)) / Math.max(1, per - 1));
        return (
          <g key={beat}>
            {xs.map((x, i) => (
              <g key={i}>
                <ellipse cx={x} cy={64} rx={6} ry={4.5} transform={`rotate(-20 ${x} 64)`} fill={INK} />
                <line x1={x + 5} x2={x + 5} y1={64} y2={36} stroke={INK} strokeWidth={2} />
                <text x={x} y={92} textAnchor="middle" fontSize="11" fontWeight={i === 0 ? 700 : 400} fill={i === 0 ? ACCENT : MUTED}>
                  {i === 0 ? String(beat + 1) : counts[i]}
                </text>
              </g>
            ))}
            <line x1={xs[0] + 5} x2={xs[xs.length - 1] + 5} y1={36} y2={36} stroke={INK} strokeWidth={4} />
            {per === 4 && <line x1={xs[0] + 5} x2={xs[xs.length - 1] + 5} y1={43} y2={43} stroke={INK} strokeWidth={4} />}
            {triplet && (
              <text x={(xs[0] + xs[xs.length - 1]) / 2 + 5} y={26} textAnchor="middle" fontSize="12" fontWeight="800" fill={ACCENT}>
                3
              </text>
            )}
          </g>
        );
      })}
      <line x1={x0} x2={x0 + 2 * beatW} y1={104} y2={104} stroke={MUTED} strokeWidth={1} />
      <text x={x0 + beatW / 2} y={116} textAnchor="middle" fontSize="9" fill={MUTED}>beat 1</text>
      <text x={x0 + 1.5 * beatW} y={116} textAnchor="middle" fontSize="9" fill={MUTED}>beat 2</text>
    </g>
  );
}

function ScaleFormula() {
  const steps = ['W', 'W', 'H', 'W', 'W', 'W', 'H'];
  const names = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'];
  return (
    <g>
      {names.map((n, i) => (
        <g key={i}>
          <rect x={16 + i * 26} y={30} width={24} height={50} rx={3} fill="#f8fafc" stroke="#334155" />
          <text x={28 + i * 26} y={74} textAnchor="middle" fontSize="10" fontWeight="700" fill="#334155">{n}</text>
        </g>
      ))}
      {steps.map((s, i) => (
        <text key={i} x={41 + i * 26} y={100} textAnchor="middle" fontSize="12" fontWeight="800" fill={s === 'H' ? '#fbbf24' : ACCENT}>
          {s}
        </text>
      ))}
      <text x="120" y="20" textAnchor="middle" fontSize="10" fill={MUTED}>W = whole step, H = half step</text>
    </g>
  );
}

function CircleOfFifths() {
  const keys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
  return (
    <g>
      <circle cx="120" cy="62" r="44" fill="none" stroke={MUTED} strokeWidth="1.5" />
      {keys.map((k, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const x = 120 + Math.cos(a) * 44;
        const y = 62 + Math.sin(a) * 44;
        const sharp = i >= 1 && i <= 6;
        const flat = i >= 7;
        return (
          <g key={k}>
            <circle cx={x} cy={y} r="11" fill={i === 0 ? ACCENT : '#0f172a'} stroke={sharp ? GOOD : flat ? '#fbbf24' : ACCENT} strokeWidth="1.5" />
            <text x={x} y={y + 4} textAnchor="middle" fontSize="9" fontWeight="800" fill={i === 0 ? '#0f172a' : INK}>{k}</text>
          </g>
        );
      })}
      <text x="214" y="40" fontSize="9" fill={GOOD}>sharps ↻</text>
      <text x="4" y="40" fontSize="9" fill="#fbbf24">↺ flats</text>
    </g>
  );
}

function RomanNumerals() {
  const names = ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'B°'];
  const numerals = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
  const hot = new Set([0, 3, 4, 5]);
  return (
    <g>
      {names.map((n, i) => (
        <g key={i}>
          <rect x={14 + i * 31} y={28} width={28} height={30} rx={6} fill={hot.has(i) ? ACCENT : '#1e293b'} opacity={hot.has(i) ? 0.85 : 1} />
          <text x={28 + i * 31} y={48} textAnchor="middle" fontSize="11" fontWeight="800" fill={hot.has(i) ? '#0f172a' : INK}>{n}</text>
          <text x={28 + i * 31} y={78} textAnchor="middle" fontSize="12" fontWeight="800" fill={hot.has(i) ? ACCENT : MUTED}>{numerals[i]}</text>
        </g>
      ))}
      <text x="120" y="104" textAnchor="middle" fontSize="10" fill={MUTED}>capitals = major, lower case = minor</text>
    </g>
  );
}

const DRAWINGS: Record<IllustrationId, () => JSX.Element> = {
  eighths: () => <Subdivision per={2} counts={['1', '&']} />,
  sixteenths: () => <Subdivision per={4} counts={['1', 'e', '&', 'a']} />,
  triplets: () => <Subdivision per={3} counts={['1', 'trip', 'let']} triplet />,
  'scale-formula': ScaleFormula,
  'circle-of-fifths': CircleOfFifths,
  'roman-numerals': RomanNumerals,
  'elbow-angle': ElbowAngle,
  'wrist-neutral': WristNeutral,
  'curved-fingers': CurvedFingers,
  'finger-numbers': FingerNumbers,
  pulse: Pulse,
  'quarter-notes': QuarterNotes,
  'note-values': NoteValues,
  'hold-then-move': HoldThenMove,
  rests: Rests,
  'three-four': ThreeFour,
  'changing-chords': ChangingChords,
};

export default function Illustration({ id }: { id: IllustrationId }) {
  const Drawing = DRAWINGS[id];
  return (
    <div className="rounded-xl border border-violet-500/20 bg-slate-950/80 p-4">
      <svg viewBox="0 0 240 120" className="mx-auto h-auto w-full max-w-md" aria-hidden="true" focusable="false">
        <Drawing />
      </svg>
    </div>
  );
}
