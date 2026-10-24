import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';
import { setAuthPersistPreference } from '../lib/supabase/authStorage';
import { mapAuthError } from '../lib/auth/mapAuthError';
import { applySelfAssessment, ensureProfile, isOnboarded, type SkillLevel } from '../lib/auth/profile';
import type { Profile } from '../types/database.types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function assertEmail(email: string) {
  if (!EMAIL_PATTERN.test(email.trim())) {
    throw new Error('Enter a valid email address.');
  }
}

function assertPassword(password: string) {
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
}

function isEmailVerified(user: User): boolean {
  const providers = user.app_metadata?.providers ?? [user.app_metadata?.provider];
  const usesPassword = providers.filter(Boolean).includes('email');
  if (!usesPassword) {
    return true;
  }
  return Boolean(user.email_confirmed_at);
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'error' | 'info'; message: string } | null>(null);

  const hydrate = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);

    if (!nextSession?.user) {
      setProfile(null);
      return;
    }

    if (!isEmailVerified(nextSession.user)) {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
      setBanner({
        tone: 'error',
        message: 'Please confirm your email before signing in. Check your inbox for the MUZ verification link.',
      });
      return;
    }

    const nextProfile = await ensureProfile(nextSession.user);
    setProfile(nextProfile);
  }, []);

  useEffect(() => {
    let cancelled = false;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (cancelled) return;
        try {
          await hydrate(data.session);
        } catch (error) {
          setBanner({ tone: 'error', message: mapAuthError(error) });
        } finally {
          if (!cancelled) setLoading(false);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setBanner({ tone: 'error', message: mapAuthError(error) });
          setLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void hydrate(nextSession).catch((error) => {
        setBanner({ tone: 'error', message: mapAuthError(error) });
      });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [hydrate]);

  const signIn = useCallback(async (email: string, password: string, keepSignedIn = true) => {
    assertEmail(email);
    assertPassword(password);
    setAuthPersistPreference(keepSignedIn);
    setBusy(true);
    setBanner(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user && !data.session) {
        throw new Error('Please confirm your email before signing in. Check your inbox for the MUZ verification link.');
      }

      if (data.user && !isEmailVerified(data.user)) {
        await supabase.auth.signOut();
        throw new Error('Please confirm your email before signing in. Check your inbox for the MUZ verification link.');
      }

      await hydrate(data.session);
    } catch (error) {
      const message = mapAuthError(error, 'Unable to sign in.');
      setBanner({ tone: 'error', message });
      throw error;
    } finally {
      setBusy(false);
    }
  }, [hydrate]);

  const signUp = useCallback(async (email: string, password: string) => {
    assertEmail(email);
    assertPassword(password);
    setAuthPersistPreference(true);
    setBusy(true);
    setBanner(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { instrument_focus: 'piano' },
        },
      });

      if (error) {
        throw error;
      }

      if (data.user && data.session) {
        await hydrate(data.session);
        return;
      }

      setBanner({
        tone: 'info',
        message: 'Account created. Confirm your email from the verification link, then sign in.',
      });
    } catch (error) {
      const message = mapAuthError(error, 'Unable to create your account.');
      setBanner({ tone: 'error', message });
      throw error;
    } finally {
      setBusy(false);
    }
  }, [hydrate]);

  const signInWithGoogle = useCallback(async () => {
    setAuthPersistPreference(true);
    setBusy(true);
    setBanner(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      const message = mapAuthError(error, 'Google sign-in could not be started.');
      setBanner({ tone: 'error', message });
      setBusy(false);
      throw error;
    }
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    assertEmail(email);
    setBusy(true);
    setBanner(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });

      if (error) {
        throw error;
      }

      setBanner({
        tone: 'info',
        message: 'Password reset email sent. Check your inbox for the MUZ recovery link.',
      });
    } catch (error) {
      const message = mapAuthError(error, 'Unable to send a password reset email.');
      setBanner({ tone: 'error', message });
      throw error;
    } finally {
      setBusy(false);
    }
  }, []);

  const completeOnboarding = useCallback(async (level: SkillLevel) => {
    if (!session?.user) {
      throw new Error('You need an active session to finish onboarding.');
    }

    setBusy(true);
    setBanner(null);

    try {
      await applySelfAssessment(session.user.id, level);
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      await hydrate(data.session);
    } catch (error) {
      const message = mapAuthError(error, 'Could not save your skill level.');
      setBanner({ tone: 'error', message });
      throw error;
    } finally {
      setBusy(false);
    }
  }, [hydrate, session]);

  const signOut = useCallback(async () => {
    setBusy(true);
    try {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
    } finally {
      setBusy(false);
    }
  }, []);

  const needsOnboarding = useMemo(() => Boolean(session?.user && !isOnboarded(session.user)), [session]);

  return {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    busy,
    banner,
    setBanner,
    needsOnboarding,
    signIn,
    signUp,
    signInWithGoogle,
    forgotPassword,
    completeOnboarding,
    signOut,
  };
}
