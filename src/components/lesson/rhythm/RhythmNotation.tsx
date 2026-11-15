/**
 * COURSE-4: draws a rhythm pattern as simple notation (note heads, stems, flags,
 * dots, rests, ties, bar lines). Drawn as SVG so it does not depend on a music font.
 */
import type { CompiledPattern } from '../../../content/patterns';
import type { NoteValue, RhythmToken } from '../../../lib/rhythm/notation';

const FILLED: readonly NoteValue[] = ['q', 'e', 's', 'dq', 'de', 't', 'tq'];
const DOTTED: readonly NoteValue[] = ['dh', 'dq', 'de'];
const FLAGS: Partial<Record<NoteValue, number>> = { e: 1, de: 1, t: 1, s: 2 };

const STEP = 46;
const PAD = 28;
const Y = 62;

function Rest({ x, value }: { x: number; value: NoteValue }) {
  const base = value.replace('d', '') as NoteValue;
  if (base === 'w' || base === 'h') {
    // Whole rest hangs below the line, half rest sits on it.
    return (
      <g>
        <line x1={x - 12} x2={x + 12} y1={Y - 8} y2={Y - 8} stroke="currentColor" strokeWidth={1.5} />
        <rect x={x - 8} y={base === 'w' ? Y - 8 : Y - 14} width={16} height={6} fill="currentColor" />
      </g>
    );
  }
  if (base === 'q' || value === 'tq') {
    return (
      <path
        d={`M ${x - 4} ${Y - 18} L ${x + 5} ${Y - 8} L ${x - 4} ${Y} L ${x + 5} ${Y + 8} Q ${x - 8} ${Y + 4} ${x} ${Y + 16}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    );
  }
  // Eighth / sixteenth / triplet rests
  return (
    <g fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
      <path d={`M ${x - 6} ${Y - 10} Q ${x} ${Y - 5} ${x + 6} ${Y - 12} L ${x - 2} ${Y + 14}`} />
      <circle cx={x - 6} cy={Y - 10} r={2.6} fill="currentColor" stroke="none" />
      {base === 's' && <circle cx={x - 8} cy={Y - 1} r={2.6} fill="currentColor" stroke="none" />}
    </g>
  );
}

function Note({ x, token }: { x: number; token: RhythmToken }) {
  const v = token.value;
  const filled = FILLED.includes(v);
  const hasStem = v !== 'w';
  const flags = FLAGS[v] ?? 0;
  const stemX = x + 7.5;
  const stemTop = Y - 34;
  return (
    <g>
      <ellipse
        cx={x}
        cy={Y}
        rx={8.5}
        ry={6}
        transform={`rotate(-20 ${x} ${Y})`}
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2.2}
      />
      {hasStem && <line x1={stemX} x2={stemX} y1={Y - 2} y2={stemTop} stroke="currentColor" strokeWidth={2.2} />}
      {Array.from({ length: flags }, (_, i) => (
        <path
          key={i}
          d={`M ${stemX} ${stemTop + i * 9} q 12 8 7 22`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
        />
      ))}
      {DOTTED.includes(v) && <circle cx={x + 15} cy={Y} r={2.6} fill="currentColor" />}
      {(v === 't' || v === 'tq') && (
        <text x={x + 3} y={stemTop - 6} fontSize={12} fontWeight={700} textAnchor="middle" fill="currentColor">
          3
        </text>
      )}
    </g>
  );
}

export default function RhythmNotation({ pattern }: { pattern: CompiledPattern }) {
  const { tokens, beatsPerMeasure, lengthBeats, meter } = pattern;
  // One column per token, plus a little room at each bar line.
  let x = PAD + 44;
  const placed: Array<{ token: RhythmToken; x: number }> = [];
  const bars: number[] = [];
  tokens.forEach((token, i) => {
    if (i > 0 && Math.abs(token.start / beatsPerMeasure - Math.round(token.start / beatsPerMeasure)) < 1e-6) {
      bars.push(x - STEP / 2 + 6);
      x += 12;
    }
    placed.push({ token, x });
    x += STEP;
  });
  const width = x - STEP / 2 + PAD;
  const [top, bottom] = meter.split('/');

  return (
    <svg
      viewBox={`0 0 ${width} 100`}
      className="mx-auto block h-24 max-w-full text-slate-100"
      role="img"
      aria-label={`${pattern.label}, ${meter}, ${Math.round(lengthBeats / beatsPerMeasure)} measure(s)`}
    >
      <line x1={PAD - 12} x2={width - PAD + 12} y1={Y} y2={Y} stroke="currentColor" strokeOpacity={0.35} strokeWidth={1.5} />
      <text x={PAD} y={Y - 6} fontSize={22} fontWeight={800} textAnchor="middle" fill="currentColor">
        {top}
      </text>
      <text x={PAD} y={Y + 22} fontSize={22} fontWeight={800} textAnchor="middle" fill="currentColor">
        {bottom}
      </text>
      {bars.map((bx) => (
        <line key={bx} x1={bx} x2={bx} y1={Y - 30} y2={Y + 22} stroke="currentColor" strokeOpacity={0.6} strokeWidth={1.5} />
      ))}
      <line x1={width - PAD + 8} x2={width - PAD + 8} y1={Y - 30} y2={Y + 22} stroke="currentColor" strokeWidth={3} />
      {placed.map(({ token, x: tx }, i) => (
        <g key={i} opacity={token.rest ? 0.75 : 1}>
          {token.rest ? <Rest x={tx} value={token.value} /> : <Note x={tx} token={token} />}
          {token.tie && i > 0 && (
            <path
              d={`M ${placed[i - 1].x + 4} ${Y + 12} Q ${(placed[i - 1].x + tx) / 2} ${Y + 26} ${tx - 4} ${Y + 12}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            />
          )}
        </g>
      ))}
    </svg>
  );
}
