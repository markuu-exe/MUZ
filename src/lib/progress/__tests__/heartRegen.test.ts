import { describe, expect, it } from 'vitest';
import { HEART_REGEN_MS, msUntilNextHeart, regenStep } from '../heartRegen';

const P = HEART_REGEN_MS;
const T0 = 1_000_000;

describe('regenStep', () => {
  it('is 15 minutes per heart', () => {
    expect(P).toBe(15 * 60 * 1000);
  });

  it('full hearts: nothing to regenerate and no timer', () => {
    expect(regenStep({ hearts: 5, anchorMs: T0 }, T0 + 10 * P)).toEqual({ hearts: 5, anchorMs: null, gained: 0 });
  });

  it('below full with no timer yet: starts the timer now, gains nothing', () => {
    expect(regenStep({ hearts: 2, anchorMs: null }, T0)).toEqual({ hearts: 2, anchorMs: T0, gained: 0 });
  });

  it('gains one heart per whole period and keeps the leftover time', () => {
    expect(regenStep({ hearts: 1, anchorMs: T0 }, T0 + 2 * P + 1000)).toEqual({
      hearts: 3,
      anchorMs: T0 + 2 * P,
      gained: 2,
    });
  });

  it('nothing changes before the first period ends', () => {
    expect(regenStep({ hearts: 3, anchorMs: T0 }, T0 + P - 1)).toEqual({ hearts: 3, anchorMs: T0, gained: 0 });
  });

  it('stops at 5 and clears the timer, however long the learner was away', () => {
    expect(regenStep({ hearts: 0, anchorMs: T0 }, T0 + 100 * P)).toEqual({ hearts: 5, anchorMs: null, gained: 5 });
  });

  it('a timer in the future (clock moved back) restarts from now', () => {
    expect(regenStep({ hearts: 2, anchorMs: T0 + P }, T0)).toEqual({ hearts: 2, anchorMs: T0, gained: 0 });
  });
});

describe('msUntilNextHeart', () => {
  it('counts down from the timer', () => {
    expect(msUntilNextHeart({ hearts: 2, anchorMs: T0 }, T0 + 60_000)).toBe(P - 60_000);
  });
  it('is 0 when hearts are full', () => {
    expect(msUntilNextHeart({ hearts: 5, anchorMs: null }, T0)).toBe(0);
  });
  it('is a full period when the timer has not started', () => {
    expect(msUntilNextHeart({ hearts: 4, anchorMs: null }, T0)).toBe(P);
  });
  it('never exceeds a full period when the clock read is older than the timer start', () => {
    expect(msUntilNextHeart({ hearts: 4, anchorMs: T0 + 5000 }, T0)).toBe(P);
  });
});
