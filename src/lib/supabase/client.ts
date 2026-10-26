import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';

const env = import.meta.env;

const supabaseUrl =
  env.VITE_SUPABASE_URL ||
  (env as Record<string, string>).NEXT_PUBLIC_SUPABASE_URL

const supabaseAnonKey =
  env.VITE_SUPABASE_ANON_KEY ||
  (env as Record<string, string>).NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 
  

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
