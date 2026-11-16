import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session, Provider } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';
import {
  clampHearts,
  computePassiveHeartRegen,
  HEART_REGEN_INTERVAL_MS,
  MAX_HEARTS,
} from '../lib/gamification';
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
    last_heart_update: null,
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
    last_heart_update: null,
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

        // Check hearts and last_heart_update to reconcile passive regeneration while away
        const currentHearts = clampHearts(data.hearts ?? MAX_HEARTS);
        const regenStorageKey = `muz-heart-regen-${userId}`;
        const gamificationStorageKey = `muz-gamification-v1-${userId}`;
        let reconciledHearts = currentHearts;
        let reconciledLastHeartUpdate: string | null = data.last_heart_update ?? null;

        if (currentHearts >= MAX_HEARTS) {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(regenStorageKey);
          }
          if (data.last_heart_update !== null) {
            updates.last_heart_update = null;
            reconciledLastHeartUpdate = null;
          }
        } else {
          const dbMs = data.last_heart_update ? Date.parse(data.last_heart_update) : NaN;
          const localRaw =
            typeof window !== 'undefined' ? window.localStorage.getItem(regenStorageKey) : null;
          const localMs = localRaw ? Number(localRaw) : NaN;
          const startedAtMs = Number.isFinite(dbMs)
            ? dbMs
            : Number.isFinite(localMs)
              ? localMs
              : Date.now();

          const regen = computePassiveHeartRegen(
            currentHearts,
            startedAtMs,
            Date.now(),
            HEART_REGEN_INTERVAL_MS,
          );

          reconciledHearts = regen.hearts;
          if (regen.hearts >= MAX_HEARTS) {
            reconciledLastHeartUpdate = null;
            if (typeof window !== 'undefined') {
              window.localStorage.removeItem(regenStorageKey);
            }
            if (data.hearts !== MAX_HEARTS) {
              updates.hearts = MAX_HEARTS;
            }
            if (data.last_heart_update !== null) {
              updates.last_heart_update = null;
            }
          } else {
            const nextAnchorMs = regen.nextStartedAtMs ?? startedAtMs;
            const nextAnchorIso = new Date(nextAnchorMs).toISOString();
            reconciledLastHeartUpdate = nextAnchorIso;
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(regenStorageKey, String(nextAnchorMs));
            }
            if (regen.hearts !== data.hearts) {
              updates.hearts = regen.hearts;
            }
            if (data.last_heart_update !== nextAnchorIso) {
              updates.last_heart_update = nextAnchorIso;
            }
          }
        }

        if (typeof window !== 'undefined') {
          const rawGamification = window.localStorage.getItem(gamificationStorageKey);
          if (rawGamification) {
            try {
              const parsed = JSON.parse(rawGamification) as Record<string, unknown>;
              parsed.hearts = reconciledHearts;
              parsed.lastHeartUpdate = reconciledLastHeartUpdate;
              window.localStorage.setItem(gamificationStorageKey, JSON.stringify(parsed));
            } catch {
              // Ignore malformed cached state
            }
          }
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
            return updated as UserProfile;
          }
        }

        return {
          ...(data as UserProfile),
          hearts: reconciledHearts,
          last_heart_update: reconciledLastHeartUpdate,
        };
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
        last_heart_update: null,
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

    const activeUserId = profile?.id ?? user?.id;
    if (activeUserId) {
      try {
        const regenStorageKey = `muz-heart-regen-${activeUserId}`;
        const gamificationStorageKey = `muz-gamification-v1-${activeUserId}`;
        let currentHearts = clampHearts(profile?.hearts ?? MAX_HEARTS);
        let storedLastHeartUpdate: string | null = profile?.last_heart_update ?? null;

        if (typeof window !== 'undefined') {
          const rawGamification = window.localStorage.getItem(gamificationStorageKey);
          if (rawGamification) {
            try {
              const parsed = JSON.parse(rawGamification) as {
                hearts?: number;
                lastHeartUpdate?: string | null;
              };
              if (typeof parsed.hearts === 'number') {
                currentHearts = clampHearts(parsed.hearts);
              }
              if (parsed.lastHeartUpdate) {
                storedLastHeartUpdate = parsed.lastHeartUpdate;
              }
            } catch {
              // Ignore malformed JSON
            }
          }
        }

        let finalHearts = currentHearts;
        let finalLastHeartUpdate: string | null = null;

        if (currentHearts < MAX_HEARTS) {
          const rawAnchor =
            typeof window !== 'undefined' ? window.localStorage.getItem(regenStorageKey) : null;
          const localMs = rawAnchor ? Number(rawAnchor) : NaN;
          const dbMs = storedLastHeartUpdate ? Date.parse(storedLastHeartUpdate) : NaN;
          const startedAtMs =
            Number.isFinite(localMs) && Number.isFinite(dbMs)
              ? Math.max(localMs, dbMs)
              : Number.isFinite(localMs)
                ? localMs
                : Number.isFinite(dbMs)
                  ? dbMs
                  : Date.now();

          const regen = computePassiveHeartRegen(
            currentHearts,
            startedAtMs,
            Date.now(),
            HEART_REGEN_INTERVAL_MS,
          );
          finalHearts = regen.hearts;
          if (finalHearts >= MAX_HEARTS) {
            finalLastHeartUpdate = null;
            if (typeof window !== 'undefined') {
              window.localStorage.removeItem(regenStorageKey);
            }
          } else {
            const nextAnchorMs = regen.nextStartedAtMs ?? startedAtMs;
            finalLastHeartUpdate = new Date(nextAnchorMs).toISOString();
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(regenStorageKey, String(nextAnchorMs));
            }
          }
        } else if (typeof window !== 'undefined') {
          window.localStorage.removeItem(regenStorageKey);
        }

        if (typeof window !== 'undefined') {
          const rawGamification = window.localStorage.getItem(gamificationStorageKey);
          if (rawGamification) {
            try {
              const parsed = JSON.parse(rawGamification) as Record<string, unknown>;
              parsed.hearts = finalHearts;
              parsed.lastHeartUpdate = finalLastHeartUpdate;
              window.localStorage.setItem(gamificationStorageKey, JSON.stringify(parsed));
            } catch {
              // Ignore malformed JSON
            }
          }
        }

        await supabase
          .from('profiles')
          .update({
            hearts: finalHearts,
            last_heart_update: finalLastHeartUpdate,
          })
          .eq('id', activeUserId);
      } catch (syncErr) {
        console.warn('Could not sync hearts on signOut:', syncErr);
      }
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
