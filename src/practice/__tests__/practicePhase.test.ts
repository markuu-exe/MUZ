import { describe, expect, it } from 'vitest';
import { ChromaFrameProcessor } from '../../audio/dsp/ChromaFrameProcessor';
import { feed, renderPiano, type NoteEvent } from '../../audio/__tests__/fixtures';
import { PracticeDrill, type DrillTarget } from '../PracticeDrill';
import { INITIAL_DRILL_PHASE, drillPhaseReducer, practiceDrillOptions, type DrillPhase } from '../practicePhase';

const FS = 48000;

function play(drill: PracticeDrill, events: NoteEvent[], durationSec: number, startMs = 0) {
  const audio = renderPiano(events, { sampleRate: FS, durationSec, seed: 5, decaySec: 0.4 });
  const proc = new ChromaFrameProcessor(FS, (f) => {
    const tMs = startMs + f.time * 1000;
    drill.pushPosture(tMs, true);
    drill.pushFrame({
      tMs,
      chroma: f.chroma,
      voiced: f.voiced,
      ringing: f.ringing,
      onset: f.onset,
      onsetMs: startMs + f.onsetTime * 1000,
      pitchHz: f.pitchHz,
      clarity: f.clarity,
    });
  });
  feed(proc, audio, FS);
}

function record(drill: PracticeDrill) {
  const log: string[] = [];
  drill.on('heartLost', (e) => log.push(`heart:${e.reason}`));
  drill.on('complete', () => log.push('complete'));
  drill.on('locked', () => log.push('locked'));
  return log;
}

const C4: DrillTarget[] = [{ kind: 'note', note: 60 }];
const practiceDrill = () => {
  const o = practiceDrillOptions(15);
  return new PracticeDrill(C4, { hearts: o.hearts, timeoutMs: o.timeoutSec * 1000, heartCost: o.heartCost });
};
const gradedDrill = (hearts = 3) => new PracticeDrill(C4, { hearts, timeoutMs: 15000, heartCost: 1 });

describe('practice phase (P5) state', () => {
  it('every drill starts in practice, nothing passed yet', () => {
    expect(INITIAL_DRILL_PHASE).toEqual({ kind: 'practice', passes: 0, justPassed: false });
  });

  it('a practice pass is counted and can be retried as often as wanted', () => {
    let s: DrillPhase = INITIAL_DRILL_PHASE;
    s = drillPhaseReducer(s, { type: 'practice-passed' });
    expect(s).toEqual({ kind: 'practice', passes: 1, justPassed: true });
    s = drillPhaseReducer(s, { type: 'retry-practice' });
    expect(s).toEqual({ kind: 'practice', passes: 1, justPassed: false });
    s = drillPhaseReducer(s, { type: 'practice-passed' });
    expect(s).toMatchObject({ passes: 2, justPassed: true });
  });

  it('the graded attempt can start at any time, even without a practice pass, and is final', () => {
    const graded = drillPhaseReducer(INITIAL_DRILL_PHASE, { type: 'start-graded' });
    expect(graded).toEqual({ kind: 'graded' });
    expect(drillPhaseReducer(graded, { type: 'retry-practice' })).toBe(graded);
    expect(drillPhaseReducer(graded, { type: 'practice-passed' })).toBe(graded);
  });

  it('practice runs on one unlosable heart, whatever the learner has', () => {
    expect(practiceDrillOptions(30)).toEqual({ hearts: 1, timeoutSec: 30, heartCost: 0 });
  });
});

describe('penalties only apply in the graded attempt (P5)', { timeout: 60_000 }, () => {
  it('practice: timeouts cost nothing and the run never locks', () => {
    const drill = practiceDrill();
    const log = record(drill);
    drill.start(0);
    for (const t of [15_001, 30_002, 45_003, 60_004]) drill.tick(t);
    expect(log).toEqual([]);
    expect(drill.stats.heartsLost).toBe(0);
    expect(drill.snapshot(60_004)).toMatchObject({ hearts: 1, state: 'armed' });
  });

  it('practice: three wrong notes cost nothing, and the right note still passes on the same grading', () => {
    const drill = practiceDrill();
    const log = record(drill);
    drill.start(0);
    play(drill, [62, 64, 65].map((midi, i) => ({ midi, at: 0.5 + i })).concat([{ midi: 60, at: 3.6 }]), 4.4);
    expect(log).toEqual(['complete']);
    expect(drill.stats).toMatchObject({ heartsLost: 0, misses: 3, matches: 1 });
  });

  it('graded: the same timeout and the same three wrong notes do cost hearts', () => {
    const timeout = gradedDrill();
    const tLog = record(timeout);
    timeout.start(0);
    timeout.tick(15_001);
    expect(tLog).toEqual(['heart:timeout']);

    const misses = gradedDrill();
    const mLog = record(misses);
    misses.start(0);
    play(misses, [62, 64, 65].map((midi, i) => ({ midi, at: 0.5 + i })), 3.4);
    expect(mLog).toEqual(['heart:misses']);
    expect(misses.stats.heartsLost).toBe(1);
  });

  it('graded: nothing runs before the attempt is started, so no timer can expire early', () => {
    const drill = gradedDrill();
    const log = record(drill);
    drill.tick(60_000); // the practice phase may last a long time
    expect(log).toEqual([]);
    expect(drill.snapshot(60_000)).toMatchObject({ state: 'idle', hearts: 3, heartsLost: 0 });
    drill.start(60_000);
    drill.tick(74_000);
    expect(log).toEqual([]); // 14 s into the graded attempt
    drill.tick(75_001);
    expect(log).toEqual(['heart:timeout']);
  });
});
