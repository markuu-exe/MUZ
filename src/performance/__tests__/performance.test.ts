import { describe, expect, it } from 'vitest';
import { parseChord } from '../../audio/chords/vocabulary';
import { ChromaFrameProcessor } from '../../audio/dsp/ChromaFrameProcessor';
import { feed, renderPiano } from '../../audio/__tests__/fixtures';
import { chordMatcher } from '../../practice/PracticeDrill';
import { frameMatchesTarget, type HeardFrameLike } from '../../practice/heard';
import { rhythmCue } from '../../lib/rhythm/plan';
import { EARLY_SEC, LATE_SEC, PerformanceJudge, eventWindows, type PerfFrame } from '../judge';
import { songPlan } from '../plan';
import { SONGS, getSong, songLengthBeats, type SongTarget } from '../songs';

describe('songs', () => {
  it('are public domain or MUZ originals, with valid, ordered events', () => {
    for (const s of SONGS) {
      expect(s.credit).toMatch(/Traditional|public domain|MUZ original/);
      let beat = 0;
      for (const e of s.events) {
        expect(e.beat).toBeCloseTo(beat);
        expect(e.length).toBeGreaterThan(0);
        if (e.target.kind === 'chord') expect(() => parseChord(e.target.kind === 'chord' ? e.target.chord : '')).not.toThrow();
        else expect(e.target.note).toBeGreaterThanOrEqual(48);
        beat += e.length;
      }
      expect(songLengthBeats(s) % s.beatsPerMeasure).toBe(0); // whole bars
    }
  });
});

describe('song plan', () => {
  it('4/4: one bar of count-in, targets on the beat after it', () => {
    const p = songPlan(getSong('twinkle')!); // 72 BPM
    const beat = 60 / 72;
    expect(p.clicks.filter((c) => c.countIn)).toHaveLength(4);
    expect(p.targets[0]).toBeCloseTo(4 * beat);
    expect(p.targets[6]).toBeCloseTo(10 * beat); // the half note G starts on beat 7
    expect(p.labels.slice(0, 3)).toEqual(['C4', 'C4', 'G4']);
    expect(rhythmCue(p, 0)).toMatchObject({ kind: 'count', of: 4, beatsPerMeasure: 4 });
  });

  it('3/4: two bars of count-in (6 clicks), like rhythm lessons', () => {
    const p = songPlan(getSong('gentle-waltz')!);
    expect(p.clicks.filter((c) => c.countIn)).toHaveLength(6);
    expect(rhythmCue(p, 0)).toMatchObject({ kind: 'count', of: 6, beatsPerMeasure: 3 });
  });

  it('a slower tempo stretches everything', () => {
    const song = getSong('four-chords')!;
    expect(songPlan(song, 40).endSec).toBeCloseTo(songPlan(song, 80).endSec * 2);
  });
});

describe('event windows', () => {
  it('never overlap, even for half-beat notes', () => {
    const p = songPlan(getSong('ode-to-joy')!);
    const w = eventWindows(p.targets);
    for (let i = 1; i < w.length; i++) expect(w[i].start).toBeGreaterThanOrEqual(w[i - 1].end - 1e-9);
    expect(w[0].start).toBeCloseTo(p.targets[0] - EARLY_SEC);
    expect(w[w.length - 1].end).toBeCloseTo(p.targets[p.targets.length - 1] + LATE_SEC);
  });
});

type TestFrame = PerfFrame & { plays: string | null };
const key = (t: SongTarget) => (t.kind === 'note' ? `n${t.note}` : `c${t.chord}`);

/** Frames every 10 ms; `strikes` start a sound (onset) that lasts `dur` seconds. */
function frames(strikes: Array<{ at: number; plays: string; dur?: number }>, until: number): TestFrame[] {
  const out: TestFrame[] = [];
  for (let t = 0; t <= until; t = Math.round((t + 0.01) * 1000) / 1000) {
    const s = [...strikes].reverse().find((x) => t >= x.at && t < x.at + (x.dur ?? 0.4));
    out.push({ t, voiced: !!s, onset: strikes.some((x) => Math.abs(x.at - t) < 0.005), plays: s?.plays ?? null });
  }
  return out;
}

function judge(times: number[], targets: SongTarget[], input: TestFrame[]) {
  const j = new PerformanceJudge<TestFrame>(times, targets, (f, target) => f.plays === key(target));
  for (const f of input) j.push(f);
  return j.summary();
}

describe('performance judge', () => {
  const C: SongTarget = { kind: 'note', note: 60 };
  const G: SongTarget = { kind: 'note', note: 67 };

  it('on the beat is Perfect, a little late is Good, outside the window is a Miss', () => {
    const s = judge(
      [1, 2, 3],
      [C, G, C],
      frames([
        { at: 1.03, plays: 'n60' },
        { at: 2.3, plays: 'n67' },
        { at: 3.6, plays: 'n60' }, // beyond the late window
      ], 4),
    );
    expect(s.results.map((r) => r.rating)).toEqual(['Perfect', 'Good', 'Miss']);
    expect(s.results[0].offsetMs).toBe(30);
    expect(s.results[2].missReason).toBe('missed');
    expect(s.score).toBe(Math.round(((100 + 70) / 300) * 100));
  });

  it('a wrong note is a Miss marked "wrong"', () => {
    const s = judge([1], [C], frames([{ at: 1, plays: 'n62' }], 2));
    expect(s.results[0]).toMatchObject({ rating: 'Miss', missReason: 'wrong' });
  });

  it('a ringing note does not score the next identical note: it needs a new strike', () => {
    const ringing = judge([1, 1.5], [C, C], frames([{ at: 1, plays: 'n60', dur: 1.5 }], 3));
    expect(ringing.results.map((r) => r.rating)).toEqual(['Perfect', 'Miss']);
    const struck = judge([1, 1.5], [C, C], frames([{ at: 1, plays: 'n60', dur: 0.45 }, { at: 1.52, plays: 'n60' }], 3));
    expect(struck.results.map((r) => r.rating)).toEqual(['Perfect', 'Perfect']);
  });

  it('a slightly early strike still counts and reports a negative offset', () => {
    const s = judge([1], [C], frames([{ at: 0.9, plays: 'n60' }], 2));
    expect(s.results[0]).toMatchObject({ rating: 'Perfect', offsetMs: -100 });
    expect(s.meanOffsetMs).toBe(-100);
  });
});

describe('performance judge on real piano audio (grader checks)', { timeout: 60_000 }, () => {
  it('Four-Chord Groove: C then G on their beats are hits; a wrong chord is not', () => {
    const song = getSong('four-chords')!;
    const plan = songPlan(song, 80);
    const [t0, t1, t2] = plan.targets;
    const notes = [
      ...[60, 64, 67].map((midi) => ({ midi, at: t0 })), // C on time
      ...[55, 59, 62].map((midi) => ({ midi, at: t1 + 0.05 })), // G, 50 ms late
      ...[57, 60, 65].map((midi) => ({ midi, at: t2 })), // F instead of Am
    ];
    const audio = renderPiano(notes, { sampleRate: 48000, durationSec: t2 + 1.2, seed: 3, decaySec: 0.6 });
    const j = new PerformanceJudge<PerfFrame & HeardFrameLike>(plan.targets.slice(0, 3), song.events.slice(0, 3).map((e) => e.target), (f, target) =>
      frameMatchesTarget(f, target, chordMatcher),
    );
    const proc = new ChromaFrameProcessor(48000, (f) =>
      j.push({ t: f.time, voiced: f.voiced, onset: f.onset, chroma: f.chroma, ringing: f.ringing, pitchHz: f.pitchHz, clarity: f.clarity }),
    );
    feed(proc, audio, 48000);
    const s = j.summary();
    expect(s.results[0].rating).not.toBe('Miss');
    expect(s.results[1].rating).not.toBe('Miss');
    expect(s.results[2]).toMatchObject({ rating: 'Miss', missReason: 'wrong' });
    // The analysis reports an onset a little after the strike; it must stay well inside the late window.
    for (const r of s.results.slice(0, 2)) expect(Math.abs(r.offsetMs ?? 999)).toBeLessThan(LATE_SEC * 1000 - 150);
  });
});

describe('live snapshot for the highway', () => {
  it('shows hits as soon as they happen and misses only once their window has closed', () => {
    const C: SongTarget = { kind: 'note', note: 60 };
    const j = new PerformanceJudge<TestFrame>([1, 2], [C, C], (f, target) => f.plays === key(target));
    for (const f of frames([{ at: 1.0, plays: 'n60' }], 1.5)) j.push(f);
    expect(j.snapshot(1.5)).toEqual([{ index: 0, rating: 'Perfect', offsetMs: 0, missReason: null }]);
    expect(j.snapshot(2.5).map((r) => r.rating)).toEqual(['Perfect', 'Miss']);
  });
});
