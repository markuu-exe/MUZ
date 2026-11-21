import { describe, expect, it } from 'vitest';
import type { AttemptKind } from '../../practice/ChordVerifier';
import type { EvalAttempt, VerifierRun } from '../evaluateClip';
import { countClip, formatReport, percentile, strikesWarning, summarise, type ClipReport } from '../summary';

function att(kind: AttemptKind, latencyMs = 210, onsetMs = 600): EvalAttempt {
  return { kind, onsetMs, decidedMs: onsetMs + latencyMs, latencyMs, lastHeard: null, passRatio: 1, voicedRatio: 1 };
}

describe('countClip', () => {
  it('counts every judged attempt; unvoiced ones are not attempts', () => {
    expect(countClip([att('match'), att('miss'), att('unvoiced'), att('match')], null)).toEqual({
      accepted: 2, rejected: 1, noAttempt: 0, extra: 0,
    });
  });

  it('a clip with no judged attempt is one "no attempt" when strikes is not given', () => {
    expect(countClip([], null)).toEqual({ accepted: 0, rejected: 0, noAttempt: 1, extra: 0 });
    expect(countClip([att('unvoiced')], null)).toEqual({ accepted: 0, rejected: 0, noAttempt: 1, extra: 0 });
  });

  it('with strikes, unheard strikes are "no attempt" and surplus attempts are reported as extra', () => {
    expect(countClip([att('match'), att('match')], 5)).toEqual({ accepted: 2, rejected: 0, noAttempt: 3, extra: 0 });
    expect(countClip([att('match'), att('miss'), att('match')], 2)).toEqual({ accepted: 2, rejected: 1, noAttempt: 0, extra: 1 });
  });
});

describe('percentile (nearest rank)', () => {
  it('matches hand-computed values', () => {
    const v = [250, 210, 220, 230, 240, 200, 260, 270, 280, 290];
    expect(percentile(v, 50)).toBe(240);
    expect(percentile(v, 95)).toBe(290);
    expect(percentile(v, 100)).toBe(290);
    expect(percentile([7], 95)).toBe(7);
    expect(percentile([], 50)).toBeNaN();
  });
});

describe('summarise', () => {
  it('builds the confusion counts; latency is over true accepts only (no false accepts)', () => {
    const s = summarise('pitch', [
      { expected: 'correct', strikes: null, attempts: [att('match', 200)] },
      { expected: 'correct', strikes: null, attempts: [att('match', 220)] },
      { expected: 'correct', strikes: null, attempts: [att('miss', 350)] },
      { expected: 'correct', strikes: null, attempts: [] },
      { expected: 'wrong', strikes: null, attempts: [att('miss', 350)] },
      { expected: 'wrong', strikes: null, attempts: [att('match', 300)] },
      { expected: 'wrong', strikes: 2, attempts: [att('unvoiced')] },
    ]);
    expect(s.correct).toEqual({ accepted: 2, rejected: 1, noAttempt: 1, n: 4 });
    expect(s.wrong).toEqual({ accepted: 1, rejected: 1, noAttempt: 2, n: 4 });
    expect(s.latency).toEqual({ n: 2, p50: 200, p95: 220, max: 220 });
    expect(s.extraAttempts).toBe(0);
  });

  it('has no latency when nothing was accepted', () => {
    expect(summarise('pitch', [{ expected: 'wrong', strikes: null, attempts: [att('match')] }]).latency).toBeNull();
    expect(summarise('chord', [{ expected: 'wrong', strikes: null, attempts: [att('miss')] }]).latency).toBeNull();
  });
});

describe('formatReport', () => {
  const run = (verifier: VerifierRun['verifier'], attempts: EvalAttempt[]): VerifierRun => ({ verifier, attempts, openAtEnd: false });
  const clip = (line: number, expected: 'correct' | 'wrong', runs: VerifierRun[]): ClipReport => ({
    line, file: `clip${line}.wav`, target: 'note:A4', expected, strikes: null, notes: '',
    sampleRate: 48000, channels: 1, durationMs: 1600, onsetsMs: [600], warnings: [], runs,
  });

  it('prints a confusion table per verifier with rates, n, latency and a per-clip list', () => {
    const text = formatReport([
      clip(2, 'correct', [run('pitch', [att('match', 213)]), run('chroma-note', [att('match', 213)])]),
      clip(3, 'wrong', [run('pitch', [att('miss', 352)]), run('chroma-note', [att('match', 224)])]),
    ]);
    expect(text).toContain('pitch');
    expect(text).toContain('chroma-note');
    expect(text).not.toMatch(/^== chord/m);
    expect(text).toMatch(/correct played\s+n=1\s+true accept\s+1\s+100\.0 %[\s|]+false reject\s+0\s+0\.0 %[\s|]+no attempt\s+0\s+0\.0 %/);
    expect(text).toMatch(/wrong played\s+n=1\s+true reject\s+0\s+0\.0 %[\s|]+FALSE ACCEPT\s+1\s+100\.0 %/);
    // chroma-note's 224 ms accept was on the wrong clip (a false accept), so it is not in the latency.
    expect(text).toMatch(/latency onset→verdict, 1 true accept: p50 213 ms, p95 213 ms, max 213 ms/);
    expect(text).toMatch(/clip3\.wav/);
    expect(text).toMatch(/miss\s+@600 ms\s+\+352 ms/);
  });

  it('shows a dash for rates when there are no clips of a kind', () => {
    const text = formatReport([clip(2, 'correct', [run('pitch', [att('match')]), run('chroma-note', [att('match')])])]);
    expect(text).toMatch(/wrong played\s+n=0\s+true reject\s+0\s+–/);
  });
});

describe('strikesWarning (review of AI-2: multi-strike clips need a strikes count)', () => {
  it('is silent for a single-strike clip or when strikes is given', () => {
    expect(strikesWarning(null, 1, 1, false)).toBeNull();
    expect(strikesWarning(null, 0, 0, false)).toBeNull();
    expect(strikesWarning(20, 15, 15, true)).toBeNull();
  });

  it('warns when a clip without strikes has several onsets, several judged attempts or an open attempt', () => {
    expect(strikesWarning(null, 3, 3, false)).toMatch(/3 onsets.*strikes/);
    expect(strikesWarning(null, 1, 2, false)).toMatch(/2 judged attempts.*strikes/);
    expect(strikesWarning(null, 1, 0, true)).toMatch(/still open.*strikes/);
  });
});
