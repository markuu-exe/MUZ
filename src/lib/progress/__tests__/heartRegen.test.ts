import { describe, expect, it } from 'vitest';
import {
  HEART_REGEN_MS,
  msUntilNextHeart,
  nextHeartUpdateTimestamp,
  parseHeartAnchor,
  regenStep,
} from '../heartRegen';

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

describe('parseHeartAnchor', () => {
  it('parses valid ISO timestamps and rejects missing or malformed values', () => {
    expect(parseHeartAnchor('2026-11-27T07:30:00.000Z')).toBe(Date.parse('2026-11-27T07:30:00.000Z'));
    expect(parseHeartAnchor(null)).toBeNull();
    expect(parseHeartAnchor(undefined)).toBeNull();
    expect(parseHeartAnchor('not-a-date')).toBeNull();
  });
});

describe('nextHeartUpdateTimestamp', () => {
  const OLD = '2026-11-27T07:00:00.000Z';
  const NOW = '2026-11-27T07:10:00.000Z';

  it('clears the timer when hearts reach 5', () => {
    expect(nextHeartUpdateTimestamp(4, 5, OLD, NOW)).toBeNull();
    expect(nextHeartUpdateTimestamp(5, 5, null, NOW)).toBeNull();
  });

  it('starts a new timer when dropping from 5 or when no valid prior anchor exists', () => {
    expect(nextHeartUpdateTimestamp(5, 4, null, NOW)).toBe(NOW);
    expect(nextHeartUpdateTimestamp(3, 2, null, NOW)).toBe(NOW);
    expect(nextHeartUpdateTimestamp(3, 2, 'bad-iso', NOW)).toBe(NOW);
  });

  it('preserves an existing active timer when losing another heart below 5', () => {
    expect(nextHeartUpdateTimestamp(4, 3, OLD, NOW)).toBe(OLD);
    expect(nextHeartUpdateTimestamp(2, 0, OLD, NOW)).toBe(OLD);
  });
});
