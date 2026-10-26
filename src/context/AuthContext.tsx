import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';
import type { AuthContextType, UserProfile } from '../types/auth.types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER_KEY = 'muz_demo_session_active';

const mockDemoProfile: UserProfile = {
  id: 'demo-user-muz-01',
  username: 'ChopinVirtuoso',
  instrument_focus: 'piano',
  current_streak: 14,
  last_activity_date: new Date().toISOString(),
  exp: 2450,
  hearts: 5,
  created_at: new Date().toISOString(),
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState<boolean>(() => {
    return sessionStorage.getItem(DEMO_USER_KEY) === 'true';
  });

  const fetchProfile = useCallback(async (userId: string, userEmail?: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Could not fetch user profile:', error.message);
      }

      if (data) {
        return data as UserProfile;
      }

      // If profile not found, try to upsert a default profile
      const defaultProfile: UserProfile = {
        id: userId,
        username: userEmail?.split('@')[0] || 'Pianist',
        instrument_focus: 'piano',
        current_streak: 1,
        last_activity_date: new Date().toISOString(),
        exp: 100,
        hearts: 5,
        created_at: new Date().toISOString(),
      };

      const { data: inserted, error: insertError } = await supabase
        .from('profiles')
        .upsert(defaultProfile)
        .select()
        .single();

      if (insertError) {
        console.warn('Default profile creation skipped:', insertError.message);
        return defaultProfile;
      }

      return (inserted as UserProfile) || defaultProfile;
    } catch (err) {
      console.error('Error handling profile:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      if (isDemo) {
        setProfile(mockDemoProfile);
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
            const userProf = await fetchProfile(initialSession.user.id, initialSession.user.email);
            if (mounted) setProfile(userProf);
          } else {
            setSession(null);
            setUser(null);
            setProfile(null);
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;

      if (isDemo) {
        return;
      }

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        const userProf = await fetchProfile(newSession.user.id, newSession.user.email);
        if (mounted) setProfile(userProf);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, isDemo]);

  const signInWithEmail = async (email: string, password: string) => {
    setIsDemo(false);
    sessionStorage.removeItem(DEMO_USER_KEY);
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
        const userProf = await fetchProfile(data.user.id, data.user.email);
        setProfile(userProf);
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUpWithEmail = async (email: string, password: string, username?: string) => {
    setIsDemo(false);
    sessionStorage.removeItem(DEMO_USER_KEY);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username || email.split('@')[0],
          },
        },
      });

      if (error) {
        return { error };
      }

      if (data.session && data.user) {
        setSession(data.session);
        setUser(data.user);
        const userProf = await fetchProfile(data.user.id, email);
        setProfile(userProf);
      }

      return { error: null, session: data.session };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signInWithMagicLink = async (email: string) => {
    setIsDemo(false);
    sessionStorage.removeItem(DEMO_USER_KEY);
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

  const resetPasswordForEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    if (isDemo) {
      setIsDemo(false);
      sessionStorage.removeItem(DEMO_USER_KEY);
      setUser(null);
      setSession(null);
      setProfile(null);
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
    }
  };

  const enterDemoMode = (_role?: string) => {
    setIsDemo(true);
    sessionStorage.setItem(DEMO_USER_KEY, 'true');
    setUser({
      id: mockDemoProfile.id,
      email: 'pianist@muz-practice.ai',
      app_metadata: {},
      user_metadata: { username: mockDemoProfile.username },
      aud: 'authenticated',
      created_at: mockDemoProfile.created_at || '',
    } as unknown as User);
    setProfile(mockDemoProfile);
    setLoading(false);
  };

  const refreshProfile = async () => {
    if (user) {
      const prof = await fetchProfile(user.id, user.email);
      setProfile(prof);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isDemo,
        signInWithEmail,
        signUpWithEmail,
        signInWithMagicLink,
        resetPasswordForEmail,
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
