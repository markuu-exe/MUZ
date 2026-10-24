import { FormEvent, useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import AuthAtmosphere from './AuthAtmosphere';
import ErrorBanner from './ErrorBanner';
import GoogleIcon from './GoogleIcon';
import MuzMark from './MuzMark';
import { cn } from '../../lib/cn';

type Mode = 'signin' | 'signup';

interface AuthScreenProps {
  busy: boolean;
  banner: { tone: 'error' | 'info'; message: string } | null;
  onSignIn: (email: string, password: string, keepSignedIn: boolean) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  onGoogle: () => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
}

export default function AuthScreen({
  busy,
  banner,
  onSignIn,
  onSignUp,
  onGoogle,
  onForgotPassword,
}: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLocalError(null);

    try {
      if (mode === 'signin') {
        await onSignIn(email, password, keepSignedIn);
      } else {
        await onSignUp(email, password);
      }
    } catch {
      // Banner is owned by useAuth; keep the form in place.
    }
  };

  const handleForgot = async () => {
    setLocalError(null);
    if (!email.trim()) {
      setLocalError('Enter your email above, then tap Forgot Password.');
      return;
    }

    try {
      await onForgotPassword(email);
    } catch {
      // Banner owned by useAuth.
    }
  };

  const visibleBanner = offline
    ? { tone: 'error' as const, message: 'You appear to be offline. Reconnect to the internet and try again.' }
    : localError
      ? { tone: 'error' as const, message: localError }
      : banner;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muz-bg px-4 py-10 text-muz-text">
      <AuthAtmosphere />

      <div className="relative z-10 w-full max-w-[440px] rounded-3xl border border-white/10 bg-muz-panel/95 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-sm sm:p-10">
        <MuzMark />

        <h1 className="mt-7 text-3xl font-semibold tracking-tight text-white">
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muz-muted">
          {mode === 'signin'
            ? 'Enter your credentials to access your console'
            : 'Start learning piano with posture and pitch feedback.'}
        </p>

        {visibleBanner ? (
          <div className="mt-6">
            <ErrorBanner {...visibleBanner} />
          </div>
        ) : null}

        <form className="mt-7 space-y-5" onSubmit={submit}>
          <label className="block">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muz-muted">
              Email Address
            </span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@domain.com"
              className="w-full rounded-xl border border-white/10 bg-muz-bg/80 px-4 py-3.5 text-white outline-none ring-muz-accent/40 placeholder:text-slate-500 focus:border-muz-accent focus:ring-2"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muz-muted">
              Password
            </span>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === 'signin' ? '••••••••' : 'At least 6 characters'}
                className="w-full rounded-xl border border-white/10 bg-muz-bg/80 px-4 py-3.5 pr-16 text-white outline-none ring-muz-accent/40 placeholder:text-slate-500 focus:border-muz-accent focus:ring-2"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-3 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muz-accent hover:text-muz-accentStrong"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          {mode === 'signin' ? (
            <div className="flex items-center justify-between gap-3 text-sm">
              <label className="inline-flex cursor-pointer items-center gap-2 text-muz-muted">
                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={(event) => setKeepSignedIn(event.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-muz-bg text-muz-accent focus:ring-muz-accent"
                />
                Keep me signed in
              </label>
              <button
                type="button"
                disabled={busy || offline}
                onClick={() => void handleForgot()}
                className="font-medium text-muz-accent hover:text-muz-accentStrong disabled:opacity-60"
              >
                Forgot Password?
              </button>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy || offline}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-muz-accent px-4 py-3.5 font-semibold text-white transition hover:bg-muz-accentStrong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === 'signin' ? 'Sign In' : 'Create account'}
          </button>
        </form>

        <div className="my-7 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          <span className="h-px flex-1 bg-white/10" />
          Or continue with
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          disabled={busy || offline}
          onClick={() => {
            setLocalError(null);
            void onGoogle().catch(() => undefined);
          }}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-transparent px-4 py-3.5 font-medium text-white transition hover:border-white/30 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <GoogleIcon className="h-5 w-5" />
          Continue with Google
        </button>

        <p className="mt-8 text-center text-sm text-muz-muted">
          {mode === 'signin' ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setLocalError(null);
                }}
                className={cn('font-semibold text-muz-accent hover:text-muz-accentStrong')}
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setLocalError(null);
                }}
                className="font-semibold text-muz-accent hover:text-muz-accentStrong"
              >
                Sign In
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
