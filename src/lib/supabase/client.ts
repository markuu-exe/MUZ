import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';
import { readSupabaseConfig, SUPABASE_CONFIG_ERROR } from './config';

// Reads VITE_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL, and
// VITE_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
const config = readSupabaseConfig(import.meta.env);

// Fail with a readable message instead of supabase-js's "supabaseUrl is
// required" (DEF-004). src/configGuard.ts normally shows it on the page first.
if (!config) {
  throw new Error(SUPABASE_CONFIG_ERROR);
}

export const supabase = createClient<Database>(config.url, config.anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
