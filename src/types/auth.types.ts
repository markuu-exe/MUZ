import type { User, Session, AuthError, Provider } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type UserProfile = Database['public']['Tables']['profiles']['Row'];

export type InstrumentFocus = 'piano';

export type ProfileStatus = 'loading' | 'loaded' | 'not_found' | 'failed';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  profileError: string | null;
  profileStatus: ProfileStatus;
  loading: boolean;
  isDemo: boolean;
  isPasswordRecovery: boolean;
  signInWithEmail: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | Error | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    username?: string,
    instrumentFocus?: InstrumentFocus
  ) => Promise<{ error: AuthError | Error | null; session?: Session | null }>;
  signInWithOAuth: (provider: Provider) => Promise<{ error: AuthError | Error | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | Error | null }>;
  resendVerificationEmail: (email: string) => Promise<{ error: AuthError | Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: AuthError | Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | Error | null }>;
  signOut: () => Promise<void>;
  enterDemoMode: (role?: string) => void;
  refreshProfile: () => Promise<void>;
}
