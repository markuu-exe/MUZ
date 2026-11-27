import { describe, expect, it } from 'vitest';
import { ChromaFrameProcessor } from '../../audio/dsp/ChromaFrameProcessor';
import { feed, renderPiano, type NoteEvent } from '../../audio/__tests__/fixtures';
import type { AcousticFrame, AcousticVerifier, AttemptResult } from '../../audio/practice/ChordVerifier';
import type { SongTarget } from '../songs';
import { WaitStepper, verifierForTarget, type WaitEvent } from '../wait';

const C: SongTarget = { kind: 'note', note: 60 };
const E: SongTarget = { kind: 'note', note: 64 };
const G: SongTarget = { kind: 'note', note: 67 };

/**
 * Fake verifier: an onset frame starts an attempt, decided on the next frame as a match when
 * that frame's `plays` is the target, a miss otherwise. Frames without an open attempt are ignored.
 */
type FakeFrame = AcousticFrame & { plays?: string };
const key = (t: SongTarget) => (t.kind === 'note' ? `n${t.note}` : `c${t.chord}`);
function fake(target: SongTarget): AcousticVerifier {
  let open = false;
  return {
    get isOpen() {
      return open;
    },
    reset() {
      open = false;
    },
    push(f: FakeFrame): AttemptResult | null {
      if (f.onset) {
        open = true;
        return null;
      }
      if (!open) return null;
      open = false;
      return { kind: f.plays === key(target) ? 'match' : 'miss', onsetMs: f.tMs, decidedMs: f.tMs, passRatio: 1, voicedRatio: 1, detail: null };
    },
  };
}

let t = 0;
const frame = (plays: string | undefined, onset: boolean): FakeFrame => ({
  tMs: (t += 10),
  voiced: plays !== undefined,
  onset,
  onsetMs: onset ? t : 0,
  chroma: new Float64Array(12),
  plays,
});
/** One strike: an onset frame, then a frame that sounds `plays`. */
const strike = (plays: string) => [frame(plays, true), frame(plays, false)];
/** A sound that keeps ringing (no new onset). */
const hold = (plays: string, n = 5) => Array.from({ length: n }, () => frame(plays, false));

function run(targets: SongTarget[], frames: FakeFrame[]) {
  const s = new WaitStepper(targets, fake);
  const events: WaitEvent[] = [];
  for (const f of frames) {
    const e = s.push(f);
    if (e) events.push(e);
  }
  return { s, events };
}

describe('wait-for-me stepper', () => {
  it('the right note advances exactly once', () => {
    const { s, events } = run([C, E], strike('n60'));
    expect(s.index).toBe(1);
    expect(events).toEqual([{ kind: 'advance', index: 0, firstTry: true }]);
  });

  it('a wrong note does not advance, and is reported', () => {
    const { s, events } = run([C, E], strike('n62'));
    expect(s.index).toBe(0);
    expect(events).toEqual([{ kind: 'wrong', index: 0, heard: null, heardTarget: false }]);
  });

  it('no input does not advance', () => {
    const { s, events } = run([C, E], [frame(undefined, false), frame(undefined, false)]);
    expect(s.index).toBe(0);
    expect(events).toEqual([]);
  });

  it('holding the note, or a later sound without a new strike, does not advance again', () => {
    // C then C: the first strike may only satisfy the first C.
    const { s } = run([C, C, E], [...strike('n60'), ...hold('n60')]);
    expect(s.index).toBe(1);
  });

  it('a retry after a wrong note advances, and the note is not marked first try', () => {
    const { s, events } = run([C, E], [...strike('n62'), ...strike('n60')]);
    expect(s.index).toBe(1);
    expect(events[events.length - 1]).toEqual({ kind: 'advance', index: 0, firstTry: false });
    expect(s.summary()).toMatchObject({ total: 2, firstTry: 0, wrong: 1 });
  });

  it('a miss whose clearest pitch was the target is flagged, not named as "that was C4"', () => {
    // Fake verifier that rejects the attempt but heard the target (e.g. C4 with another key held).
    const v: AcousticVerifier & { lastHeardMidi: number } = { ...fake({ kind: 'note', note: 61 }), lastHeardMidi: 60 };
    const s = new WaitStepper([C], () => v);
    const e = [...strike('n60')].map((f) => s.push(f)).find(Boolean);
    expect(e).toEqual({ kind: 'wrong', index: 0, heard: null, heardTarget: true });
  });

  it('a whole piece: done after the last note; further input changes nothing', () => {
    const { s, events } = run([C, E, G], [...strike('n60'), ...strike('n64'), ...strike('n65'), ...strike('n67'), ...strike('n60')]);
    expect(s.done).toBe(true);
    expect(events.filter((e) => e.kind === 'advance')).toHaveLength(3);
    expect(s.summary()).toEqual({ total: 3, firstTry: 2, wrong: 1, perEvent: [0, 0, 1] });
  });
});

describe('wait-for-me on real piano audio (lesson verifiers)', { timeout: 120_000 }, () => {
  function play(targets: SongTarget[], notes: NoteEvent[], durationSec: number, seed = 3) {
    const audio = renderPiano(notes, { sampleRate: 48000, durationSec, seed, decaySec: 0.6 });
    const s = new WaitStepper(targets, verifierForTarget);
    const events: WaitEvent[] = [];
    const proc = new ChromaFrameProcessor(48000, (f) => {
      const e = s.push({
        tMs: f.time * 1000,
        onset: f.onset,
        onsetMs: f.onset ? f.onsetTime * 1000 : 0,
        voiced: f.voiced,
        chroma: f.chroma,
        ringing: f.ringing,
        pitchHz: f.pitchHz,
        clarity: f.clarity,
      });
      if (e) events.push(e);
    });
    feed(proc, audio, 48000);
    return { s, events };
  }

  it('C E G played in order steps through; a wrong D in between only costs a retry', () => {
    const { s, events } = play(
      [C, E, G],
      [
        { midi: 60, at: 0.5 },
        { midi: 62, at: 1.3 }, // wrong: E expected
        { midi: 64, at: 2.1 },
        { midi: 67, at: 2.9 },
      ],
      4,
    );
    expect(s.done).toBe(true);
    expect(events.map((e) => e.kind)).toEqual(['advance', 'wrong', 'advance', 'advance']);
    // "You played X": the wrong attempt names what was heard.
    expect(events[1]).toMatchObject({ kind: 'wrong', index: 1, heard: 'D4' });
    expect(s.summary().perEvent).toEqual([0, 1, 0]);
  });

  it('a wrong chord does not advance a chord step; the right chord does', () => {
    const Cmaj: SongTarget = { kind: 'chord', chord: 'C' };
    const { s } = play([Cmaj], [62, 65, 69].map((midi) => ({ midi, at: 0.6 })), 2);
    expect(s.index).toBe(0);
    const ok = play([Cmaj], [60, 64, 67].map((midi) => ({ midi, at: 0.6 })), 2);
    expect(ok.s.done).toBe(true);
  });
});
