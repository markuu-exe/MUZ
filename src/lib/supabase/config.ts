// T-05 / DEF-004: Supabase env validation, kept free of browser APIs so it
// can be unit-tested in Node. `client.ts` and `src/configGuard.ts` use it.

export const SUPABASE_CONFIG_ERROR =
  'MUZ configuration error: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see docs/ENVIRONMENTS.md).';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

type Env = Record<string, unknown>;

function firstSet(env: Env, ...names: string[]): string | null {
  for (const name of names) {
    const value = env[name];
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return null;
}

/** The URL and key the client should use, or null if either is missing. */
export function readSupabaseConfig(env: Env): SupabaseConfig | null {
  const url = firstSet(env, 'VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = firstSet(env, 'VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  return url && anonKey ? { url, anonKey } : null;
}

/** A readable message if the Supabase env is incomplete, otherwise null. */
export function supabaseConfigError(env: Env): string | null {
  return readSupabaseConfig(env) ? null : SUPABASE_CONFIG_ERROR;
}
