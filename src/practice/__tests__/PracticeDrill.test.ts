import { describe, expect, it } from 'vitest';
import { ChromaFrameProcessor } from '../../audio/dsp/ChromaFrameProcessor';
import { feed, renderPiano, type NoteEvent } from '../../audio/__tests__/fixtures';
import { COURSE_LESSONS } from '../../content';
import { EXERCISE_ENGINE } from '../../types/lesson.types';
import type { AcousticFrame, AcousticVerifier, AttemptResult } from '../../audio/practice/ChordVerifier';
import { DEFAULT_PRACTICE_CONFIG } from '../../audio/config';
import { drillTargets, PracticeDrill, targetLabel, type DrillTarget } from '../PracticeDrill';

const FS = 48000;

/** Play `events` into a drill. Posture is reported with every audio frame. */
function play(drill: PracticeDrill, events: NoteEvent[], durationSec: number, posture: boolean | null = true, startMs = 0) {
  const audio = renderPiano(events, { sampleRate: FS, durationSec, seed: 11, decaySec: 0.4 });
  const proc = new ChromaFrameProcessor(FS, (f) => {
    const tMs = startMs + f.time * 1000;
    drill.pushPosture(tMs, posture);
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
  drill.on('stepDone', (e) => log.push(`step${e.index}`));
  drill.on('heartLost', (e) => log.push(`heart:${e.reason}`));
  drill.on('complete', () => log.push('complete'));
  drill.on('locked', () => log.push('locked'));
  return log;
}

const notes = (...midi: number[]): DrillTarget[] => midi.map((note) => ({ kind: 'note', note }));

describe('PracticeDrill', { timeout: 60_000 }, () => {
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
    expect(drill.snapshot(1200)).toMatchObject({ stepIndex: 0, lastAttempt: 'miss', lastHeard: 'F4', consecutiveMisses: 1, hearts: 5 });
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

/**
 * T-08 part 2: the single-note verifier is injectable so the pitchy PitchVerifier
 * (T-07, contract C2) can replace the chroma NoteVerifier without touching the drill.
 * C2: `new PitchVerifier(targetMidi, config?)` implements AcousticVerifier and exposes
 * `lastHeardMidi` (−1 if none). This double follows that shape and returns a scripted
 * verdict on each onset; it is not a pitch detector.
 */
class ScriptedPitchVerifier implements AcousticVerifier {
  static created: number[] = [];
  lastHeardMidi = -1;
  private open = false;
  constructor(
    readonly targetMidi: number,
    private readonly verdict: { kind: 'match' | 'miss'; heardMidi: number },
  ) {
    ScriptedPitchVerifier.created.push(targetMidi);
  }
  get isOpen(): boolean {
    return this.open;
  }
  reset(): void {
    this.open = false;
  }
  push(frame: AcousticFrame): AttemptResult | null {
    if (!frame.onset) return null;
    this.lastHeardMidi = this.verdict.heardMidi;
    return { kind: this.verdict.kind, onsetMs: frame.onsetMs, decidedMs: frame.tMs, passRatio: 1, voicedRatio: 1, detail: null };
  }
}

function strike(drill: PracticeDrill, tMs: number) {
  drill.pushPosture(tMs, true);
  drill.pushFrame({ tMs, chroma: new Float32Array(12), voiced: true, onset: true, onsetMs: tMs });
}

describe('PracticeDrill single-note verifier seam (T-08)', { timeout: 60_000 }, () => {
  it('uses the injected verifier for note targets and names the heard note with its octave', () => {
    ScriptedPitchVerifier.created = [];
    const drill = new PracticeDrill(notes(69), {
      hearts: 5,
      timeoutMs: 15000,
      createNoteVerifier: (midi) => new ScriptedPitchVerifier(midi, { kind: 'miss', heardMidi: 57 }),
    });
    const log = record(drill);
    drill.start(0);
    strike(drill, 500);
    expect(ScriptedPitchVerifier.created).toEqual([69]);
    expect(log).toEqual([]);
    // An octave error: the chroma verifier would have said "A" (and passed it); a pitch verifier says A3.
    expect(drill.snapshot(600)).toMatchObject({ stepIndex: 0, lastAttempt: 'miss', lastHeard: 'A3', consecutiveMisses: 1 });
  });

  it('does not use the note verifier factory for chord targets', () => {
    ScriptedPitchVerifier.created = [];
    const drill = new PracticeDrill([{ kind: 'chord', chord: 'C' }], {
      hearts: 5,
      timeoutMs: 15000,
      createNoteVerifier: (midi) => new ScriptedPitchVerifier(midi, { kind: 'match', heardMidi: midi }),
    });
    drill.start(0);
    expect(ScriptedPitchVerifier.created).toEqual([]);
  });

  it('uses the pitchy PitchVerifier by default: a played A3 against an A4 target is a miss', () => {
    expect(DEFAULT_PRACTICE_CONFIG.useChromaNoteVerifier).toBe(false);
    const drill = new PracticeDrill(notes(69), { hearts: 5, timeoutMs: 15000 });
    const log = record(drill);
    drill.start(0);
    play(drill, [{ midi: 57, at: 0.5 }], 1.2);
    expect(log).toEqual([]);
    expect(drill.snapshot(1200)).toMatchObject({ stepIndex: 0, lastAttempt: 'miss', lastHeard: 'A3', consecutiveMisses: 1 });
  });

  it('with the default PitchVerifier, A4 at +30 cents passes and at +40 cents misses', () => {
    const at30 = new PracticeDrill(notes(69), { hearts: 5, timeoutMs: 15000 });
    const log30 = record(at30);
    at30.start(0);
    hold(at30, 440 * 2 ** (30 / 1200), 0.95, 500);
    expect(log30).toEqual(['step0', 'complete']);

    const at40 = new PracticeDrill(notes(69), { hearts: 5, timeoutMs: 15000 });
    const log40 = record(at40);
    at40.start(0);
    hold(at40, 440 * 2 ** (40 / 1200), 0.95, 500);
    expect(log40).toEqual([]);
    expect(at40.snapshot(1000)).toMatchObject({ lastAttempt: 'miss', lastHeard: 'A4' });
  });

  it('keeps the chroma NoteVerifier behind useChromaNoteVerifier for the T-19 comparison', () => {
    const drill = new PracticeDrill(notes(69), { hearts: 5, timeoutMs: 15000, useChromaNoteVerifier: true });
    const log = record(drill);
    drill.start(0);
    play(drill, [{ midi: 57, at: 0.5 }], 1.2);
    // Pitch class only: the wrong octave passes, which is why it is no longer the default.
    expect(log).toEqual(['step0', 'complete']);
  });

  it('labels note targets with their octave, since the octave is now checked', () => {
    expect(targetLabel({ kind: 'note', note: 60 })).toBe('C4');
    expect(targetLabel({ kind: 'note', note: 61 })).toBe('C#4');
    expect(targetLabel({ kind: 'chord', chord: 'Am' })).toBe('Am');
  });
});

/** Sustained frames at a fixed f0 after one onset at `startMs` (≈ 430 ms, past the miss decision). */
function hold(drill: PracticeDrill, pitchHz: number, clarity: number, startMs: number) {
  // A clean single note: its pitch class dominates the chroma (PitchVerifier cross-checks it).
  const chroma = new Float32Array(12);
  chroma[((Math.round(69 + 12 * Math.log2(pitchHz / 440)) % 12) + 12) % 12] = 1;
  for (let i = 0; i < 40; i++) {
    const tMs = startMs + i * 10.7;
    drill.pushPosture(tMs, true);
    drill.pushFrame({ tMs, chroma, voiced: true, onset: i === 0, onsetMs: startMs, pitchHz, clarity });
  }
}
