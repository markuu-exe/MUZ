/**
 * Performance mode (owner request 2026-11-27): play a melody or a chord progression in time.
 * Practice only: no hearts, no EXP, nothing saved to the account (best score per device).
 * Microphone only (no camera): the note and chord graders from the lessons judge each event
 * against its beat (src/performance/judge.ts). The click is unpitched noise so it is never
 * graded as your playing.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Mic, Music2, Play, RotateCcw } from 'lucide-react';
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
import { SONGS, targetLabel, type Song } from '../../performance/songs';
import MediaDiagnostics, { mediaProblems } from '../lesson/practice/MediaDiagnostics';
import { PracticeRigProvider, usePracticeRig } from '../lesson/practice/PracticeRigContext';
import BeatHighway from '../lesson/rhythm/BeatHighway';
import CountInBadge from '../lesson/rhythm/CountInBadge';

type Frame = PerfFrame & HeardFrameLike;
const LEAD_SEC = 0.4;
const TAIL_SEC = 0.6;

const LEVEL_LABEL: Record<Song['level'], string> = { novice: 'Novice', proficient: 'Proficient', virtuoso: 'Virtuoso' };

function SongList({ onPick, best }: { onPick: (s: Song) => void; best: Record<string, number> }) {
  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-12">
      <div>
        <h2 className="text-2xl font-black text-white">Choose a piece</h2>
        <p className="mt-1 text-sm text-slate-400">
          Play a melody or a chord progression in time with the click. The microphone checks each note or chord on its beat.
          Practice only: no hearts and no EXP.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SONGS.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onPick(s)}
              className="group flex h-full w-full flex-col rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-left transition duration-150 hover:-translate-y-0.5 hover:border-violet-500/50 hover:bg-slate-900 motion-reduce:hover:translate-y-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
            >
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-300">
                <Music2 className="h-4 w-4" aria-hidden="true" /> {s.kind === 'melody' ? 'Melody' : 'Chords'} · {s.meter} · {s.bpm} BPM ·{' '}
                {LEVEL_LABEL[s.level]}
              </span>
              <span className="mt-1.5 text-lg font-black text-white">{s.title}</span>
              <span className="text-xs text-slate-400">{s.credit}</span>
              <span className="mt-1.5 text-sm text-slate-300">{s.description}</span>
              <span className="mt-auto pt-3 text-xs font-semibold text-slate-300">
                {best[s.id] !== undefined ? `Best on this device: ${best[s.id]}%` : 'Not played yet'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Player({ song, onBack, onBest }: { song: Song; onBack: () => void; onBest: () => void }) {
  const { rig, state } = usePracticeRig();
  const [slow, setSlow] = useState(false);
  const plan = useMemo(() => songPlan(song, slow ? Math.round(song.bpm * 0.75) : song.bpm), [song, slow]);
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [live, setLive] = useState<EventResult[]>([]);
  const [current, setCurrent] = useState(0);
  const [summary, setSummary] = useState<(PerformanceSummary & { newBest: boolean }) | null>(null);
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
    const judge = new PerformanceJudge<Frame>(plan.targets, song.events.map((e) => e.target), (f, target) => frameMatchesTarget(f, target, chordMatcher));
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
        setSummary({ ...s, newBest: !slow && saveBestScore(song.id, s.score) });
        onBest();
        setPhase('done');
      }
    }, 100);
  }, [onBest, plan, rig, slow, song, teardown]);

  const stop = () => {
    teardown();
    setPhase('idle');
  };

  // Enter starts (or restarts after results) from the piano bench.
  const keyRef = useRef<() => void>(() => undefined);
  keyRef.current = () => {
    if (micReady && phase !== 'running') void start();
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
        <div className="flex gap-2 text-xs font-bold uppercase tracking-wider">
          <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-slate-300">{song.meter}</span>
          <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-slate-300">{plan.bpm} BPM</span>
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
              onClick={() => void start()}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] transition hover:brightness-110 disabled:opacity-50 disabled:shadow-none focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
            >
              {phase === 'done' ? <RotateCcw className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
              {phase === 'done' ? 'Play again (Enter)' : 'Start (Enter)'}
            </button>
          )}
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={slow} disabled={phase === 'running'} onChange={(e) => setSlow(e.target.checked)} />
            Slow practice (75% tempo)
          </label>
        </div>
      </div>

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

      <BeatHighway plan={plan} now={now} taps={marks} labels={plan.labels} />

      {phase === 'running' && (
        <>
          <CountInBadge cue={cue} tapText={`Play now: ${nowLabel}${nextLabel ? ` · next ${nextLabel}` : ''}`} />
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
        </>
      )}

      {phase === 'done' && summary && (
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
                {r.rating === 'Miss' ? (r.missReason === 'wrong' ? ' (wrong)' : '') : ` ${r.offsetMs! > 0 ? '+' : ''}${r.offsetMs} ms`}
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

export default function PerformView() {
  const [song, setSong] = useState<Song | null>(null);
  const [best, setBest] = useState(readBestScores);
  const refreshBest = useCallback(() => setBest(readBestScores()), []);
  if (!song) return <SongList onPick={setSong} best={best} />;
  return (
    // Own rig: the microphone is released when you leave the song.
    <PracticeRigProvider key={song.id}>
      <Player song={song} onBack={() => setSong(null)} onBest={refreshBest} />
    </PracticeRigProvider>
  );
}
