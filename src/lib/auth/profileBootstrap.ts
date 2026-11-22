import type { UserProfile } from '../../types/auth.types';

export interface ProfileClient {
  select(
    userId: string,
  ): Promise<{ data: UserProfile | null; error: { code?: string; message: string } | null }>;
  insert(row: {
    id: string;
    username: string;
    instrument_focus: 'piano';
  }): Promise<{ data: UserProfile | null; error: { code?: string; message: string } | null }>;
}

export type BootstrapResult = { profile: UserProfile } | { profile: null; error: string };

const TRIGGER_SETTLE_MS = 500;

const defaultWait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Loads an authenticated user's profile without ever overwriting existing
 * progress on transient read errors. If the signup trigger has not yet created
 * the row, waits briefly and retries before inserting minimal defaults.
 */
export async function bootstrapProfile(
  client: ProfileClient,
  userId: string,
  username: string,
  wait: (ms: number) => Promise<void> = defaultWait,
): Promise<BootstrapResult> {
  const first = await client.select(userId);
  if (first.error) {
    return { profile: null, error: first.error.message };
  }
  if (first.data) {
    return { profile: first.data };
  }

  // Wait for the handle_new_user DB trigger before falling back to an insert.
  await wait(TRIGGER_SETTLE_MS);

  const second = await client.select(userId);
  if (second.error) {
    return { profile: null, error: second.error.message };
  }
  if (second.data) {
    return { profile: second.data };
  }

  const normalizedUsername = username.trim() || 'Pianist';
  const inserted = await client.insert({
    id: userId,
    username: normalizedUsername,
    instrument_focus: 'piano',
  });

  if (!inserted.error) {
    if (inserted.data) {
      return { profile: inserted.data };
    }
    return { profile: null, error: 'Profile insert returned no row.' };
  }

  if (inserted.error.code === '23505') {
    const afterRace = await client.select(userId);
    if (afterRace.error) {
      return { profile: null, error: afterRace.error.message };
    }
    if (afterRace.data) {
      return { profile: afterRace.data };
    }
    return { profile: null, error: 'Profile not found after duplicate key conflict.' };
  }

  return { profile: null, error: inserted.error.message };
}
