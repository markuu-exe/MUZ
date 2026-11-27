import { describe, expect, it } from 'vitest';
import { dailyGoalMet, weekStartIso, weeklySummary } from '../weekly';

// Local times throughout, so the test means the same in any timezone.
const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min);
const NOW = at(2026, 11, 27, 18); // Friday

describe('daily goal (finish one lesson today, same record as the streak)', () => {
  it('is met when the last activity is today', () => {
    expect(dailyGoalMet('2026-11-27', NOW)).toBe(true);
  });
  it('is not met for yesterday, no history, or a future date', () => {
    expect(dailyGoalMet('2026-11-26', NOW)).toBe(false);
    expect(dailyGoalMet(null, NOW)).toBe(false);
    expect(dailyGoalMet(undefined, NOW)).toBe(false);
    expect(dailyGoalMet('2026-11-28', NOW)).toBe(false);
  });
  it('rolls over at local midnight', () => {
    expect(dailyGoalMet('2026-11-27', at(2026, 11, 27, 23, 59))).toBe(true);
    expect(dailyGoalMet('2026-11-27', at(2026, 11, 28, 0, 1))).toBe(false);
  });
});

describe('weekly summary (last 7 local days)', () => {
  it('empty history: seven empty days ending today, nothing active', () => {
    const s = weeklySummary([], NOW, null);
    expect(s.days.map((d) => d.date)).toEqual(['2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27']);
    expect(s.days.map((d) => d.label)).toEqual(['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    expect(s.days[6].isToday).toBe(true);
    expect(s).toMatchObject({ activeDays: 0, sessions: 0, minutes: 0 });
  });

  it('counts sessions and minutes per local day and ignores anything outside the week', () => {
    const rows = [
      { session_timestamp: at(2026, 11, 27, 9).toISOString(), drill_duration_sec: 90 },
      { session_timestamp: at(2026, 11, 27, 10).toISOString(), drill_duration_sec: 30 },
      { session_timestamp: at(2026, 11, 23, 0, 5).toISOString(), drill_duration_sec: 600 },
      { session_timestamp: at(2026, 11, 20, 23, 55).toISOString(), drill_duration_sec: 999 }, // 8 days ago
      { session_timestamp: 'not a date', drill_duration_sec: 50 },
      { session_timestamp: at(2026, 11, 25).toISOString(), drill_duration_sec: null },
    ];
    const s = weeklySummary(rows, NOW, '2026-11-27');
    const day = (date: string) => s.days.find((d) => d.date === date)!;
    expect(day('2026-11-27')).toMatchObject({ sessions: 2, minutes: 2, active: true });
    expect(day('2026-11-23')).toMatchObject({ sessions: 1, minutes: 10, active: true });
    expect(day('2026-11-25')).toMatchObject({ sessions: 1, minutes: 0, active: true });
    expect(s).toMatchObject({ activeDays: 3, sessions: 4, minutes: 12 });
  });

  it('a theory-only lesson today (no session row) still marks today active through the streak record', () => {
    const s = weeklySummary([], NOW, '2026-11-27');
    expect(s.days[6]).toMatchObject({ active: true, sessions: 0 });
    expect(s.activeDays).toBe(1);
  });

  it('queries from the start of the local day six days ago', () => {
    expect(new Date(weekStartIso(NOW)).getTime()).toBe(at(2026, 11, 21, 0).getTime());
  });

  it('handles a month boundary', () => {
    const s = weeklySummary([], at(2026, 12, 2), null);
    expect(s.days[0].date).toBe('2026-11-26');
    expect(s.days[6].date).toBe('2026-12-02');
  });
});
