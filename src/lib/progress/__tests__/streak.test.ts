import { describe, expect, it } from 'vitest';
import { daysBetween, displayedStreak, nextStreak, toLocalDate } from '../streak';

describe('toLocalDate', () => {
  it('formats the local calendar date as YYYY-MM-DD', () => {
    expect(toLocalDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toLocalDate(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31');
  });
});

describe('daysBetween', () => {
  it('counts whole calendar days, across month and year ends', () => {
    expect(daysBetween('2026-11-15', '2026-11-15')).toBe(0);
    expect(daysBetween('2026-11-15', '2026-11-16')).toBe(1);
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
  });

  it('accepts a full ISO timestamp by reading its date part', () => {
    expect(daysBetween('2026-11-15T22:10:00.000Z', '2026-11-16')).toBe(1);
  });
});

describe('nextStreak (after a finished lesson)', () => {
  it('starts at 1 with no previous activity', () => {
    expect(nextStreak(0, null, '2026-11-16')).toBe(1);
  });
  it('keeps the streak for a second lesson on the same day', () => {
    expect(nextStreak(4, '2026-11-16', '2026-11-16')).toBe(4);
  });
  it('a same-day lesson never leaves the streak at 0', () => {
    expect(nextStreak(0, '2026-11-16', '2026-11-16')).toBe(1);
  });
  it('adds one for consecutive days', () => {
    expect(nextStreak(4, '2026-11-15', '2026-11-16')).toBe(5);
  });
  it('resets to 1 after a missed day', () => {
    expect(nextStreak(9, '2026-11-13', '2026-11-16')).toBe(1);
  });
  it('treats a last-activity date in the future (clock change) as today', () => {
    expect(nextStreak(3, '2026-11-17', '2026-11-16')).toBe(3);
  });
});

describe('displayedStreak (dashboard, before today’s lesson)', () => {
  it('shows the stored streak while it is still alive (today or yesterday)', () => {
    expect(displayedStreak(5, '2026-11-16', '2026-11-16')).toBe(5);
    expect(displayedStreak(5, '2026-11-15', '2026-11-16')).toBe(5);
  });
  it('shows 0 once a day has been missed, or with no activity', () => {
    expect(displayedStreak(5, '2026-11-14', '2026-11-16')).toBe(0);
    expect(displayedStreak(5, null, '2026-11-16')).toBe(0);
  });
});
