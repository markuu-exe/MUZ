import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  Music,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type AuthMode = 'signin' | 'signup' | 'forgot';

interface LoginPageProps {
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const {
    signInWithEmail,
    signUpWithEmail,
    resetPasswordForEmail,
    enterDemoMode,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleModeChange = (newMode: AuthMode) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setMode(newMode);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    setLoading(true);
    const { error } = await signInWithEmail(email.trim(), password);
    setLoading(false);

    if (error) {
      setErrorMessage(
        error.message.toLowerCase().includes('invalid login credentials')
          ? 'Invalid email or password.'
          : error.message
      );
    } else if (onSuccess) {
      onSuccess();
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Email and password are required.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error, session } = await signUpWithEmail(email.trim(), password, username.trim());
    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
    } else if (session) {
      if (onSuccess) onSuccess();
    } else {
      setSuccessMessage('Verification link sent! Please check your email.');
      setMode('signin');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setLoading(true);
    const { error } = await resetPasswordForEmail(email.trim());
    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setSuccessMessage('Password reset link sent to your email.');
    }
  };

  const handleDemoSignIn = () => {
    enterDemoMode('virtuoso');
    if (onSuccess) onSuccess();
  };

  return (
    <div className="relative flex h-dvh w-full items-center justify-center overflow-hidden bg-muz-bg px-4 text-muz-text selection:bg-muz-accent selection:text-slate-950">
      {/* Subtle Ambient Glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-36 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-muz-accent/10 blur-[130px]" />
        <div className="absolute -bottom-36 left-1/3 h-[360px] w-[360px] rounded-full bg-sky-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-[400px]">
        {/* Minimal Brand Header */}
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-800 bg-muz-panel shadow-glow">
            <Music className="h-5 w-5 text-muz-accent" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {mode === 'signin' && 'Welcome back'}
            {mode === 'signup' && 'Create an account'}
            {mode === 'forgot' && 'Reset password'}
          </h1>
          <p className="mt-1 text-xs text-muz-muted">
            {mode === 'signin' && 'Sign in to continue to MUZ Studio'}
            {mode === 'signup' && 'Start your piano practice journey today'}
            {mode === 'forgot' && "We'll send a recovery link to your inbox"}
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-3xl border border-slate-800/90 bg-muz-panel/90 p-6 shadow-2xl backdrop-blur-xl">
          {/* Segmented Switcher */}
          {mode !== 'forgot' && (
            <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-950/80 p-1 border border-slate-800/80">
              <button
                type="button"
                onClick={() => handleModeChange('signin')}
                className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                  mode === 'signin'
                    ? 'bg-muz-accent text-slate-950 shadow-sm'
                    : 'text-muz-muted hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('signup')}
                className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                  mode === 'signup'
                    ? 'bg-muz-accent text-slate-950 shadow-sm'
                    : 'text-muz-muted hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Feedback Alert */}
          {errorMessage && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-muz-danger/30 bg-muz-danger/10 px-3 py-2 text-xs text-muz-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="truncate">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-muz-accent/30 bg-muz-accent/10 px-3 py-2 text-xs text-muz-accent">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{successMessage}</span>
            </div>
          )}

          {/* Sign In Form (2 input rows + button) */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muz-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="h-10 w-full rounded-xl border border-slate-700/80 bg-slate-900/80 pl-10 pr-3.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-muz-accent focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => handleModeChange('forgot')}
                    className="text-xs text-muz-accent hover:underline"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muz-muted" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="h-10 w-full rounded-xl border border-slate-700/80 bg-slate-900/80 pl-10 pr-10 text-sm text-white placeholder-slate-500 transition-colors focus:border-muz-accent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muz-muted hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-muz-accent to-muz-accentStrong text-sm font-semibold text-slate-950 shadow-glow transition hover:opacity-95 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Sign Up Form (2x2 grid = exact same 2 input rows + button height as Sign In) */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Username
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muz-muted" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Name"
                      autoComplete="username"
                      className="h-10 w-full rounded-xl border border-slate-700/80 bg-slate-900/80 pl-9 pr-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-muz-accent focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muz-muted" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      required
                      autoComplete="email"
                      className="h-10 w-full rounded-xl border border-slate-700/80 bg-slate-900/80 pl-9 pr-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-muz-accent focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muz-muted" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="6+ chars"
                      required
                      autoComplete="new-password"
                      className="h-10 w-full rounded-xl border border-slate-700/80 bg-slate-900/80 pl-9 pr-8 text-sm text-white placeholder-slate-500 transition-colors focus:border-muz-accent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muz-muted hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Confirm
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muz-muted" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat"
                      required
                      autoComplete="new-password"
                      className="h-10 w-full rounded-xl border border-slate-700/80 bg-slate-900/80 pl-9 pr-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-muz-accent focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-muz-accent to-muz-accentStrong text-sm font-semibold text-slate-950 shadow-glow transition hover:opacity-95 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Forgot Password Form */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muz-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="h-10 w-full rounded-xl border border-slate-700/80 bg-slate-900/80 pl-10 pr-3.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-muz-accent focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-muz-accent to-muz-accentStrong text-sm font-semibold text-slate-950 shadow-glow transition hover:opacity-95 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>Send Reset Link</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('signin')}
                className="flex w-full items-center justify-center gap-1.5 pt-1 text-xs text-muz-muted hover:text-white transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Sign In</span>
              </button>
            </form>
          )}

          {/* Divider & Guest Button */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-muz-panel px-2.5 text-muz-muted">or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDemoSignIn}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/60 text-xs font-medium text-slate-200 transition hover:border-muz-accent/50 hover:bg-slate-800/80 hover:text-white"
          >
            <span>Continue as Guest</span>
            <ArrowRight className="h-3.5 w-3.5 text-muz-accent" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
