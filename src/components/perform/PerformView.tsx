/**
 * Performance mode (owner request 2026-11-27): play a melody or a chord progression in time.
 * Practice only: no hearts, no EXP, nothing saved to the account (best score per device).
 * Microphone only (no camera): the note and chord graders from the lessons judge each event
 * against its beat (src/performance/judge.ts). The click is unpitched noise so it is never
 * graded as your playing.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Mic, Music2, PenLine, Play, RotateCcw } from 'lucide-react';
import { useRhythmCue } from '../../hooks/useRhythmCue';
import { audioTimeAt } from '../../lib/rhythm/audioClock';
import type { JudgedTap } from '../../lib/rhythm/timing';
import { cn } from '../../lib/cn';
import { chordMatcher } from '../../practice/PracticeDrill';
import { frameMatchesTarget, type HeardFrameLike } from '../../practice/heard';
import { readBestScores, saveBestScore } from '../../performance/best';
import { scheduleNoiseClick } from '../../performance/click';
import { PerformanceJudge, type EventResult, type PerfFrame, type PerformanceSummary } from '../../performance/judge';
import { songPlan } from '../../performance/plan';
import { WaitStepper, type WaitSummary } from '../../performance/wait';
import { describeHeard } from '../../performance/heardLabel';
import { barsOf, loopRange, sliceSong } from '../../performance/loop';
import { SONGS, targetLabel, type Song } from '../../performance/songs';
import MediaDiagnostics, { mediaProblems } from '../lesson/practice/MediaDiagnostics';
import { PracticeRigProvider, usePracticeRig } from '../lesson/practice/PracticeRigContext';
import BeatHighway from '../lesson/rhythm/BeatHighway';
import CountInBadge from '../lesson/rhythm/CountInBadge';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import FallingNotes from './FallingNotes';
import SheetEditor, { NEW_SHEET } from './SheetEditor';
import { deleteCustomSheet, listCustomSongs, saveCustomSheet, type CustomPiece } from '../../performance/customSongs';

type Frame = PerfFrame & HeardFrameLike;
const LEAD_SEC = 0.4;
const TAIL_SEC = 0.6;

/** "bar 3" or "bars 3–4" (1-based, as musicians count). */
function barsLabel({ from, to }: { from: number; to: number }): string {
  return from === to ? `bar ${from + 1}` : `bars ${from + 1}–${to + 1}`;
}

const MODES = [
  ['time', 'In time'],
  ['wait', 'Wait for me'],
] as const;

const LEVEL_LABEL: Record<Song['level'], string> = { novice: 'Novice', proficient: 'Proficient', virtuoso: 'Virtuoso' };

const CARD =
  'group flex h-full w-full flex-col rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-left transition duration-150 hover:-translate-y-0.5 hover:border-violet-500/50 hover:bg-slate-900 motion-reduce:hover:translate-y-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300';

function SongCard({ s, best, onPick }: { s: Song; best: Record<string, number>; onPick: (s: Song) => void }) {
  return (
    <button type="button" onClick={() => onPick(s)} className={CARD}>
      <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-300">
        <Music2 className="h-4 w-4" aria-hidden="true" /> {s.kind === 'melody' ? 'Melody' : 'Chords'} · {s.meter} · {s.bpm} BPM · {LEVEL_LABEL[s.level]}
      </span>
      <span className="mt-1.5 text-lg font-black text-white">{s.title}</span>
      <span className="text-xs text-slate-400">{s.credit}</span>
      {s.description && <span className="mt-1.5 text-sm text-slate-300">{s.description}</span>}
      <span className="mt-auto pt-3 text-xs font-semibold text-slate-300">
        {best[s.id] !== undefined ? `Best on this device: ${best[s.id]}%` : 'Not played yet'}
      </span>
    </button>
  );
}

interface SongListProps {
  onPick: (s: Song) => void;
  best: Record<string, number>;
  customs: CustomPiece[];
  onNew: () => void;
  onEdit: (piece: CustomPiece) => void;
}

function SongList({ onPick, best, customs, onNew, onEdit }: SongListProps) {
  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-white">Choose a piece</h2>
          <p className="mt-1 text-sm text-slate-400">
            Play a melody or a chord progression in time with the click, or at your own pace. The microphone checks each note or chord.
            Practice only: no hearts and no EXP.
          </p>
        </div>
        <button
          type="button"
          onClick={onNew}
          className="flex items-center gap-2 rounded-xl border border-violet-500/50 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-violet-200 hover:bg-violet-500/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
        >
          <PenLine className="h-4 w-4" aria-hidden="true" /> Write a piece
        </button>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SONGS.map((s) => (
          <li key={s.id}>
            <SongCard s={s} best={best} onPick={onPick} />
          </li>
        ))}
      </ul>
      {customs.length > 0 && (
        <section className="space-y-3" aria-label="Your pieces">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Your pieces</h3>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {customs.map((c) => (
              <li key={c.id} className="relative">
                {c.song ? (
                  <SongCard s={c.song} best={best} onPick={onPick} />
                ) : (
                  <button type="button" onClick={() => onEdit(c)} className={CARD}>
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-300">Needs a fix</span>
                    <span className="mt-1.5 text-sm text-slate-300">This sheet no longer reads correctly. Open it to fix it.</span>
                  </button>
                )}
                {c.song && (
                  <button
                    type="button"
                    onClick={() => onEdit(c)}
                    aria-label={`Edit ${c.song.title}`}
                    className="absolute right-3 top-3 rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-slate-300 hover:border-violet-500/50 hover:text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
                  >
                    <PenLine className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

interface WaitDisplayProps {
  song: Song;
  phase: 'idle' | 'running' | 'done';
  current: number;
  wrongs: number[];
  lastWrong: boolean;
  /** What the last wrong attempt sounded like ("E4", "D minor"), when known. */
  lastHeard: string | null;
  /** The falling-notes view shows what to play: one line instead of the big cards and chips. */
  compact: boolean;
  summary: WaitSummary | null;
  nowLabel: string;
  nextLabel: string | null;
}

/** "Wait for me": every step of the piece as a chip, the step being waited on, and the result. */
function WaitDisplay({ song, phase, current, wrongs, lastWrong, lastHeard, summary, nowLabel, nextLabel, compact }: WaitDisplayProps) {
  return (
    <div className="space-y-4">
      {compact && phase === 'running' && (
        <p className={cn('text-lg font-black', lastWrong ? 'text-rose-200' : 'text-white')} aria-live="polite">
          {lastWrong ? `${lastHeard ? `That was ${lastHeard}.` : 'Not quite.'} Try ${nowLabel} again.` : `Play ${nowLabel}`}
          {!lastWrong && nextLabel && <span className="text-sm font-semibold text-slate-400"> · next {nextLabel}</span>}
        </p>
      )}
      <ol className={cn('flex flex-wrap gap-1.5', compact && phase !== 'done' && 'hidden')} aria-label="Notes and chords in this piece">
        {song.events.map((e, i) => {
          const finished = (phase === 'running' && i < current) || (phase === 'done' && summary !== null);
          const isNow = phase === 'running' && i === current;
          return (
            <li
              key={i}
              aria-current={isNow ? 'step' : undefined}
              className={cn(
                'rounded-lg border px-2 py-1 text-xs font-bold transition-colors duration-150',
                finished && wrongs[i] === 0 && 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200',
                finished && wrongs[i] > 0 && 'border-amber-500/50 bg-amber-500/10 text-amber-200',
                isNow && 'border-violet-400 bg-violet-500/20 text-white',
                !finished && !isNow && 'border-slate-800 text-slate-400',
              )}
            >
              {targetLabel(e.target)}
              {finished && wrongs[i] > 0 ? ` · ${wrongs[i]} ${wrongs[i] === 1 ? 'retry' : 'retries'}` : ''}
            </li>
          );
        })}
      </ol>

      {phase === 'idle' && (
        <p className="text-sm text-slate-400">
          No click and no tempo: each note or chord waits until the microphone hears it, then the next one comes up. Take your time.
        </p>
      )}

      {phase === 'running' && !compact && (
        <>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div
              className={cn(
                'rounded-2xl border px-4 py-3 transition-colors duration-150',
                lastWrong ? 'border-rose-400/70 bg-rose-950/40' : 'border-violet-500/40 bg-violet-950/40',
              )}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-violet-300">Play</p>
              <p className="text-4xl font-black text-white">{nowLabel}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3" aria-hidden="true">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Next</p>
              <p className="text-4xl font-black text-slate-300">{nextLabel ?? '—'}</p>
            </div>
          </div>
          <p className="min-h-5 text-sm font-semibold text-rose-200" aria-live="polite">
            {lastWrong ? `${lastHeard ? `That was ${lastHeard}.` : 'Not quite.'} Try ${nowLabel} again.` : ''}
          </p>
        </>
      )}

      {phase === 'done' && summary && (
        <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/90 p-5" role="status">
          <div className="flex items-center justify-between">
            <p className="text-xl font-black text-white">Piece complete</p>
            <p className="text-3xl font-black text-white">
              {summary.firstTry}/{summary.total}
            </p>
          </div>
          <p className="text-sm text-slate-300">
            {summary.firstTry === summary.total
              ? 'Every note and chord right on the first try. Ready for In time mode.'
              : `Right on the first try: ${summary.firstTry} of ${summary.total}. Wrong attempts: ${summary.wrong}. The amber steps are the ones to practise.`}
          </p>
        </div>
      )}
    </div>
  );
}

function Player({ song: fullSong, onBack, onBest }: { song: Song; onBack: () => void; onBest: () => void }) {
  const { rig, state } = usePracticeRig();
  // "Loop the bars you missed": `song` is the piece being played, the whole song or a slice.
  const [loop, setLoop] = useState<{ from: number; to: number } | null>(null);
  const [loopPasses, setLoopPasses] = useState<string[]>([]);
  const song = useMemo(() => (loop ? sliceSong(fullSong, loop.from, loop.to) : fullSong), [fullSong, loop]);
  const loopRef = useRef(loop);
  loopRef.current = loop;
  const [slow, setSlow] = useState(false);
  const plan = useMemo(() => songPlan(song, slow ? Math.round(song.bpm * 0.75) : song.bpm), [song, slow]);
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [live, setLive] = useState<EventResult[]>([]);
  const [current, setCurrent] = useState(0);
  const [summary, setSummary] = useState<(PerformanceSummary & { newBest: boolean }) | null>(null);
  // "Wait for me": no click, no tempo; each note or chord waits until it is heard (performance/wait.ts).
  const [mode, setMode] = useState<'time' | 'wait'>('time');
  // Falling notes (Synthesia-style) by default; the beat highway / step chips stay available.
  const [view, setView] = useState<'falling' | 'highway'>('falling');
  const reducedMotion = useReducedMotion();
  const [wrongs, setWrongs] = useState<number[]>(() => song.events.map(() => 0));
  const [lastWrong, setLastWrong] = useState(false);
  const [lastHeard, setLastHeard] = useState<string | null>(null);
  const [waitSummary, setWaitSummary] = useState<WaitSummary | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const t0Ref = useRef<number | null>(null);
  const judgeRef = useRef<PerformanceJudge<Frame> | null>(null);
  const offRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<number | null>(null);

  const micReady = state.mic === 'running';
  const problems = mediaProblems(state, true).filter((p) => p.device !== 'Camera' && p.device !== 'Posture model');

  const now = useCallback((): number | null => {
    const ctx = ctxRef.current;
    const t0 = t0Ref.current;
    if (!ctx || t0 === null) return null;
    const p = performance.now();
    return audioTimeAt(ctx, p, p) - t0;
  }, []);

  const teardown = useCallback(() => {
    offRef.current?.();
    offRef.current = null;
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    const ctx = ctxRef.current;
    ctxRef.current = null;
    t0Ref.current = null;
    if (ctx && ctx.state !== 'closed') void ctx.close();
  }, []);
  useEffect(() => teardown, [teardown]);

  const start = useCallback(async () => {
    teardown();
    (document.activeElement as HTMLElement | null)?.blur();
    rig.resetAudioAnalysis();
    const ctx = new AudioContext({ latencyHint: 'interactive' });
    ctxRef.current = ctx;
    await ctx.resume();
    if (ctxRef.current !== ctx) return;
    const t0 = ctx.currentTime + LEAD_SEC;
    t0Ref.current = t0;
    for (const c of plan.clicks) scheduleNoiseClick(ctx, t0 + c.time, c.accent, c.countIn);
    const judge = new PerformanceJudge<Frame>(plan.targets, song.events.map((e) => e.target), (f, target) => frameMatchesTarget(f, target, chordMatcher), describeHeard);
    judgeRef.current = judge;
    setLive([]);
    setSummary(null);
    setCurrent(0);
    // Mic frames are stamped on the performance clock; put them on the song's clock.
    offRef.current = rig.on('audio', (frame) => {
      const toPlan = (ms: number) => audioTimeAt(ctx, ms, performance.now()) - t0;
      judge.push({
        t: toPlan(frame.tMs),
        onset: frame.onset,
        onsetT: frame.onset ? toPlan(frame.onsetMs) : undefined,
        voiced: frame.voiced,
        chroma: frame.chroma,
        ringing: frame.ringing,
        pitchHz: frame.pitchHz,
        clarity: frame.clarity,
      });
    });
    setPhase('running');
    timerRef.current = window.setInterval(() => {
      const t = audioTimeAt(ctx, performance.now(), performance.now()) - t0;
      setLive(judge.snapshot(t));
      const next = plan.targets.findIndex((target, i) => t < target + (plan.targets[i + 1] !== undefined ? (plan.targets[i + 1] - target) / 2 : 0.5));
      setCurrent(next < 0 ? plan.targets.length - 1 : next);
      if (t >= plan.endSec + TAIL_SEC) {
        const s = judge.summary();
        teardown();
        if (loopRef.current) {
          // Looping: note the pass and go again (each pass has its own count-in).
          setLoopPasses((p) => [...p, `${s.score}%`]);
          void startRef.current();
          return;
        }
        setSummary({ ...s, newBest: !slow && saveBestScore(song.id, s.score) });
        onBest();
        setPhase('done');
      }
    }, 100);
  }, [onBest, plan, rig, slow, song, teardown]);

  const startWait = useCallback(() => {
    teardown();
    (document.activeElement as HTMLElement | null)?.blur();
    rig.resetAudioAnalysis();
    const stepper = new WaitStepper(song.events.map((e) => e.target));
    setSummary(null);
    setWaitSummary(null);
    setCurrent(0);
    setWrongs(song.events.map(() => 0));
    setLastWrong(false);
    offRef.current = rig.on('audio', (frame) => {
      const e = stepper.push(frame);
      if (!e) return;
      if (e.kind === 'wrong') {
        setWrongs(stepper.summary().perEvent);
        setLastWrong(true);
        setLastHeard(e.heard);
        return;
      }
      setLastWrong(false);
      setCurrent(Math.min(stepper.index, song.events.length - 1));
      if (stepper.done) {
        const s = stepper.summary();
        if (loopRef.current) {
          setLoopPasses((p) => [...p, `${s.firstTry}/${s.total}`]);
          queueMicrotask(() => startWaitRef.current()); // not from inside the rig's own emit
          return;
        }
        setWaitSummary(s);
        setPhase('done');
        queueMicrotask(teardown);
      }
    });
    setPhase('running');
  }, [rig, song, teardown]);

  const startRef = useRef(start);
  startRef.current = start;
  const startWaitRef = useRef(startWait);
  startWaitRef.current = startWait;

  const begin = () => (mode === 'wait' ? startWait() : void start());

  /** Enter or leave a loop; the next Start plays it. */
  const chooseLoop = (next: { from: number; to: number } | null) => {
    teardown();
    setLoop(next);
    setLoopPasses([]);
    setPhase('idle');
    setSummary(null);
    setWaitSummary(null);
    setCurrent(0);
    setLastWrong(false);
  };
  // A new piece (loop on or off) needs per-step counters of its own length.
  useEffect(() => {
    setWrongs(song.events.map(() => 0));
  }, [song]);
  const missedLoop =
    phase !== 'done' || loop
      ? null
      : mode === 'time' && summary
        ? loopRange(barsOf(song, summary.results.filter((r) => r.rating === 'Miss').map((r) => r.index)))
        : mode === 'wait' && waitSummary
          ? loopRange(barsOf(song, waitSummary.perEvent.flatMap((w, i) => (w > 0 ? [i] : []))))
          : null;

  const resetForMode = (next: 'time' | 'wait') => {
    setMode(next);
    setPhase('idle');
    setSummary(null);
    setWaitSummary(null);
    setCurrent(0);
    setWrongs(song.events.map(() => 0));
    setLastWrong(false);
  };

  const stop = () => {
    teardown();
    setPhase('idle');
  };

  // Enter starts (or restarts after results) from the piano bench.
  const keyRef = useRef<() => void>(() => undefined);
  keyRef.current = () => {
    if (micReady && phase !== 'running') begin();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat) return;
      e.preventDefault();
      keyRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const cue = useRhythmCue(plan, now, phase === 'running');
  const marks: JudgedTap[] = live.map((r) => ({ rating: r.rating, deltaMs: r.offsetMs ?? 0, beatIndex: r.index }));
  const nowLabel = targetLabel(song.events[current].target);
  const nextLabel = song.events[current + 1] ? targetLabel(song.events[current + 1].target) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            stop();
            onBack();
          }}
          className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-200 hover:border-slate-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Songs
        </button>
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider">
          <div role="group" aria-label="View" className="flex rounded-full border border-slate-700 bg-slate-900 p-0.5">
            {(
              [
                ['falling', 'Falling notes'],
                ['highway', mode === 'wait' ? 'Steps' : 'Highway'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={view === id}
                onClick={() => setView(id)}
                className={cn(
                  'rounded-full px-3 py-0.5 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300',
                  view === id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-100',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-slate-300">{song.meter}</span>
          <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-slate-300">{mode === 'wait' ? 'Your pace' : `${plan.bpm} BPM`}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-black text-white">{song.title}</h2>
          <p className="text-sm text-slate-400">
            {song.credit} · {song.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          {phase === 'running' ? (
            <button type="button" onClick={stop} className="rounded-xl border border-slate-600 px-6 py-3 text-sm font-bold uppercase tracking-wider text-slate-200 hover:border-slate-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300">
              Stop
            </button>
          ) : (
            <button
              type="button"
              disabled={!micReady}
              onClick={begin}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] transition hover:brightness-110 disabled:opacity-50 disabled:shadow-none focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
            >
              {phase === 'done' ? <RotateCcw className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
              {phase === 'done' ? 'Play again (Enter)' : 'Start (Enter)'}
            </button>
          )}
          <div role="group" aria-label="Practice mode" className="flex rounded-xl border border-slate-700 bg-slate-900/80 p-1 text-xs font-bold uppercase tracking-wider">
            {MODES.map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={mode === id}
                disabled={phase === 'running'}
                onClick={() => resetForMode(id)}
                className={cn(
                  'rounded-lg px-3 py-1.5 transition-colors disabled:cursor-not-allowed focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300',
                  mode === id ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-100',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === 'time' && (
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={slow} disabled={phase === 'running'} onChange={(e) => setSlow(e.target.checked)} />
              Slow practice (75% tempo)
            </label>
          )}
        </div>
      </div>

      {loop && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-950/30 px-4 py-2.5 text-sm" role="status">
          <p className="font-semibold text-amber-100">
            Looping {barsLabel(loop)}
            {phase === 'running' ? ' · keeps going until you press Stop' : ''}
            {loopPasses.length > 0 && <span className="text-amber-200/80"> · passes: {loopPasses.slice(-6).join(' · ')}</span>}
          </p>
          <button
            type="button"
            onClick={() => chooseLoop(null)}
            className="rounded-lg border border-amber-500/50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-100 hover:bg-amber-500/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300"
          >
            Whole piece
          </button>
        </div>
      )}
      {missedLoop && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 text-sm">
          <p className="text-slate-300">Drill the trouble spot: replay just those bars until they feel easy.</p>
          <button
            type="button"
            onClick={() => chooseLoop(missedLoop)}
            className="rounded-lg bg-amber-500/90 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-950 hover:bg-amber-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300"
          >
            Loop {barsLabel(missedLoop)}
          </button>
        </div>
      )}

      {problems.length > 0 ? (
        <MediaDiagnostics problems={problems} onRetry={() => void rig.startMic()} needsMic />
      ) : !micReady ? (
        <div className="rounded-2xl border border-violet-500/30 bg-violet-950/30 p-5">
          <p className="text-sm text-slate-200">
            Performance mode listens with the microphone only (no camera). Put the computer where it can hear your piano. The click is a
            soft tick that the grading ignores; speakers or headphones both work.
          </p>
          <button
            type="button"
            disabled={state.mic === 'starting'}
            onClick={() => void rig.startMic()}
            className="mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-white disabled:opacity-60"
          >
            <Mic className="h-4 w-4" aria-hidden="true" /> {state.mic === 'starting' ? 'Starting microphone…' : 'Turn on microphone'}
          </button>
        </div>
      ) : null}

      {view === 'falling' && (
        <FallingNotes
          song={song}
          plan={plan}
          mode={mode}
          now={now}
          running={phase === 'running'}
          current={current}
          results={live}
          wrongs={wrongs}
          reducedMotion={reducedMotion}
        />
      )}
      {mode === 'time' && view === 'highway' && <BeatHighway plan={plan} now={now} taps={marks} labels={plan.labels} />}

      {mode === 'wait' && (
        <WaitDisplay
          song={song}
          phase={phase}
          current={current}
          wrongs={wrongs}
          lastWrong={lastWrong}
          lastHeard={lastHeard}
          summary={waitSummary}
          nowLabel={nowLabel}
          nextLabel={nextLabel}
          compact={view === 'falling'}
        />
      )}

      {mode === 'time' && phase === 'running' && (
        <>
          <CountInBadge cue={cue} tapText={`Play now: ${nowLabel}${nextLabel ? ` · next ${nextLabel}` : ''}`} />
          {view === 'highway' && (
          <div className="grid grid-cols-2 gap-4 text-center" aria-hidden="true">
            <div className="rounded-2xl border border-violet-500/40 bg-violet-950/40 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-violet-300">Now</p>
              <p className="text-4xl font-black text-white">{nowLabel}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Next</p>
              <p className="text-4xl font-black text-slate-300">{nextLabel ?? '—'}</p>
            </div>
          </div>
          )}
        </>
      )}

      {mode === 'time' && phase === 'done' && summary && (
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-5" role="status">
          <div className="flex items-center justify-between">
            <p className="text-xl font-black text-white">{summary.newBest ? 'New best!' : 'Performance complete'}</p>
            <p className="text-3xl font-black text-white">{summary.score}%</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-lg bg-slate-950/80 p-2">
              <p className="text-lg font-bold text-emerald-300">{summary.perfect}</p>
              <p className="text-xs text-slate-400">Perfect</p>
            </div>
            <div className="rounded-lg bg-slate-950/80 p-2">
              <p className="text-lg font-bold text-amber-300">{summary.good}</p>
              <p className="text-xs text-slate-400">Good</p>
            </div>
            <div className="rounded-lg bg-slate-950/80 p-2">
              <p className="text-lg font-bold text-rose-300">{summary.miss}</p>
              <p className="text-xs text-slate-400">Missed</p>
            </div>
          </div>
          <ol className="flex flex-wrap gap-1.5" aria-label="Each note or chord">
            {summary.results.map((r) => (
              <li
                key={r.index}
                className={cn(
                  'rounded-lg border px-2 py-1 text-xs font-bold',
                  r.rating === 'Perfect' && 'border-emerald-500/50 text-emerald-200',
                  r.rating === 'Good' && 'border-amber-500/50 text-amber-200',
                  r.rating === 'Miss' && 'border-rose-500/50 text-rose-200',
                )}
              >
                {plan.labels[r.index]}: {r.rating}
                {r.rating === 'Miss'
                  ? r.missReason === 'wrong'
                    ? r.heard
                      ? ` (played ${r.heard})`
                      : ' (wrong)'
                    : ''
                  : ` ${r.offsetMs! > 0 ? '+' : ''}${r.offsetMs} ms`}
              </li>
            ))}
          </ol>
          <p className="text-xs text-slate-400">
            Perfect is within 120 ms of the beat; the window runs from 200 ms early to 450 ms late.
            {summary.meanOffsetMs !== null && Math.abs(summary.meanOffsetMs) >= 40
              ? ` On average you played ${Math.abs(summary.meanOffsetMs)} ms ${summary.meanOffsetMs > 0 ? 'late' : 'early'}.`
              : ''}
            {slow ? ' Slow tempo: best scores are kept for full tempo only.' : ''}
          </p>
        </div>
      )}

    </div>
  );
}

type Screen = { kind: 'list' } | { kind: 'play'; song: Song } | { kind: 'edit'; id: string | null; text: string };

export default function PerformView() {
  const [screen, setScreen] = useState<Screen>({ kind: 'list' });
  const [best, setBest] = useState(readBestScores);
  const [customs, setCustoms] = useState(listCustomSongs);
  const refreshBest = useCallback(() => setBest(readBestScores()), []);
  if (screen.kind === 'edit') {
    return (
      <SheetEditor
        key={screen.id ?? 'new'}
        initialText={screen.text}
        existing={screen.id !== null}
        onCancel={() => setScreen({ kind: 'list' })}
        onSave={(text) => {
          const id = saveCustomSheet(text, screen.id ?? undefined);
          const pieces = listCustomSongs();
          setCustoms(pieces);
          const saved = pieces.find((p) => p.id === id)?.song;
          setScreen(saved ? { kind: 'play', song: saved } : { kind: 'list' });
        }}
        onDelete={() => {
          if (screen.id) deleteCustomSheet(screen.id);
          setCustoms(listCustomSongs());
          setScreen({ kind: 'list' });
        }}
      />
    );
  }
  if (screen.kind === 'list') {
    return (
      <SongList
        onPick={(s) => setScreen({ kind: 'play', song: s })}
        best={best}
        customs={customs}
        onNew={() => setScreen({ kind: 'edit', id: null, text: NEW_SHEET })}
        onEdit={(c) => setScreen({ kind: 'edit', id: c.id, text: c.text })}
      />
    );
  }
  const song = screen.song;
  return (
    // Own rig: the microphone is released when you leave the song.
    <PracticeRigProvider key={song.id}>
      <Player song={song} onBack={() => setScreen({ kind: 'list' })} onBest={refreshBest} />
    </PracticeRigProvider>
  );
}
