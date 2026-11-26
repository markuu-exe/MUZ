/**
 * Saving the profile look. The display name goes to profiles.username (own-row
 * update is allowed by profiles_update_own); a duplicate hits the unique
 * constraint (23505) and is reported as "taken". Avatar and frame go to the
 * account's auth user_metadata, like placement.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';
import { normalizeDisplayName, validateDisplayName, type ProfileLook } from './look';

type Client = SupabaseClient<Database>;

/** Returns a message for the learner, or null when saved. */
export async function saveDisplayName(client: Client, userId: string, raw: string): Promise<string | null> {
  const name = normalizeDisplayName(raw);
  const invalid = validateDisplayName(name);
  if (invalid) return invalid;
  const { data, error } = await client.from('profiles').update({ username: name }).eq('id', userId).select('id');
  if (error?.code === '23505') return 'That name is already taken. Try another one.';
  if (error) return 'Your name could not be saved. Check your connection and try again.';
  if (!data || data.length === 0) return 'Your name could not be saved.';
  return null;
}

export async function saveLook(client: Client, look: ProfileLook): Promise<string | null> {
  const { error } = await client.auth.updateUser({ data: { avatar: look.avatar, frame: look.frame } });
  return error ? 'Your avatar could not be saved. Check your connection and try again.' : null;
}
