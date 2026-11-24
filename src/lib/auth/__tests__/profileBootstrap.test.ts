import { describe, it, expect, vi } from 'vitest';
import type { UserProfile } from '../../../types/auth.types';
import { bootstrapProfile, type ProfileClient } from '../profileBootstrap';

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'user-1',
    username: 'Clara',
    instrument_focus: 'piano',
    current_streak: 5,
    last_activity_date: '2026-11-20T00:00:00.000Z',
    exp: 420,
    hearts: 3,
    created_at: '2026-11-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('bootstrapProfile', () => {
  it('Rule 1: returns existing profile immediately without waiting or writing', async () => {
    const existing = makeProfile({ exp: 950, current_streak: 12, hearts: 2 });
    const select = vi.fn().mockResolvedValue({ data: existing, error: null });
    const insert = vi.fn();
    const wait = vi.fn().mockResolvedValue(undefined);
    const client: ProfileClient = { select, insert };

    const result = await bootstrapProfile(client, 'user-1', 'OtherName', wait);

    expect(result).toEqual({ profile: existing });
    expect(select).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenCalledWith('user-1');
    expect(wait).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('Rule 2: returns error and never inserts when initial select fails', async () => {
    const select = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '500', message: 'network timeout' },
    });
    const insert = vi.fn();
    const wait = vi.fn().mockResolvedValue(undefined);
    const client: ProfileClient = { select, insert };

    const result = await bootstrapProfile(client, 'user-1', 'Clara', wait);

    expect(result).toEqual({ profile: null, error: 'network timeout' });
    expect(select).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('Rule 3a: waits 500ms and returns trigger-created profile on second select', async () => {
    const triggerRow = makeProfile({ exp: 0, current_streak: 0, hearts: 5 });
    const select = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: triggerRow, error: null });
    const insert = vi.fn();
    const wait = vi.fn().mockResolvedValue(undefined);
    const client: ProfileClient = { select, insert };

    const result = await bootstrapProfile(client, 'user-1', 'Clara', wait);

    expect(result).toEqual({ profile: triggerRow });
    expect(wait).toHaveBeenCalledTimes(1);
    expect(wait).toHaveBeenCalledWith(500);
    expect(select).toHaveBeenCalledTimes(2);
    expect(insert).not.toHaveBeenCalled();
  });

  it('Rule 3b: never inserts if the second select after wait returns an error', async () => {
    const select = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: '503', message: 'db unavailable' } });
    const insert = vi.fn();
    const wait = vi.fn().mockResolvedValue(undefined);
    const client: ProfileClient = { select, insert };

    const result = await bootstrapProfile(client, 'user-1', 'Clara', wait);

    expect(result).toEqual({ profile: null, error: 'db unavailable' });
    expect(wait).toHaveBeenCalledWith(500);
    expect(select).toHaveBeenCalledTimes(2);
    expect(insert).not.toHaveBeenCalled();
  });

  it('Rule 3c: inserts only id, username, and instrument_focus when still missing after wait', async () => {
    const insertedRow = makeProfile({ exp: 0, current_streak: 0, hearts: 5 });
    const select = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    const insert = vi.fn().mockResolvedValue({ data: insertedRow, error: null });
    const wait = vi.fn().mockResolvedValue(undefined);
    const client: ProfileClient = { select, insert };

    const result = await bootstrapProfile(client, 'user-1', '  Clara  ', wait);

    expect(result).toEqual({ profile: insertedRow });
    expect(wait).toHaveBeenCalledWith(500);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith({
      id: 'user-1',
      username: 'Clara',
      instrument_focus: 'piano',
    });
  });

  it('Rule 4: selects once more and returns row when insert hits 23505 duplicate race', async () => {
    const raceRow = makeProfile({ exp: 0, current_streak: 0, hearts: 5 });
    const select = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: raceRow, error: null });
    const insert = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    });
    const wait = vi.fn().mockResolvedValue(undefined);
    const client: ProfileClient = { select, insert };

    const result = await bootstrapProfile(client, 'user-1', 'Clara', wait);

    expect(result).toEqual({ profile: raceRow });
    expect(select).toHaveBeenCalledTimes(3);
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it('Rule 5: returns error on any non-23505 insert error without a third select', async () => {
    const select = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    const insert = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'new row violates row-level security policy' },
    });
    const wait = vi.fn().mockResolvedValue(undefined);
    const client: ProfileClient = { select, insert };

    const result = await bootstrapProfile(client, 'user-1', 'Clara', wait);

    expect(result).toEqual({
      profile: null,
      error: 'new row violates row-level security policy',
    });
    expect(select).toHaveBeenCalledTimes(2);
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
