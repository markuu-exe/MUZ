import { describe, expect, it } from 'vitest';
import { PostureHold } from '../PostureHold';

/** Push samples every 40 ms (25 Hz) from `from` to `to` (exclusive). */
function feed(hold: PostureHold, from: number, to: number, compliant: boolean | null): boolean {
  let finished = false;
  for (let t = from; t < to; t += 40) finished = hold.push(t, compliant) || finished;
  return finished;
}

describe('PostureHold', () => {
  it('completes after an unbroken hold', () => {
    const hold = new PostureHold({ holdMs: 5000 });
    expect(feed(hold, 0, 4990, true)).toBe(false);
    expect(hold.progress).toBeCloseTo(0.992, 2);
    expect(hold.push(5000, true)).toBe(true);
    expect(hold.done).toBe(true);
    expect(hold.postureScore).toBe(100);
  });

  it('forgives a lapse shorter than the grace period', () => {
    const hold = new PostureHold({ holdMs: 2000 });
    feed(hold, 0, 1000, true);
    feed(hold, 1000, 1300, false); // 300 ms wobble
    expect(feed(hold, 1300, 2100, true)).toBe(true);
  });

  it('resets after a longer lapse, and "not visible" counts as a lapse', () => {
    const hold = new PostureHold({ holdMs: 2000 });
    feed(hold, 0, 1500, true);
    feed(hold, 1500, 2200, null); // stepped out of frame for 700 ms
    expect(hold.heldMs).toBe(0);
    expect(feed(hold, 2200, 4100, true)).toBe(false);
    expect(feed(hold, 4100, 4300, true)).toBe(true);
  });

  it('scores only frames that could be evaluated', () => {
    const hold = new PostureHold({ holdMs: 60_000 });
    feed(hold, 0, 400, true); // 10 in band
    feed(hold, 400, 800, false); // 10 out of band
    feed(hold, 800, 1200, null); // not evaluable
    expect(hold.postureScore).toBe(50);
  });

  it('never completes while posture is wrong', () => {
    const hold = new PostureHold({ holdMs: 1000 });
    expect(feed(hold, 0, 10_000, false)).toBe(false);
    expect(hold.progress).toBe(0);
  });
});
