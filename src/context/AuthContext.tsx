import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session, Provider } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';
import type { AuthContextType, InstrumentFocus, UserProfile } from '../types/auth.types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER_KEY = 'muz_demo_session_active';
const DEMO_ROLE_KEY = 'muz_demo_session_role';

const getMetadataUsername = (user: User): string | undefined => {
  const username = user.user_metadata?.username || user.user_metadata?.full_name || user.user_metadata?.name;
  return typeof username === 'string' && username.trim() ? username.trim() : undefined;
};

const getMetadataInstrument = (user: User): InstrumentFocus => {
  const instrument = user.user_metadata?.instrument_focus;
  if (instrument === 'piano' || instrument === 'guitar' || instrument === 'violin' || instrument === 'vocals') {
    return instrument;
  }
  return 'piano';
};

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
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [isDemo, setIsDemo] = useState<boolean>(() => {
    return sessionStorage.getItem(DEMO_USER_KEY) === 'true';
  });

  const fetchProfile = useCallback(async (
    userId: string,
    userEmail?: string,
    preferredUsername?: string,
    preferredInstrument?: InstrumentFocus,
  ): Promise<UserProfile | null> => {
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
        const updates: Partial<UserProfile> = {};
        if (preferredUsername && data.username !== preferredUsername) {
          updates.username = preferredUsername;
        }
        if (preferredInstrument && data.instrument_focus !== preferredInstrument) {
          updates.instrument_focus = preferredInstrument;
        }

        if (Object.keys(updates).length > 0) {
          const { data: updated, error: updateError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .maybeSingle();

          if (updateError) {
            console.warn('Could not update profile metadata:', updateError.message);
          } else if (updated) {
            return updated;
          }
        }

        return data as UserProfile;
      }

      // If profile not found, try to upsert a default profile
      const defaultProfile: UserProfile = {
        id: userId,
        username: preferredUsername || userEmail?.split('@')[0] || 'Pianist',
        instrument_focus: preferredInstrument || 'piano',
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
        const savedRole = sessionStorage.getItem(DEMO_ROLE_KEY) || 'virtuoso';
        const chosenProfile = DEMO_PROFILES[savedRole] || DEMO_PROFILES.virtuoso;
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
            const userProf = await fetchProfile(
              initialSession.user.id,
              initialSession.user.email,
              getMetadataUsername(initialSession.user),
              getMetadataInstrument(initialSession.user),
            );
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
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }

      if (isDemo) {
        return;
      }

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        const userProf = await fetchProfile(
          newSession.user.id,
          newSession.user.email,
          getMetadataUsername(newSession.user),
          getMetadataInstrument(newSession.user),
        );
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
        const userProf = await fetchProfile(
          data.user.id,
          data.user.email,
          getMetadataUsername(data.user),
          getMetadataInstrument(data.user),
        );
        setProfile(userProf);
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
        const userProf = await fetchProfile(
          data.user.id,
          email,
          profileUsername,
          instrumentFocus,
        );
        setProfile(userProf);
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
    if (isDemo) {
      setIsDemo(false);
      sessionStorage.removeItem(DEMO_USER_KEY);
      sessionStorage.removeItem(DEMO_ROLE_KEY);
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
    setLoading(false);
  };

  const refreshProfile = async () => {
    if (user) {
      const prof = await fetchProfile(
        user.id,
        user.email,
        getMetadataUsername(user),
        getMetadataInstrument(user),
      );
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
