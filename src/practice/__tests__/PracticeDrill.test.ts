import { describe, expect, it } from 'vitest';
import { ChromaFrameProcessor } from '../../audio/dsp/ChromaFrameProcessor';
import { feed, renderPiano, type NoteEvent } from '../../audio/__tests__/fixtures';
import { COURSE_LESSONS } from '../../content';
import { EXERCISE_ENGINE } from '../../types/lesson.types';
import { drillTargets, PracticeDrill, targetLabel, type DrillTarget } from '../PracticeDrill';

const FS = 48000;

/** Play `events` into a drill. Posture is reported with every audio frame. */
function play(drill: PracticeDrill, events: NoteEvent[], durationSec: number, posture: boolean | null = true, startMs = 0) {
  const audio = renderPiano(events, { sampleRate: FS, durationSec, seed: 11, decaySec: 0.4 });
  const proc = new ChromaFrameProcessor(FS, (f) => {
    const tMs = startMs + f.time * 1000;
    drill.pushPosture(tMs, posture);
    drill.pushFrame({ tMs, chroma: f.chroma, voiced: f.voiced, ringing: f.ringing, onset: f.onset, onsetMs: startMs + f.onsetTime * 1000 });
  });
  feed(proc, audio, FS);
}

function record(drill: PracticeDrill) {
  const log: string[] = [];
  drill.on('stepDone', (e) => log.push(`step${e.index}`));
  drill.on('heartLost', (e) => log.push(`heart:${e.reason}`));
  drill.on('complete', () => log.push('complete'));
  drill.on('locked', () => log.push('locked'));
  return log;
}

const notes = (...midi: number[]): DrillTarget[] => midi.map((note) => ({ kind: 'note', note }));

describe('PracticeDrill', () => {
  it('a single note with good posture completes without losing hearts', () => {
    const drill = new PracticeDrill(notes(60), { hearts: 5, timeoutMs: 15000 });
    const log = record(drill);
    drill.start(0);
    play(drill, [{ midi: 60, at: 0.5 }], 1.2);
    expect(log).toEqual(['step0', 'complete']);
    expect(drill.stats).toMatchObject({ pitchAccuracy: 100, postureScore: 100, heartsLost: 0, matches: 1, misses: 0 });
    expect(drill.snapshot(1200)).toMatchObject({ complete: true, state: 'success', hearts: 5 });
  });

  it('walks a note sequence in order', () => {
    const drill = new PracticeDrill(notes(60, 62, 64), { hearts: 5, timeoutMs: 15000 });
    const log = record(drill);
    drill.start(0);
    play(drill, [60, 62, 64].map((midi, i) => ({ midi, at: 0.5 + i })), 3.4);
    expect(log).toEqual(['step0', 'step1', 'step2', 'complete']);
  });

  it('mixes notes and chords in one sequence', () => {
    const drill = new PracticeDrill([{ kind: 'note', note: 60 }, { kind: 'chord', chord: 'C' }], { hearts: 5, timeoutMs: 15000 });
    const log = record(drill);
    drill.start(0);
    play(drill, [{ midi: 60, at: 0.5 }, { midi: 60, at: 1.6 }, { midi: 64, at: 1.6 }, { midi: 67, at: 1.6 }], 2.6);
    expect(log).toEqual(['step0', 'step1', 'complete']);
  });

  it('a wrong note is reported with what was heard and does not advance', () => {
    const drill = new PracticeDrill(notes(60, 62), { hearts: 5, timeoutMs: 15000 });
    const log = record(drill);
    drill.start(0);
    play(drill, [{ midi: 65, at: 0.5 }], 1.2);
    expect(log).toEqual([]);
    expect(drill.snapshot(1200)).toMatchObject({ stepIndex: 0, lastAttempt: 'miss', lastHeard: 'F', consecutiveMisses: 1, hearts: 5 });
    expect(drill.stats.pitchAccuracy).toBe(0);
  });

  it('the right note with bad posture is blocked, not punished', () => {
    const drill = new PracticeDrill(notes(60), { hearts: 5, timeoutMs: 15000 });
    const log = record(drill);
    drill.start(0);
    play(drill, [{ midi: 60, at: 0.5 }], 1.4, false);
    expect(log).toEqual([]);
    expect(drill.snapshot(1400)).toMatchObject({ postureBlocked: true, hearts: 5, state: 'armed' });
    expect(drill.stats).toMatchObject({ pitchAccuracy: 100, postureScore: 0 });
  });

  it('a timeout costs a heart and re-arms the same step; hearts carry to the next step', () => {
    const drill = new PracticeDrill(notes(60, 62), { hearts: 2, timeoutMs: 1000 });
    const log = record(drill);
    drill.start(0);
    drill.tick(1001);
    expect(log).toEqual(['heart:timeout']);
    expect(drill.snapshot(1001)).toMatchObject({ hearts: 1, heartsLost: 1, stepIndex: 0, state: 'armed' });
    play(drill, [{ midi: 60, at: 0.3 }], 0.9, true, 1100);
    expect(log).toEqual(['heart:timeout', 'step0']);
    expect(drill.snapshot(2000)).toMatchObject({ hearts: 1, stepIndex: 1 });
  });

  it('locks when the last heart is lost', () => {
    const drill = new PracticeDrill(notes(60), { hearts: 1, timeoutMs: 1000 });
    const log = record(drill);
    drill.start(0);
    drill.tick(1000);
    expect(log).toEqual(['heart:timeout', 'locked']);
    expect(drill.snapshot(1000)).toMatchObject({ state: 'locked', hearts: 0 });
    expect(drill.stats.heartsLost).toBe(1);
  });

  it('starting with no hearts locks at once', () => {
    const drill = new PracticeDrill(notes(60), { hearts: 0, timeoutMs: 1000 });
    const log = record(drill);
    drill.start(0);
    expect(log).toEqual(['locked']);
  });

  it('pausing freezes the drill timer', () => {
    const drill = new PracticeDrill(notes(60), { hearts: 3, timeoutMs: 1000 });
    const log = record(drill);
    drill.start(0);
    drill.pause(400);
    drill.tick(5000);
    drill.resume(5000);
    expect(drill.snapshot(5000).remainingMs).toBe(600);
    drill.tick(5599);
    expect(log).toEqual([]);
    drill.tick(5600);
    expect(log).toEqual(['heart:timeout']);
  });

  it('every practice exercise in the course yields valid targets', () => {
    let count = 0;
    for (const lesson of COURSE_LESSONS) {
      for (const stage of lesson.payload.stages) {
        for (const ex of stage.exercises) {
          if (EXERCISE_ENGINE[ex.type] !== 'practice' || ex.type === 'posture-hold') continue;
          const targets = drillTargets(ex);
          expect(targets.length, `${lesson.id} ${ex.id}`).toBeGreaterThan(0);
          for (const t of targets) expect(targetLabel(t)).toMatch(/^[A-G]#?/);
          expect(() => new PracticeDrill(targets, { hearts: 5, timeoutMs: 15000 }).start(0)).not.toThrow();
          count++;
        }
      }
    }
    expect(count).toBe(48);
  });
});
