import { describe, expect, it } from 'vitest';
import { FRAMED_AFTER_MS, FramingTracker, LOST_AFTER_MS } from '../framing';

function feed(t: FramingTracker, from: number, to: number, compliant: boolean | null, step = 100) {
  let s = t.current;
  for (let ms = from; ms <= to; ms += step) s = t.push(ms, compliant);
  return s;
}

describe('FramingTracker', () => {
  it('starts searching and stays there while the arm is not visible', () => {
    const t = new FramingTracker();
    expect(feed(t, 0, 5000, null)).toBe('searching');
  });

  it('becomes framed only after the arm has been judgeable for a while', () => {
    const t = new FramingTracker();
    expect(t.push(0, true)).toBe('searching');
    expect(t.push(FRAMED_AFTER_MS - 1, false)).toBe('searching');
    expect(t.push(FRAMED_AFTER_MS, true)).toBe('framed');
  });

  it('a short gap does not reset an earlier sighting into framed, but restarts the wait', () => {
    const t = new FramingTracker();
    t.push(0, true);
    t.push(500, null);
    expect(t.push(FRAMED_AFTER_MS + 100, true)).toBe('searching');
    expect(t.push(FRAMED_AFTER_MS + 100 + FRAMED_AFTER_MS, true)).toBe('framed');
  });

  it('a brief occlusion while framed does not count as lost', () => {
    const t = new FramingTracker();
    feed(t, 0, 1000, true);
    expect(feed(t, 1100, 1100 + LOST_AFTER_MS - 200, null)).toBe('framed');
  });

  it('goes lost after a long gap, and back to framed when visible again', () => {
    const t = new FramingTracker();
    feed(t, 0, 1000, true);
    expect(feed(t, 1100, 1100 + LOST_AFTER_MS, null)).toBe('lost');
    expect(feed(t, 3000, 3000 + FRAMED_AFTER_MS, false)).toBe('framed');
  });
});
