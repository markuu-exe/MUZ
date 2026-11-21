/**
 * AI-2: synthetic piano → in-memory WAV → readWav → downmix → evaluateClip,
 * which replays the clip through the unchanged ChromaFrameProcessor and the
 * live verifiers. The verdicts must agree with scenarios.test.ts / pitch.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { feed, renderPiano, type NoteEvent } from '../../__tests__/fixtures';
import { ChromaFrameProcessor } from '../../dsp/ChromaFrameProcessor';
import { clipVerdict, evaluateClip, parseTarget, replay, type VerifierId } from '../evaluateClip';
import { downmix, encodeWav, readWav } from '../wav';

const FS = 48000;

function clip(notes: NoteEvent[], durationSec: number, seed: number, fs = FS, stereo = false) {
  const mono = renderPiano(notes, { sampleRate: fs, durationSec, seed, snrDb: 30 });
  const bytes = encodeWav(stereo ? [mono, mono] : [mono], fs, 'pcm16');
  const wav = readWav(bytes);
  return { samples: downmix(wav.channels), sampleRate: wav.sampleRate };
}

function kinds(ev: ReturnType<typeof evaluateClip>, id: VerifierId): string[] {
  const run = ev.runs.find((r) => r.verifier === id);
  if (!run) throw new Error(`no ${id} run`);
  return run.attempts.map((a) => a.kind);
}

describe('parseTarget', () => {
  it('reads note targets as MIDI numbers or scientific names', () => {
    expect(parseTarget('note:69')).toEqual({ kind: 'note', midi: 69, label: 'A4' });
    expect(parseTarget('note:A4')).toEqual({ kind: 'note', midi: 69, label: 'A4' });
    expect(parseTarget('note:C#4')).toMatchObject({ midi: 61 });
    expect(parseTarget('note:Bb3')).toMatchObject({ midi: 58, label: 'A#3' });
    expect(parseTarget(' note:c4 ')).toMatchObject({ midi: 60 });
  });

  it('reads chord targets with the lesson chord parser', () => {
    const t = parseTarget('chord:Am');
    expect(t.kind).toBe('chord');
    expect(t.label).toBe('Am');
  });

  it('rejects malformed targets with a reason', () => {
    expect(() => parseTarget('A4')).toThrow(/note:.*chord:/);
    expect(() => parseTarget('note:H4')).toThrow(/note/);
    expect(() => parseTarget('note:200')).toThrow(/21.*108/);
    expect(() => parseTarget('chord:Xq')).toThrow(/chord/i);
  });
});

describe('evaluateClip on synthetic piano', { timeout: 60_000 }, () => {
  it('A4 played, target A4: PitchVerifier and chroma NoteVerifier both accept', () => {
    const { samples, sampleRate } = clip([{ midi: 69, at: 0.6 }], 1.6, 1);
    const ev = evaluateClip(samples, sampleRate, parseTarget('note:A4'));
    expect(ev.runs.map((r) => r.verifier)).toEqual(['pitch', 'chroma-note']);
    expect(kinds(ev, 'pitch')).toEqual(['match']);
    expect(kinds(ev, 'chroma-note')).toEqual(['match']);
    const a = ev.runs[0].attempts[0];
    expect(a.lastHeard).toBe('A4');
    expect(a.latencyMs).toBe(a.decidedMs - a.onsetMs);
    expect(a.latencyMs).toBeGreaterThanOrEqual(200);
    expect(a.latencyMs).toBeLessThan(400);
    expect(Math.abs(a.onsetMs - 600)).toBeLessThan(40);
    expect(ev.runs[1].attempts[0].lastHeard).toBe('A');
  });

  it('A3 played, target A4: PitchVerifier rejects (octave), chroma NoteVerifier accepts', () => {
    const { samples, sampleRate } = clip([{ midi: 57, at: 0.6 }], 1.6, 2);
    const ev = evaluateClip(samples, sampleRate, parseTarget('note:A4'));
    expect(kinds(ev, 'pitch')).toEqual(['miss']);
    expect(ev.runs[0].attempts[0].lastHeard).toBe('A3');
    expect(kinds(ev, 'chroma-note')).toEqual(['match']);
  });

  it('C major played (stereo file), target C: ChordVerifier accepts; only the chord verifier runs', () => {
    const { samples, sampleRate } = clip([60, 64, 67].map((midi) => ({ midi, at: 0.6 })), 1.6, 3, 44100, true);
    expect(sampleRate).toBe(44100);
    const ev = evaluateClip(samples, sampleRate, parseTarget('chord:C'));
    expect(ev.runs.map((r) => r.verifier)).toEqual(['chord']);
    expect(kinds(ev, 'chord')).toEqual(['match']);
    expect(ev.runs[0].attempts[0].lastHeard).toBe('C');
  });

  it('F major played, target C: ChordVerifier rejects and names what it heard', () => {
    const { samples, sampleRate } = clip([53, 57, 60].map((midi) => ({ midi, at: 0.6 })), 1.6, 31);
    const ev = evaluateClip(samples, sampleRate, parseTarget('chord:C'));
    expect(kinds(ev, 'chord')).toEqual(['miss']);
    expect(ev.runs[0].attempts[0].lastHeard).toBe('F');
  });

  it('collects every attempt in a clip, not only the first', () => {
    const { samples, sampleRate } = clip([{ midi: 69, at: 0.6 }, { midi: 57, at: 2.4 }], 3.4, 5);
    const ev = evaluateClip(samples, sampleRate, parseTarget('note:A4'));
    expect(ev.onsetsMs).toHaveLength(2);
    expect(kinds(ev, 'pitch')).toEqual(['match', 'miss']);
    expect(kinds(ev, 'chroma-note')).toEqual(['match', 'match']);
    expect(ev.runs[0].attempts[1].onsetMs).toBeGreaterThan(2300);
  });

  it('silence: no onset, no attempt (not a miss)', () => {
    const silent = readWav(encodeWav([new Float32Array(FS * 2)], FS, 'pcm16'));
    for (const target of ['note:C4', 'chord:Am']) {
      const ev = evaluateClip(downmix(silent.channels), silent.sampleRate, parseTarget(target));
      expect(ev.onsetsMs).toEqual([]);
      for (const run of ev.runs) {
        expect(run.attempts).toEqual([]);
        expect(clipVerdict(run)).toBe('no attempt');
      }
    }
  });

  it('flags an attempt still open when the clip ends', () => {
    const { samples, sampleRate } = clip([{ midi: 69, at: 0.6 }], 0.7, 7);
    const ev = evaluateClip(samples, sampleRate, parseTarget('note:A4'));
    expect(ev.runs[0].attempts).toEqual([]);
    expect(ev.runs[0].openAtEnd).toBe(true);
    expect(clipVerdict(ev.runs[0])).toBe('no attempt');
  });

  it('replay emits the same frames as feeding ChromaFrameProcessor in 128-sample quanta', () => {
    const { samples } = clip([{ midi: 60, at: 0.3 }], 0.8, 9);
    const got: Array<[number, boolean, boolean, number | null]> = [];
    replay(samples, FS, (f) => got.push([f.tMs, f.onset, f.voiced, f.pitchHz ?? null]));
    const want: typeof got = [];
    feed(new ChromaFrameProcessor(FS, (f) => want.push([f.time * 1000, f.onset, f.voiced, f.pitchHz])), samples, FS);
    expect(got).toEqual(want);
  });
});

describe('clipVerdict', () => {
  const at = (kind: 'match' | 'miss' | 'unvoiced') => ({
    kind, onsetMs: 0, decidedMs: 200, latencyMs: 200, lastHeard: null, passRatio: 0, voicedRatio: 0,
  });
  it('is accepted / rejected from the first judged attempt; unvoiced attempts are ignored', () => {
    expect(clipVerdict({ verifier: 'pitch', attempts: [at('unvoiced'), at('match')], openAtEnd: false })).toBe('accepted');
    expect(clipVerdict({ verifier: 'pitch', attempts: [at('miss'), at('match')], openAtEnd: false })).toBe('rejected');
    expect(clipVerdict({ verifier: 'pitch', attempts: [at('unvoiced')], openAtEnd: false })).toBe('no attempt');
  });
});
