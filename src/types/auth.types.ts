import type { User, Session, AuthError } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type UserProfile = Database['public']['Tables']['profiles']['Row'];

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isDemo: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    username?: string
  ) => Promise<{ error: AuthError | Error | null; session?: Session | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: AuthError | Error | null }>;
  signOut: () => Promise<void>;
  enterDemoMode: (role?: string) => void;
  refreshProfile: () => Promise<void>;
}
