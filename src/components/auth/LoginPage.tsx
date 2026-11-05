import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  Music,
  Music2,
  Music3,
  Music4,
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

// White key x-offsets and black key positions for a 3-octave wireframe piano wave
const WHITE_KEY_INDICES = Array.from({ length: 22 }, (_, i) => i);
const BLACK_KEY_OFFSETS = [0, 1, 3, 4, 5, 7, 8, 10, 11, 12, 14, 15, 17, 18, 19];

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

  // Helper to compute smooth wave Y offset for the wireframe piano keys
  const getWaveY = (x: number) =>
    Math.sin((x / 1440) * Math.PI * 2.2) * 28 +
    Math.cos((x / 1440) * Math.PI * 1.1) * 12;

  return (
    <div className="relative flex h-dvh w-full items-center justify-center overflow-hidden bg-muz-bg px-4 text-muz-text selection:bg-muz-accent selection:text-slate-950">
      {/* Subtle Musical Background Accents & Edge Glows */}
      <div className="pointer-events-none absolute inset-0 select-none overflow-hidden" aria-hidden="true">
        {/* Core & Edge Soft Glowing Musical Accents */}
        <div className="absolute -top-36 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-muz-accent/10 blur-[130px]" />
        <div className="absolute -bottom-36 left-1/3 h-[360px] w-[360px] rounded-full bg-sky-500/10 blur-[120px]" />
        <div className="animate-edge-glow absolute -left-24 -top-24 h-72 w-72 rounded-full bg-muz-accent/10 blur-[100px]" />
        <div className="animate-edge-glow-delayed absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-sky-400/10 blur-[110px]" />
        <div className="animate-edge-glow-delayed absolute -right-20 top-1/4 h-56 w-56 rounded-full bg-emerald-400/8 blur-[95px]" />
        <div className="animate-edge-glow absolute -left-20 bottom-1/4 h-56 w-56 rounded-full bg-sky-500/8 blur-[95px]" />

        {/* Soft Glowing Corner Acoustic Resonance Arcs */}
        <svg
          className="animate-edge-glow absolute -left-12 -top-12 h-64 w-64 text-muz-accent/15"
          viewBox="0 0 200 200"
          fill="none"
        >
          <circle cx="0" cy="0" r="70" stroke="currentColor" strokeWidth="0.75" strokeDasharray="4 6" />
          <circle cx="0" cy="0" r="110" stroke="currentColor" strokeWidth="0.6" />
          <circle cx="0" cy="0" r="150" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 8" />
        </svg>

        <svg
          className="animate-edge-glow-delayed absolute -bottom-12 -right-12 h-64 w-64 text-sky-400/15"
          viewBox="0 0 200 200"
          fill="none"
        >
          <circle cx="200" cy="200" r="70" stroke="currentColor" strokeWidth="0.75" strokeDasharray="4 6" />
          <circle cx="200" cy="200" r="110" stroke="currentColor" strokeWidth="0.6" />
          <circle cx="200" cy="200" r="150" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 8" />
        </svg>

        {/* Subtle Drifting Stave Lines (Upper & Mid Ribbon) */}
        <svg
          className="animate-staff-wave absolute -left-[5%] top-[10%] h-[260px] w-[110%]"
          viewBox="0 0 1440 260"
          fill="none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="staveGradPrimary" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#73e0a9" stopOpacity="0" />
              <stop offset="20%" stopColor="#73e0a9" stopOpacity="0.16" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.1" />
              <stop offset="80%" stopColor="#73e0a9" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#73e0a9" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 12, 24, 36, 48].map((offset) => (
            <path
              key={`upper-stave-${offset}`}
              d={`M -40 ${90 + offset} C 320 ${35 + offset}, 680 ${150 + offset}, 1060 ${70 + offset} C 1260 ${30 + offset}, 1380 ${95 + offset}, 1480 ${80 + offset}`}
              stroke="url(#staveGradPrimary)"
              strokeWidth="1"
            />
          ))}
          {/* Subtle Measure Barlines & Harmonic Nodes on Stave */}
          <line x1="280" y1="73" x2="280" y2="121" stroke="#73e0a9" strokeOpacity="0.12" strokeWidth="1" />
          <line x1="1150" y1="58" x2="1150" y2="106" stroke="#38bdf8" strokeOpacity="0.12" strokeWidth="1" />
          <circle cx="220" cy="88" r="3" fill="#73e0a9" fillOpacity="0.22" />
          <circle cx="340" cy="103" r="2.5" fill="#38bdf8" fillOpacity="0.2" />
          <circle cx="1090" cy="79" r="3" fill="#73e0a9" fillOpacity="0.22" />
          <circle cx="1210" cy="94" r="2.5" fill="#38bdf8" fillOpacity="0.18" />
        </svg>

        {/* Secondary Counter-Drifting Stave Lines */}
        <svg
          className="animate-staff-wave-slow absolute -left-[5%] bottom-[16%] h-[220px] w-[110%]"
          viewBox="0 0 1440 220"
          fill="none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="staveGradSecondary" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
              <stop offset="25%" stopColor="#38bdf8" stopOpacity="0.13" />
              <stop offset="50%" stopColor="#73e0a9" stopOpacity="0.08" />
              <stop offset="75%" stopColor="#73e0a9" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 11, 22, 33, 44].map((offset) => (
            <path
              key={`lower-stave-${offset}`}
              d={`M -40 ${110 + offset} C 380 ${165 + offset}, 760 ${45 + offset}, 1140 ${125 + offset} C 1300 ${155 + offset}, 1400 ${105 + offset}, 1480 ${115 + offset}`}
              stroke="url(#staveGradSecondary)"
              strokeWidth="0.9"
            />
          ))}
        </svg>

        {/* Minimalist Wireframe Piano Key Wave with Slow Floating Physics */}
        <svg
          className="animate-piano-wave absolute -left-[4%] bottom-[3%] h-[190px] w-[108%]"
          viewBox="0 0 1440 200"
          fill="none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="pianoWireframeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#73e0a9" stopOpacity="0" />
              <stop offset="15%" stopColor="#73e0a9" stopOpacity="0.22" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.16" />
              <stop offset="85%" stopColor="#73e0a9" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#73e0a9" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="blackKeyFillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#73e0a9" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#070b14" stopOpacity="0.35" />
            </linearGradient>
          </defs>

          {/* Upper and Lower Continuous Wave Rails */}
          <path
            d={`M ${WHITE_KEY_INDICES.map((i) => {
              const x = 60 + i * 60;
              const y = 68 + getWaveY(x);
              return `${i === 0 ? '' : 'L '}${x} ${y.toFixed(1)}`;
            }).join(' ')}`}
            stroke="url(#pianoWireframeGrad)"
            strokeWidth="1"
          />
          <path
            d={`M ${WHITE_KEY_INDICES.map((i) => {
              const x = 42 + i * 60;
              const y = 148 + getWaveY(x) * 1.08;
              return `${i === 0 ? '' : 'L '}${x} ${y.toFixed(1)}`;
            }).join(' ')}`}
            stroke="url(#pianoWireframeGrad)"
            strokeWidth="1.1"
          />
          <path
            d={`M ${WHITE_KEY_INDICES.map((i) => {
              const x = 42 + i * 60;
              const y = 155 + getWaveY(x) * 1.08;
              return `${i === 0 ? '' : 'L '}${x} ${y.toFixed(1)}`;
            }).join(' ')}`}
            stroke="url(#pianoWireframeGrad)"
            strokeWidth="0.6"
            strokeDasharray="3 5"
          />

          {/* White Key Wireframe Divisions & Lip Ticks */}
          {WHITE_KEY_INDICES.map((i) => {
            const xTop = 60 + i * 60;
            const yTop = 68 + getWaveY(xTop);
            const xBot = 42 + i * 60;
            const yBot = 148 + getWaveY(xTop) * 1.08;
            return (
              <g key={`wk-${i}`}>
                <line
                  x1={xTop}
                  y1={yTop}
                  x2={xBot}
                  y2={yBot}
                  stroke="url(#pianoWireframeGrad)"
                  strokeWidth="0.85"
                />
                <line
                  x1={xBot}
                  y1={yBot}
                  x2={xBot}
                  y2={yBot + 7}
                  stroke="url(#pianoWireframeGrad)"
                  strokeWidth="0.85"
                />
              </g>
            );
          })}

          {/* Raised Minimalist Wireframe Black Keys */}
          {BLACK_KEY_OFFSETS.map((keyIdx) => {
            const xTop = 60 + (keyIdx + 0.68) * 60;
            const yTop = 64 + getWaveY(xTop);
            const xBot = 50 + (keyIdx + 0.68) * 60;
            const yBot = 112 + getWaveY(xTop) * 1.04;
            const w = 22;
            const hLift = 6;

            return (
              <g key={`bk-${keyIdx}`}>
                {/* 3D Top Face of Black Key */}
                <polygon
                  points={`${xTop},${yTop - hLift} ${xTop + w},${yTop - hLift + 1.5} ${xBot + w},${yBot - hLift + 1.5} ${xBot},${yBot - hLift}`}
                  fill="url(#blackKeyFillGrad)"
                  stroke="url(#pianoWireframeGrad)"
                  strokeWidth="0.95"
                />
                {/* Front Bevel Wireframe Lines */}
                <line
                  x1={xBot}
                  y1={yBot - hLift}
                  x2={xBot}
                  y2={yBot}
                  stroke="url(#pianoWireframeGrad)"
                  strokeWidth="0.8"
                />
                <line
                  x1={xBot + w}
                  y1={yBot - hLift + 1.5}
                  x2={xBot + w}
                  y2={yBot + 1.5}
                  stroke="url(#pianoWireframeGrad)"
                  strokeWidth="0.8"
                />
                <line
                  x1={xBot}
                  y1={yBot}
                  x2={xBot + w}
                  y2={yBot + 1.5}
                  stroke="url(#pianoWireframeGrad)"
                  strokeWidth="0.8"
                />
              </g>
            );
          })}
        </svg>

        {/* Small Floating Music Notes (Slow Floating Physics around Perimeter) */}
        <div className="animate-music-drift-1 absolute left-[10%] top-[18%] text-muz-accent/30 drop-shadow-[0_0_10px_rgba(115,224,169,0.35)]">
          <Music className="h-4 w-4" />
        </div>
        <div className="animate-music-drift-2 absolute right-[12%] top-[16%] text-sky-400/30 drop-shadow-[0_0_10px_rgba(56,189,248,0.35)]">
          <Music2 className="h-5 w-5" />
        </div>
        <div className="animate-music-drift-3 absolute left-[15%] bottom-[24%] text-muz-accent/25 drop-shadow-[0_0_8px_rgba(115,224,169,0.3)]">
          <Music3 className="h-4 w-4" />
        </div>
        <div className="animate-music-drift-4 absolute right-[14%] bottom-[26%] text-sky-300/25 drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]">
          <Music4 className="h-4 w-4" />
        </div>
        <span className="animate-music-drift-5 absolute left-[24%] top-[11%] font-serif text-lg text-muz-accent/25 drop-shadow-[0_0_8px_rgba(115,224,169,0.3)]">
          𝄞
        </span>
        <span className="animate-music-drift-6 absolute right-[23%] top-[28%] text-sm text-sky-300/25 drop-shadow-[0_0_8px_rgba(56,189,248,0.25)]">
          ♫
        </span>
        <span className="animate-music-drift-2 absolute left-[7%] top-[48%] text-xs text-muz-accent/25 drop-shadow-[0_0_6px_rgba(115,224,169,0.25)]">
          ♪
        </span>
        <span className="animate-music-drift-5 absolute right-[8%] top-[52%] text-sm text-muz-accent/25 drop-shadow-[0_0_6px_rgba(115,224,169,0.25)]">
          ♬
        </span>

        {/* Salt-and-Pepper Ambient Particles & Soft Glowing Edge Micro-Touches */}
        <span className="animate-pulse absolute left-[6%] top-[26%] h-1.5 w-1.5 rounded-full bg-muz-accent/40 shadow-[0_0_8px_#73e0a9]" />
        <span className="animate-pulse absolute right-[7%] top-[22%] h-1 w-1 rounded-full bg-sky-400/45 shadow-[0_0_8px_#38bdf8]" />
        <span className="animate-pulse absolute left-[19%] bottom-[16%] h-1 w-1 rounded-full bg-muz-accent/35 shadow-[0_0_6px_#73e0a9]" />
        <span className="animate-pulse absolute right-[20%] bottom-[14%] h-1.5 w-1.5 rounded-full bg-sky-300/35 shadow-[0_0_8px_#38bdf8]" />
        <span className=" absolute left-[29%] top-[36%] h-1 w-1 rounded-full bg-slate-400/20" />
        <span className="absolute right-[28%] top-[40%] h-1 w-1 rounded-full bg-slate-400/20" />
        <span className="absolute left-[12%] bottom-[38%] h-0.5 w-0.5 rounded-full bg-slate-300/25" />
        <span className="absolute right-[11%] bottom-[42%] h-0.5 w-0.5 rounded-full bg-slate-300/25" />

        {/* Subtle Edge Equalizer Glow Micro-Accents */}
        <div className=" hidden sm:flex items-end gap-1 absolute bottom-6 left-7 h-5 opacity-35">
          <span className="animate-eq-1 w-0.5 rounded-full bg-muz-accent shadow-[0_0_6px_#73e0a9]" />
          <span className="animate-eq-2 w-0.5 rounded-full bg-muz-accent shadow-[0_0_6px_#73e0a9]" />
          <span className="animate-eq-3 w-0.5 rounded-full bg-sky-400 shadow-[0_0_6px_#38bdf8]" />
          <span className="animate-eq-4 w-0.5 rounded-full bg-muz-accent shadow-[0_0_6px_#73e0a9]" />
          <span className="animate-eq-5 w-0.5 rounded-full bg-sky-400 shadow-[0_0_6px_#38bdf8]" />
        </div>
        <div className="hidden sm:flex items-end gap-1 absolute top-6 right-7 h-5 opacity-30">
          <span className="animate-eq-3 w-0.5 rounded-full bg-sky-400 shadow-[0_0_6px_#38bdf8]" />
          <span className="animate-eq-1 w-0.5 rounded-full bg-muz-accent shadow-[0_0_6px_#73e0a9]" />
          <span className="animate-eq-5 w-0.5 rounded-full bg-muz-accent shadow-[0_0_6px_#73e0a9]" />
          <span className="animate-eq-2 w-0.5 rounded-full bg-sky-400 shadow-[0_0_6px_#38bdf8]" />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-[400px]">
        {/* Minimal Brand Header with App Name Cleanly Above Form */}
        <div className="mb-5 text-center">
          <div className="mb-2.5 inline-flex items-center gap-2.5 rounded-2xl border border-slate-800/90 bg-muz-panel/90 px-3.5 py-1.5 shadow-glow backdrop-blur-md">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-muz-accent/15 text-muz-accent">
              <Music className="h-4 w-4" />
            </div>
            <span className="text-sm font-extrabold uppercase tracking-[0.28em] text-white">
              MUZ
            </span>
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
