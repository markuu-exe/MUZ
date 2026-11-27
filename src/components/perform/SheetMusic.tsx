/**
 * Sheet-music view (owner request 2026-11-28): the piece on a staff, a few bars at a time, for
 * learning to read. Layout comes from performance/staff.ts; this file only draws it as SVG.
 * In time: the page and the highlighted note follow the song clock, with a thin cursor (none
 * with reduced motion). Wait for me: the step being waited on is highlighted. Judged notes turn
 * green (hit), amber (good / needed retries) or red (missed), like the other views.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { EventResult } from '../../performance/judge';
import type { SongPlan } from '../../performance/plan';
import { targetLabel, type Song } from '../../performance/songs';
import { barAt, chordSymbol, layoutStaff, ledgerSteps, soundingEvent, spaceBar, type StaffItem, type StaffLayout } from '../../performance/staff';

interface SheetMusicProps {
  song: Song;
  plan: SongPlan;
  mode: 'time' | 'wait';
  /** Plan seconds (In time), or null when idle. */
  now: () => number | null;
  running: boolean;
  /** Wait for me: the step being waited on. */
  current: number;
  /** In time: judged events so far. */
  results: readonly EventResult[];
  /** Wait for me: wrong attempts per step. */
  wrongs: readonly number[];
  reducedMotion: boolean;
}

const COLORS = {
  line: '#64748b',
  ink: '#e2e8f0',
  muted: '#94a3b8',
  active: '#c4b5fd',
  activeBand: 'rgba(139, 92, 246, 0.16)',
  cursor: '#e879f9',
  perfect: '#34d399',
  good: '#fbbf24',
  miss: '#fb7185',
  chord: '#ddd6fe',
};

/** Space between staff lines; a step (line to space) is half of it. */
const S = 10;
const STEP = S / 2;
const CLEF_W = 44;
const METER_W = 30;
const BAR_W = 220;
const RIGHT_PAD = 8;
const HEAD_RX = 6;
const STEM = 3.5 * S;

const TREBLE_CLEF =
  'M15 33 C9 33 8 25 14 23 C21 21 25 30 20 36 C15 42 4 40 3 31 C2 22 12 15 18 7 C23 0 23 -11 18 -12 C13 -13 11 -3 12 4 L16 52 C16.5 58 11 60 8 56';
const BASS_CLEF = 'M5 10 C4 1 22 -2 24 10 C26 24 13 35 2 42';

/** Glyph pieces drawn around (x, y) in user units. */
function sharp(x: number, y: number, color: string) {
  return (
    <g stroke={color} strokeLinecap="round">
      <path d={`M${x - 2} ${y - 9} V${y + 10} M${x + 2} ${y - 10} V${y + 9}`} strokeWidth={1.2} />
      <path d={`M${x - 5} ${y - 1.5} L${x + 5} ${y - 4.5} M${x - 5} ${y + 4.5} L${x + 5} ${y + 1.5}`} strokeWidth={2.4} />
    </g>
  );
}
function flat(x: number, y: number, color: string) {
  return (
    <g stroke={color} fill="none" strokeLinecap="round">
      <path d={`M${x - 3} ${y - 13} V${y + 4.5}`} strokeWidth={1.3} />
      <path d={`M${x - 3} ${y + 4.5} C${x + 6} ${y - 0.5} ${x + 4} ${y - 6} ${x - 3} ${y - 1.5}`} strokeWidth={1.9} />
    </g>
  );
}
function natural(x: number, y: number, color: string) {
  return (
    <g stroke={color} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={`M${x - 3} ${y - 10} V${y + 4} L${x + 3} ${y + 2.5}`} strokeWidth={1.3} />
      <path d={`M${x + 3} ${y + 10} V${y - 4} L${x - 3} ${y - 2.5}`} strokeWidth={1.3} />
      <path d={`M${x - 3} ${y - 2.5} L${x + 3} ${y - 4} M${x - 3} ${y + 4} L${x + 3} ${y + 2.5}`} strokeWidth={2.4} />
    </g>
  );
}

interface Geometry {
  layout: StaffLayout;
  /** Steps above and below the staff kept free for ledger lines and stems. */
  topStep: number;
  bottomStep: number;
  labelH: number;
  height: number;
  yOf: (step: number) => number;
}

function geometry(layout: StaffLayout, song: Song): Geometry {
  const topStep = Math.max(10, layout.maxStep + 8);
  const bottomStep = Math.min(-3, layout.minStep - 8);
  const labelH = song.events.some((e) => e.target.kind === 'chord') ? 22 : 6;
  const top = 6 + labelH;
  const height = top + (topStep - bottomStep) * STEP + 6;
  return { layout, topStep, bottomStep, labelH, height, yOf: (step) => top + (topStep - step) * STEP };
}

function Rest({ item, x, y, color }: { item: StaffItem; x: number; y: (step: number) => number; color: string }) {
  const v = item.glyph.value;
  const dot = item.glyph.dots ? <circle cx={x + 10} cy={y(5)} r={1.8} fill={color} /> : null;
  if (v === 'whole') return <rect x={x - 6} y={y(6)} width={12} height={STEP} fill={color} />;
  if (v === 'half')
    return (
      <g>
        <rect x={x - 6} y={y(4) - STEP} width={12} height={STEP} fill={color} />
        {dot}
      </g>
    );
  if (v === 'quarter')
    return (
      <g>
        <path
          d={`M${x - 2} ${y(7.4)} L${x + 4} ${y(5.4)} L${x - 1} ${y(3.6)} L${x + 4} ${y(2)} C${x - 4} ${y(1.6)} ${x - 4} ${y(0.2)} ${x + 1} ${y(-0.4)}`}
          fill="none"
          stroke={color}
          strokeWidth={2.4}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {dot}
      </g>
    );
  const flags = v === 'eighth' ? [0] : [0, 2];
  return (
    <g fill="none" stroke={color} strokeLinecap="round">
      {flags.map((f) => (
        <g key={f}>
          <circle cx={x - 3 - f * 1.2} cy={y(5 - f)} r={2.2} fill={color} stroke="none" />
          <path d={`M${x - 3 - f * 1.2} ${y(5 - f) + 1.5} C${x} ${y(4.6 - f)} ${x + 3} ${y(5 - f)} ${x + 4.5 - f * 1.2} ${y(5.4 - f)}`} strokeWidth={1.4} />
        </g>
      ))}
      <path d={`M${x + 4.5} ${y(5.4)} L${x - 1 - flags.length} ${y(1 - flags.length)}`} strokeWidth={1.5} />
      {dot}
    </g>
  );
}

export default function SheetMusic(props: SheetMusicProps) {
  const { song, plan, mode, now, running, current, results, wrongs, reducedMotion } = props;
  const layout = useMemo(() => layoutStaff(song), [song]);
  const geo = useMemo(() => geometry(layout, song), [layout, song]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<SVGLineElement>(null);
  const [perPage, setPerPage] = useState(4);
  const [manualPage, setManualPage] = useState(0);
  /** In time: the sounding event (-1 in a rest) and the bar the clock is in. */
  const [clock, setClock] = useState({ event: -1, bar: 0 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => setPerPage(el.getBoundingClientRect().width < 560 ? 2 : 4);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pageCount = Math.max(1, Math.ceil(layout.bars.length / perPage));
  const followBar =
    running && mode === 'time' ? clock.bar : running && mode === 'wait' ? barAt(layout, song.events[current]?.beat ?? 0) : null;
  const page = Math.min(pageCount - 1, followBar !== null ? Math.floor(followBar / perPage) : manualPage);
  const pageRef = useRef(page);
  pageRef.current = page;
  // After a run, stay on the page it ended on; a new piece (or loop) starts at its first page.
  useEffect(() => {
    if (!running) setManualPage(pageRef.current);
  }, [running]);
  useEffect(() => setManualPage(0), [song]);

  const firstBar = page * perPage;
  const width = CLEF_W + METER_W + perPage * BAR_W + RIGHT_PAD;
  const headerW = CLEF_W + (page === 0 ? METER_W : 0);
  // Bars at their natural widths (staff.ts spaceBar), stretched together to fill the page. A short
  // last page keeps the width its bars would have on a full one.
  const shown = layout.bars.slice(firstBar, firstBar + perPage);
  const spacing = shown.map(spaceBar);
  const room = ((width - RIGHT_PAD - headerW) * shown.length) / perPage;
  const scale = room / Math.max(1, spacing.reduce((sum, b) => sum + b.width, 0));
  let barX = headerW;
  const pageBars = shown.map((bar, i) => {
    const x = barX;
    const w = spacing[i].width * scale;
    barX += w;
    const items = bar.items.map((item, k) => ({
      item,
      x: item.wholeBarRest ? x + w / 2 - HEAD_RX : x + spacing[i].offsets[k] * scale,
    }));
    return { bar, x, w, items };
  });
  const staffRight = barX;
  /** x of a beat on this page: between the items around it, or null off the page. */
  const xAt = (beat: number): number | null => {
    const pb = pageBars[barAt(layout, beat) - firstBar];
    if (!pb) return null;
    const barEnd = pb.bar.start + layout.beatsPerBar;
    let k = pb.items.length - 1;
    while (k > 0 && pb.items[k].item.beat > beat) k--;
    const from = pb.items[k] ?? { item: { beat: pb.bar.start }, x: pb.x };
    const to = pb.items[k + 1] ?? { item: { beat: barEnd }, x: pb.x + pb.w - 6 };
    const span = to.item.beat - from.item.beat;
    const frac = span > 0 ? Math.max(0, Math.min(1, (beat - from.item.beat) / span)) : 0;
    return from.x + HEAD_RX + frac * (to.x - from.x);
  };
  const xAtRef = useRef(xAt);
  xAtRef.current = xAt;

  // In time: follow the song clock. React state changes only when the note or bar does; the
  // cursor line moves every frame through its ref.
  useEffect(() => {
    if (!running || mode !== 'time') {
      setClock({ event: -1, bar: 0 });
      return;
    }
    let raf = 0;
    let last = { event: -2, bar: -1 };
    const countIn = plan.targets[0] - (song.events[0]?.beat ?? 0) * plan.beatSec;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = now();
      const pos = t === null ? -1 : (t - countIn) / plan.beatSec;
      const next = { event: pos < 0 ? -1 : soundingEvent(song, pos), bar: barAt(layout, Math.max(0, pos)) };
      if (next.event !== last.event || next.bar !== last.bar) {
        last = next;
        setClock(next);
      }
      const line = cursorRef.current;
      if (line) {
        const x = pos >= 0 && pos < layout.bars.length * layout.beatsPerBar ? xAtRef.current(pos) : null;
        line.style.display = x === null ? 'none' : '';
        if (x !== null) {
          line.setAttribute('x1', String(x));
          line.setAttribute('x2', String(x));
        }
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, mode, plan, song, layout, now]);

  const active = running ? (mode === 'time' ? clock.event : current) : -1;
  const rating = useMemo(() => new Map(results.map((r) => [r.index, r.rating])), [results]);
  const colorOf = (event: number): string => {
    if (event === active) return COLORS.active;
    if (mode === 'time') {
      const r = rating.get(event);
      return r === 'Perfect' ? COLORS.perfect : r === 'Good' ? COLORS.good : r === 'Miss' ? COLORS.miss : COLORS.ink;
    }
    if (event < current) return (wrongs[event] ?? 0) > 0 ? COLORS.good : COLORS.perfect;
    return COLORS.ink;
  };

  const { yOf } = geo;
  const staffLines = [0, 2, 4, 6, 8].map((s) => yOf(s));
  const staffTop = yOf(8);
  const staffBottom = yOf(0);

  // Every item on the page with its x (left edge of the head), in order, for ties.
  const placed = pageBars.flatMap((pb) => pb.items);

  const drawNote = (item: StaffItem, x: number, next: { item: StaffItem; x: number } | undefined, key: string): ReactNode => {
    const color = colorOf(item.event!);
    const cx = x + HEAD_RX;
    const v = item.glyph.value;
    const lo = item.heads[0].step;
    const hi = item.heads[item.heads.length - 1].step;
    const ledgers = new Set(item.heads.flatMap((h) => ledgerSteps(h.step)));
    const stemX = item.stemUp ? cx + HEAD_RX - 0.6 : cx - HEAD_RX + 0.6;
    const stemEnd = item.stemUp ? Math.min(yOf(hi) - STEM, yOf(4)) : Math.max(yOf(lo) + STEM, yOf(4));
    const flags = v === 'eighth' ? 1 : v === 'sixteenth' ? 2 : 0;
    const dir = item.stemUp ? 1 : -1;
    const glow = item.event === active && !reducedMotion ? { filter: 'drop-shadow(0 0 4px rgba(167, 139, 250, 0.9))' } : undefined;
    return (
      <g key={key} style={glow}>
        {[...ledgers].map((s) => (
          <line key={`l${s}`} x1={cx - 10} x2={cx + 10} y1={yOf(s)} y2={yOf(s)} stroke={COLORS.line} strokeWidth={1.2} />
        ))}
        {item.heads.map((h) => {
          const cy = yOf(h.step);
          const ax = cx - 15 - h.accidentalColumn * 9;
          return (
            <g key={h.midi}>
              {h.accidental === 'sharp' && sharp(ax, cy, color)}
              {h.accidental === 'flat' && flat(ax + 1, cy, color)}
              {h.accidental === 'natural' && natural(ax, cy, color)}
              {v === 'whole' ? (
                <ellipse cx={cx} cy={cy} rx={HEAD_RX + 1.2} ry={4.4} fill="none" stroke={color} strokeWidth={2.4} />
              ) : (
                <ellipse
                  cx={cx}
                  cy={cy}
                  rx={HEAD_RX}
                  ry={4.2}
                  transform={`rotate(-20 ${cx} ${cy})`}
                  fill={v === 'half' ? 'none' : color}
                  stroke={color}
                  strokeWidth={v === 'half' ? 1.9 : 1}
                />
              )}
              {item.glyph.dots > 0 && <circle cx={cx + HEAD_RX + 5} cy={yOf(h.step % 2 === 0 ? h.step + 1 : h.step)} r={1.8} fill={color} />}
              {item.tieToNext &&
                (() => {
                  const x1 = cx + 4;
                  const x2 = next && next.item.event === item.event ? next.x + HEAD_RX - 4 : staffRight - 2;
                  const y1 = cy + 6 * dir;
                  const mx = (x1 + x2) / 2;
                  return <path d={`M${x1} ${y1} Q${mx} ${y1 + 9 * dir} ${x2} ${y1} Q${mx} ${y1 + 6 * dir} ${x1} ${y1} Z`} fill={color} />;
                })()}
            </g>
          );
        })}
        {v !== 'whole' && <line x1={stemX} x2={stemX} y1={item.stemUp ? yOf(lo) - 1 : yOf(hi) + 1} y2={stemEnd} stroke={color} strokeWidth={1.4} />}
        {Array.from({ length: flags }, (_, f) => {
          const y0 = stemEnd + f * 7 * dir;
          return (
            <path
              key={f}
              d={`M${stemX} ${y0} C${stemX + 1} ${y0 + 9 * dir} ${stemX + 11} ${y0 + 12 * dir} ${stemX + 7} ${y0 + 23 * dir}`}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
            />
          );
        })}
      </g>
    );
  };

  const meterLabel = song.meter;
  const shownTo = firstBar + pageBars.length;
  const activeItems = placed.filter((p) => p.item.event === active && active >= 0);

  return (
    <div ref={wrapRef} className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-3">
      <svg
        viewBox={`0 0 ${width} ${geo.height}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`Sheet music, ${layout.clef} clef, ${meterLabel} time, bars ${firstBar + 1} to ${shownTo} of ${layout.bars.length}.${
          active >= 0 ? ` Now: ${targetLabel(song.events[active].target)}.` : ''
        }`}
      >
        {/* Highlight band behind the note or chord to play now. */}
        {activeItems.map((p, i) => (
          <rect key={i} x={p.x - 6} y={staffTop - 3 * STEP} width={HEAD_RX * 2 + 12} height={staffBottom - staffTop + 6 * STEP} rx={6} fill={COLORS.activeBand} />
        ))}
        {staffLines.map((y) => (
          <line key={y} x1={0} x2={staffRight} y1={y} y2={y} stroke={COLORS.line} strokeWidth={1.1} />
        ))}
        <line x1={0.5} x2={0.5} y1={staffTop} y2={staffBottom} stroke={COLORS.line} strokeWidth={1.1} />
        {layout.clef === 'treble' ? (
          <g transform={`translate(10 ${staffTop})`}>
            <path d={TREBLE_CLEF} fill="none" stroke={COLORS.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={9} cy={55.5} r={3} fill={COLORS.ink} />
          </g>
        ) : (
          <g transform={`translate(8 ${staffTop})`}>
            <circle cx={5.5} cy={10} r={3.6} fill={COLORS.ink} />
            <path d={BASS_CLEF} fill="none" stroke={COLORS.ink} strokeWidth={2.8} strokeLinecap="round" />
            <circle cx={30} cy={5} r={2} fill={COLORS.ink} />
            <circle cx={30} cy={15} r={2} fill={COLORS.ink} />
          </g>
        )}
        {page === 0 && (
          <g fill={COLORS.ink} fontFamily="Georgia, 'Times New Roman', serif" fontWeight={900} fontSize={2.3 * S} textAnchor="middle">
            <text x={CLEF_W + METER_W / 2 - 4} y={yOf(6)} dominantBaseline="central">
              {layout.meterTop}
            </text>
            <text x={CLEF_W + METER_W / 2 - 4} y={yOf(2)} dominantBaseline="central">
              {layout.meterBottom}
            </text>
          </g>
        )}
        {pageBars.map(({ bar, x, w }, i) => {
          const right = x + w;
          const last = bar.index === layout.bars.length - 1;
          return (
            <g key={bar.index}>
              {i === 0 && page > 0 && (
                <text x={headerW - 2} y={staffTop - 2 * STEP} fill={COLORS.muted} fontSize={10} fontWeight={700}>
                  {bar.index + 1}
                </text>
              )}
              {last ? (
                <>
                  <line x1={right - 6} x2={right - 6} y1={staffTop} y2={staffBottom} stroke={COLORS.line} strokeWidth={1.1} />
                  <rect x={right - 3.5} y={staffTop} width={3.5} height={staffBottom - staffTop} fill={COLORS.line} />
                </>
              ) : (
                <line x1={right} x2={right} y1={staffTop} y2={staffBottom} stroke={COLORS.line} strokeWidth={1.1} />
              )}
            </g>
          );
        })}
        {placed.map((p, i) => {
          const { item, x } = p;
          if (item.kind === 'rest') return <Rest key={i} item={item} x={x + HEAD_RX} y={yOf} color={COLORS.muted} />;
          const first = i === 0 ? true : !(placed[i - 1].item.tieToNext && placed[i - 1].item.event === item.event);
          const target = song.events[item.event!].target;
          return (
            <g key={i}>
              {first && target.kind === 'chord' && (
                <text x={x} y={6 + 14} fill={item.event === active ? COLORS.active : COLORS.chord} fontSize={13} fontWeight={800}>
                  {chordSymbol(target.chord)}
                </text>
              )}
              {drawNote(item, x, placed[i + 1], `n${i}`)}
            </g>
          );
        })}
        {mode === 'time' && running && !reducedMotion && (
          <line ref={cursorRef} x1={0} x2={0} y1={staffTop - 3 * STEP} y2={staffBottom + 3 * STEP} stroke={COLORS.cursor} strokeWidth={1.5} strokeLinecap="round" opacity={0.85} style={{ display: 'none' }} />
        )}
      </svg>
      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs font-semibold text-slate-400">
          <span aria-live="polite">
            Bars {firstBar + 1}–{shownTo} of {layout.bars.length}
            {running ? ' · follows the music' : ''}
          </span>
          <button
            type="button"
            aria-label="Previous bars"
            disabled={running || page === 0}
            onClick={() => setManualPage(Math.max(0, page - 1))}
            className="rounded-lg border border-slate-700 p-1 text-slate-300 hover:border-violet-500/50 hover:text-white disabled:opacity-40 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next bars"
            disabled={running || page >= pageCount - 1}
            onClick={() => setManualPage(Math.min(pageCount - 1, page + 1))}
            className="rounded-lg border border-slate-700 p-1 text-slate-300 hover:border-violet-500/50 hover:text-white disabled:opacity-40 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
