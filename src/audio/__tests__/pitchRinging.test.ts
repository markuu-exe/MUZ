/**
 * Owner hardware report 2026-11-28: in Twinkle, F4 was hardly ever heard (it worked as an F4+F5
 * octave). F4 is the note struck right after the held G4. With a neighbouring note still
 * ringing, pitchy measures the mix (e.g. ~384 Hz for F4 over G4), so the ±35-cent pitch check
 * failed even though the ringing-subtracted chroma clearly held the new F. Often the strike
 * was not even detected: the level rose < 2 dB, or a hop after the flux peak (onset gate in
 * ChromaFrameProcessor).
 */
import { describe, expect, it } from 'vitest';
import { ChromaFrameProcessor } from '../dsp/ChromaFrameProcessor';
import { PitchVerifier } from '../notes/PitchVerifier';
import type { AttemptResult } from '../practice/ChordVerifier';
import { feed, renderPiano } from './fixtures';

/** Strike `prev` (left ringing), then `played`, and report the attempt for `target` decided after the second strike. */
function attempt(prev: number, played: number, target: number, seed: number, decaySec: number): AttemptResult['kind'] | 'none' {
  const audio = renderPiano(
    [
      { midi: prev, at: 0.4 },
      { midi: played, at: 1.2 },
    ],
    { sampleRate: 48000, durationSec: 2.2, seed, decaySec },
  );
  const v = new PitchVerifier(target);
  let result: AttemptResult['kind'] | 'none' = 'none';
  const proc = new ChromaFrameProcessor(48000, (f) => {
    const r = v.push({ tMs: f.time * 1000, onset: f.onset, onsetMs: f.onset ? f.onsetTime * 1000 : 0, voiced: f.voiced, chroma: f.chroma, ringing: f.ringing, pitchHz: f.pitchHz, clarity: f.clarity });
    if (r && f.time > 1.2) result = r.kind;
  });
  feed(proc, audio, 48000);
  return result;
}

const SEEDS: Array<[number, number]> = [
  [1, 0.6],
  [3, 1.5],
  [5, 1.5],
];

describe('a note struck while its neighbour still rings', { timeout: 120_000 }, () => {
  it.each([
    ['F4 after G4 (Twinkle)', 67, 65],
    ['E4 after F4', 65, 64],
    ['D4 after E4', 64, 62],
  ])('%s is heard', (_label, prev, target) => {
    for (const [seed, decay] of SEEDS) expect(attempt(prev, target, target, seed, decay)).toBe('match');
  });

  it('a wrong neighbour is still a miss (E4 struck for F4 while G4 rings)', () => {
    for (const [seed, decay] of SEEDS) expect(attempt(67, 64, 65, seed, decay)).not.toBe('match');
  });

  it('a ringing note does not stand in for a different new note (G4 struck for F4 while F4 rings)', () => {
    for (const [seed, decay] of SEEDS) expect(attempt(65, 67, 65, seed, decay)).not.toBe('match');
  });

  // Known limit (unchanged by this fix): C5 struck while C4 still rings counts for C4. Chroma
  // folds octaves and the pitch reading is dominated by the ringing C4, so nothing measured
  // here tells the two apart. From silence, the wrong octave is a miss (pitch.test.ts).
});
