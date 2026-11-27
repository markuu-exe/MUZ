import { describe, expect, it } from 'vitest';
import { barsOf, loopRange, sliceSong } from '../loop';
import { songPlan } from '../plan';
import { getSong, songLengthBeats } from '../songs';

const twinkle = getSong('twinkle')!; // 4/4: C C G G | A A G- | F F E E | D D C-

describe('loop the bars you missed', () => {
  it('maps event indices to their bars', () => {
    expect(barsOf(twinkle, [0, 5, 7, 8, 13])).toEqual([0, 1, 2, 3]);
    expect(barsOf(twinkle, [])).toEqual([]);
  });

  it('loops the first run of missed bars, at most four bars long', () => {
    expect(loopRange([2, 3])).toEqual({ from: 2, to: 3 });
    expect(loopRange([1])).toEqual({ from: 1, to: 1 });
    expect(loopRange([0, 1, 2, 3, 4, 5], 4)).toEqual({ from: 0, to: 3 });
    // A one-bar gap between misses is kept in the loop; the passage stays musical.
    expect(loopRange([1, 3])).toEqual({ from: 1, to: 3 });
    expect(loopRange([])).toBeNull();
  });

  it('slices whole bars and starts them at beat 0', () => {
    const s = sliceSong(twinkle, 2, 3);
    expect(s.events.map((e) => e.beat)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(s.events.map((e) => (e.target.kind === 'note' ? e.target.note : 0))).toEqual([65, 65, 64, 64, 62, 62, 60]);
    expect(songLengthBeats(s)).toBe(8);
    expect(s.id).toBe('twinkle@2-3');
    // The plan of a slice is a normal plan: count-in, then the bars.
    expect(songPlan(s).targets).toHaveLength(7);
  });

  it('a chord held across the end of the slice is cut at the slice end', () => {
    const s = sliceSong(getSong('turnaround')!, 0, 0); // Dm7 2, G7 2 | Cmaj7 4 …
    expect(s.events.map((e) => [e.beat, e.length])).toEqual([
      [0, 2],
      [2, 2],
    ]);
  });
});
