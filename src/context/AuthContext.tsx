import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { User, Session, Provider } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';
import { bootstrapProfile, type ProfileClient } from '../lib/auth/profileBootstrap';
import type {
  AuthContextType,
  InstrumentFocus,
  ProfileStatus,
  UserProfile,
} from '../types/auth.types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER_KEY = 'muz_demo_session_active';
const DEMO_ROLE_KEY = 'muz_demo_session_role';

const getMetadataUsername = (user: User): string | undefined => {
  const username = user.user_metadata?.username || user.user_metadata?.full_name || user.user_metadata?.name;
  return typeof username === 'string' && username.trim() ? username.trim() : undefined;
};

const getMetadataInstrument = (_user?: User): InstrumentFocus => 'piano';

const resolveProfileUsername = (user: User): string =>
  getMetadataUsername(user) || user.email?.split('@')[0] || 'Pianist';

const createProfileClient = (): ProfileClient => ({
  select: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    return {
      data: (data as UserProfile | null) ?? null,
      error: error ? { code: error.code, message: error.message } : null,
    };
  },
  insert: async (row) => {
    const { data, error } = await supabase
      .from('profiles')
      .insert(row)
      .select()
      .single();
    return {
      data: (data as UserProfile | null) ?? null,
      error: error ? { code: error.code, message: error.message } : null,
    };
  },
});

const DEMO_PROFILES: Record<string, UserProfile> = {
  virtuoso: {
    id: 'demo-user-muz-01',
    username: 'ChopinVirtuoso',
    instrument_focus: 'piano',
    current_streak: 14,
    last_activity_date: new Date().toISOString(),
    exp: 2450,
    hearts: 5,
    created_at: new Date().toISOString(),
  },
  beginner: {
    id: 'demo-user-muz-02',
    username: 'ApprenticeKeys',
    instrument_focus: 'piano',
    current_streak: 1,
    last_activity_date: new Date().toISOString(),
    exp: 120,
    hearts: 5,
    created_at: new Date().toISOString(),
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('loading');
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [isDemo, setIsDemo] = useState<boolean>(() => {
    return sessionStorage.getItem(DEMO_USER_KEY) === 'true';
  });

  const mountedRef = useRef(true);
  const profileReqIdRef = useRef(0);

  const loadProfile = useCallback(async (targetUser: User): Promise<UserProfile | null> => {
    const reqId = ++profileReqIdRef.current;
    setProfileStatus('loading');
    setProfileError(null);

    try {
      const result = await bootstrapProfile(
        createProfileClient(),
        targetUser.id,
        resolveProfileUsername(targetUser),
      );

      if (!mountedRef.current || reqId !== profileReqIdRef.current) {
        return null;
      }

      if (result.profile === null) {
        setProfile(null);
        setProfileError(result.error);
        setProfileStatus('failed');
        return null;
      }

      setProfile(result.profile);
      setProfileError(null);
      setProfileStatus('loaded');
      return result.profile;
    } catch (err) {
      if (!mountedRef.current || reqId !== profileReqIdRef.current) {
        return null;
      }
      const message = err instanceof Error ? err.message : 'Failed to load profile.';
      setProfile(null);
      setProfileError(message);
      setProfileStatus('failed');
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    mountedRef.current = true;
    let pendingProfileTimer: ReturnType<typeof setTimeout> | null = null;

    const clearPendingProfileTimer = () => {
      if (pendingProfileTimer !== null) {
        clearTimeout(pendingProfileTimer);
        pendingProfileTimer = null;
      }
    };

    async function initializeAuth() {
      if (isDemo) {
        const savedRole = sessionStorage.getItem(DEMO_ROLE_KEY) || 'virtuoso';
        const chosenProfile = DEMO_PROFILES[savedRole] || DEMO_PROFILES.virtuoso;
        setUser({
          id: chosenProfile.id,
          email: `${chosenProfile.username.toLowerCase()}@muz-practice.ai`,
          app_metadata: {},
          user_metadata: {
            username: chosenProfile.username,
            instrument_focus: getMetadataInstrument(),
          },
          aud: 'authenticated',
          created_at: chosenProfile.created_at || '',
        } as unknown as User);
        setProfile(chosenProfile);
        setProfileError(null);
        setProfileStatus('loaded');
        setLoading(false);
        return;
      }

      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Supabase getSession error:', error.message);
        }

        if (mounted) {
          if (initialSession?.user) {
            setSession(initialSession);
            setUser(initialSession.user);
          } else {
            setSession(null);
            setUser(null);
            setProfile(null);
            setProfileError(null);
            setProfileStatus('not_found');
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    // Keep callback synchronous to avoid supabase-js auth lock deadlocks.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }

      if (isDemo) {
        return;
      }

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === 'TOKEN_REFRESHED') {
        setLoading(false);
        return;
      }

      if (
        newSession?.user &&
        (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'USER_UPDATED')
      ) {
        clearPendingProfileTimer();
        setProfileStatus('loading');
        setProfileError(null);
        const targetUser = newSession.user;
        pendingProfileTimer = setTimeout(() => {
          pendingProfileTimer = null;
          if (mounted) {
            void loadProfile(targetUser);
          }
        }, 0);
      } else if (!newSession?.user) {
        clearPendingProfileTimer();
        profileReqIdRef.current += 1;
        setProfile(null);
        setProfileError(null);
        setProfileStatus('not_found');
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      mountedRef.current = false;
      clearPendingProfileTimer();
      subscription.unsubscribe();
    };
  }, [loadProfile, isDemo]);

  const signInWithEmail = async (email: string, password: string) => {
    setIsDemo(false);
    sessionStorage.removeItem(DEMO_USER_KEY);
    sessionStorage.removeItem(DEMO_ROLE_KEY);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.user);
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    username?: string,
    instrumentFocus: InstrumentFocus = 'piano'
  ) => {
    setIsDemo(false);
    sessionStorage.removeItem(DEMO_USER_KEY);
    sessionStorage.removeItem(DEMO_ROLE_KEY);
    const profileUsername = username?.trim() || email.split('@')[0];
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            username: profileUsername,
            instrument_focus: instrumentFocus,
          },
        },
      });

      if (error) {
        return { error };
      }

      if (data.session && data.user) {
        setSession(data.session);
        setUser(data.user);
      }

      return { error: null, session: data.session };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signInWithOAuth = async (provider: Provider) => {
    setIsDemo(false);
    sessionStorage.removeItem(DEMO_USER_KEY);
    sessionStorage.removeItem(DEMO_ROLE_KEY);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });
      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signInWithMagicLink = async (email: string) => {
    setIsDemo(false);
    sessionStorage.removeItem(DEMO_USER_KEY);
    sessionStorage.removeItem(DEMO_ROLE_KEY);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const resendVerificationEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const resetPasswordForEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (!error) {
        setIsPasswordRecovery(false);
      }
      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    setIsPasswordRecovery(false);
    profileReqIdRef.current += 1;
    if (isDemo) {
      setIsDemo(false);
      sessionStorage.removeItem(DEMO_USER_KEY);
      sessionStorage.removeItem(DEMO_ROLE_KEY);
      setUser(null);
      setSession(null);
      setProfile(null);
      setProfileError(null);
      setProfileStatus('not_found');
      return;
    }

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('SignOut error:', err);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setProfileError(null);
      setProfileStatus('not_found');
    }
  };

  const enterDemoMode = (role: string = 'virtuoso') => {
    const chosenProfile = DEMO_PROFILES[role] || DEMO_PROFILES.virtuoso;
    setIsDemo(true);
    sessionStorage.setItem(DEMO_USER_KEY, 'true');
    sessionStorage.setItem(DEMO_ROLE_KEY, role);
    setUser({
      id: chosenProfile.id,
      email: `${chosenProfile.username.toLowerCase()}@muz-practice.ai`,
      app_metadata: {},
      user_metadata: {
        username: chosenProfile.username,
        instrument_focus: chosenProfile.instrument_focus,
      },
      aud: 'authenticated',
      created_at: chosenProfile.created_at || '',
    } as unknown as User);
    setProfile(chosenProfile);
    setProfileError(null);
    setProfileStatus('loaded');
    setLoading(false);
  };

  const refreshProfile = async () => {
    if (user && !isDemo) {
      await loadProfile(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        profileError,
        profileStatus,
        loading,
        isDemo,
        isPasswordRecovery,
        signInWithEmail,
        signUpWithEmail,
        signInWithOAuth,
        signInWithMagicLink,
        resendVerificationEmail,
        resetPasswordForEmail,
        updatePassword,
        signOut,
        enterDemoMode,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
