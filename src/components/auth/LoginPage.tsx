import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Music,
  Music2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  KeyRound,
  ShieldCheck,
  ArrowLeft,
  Flame,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type AuthMode = 'signin' | 'signup' | 'forgot' | 'magic';

interface LoginPageProps {
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithMagicLink,
    resetPasswordForEmail,
    enterDemoMode,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleModeChange = (newMode: AuthMode) => {
    clearMessages();
    setMode(newMode);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email || !password) {
      setErrorMessage('Please fill in both email and password.');
      return;
    }

    setLoading(true);
    const { error } = await signInWithEmail(email.trim(), password);
    setLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setErrorMessage('Invalid email or password. Please verify your credentials or try quick demo.');
      } else if (error.message.includes('Email not confirmed')) {
        setErrorMessage('Your email address has not been confirmed yet. Please check your inbox.');
      } else {
        setErrorMessage(error.message);
      }
    } else {
      if (onSuccess) onSuccess();
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email || !password) {
      setErrorMessage('Email and password are required.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    const { error, session } = await signUpWithEmail(email.trim(), password, username.trim());
    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
    } else if (session) {
      setSuccessMessage('Account created successfully! Welcome to MUZ.');
      if (onSuccess) onSuccess();
    } else {
      setSuccessMessage('Verification email sent! Check your inbox to confirm your account, or sign in.');
      setMode('signin');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email) {
      setErrorMessage('Please enter your email to receive recovery instructions.');
      return;
    }

    setLoading(true);
    const { error } = await resetPasswordForEmail(email.trim());
    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setSuccessMessage('Password reset link sent! Please check your email inbox.');
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email) {
      setErrorMessage('Please enter your email address for magic link login.');
      return;
    }

    setLoading(true);
    const { error } = await signInWithMagicLink(email.trim());
    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setSuccessMessage('Magic link sent! Check your email to sign in immediately without a password.');
    }
  };

  const handleDemoSignIn = () => {
    clearMessages();
    enterDemoMode();
    if (onSuccess) onSuccess();
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-muz-bg px-4 py-12 text-muz-text selection:bg-muz-accent selection:text-slate-900 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[550px] w-[550px] -translate-x-1/2 rounded-full bg-muz-accent/15 blur-[130px]" />
        <div className="absolute bottom-10 -right-20 h-[400px] w-[400px] rounded-full bg-muz-accentStrong/10 blur-[110px]" />
        <div className="absolute top-1/3 -left-24 h-[350px] w-[350px] rounded-full bg-sky-500/10 blur-[120px]" />

        {/* Decorative Musical Staff Wave in background */}
        <svg
          className="absolute inset-0 h-full w-full opacity-20 pointer-events-none animate-staff-wave"
          viewBox="0 0 1440 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* 5-line musical stave 1 */}
          <path
            d="M-50,220 C300,160 500,280 850,210 C1200,140 1350,230 1500,190"
            stroke="url(#staff-gradient)"
            strokeWidth="1.2"
          />
          <path
            d="M-50,235 C300,175 500,295 850,225 C1200,155 1350,245 1500,205"
            stroke="url(#staff-gradient)"
            strokeWidth="1.2"
          />
          <path
            d="M-50,250 C300,190 500,310 850,240 C1200,170 1350,260 1500,220"
            stroke="url(#staff-gradient)"
            strokeWidth="1.2"
          />
          <path
            d="M-50,265 C300,205 500,325 850,255 C1200,185 1350,275 1500,235"
            stroke="url(#staff-gradient)"
            strokeWidth="1.2"
          />
          <path
            d="M-50,280 C300,220 500,340 850,270 C1200,200 1350,290 1500,250"
            stroke="url(#staff-gradient)"
            strokeWidth="1.2"
          />

          {/* 5-line musical stave 2 (lower counter-melody) */}
          <path
            d="M-50,680 C350,740 600,620 950,690 C1250,750 1380,670 1500,700"
            stroke="url(#staff-gradient-subtle)"
            strokeWidth="1"
          />
          <path
            d="M-50,695 C350,755 600,635 950,705 C1250,765 1380,685 1500,715"
            stroke="url(#staff-gradient-subtle)"
            strokeWidth="1"
          />
          <path
            d="M-50,710 C350,770 600,650 950,720 C1250,780 1380,700 1500,730"
            stroke="url(#staff-gradient-subtle)"
            strokeWidth="1"
          />
          <path
            d="M-50,725 C350,785 600,665 950,735 C1250,795 1380,715 1500,745"
            stroke="url(#staff-gradient-subtle)"
            strokeWidth="1"
          />
          <path
            d="M-50,740 C350,800 600,680 950,750 C1250,810 1380,730 1500,760"
            stroke="url(#staff-gradient-subtle)"
            strokeWidth="1"
          />

          <defs>
            <linearGradient id="staff-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#73e0a9" stopOpacity="0" />
              <stop offset="25%" stopColor="#73e0a9" stopOpacity="0.45" />
              <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#73e0a9" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="staff-gradient-subtle" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
              <stop offset="40%" stopColor="#73e0a9" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Floating Musical Notes & Clef Elements */}
        {/* Treble Clef floating top left */}
        <div className="absolute top-[10%] left-[8%] font-serif text-5xl text-muz-accent/25 select-none animate-music-drift-1 drop-shadow-[0_0_15px_rgba(115,224,169,0.3)]">
          𝄞
        </div>

        {/* Beamed Eighth Notes floating top right */}
        <div className="absolute top-[18%] right-[12%] font-serif text-4xl text-sky-400/30 select-none animate-music-drift-2 drop-shadow-[0_0_12px_rgba(56,189,248,0.25)]">
          ♫
        </div>

        {/* Bass Clef floating bottom left */}
        <div className="absolute bottom-[16%] left-[10%] font-serif text-4xl text-muz-accent/20 select-none animate-music-drift-3 drop-shadow-[0_0_15px_rgba(115,224,169,0.2)]">
          𝄢
        </div>

        {/* Sixteenth Notes floating bottom right */}
        <div className="absolute bottom-[22%] right-[10%] font-serif text-3xl text-emerald-400/25 select-none animate-music-drift-4 drop-shadow-[0_0_10px_rgba(52,211,153,0.25)]">
          ♬
        </div>

        {/* Single Eighth Note floating mid left */}
        <div className="absolute top-[46%] left-[5%] font-serif text-3xl text-sky-300/20 select-none animate-music-drift-5">
          ♪
        </div>

        {/* Quarter Note floating mid right */}
        <div className="absolute top-[58%] right-[6%] font-serif text-3xl text-muz-accent/20 select-none animate-music-drift-6">
          ♩
        </div>

        {/* Sharp sign floating near header */}
        <div className="absolute top-[28%] left-[22%] font-serif text-2xl text-amber-300/20 select-none animate-music-drift-2">
          ♯
        </div>

        {/* Flat sign floating near bottom card */}
        <div className="absolute bottom-[32%] right-[22%] font-serif text-2xl text-sky-300/20 select-none animate-music-drift-3">
          ♭
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Brand identity header with Musical Equalizer */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center gap-3 rounded-2xl border border-slate-700/80 bg-muz-panel/90 px-4 py-2.5 shadow-glow backdrop-blur-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muz-accent/15 text-muz-accent">
              <Music className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="block font-black tracking-widest text-white text-base">MUZ</span>
                {/* Lively music frequency equalizer bars */}
                <div className="flex items-end gap-0.5 h-3.5 px-1">
                  <div className="w-1 rounded-full bg-muz-accent animate-eq-1" />
                  <div className="w-1 rounded-full bg-sky-400 animate-eq-2" />
                  <div className="w-1 rounded-full bg-muz-accent animate-eq-3" />
                  <div className="w-1 rounded-full bg-sky-400 animate-eq-4" />
                  <div className="w-1 rounded-full bg-muz-accent animate-eq-5" />
                </div>
              </div>
            </div>
          </div>

          <h2 className="mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {mode === 'signin' && 'Welcome back to practice'}
            {mode === 'signup' && 'Create your pianist account'}
            {mode === 'forgot' && 'Reset your password'}
            {mode === 'magic' && 'Passwordless sign in'}
          </h2>

          <p className="mt-2 text-sm text-muz-muted">
            {mode === 'signin' && 'Sign in to access real-time posture AI and acoustic pitch verification.'}
            {mode === 'signup' && 'Track posture angles, chord accuracy, and sync with Supabase.'}
            {mode === 'forgot' && "Enter your email address and we'll send a password recovery link."}
            {mode === 'magic' && 'Receive an instant one-click login link delivered directly to your inbox.'}
          </p>
        </div>

        {/* Main Auth Container Card */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-700/90 bg-muz-panel/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          {/* Decorative Piano Keys Trim along card top */}
          <div className="absolute top-0 inset-x-0 h-2 bg-slate-900 border-b border-slate-800 flex overflow-hidden">
            {[...Array(18)].map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-full border-r border-slate-700/60 ${
                  [1, 3, 6, 8, 10, 13, 15].includes(i % 14) ? 'bg-slate-950' : 'bg-slate-200/90'
                }`}
              />
            ))}
          </div>

          {/* Feedback alerts */}
          {errorMessage && (
            <div className="mt-2 mb-5 flex items-start gap-3 rounded-xl border border-muz-danger/30 bg-muz-danger/10 p-3.5 text-sm text-muz-danger animate-in fade-in duration-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="leading-snug">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="mt-2 mb-5 flex items-start gap-3 rounded-xl border border-muz-accent/30 bg-muz-accent/10 p-3.5 text-sm text-muz-accent animate-in fade-in duration-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="leading-snug">{successMessage}</div>
            </div>
          )}

          {/* Sign In Form */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4 pt-1">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muz-muted">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muz-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pianist@example.com"
                    required
                    autoComplete="email"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 transition-colors focus:border-muz-accent focus:outline-none focus:ring-1 focus:ring-muz-accent"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muz-muted">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => handleModeChange('forgot')}
                    className="text-xs text-muz-accent hover:underline focus:outline-none"
                  >
                    Forgot password?
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
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 transition-colors focus:border-muz-accent focus:outline-none focus:ring-1 focus:ring-muz-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muz-muted hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muz-muted">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-muz-accent focus:ring-muz-accent"
                  />
                  <span>Keep me signed in</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleModeChange('magic')}
                  className="hover:text-muz-accent transition-colors"
                >
                  Sign in with Magic Link
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-muz-accent to-muz-accentStrong py-3 text-sm font-semibold text-slate-950 shadow-glow transition hover:opacity-95 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* Separated Sign Up Link - No slider */}
              <div className="pt-3 text-center text-sm text-muz-muted">
                <span>Don&apos;t have an account? </span>
                <button
                  type="button"
                  onClick={() => handleModeChange('signup')}
                  className="font-semibold text-muz-accent transition-colors hover:underline hover:text-emerald-300 ml-1"
                >
                  Sign up
                </button>
              </div>
            </form>
          )}

          {/* Sign Up Form */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4 pt-1">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muz-muted">
                  Display / Pianist Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muz-muted" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. Rachmaninoff"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 transition-colors focus:border-muz-accent focus:outline-none focus:ring-1 focus:ring-muz-accent"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muz-muted">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muz-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pianist@example.com"
                    required
                    autoComplete="email"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 transition-colors focus:border-muz-accent focus:outline-none focus:ring-1 focus:ring-muz-accent"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muz-muted">
                  Password (min. 6 characters)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muz-muted" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 transition-colors focus:border-muz-accent focus:outline-none focus:ring-1 focus:ring-muz-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muz-muted hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muz-muted">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muz-muted" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 transition-colors focus:border-muz-accent focus:outline-none focus:ring-1 focus:ring-muz-accent"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-muz-accent to-muz-accentStrong py-3 text-sm font-semibold text-slate-950 shadow-glow transition hover:opacity-95 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Free Account</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* Separated Sign In Link - No slider */}
              <div className="pt-3 text-center text-sm text-muz-muted">
                <span>Already have an account? </span>
                <button
                  type="button"
                  onClick={() => handleModeChange('signin')}
                  className="font-semibold text-muz-accent transition-colors hover:underline hover:text-emerald-300 ml-1"
                >
                  Sign in
                </button>
              </div>
            </form>
          )}

          {/* Forgot Password Form */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4 pt-1">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muz-muted">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muz-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pianist@example.com"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 transition-colors focus:border-muz-accent focus:outline-none focus:ring-1 focus:ring-muz-accent"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-muz-accent to-muz-accentStrong py-3 text-sm font-semibold text-slate-950 shadow-glow transition hover:opacity-95 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sending link...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    <span>Send Reset Instructions</span>
                  </>
                )}
              </button>

              <div className="pt-3 flex flex-col items-center gap-2.5 text-center text-sm text-muz-muted">
                <button
                  type="button"
                  onClick={() => handleModeChange('signin')}
                  className="flex items-center justify-center gap-2 text-xs text-muz-muted hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to sign in</span>
                </button>
                <div className="text-xs">
                  <span>Don&apos;t have an account? </span>
                  <button
                    type="button"
                    onClick={() => handleModeChange('signup')}
                    className="font-semibold text-muz-accent hover:underline hover:text-emerald-300 ml-1"
                  >
                    Sign up
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Magic Link Form */}
          {mode === 'magic' && (
            <form onSubmit={handleMagicLink} className="space-y-4 pt-1">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muz-muted">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muz-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pianist@example.com"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 transition-colors focus:border-muz-accent focus:outline-none focus:ring-1 focus:ring-muz-accent"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-muz-accent to-muz-accentStrong py-3 text-sm font-semibold text-slate-950 shadow-glow transition hover:opacity-95 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sending magic link...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Send Magic Link</span>
                  </>
                )}
              </button>

              <div className="pt-3 flex flex-col items-center gap-2.5 text-center text-sm text-muz-muted">
                <button
                  type="button"
                  onClick={() => handleModeChange('signin')}
                  className="flex items-center justify-center gap-2 text-xs text-muz-muted hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to standard password login</span>
                </button>
                <div className="text-xs">
                  <span>Don&apos;t have an account? </span>
                  <button
                    type="button"
                    onClick={() => handleModeChange('signup')}
                    className="font-semibold text-muz-accent hover:underline hover:text-emerald-300 ml-1"
                  >
                    Sign up
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Quick Demo Access Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-muz-panel px-3 text-muz-muted flex items-center gap-1.5">
                <Music2 className="h-3 w-3 text-muz-accent" />
                <span>Instant Practice Access</span>
              </span>
            </div>
          </div>

          {/* 1-Click Guest / Demo Session */}
          <button
            type="button"
            onClick={handleDemoSignIn}
            className="group flex w-full items-center justify-between rounded-xl border border-slate-700/80 bg-slate-900/60 p-3.5 text-left text-sm transition-all hover:border-muz-accent/50 hover:bg-slate-800/80"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-muz-accent/15 group-hover:text-muz-accent transition-colors">
                <Flame className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-slate-200 group-hover:text-white">Explore as Virtuoso Guest</p>
                <p className="text-xs text-muz-muted">Try practice HUD & 14-day streak without sign-up</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muz-muted group-hover:translate-x-0.5 group-hover:text-muz-accent transition-all" />
          </button>
        </div>

        {/* Security / Technology Badge */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muz-muted">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-muz-accent" />
            Supabase Auth Protected
          </span>
          <span>•</span>
          <span>Client-side inference only</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
