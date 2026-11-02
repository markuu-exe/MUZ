import {
  Activity,
  Headphones,
  ShieldCheck,
  Sparkles,
  LogOut,
  Flame,
  Award,
  Music2,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import ViewportGuard from './components/common/ViewportGuard';
import { LoginPage } from './components/auth/LoginPage';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { user, profile, loading, signOut, isDemo } = useAuth();

  // Loading state while checking session
  if (loading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muz-bg text-muz-text">
        <div className="relative flex flex-col items-center">
          <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700 bg-muz-panel shadow-glow">
            <Music2 className="h-8 w-8 text-muz-accent animate-pulse" />
            <div className="absolute -inset-1 rounded-2xl border border-muz-accent/30 blur-sm animate-ping" />
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin text-muz-accent" />
            <span className="text-sm font-medium tracking-wide">Initializing MUZ secure session...</span>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, show the Login Page
  if (!user) {
    return <LoginPage />;
  }

  const statCards = [
    {
      label: 'Practice Streak',
      value: `${profile?.current_streak ?? 1} Days`,
      sub: profile?.current_streak && profile.current_streak > 7 ? 'Active commitment' : 'Daily streak',
      icon: Flame,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Experience Points',
      value: `${(profile?.exp ?? 100).toLocaleString()} XP`,
      sub: 'Acoustic mastery',
      icon: Award,
      color: 'text-muz-accent',
      bg: 'bg-muz-accent/10',
    },
    {
      label: 'Posture Compliance',
      value: '96%',
      sub: 'Elbow & wrist locked',
      icon: Activity,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
    },
  ];

  const displayName = profile?.username || user.email?.split('@')[0] || 'Pianist';

  return (
    <>
      <ViewportGuard />

      <main className="min-h-screen bg-muz-bg text-muz-text">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
          {/* Header with App Branding and Authenticated User Bar */}
          <header className="flex flex-col gap-4 rounded-2xl border border-slate-700/80 bg-muz-panel p-5 shadow-glow md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.32em] text-muz-muted">MUZ</p>
                {isDemo && (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                    Guest Demo Session
                  </span>
                )}
                {!isDemo && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-muz-accent/30 bg-muz-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muz-accent">
                    <CheckCircle className="h-2.5 w-2.5" /> Authenticated
                  </span>
                )}
              </div>
              <h1 className="mt-1 text-2xl md:text-3xl font-semibold text-white">
                Piano practice command center
              </h1>
            </div>

            {/* User Profile Info & Sign Out */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-slate-700/70 bg-slate-900/80 px-3.5 py-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-muz-accent to-emerald-600 font-bold text-slate-950 text-sm">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-white leading-tight">{displayName}</p>
                  <p className="text-[11px] text-muz-muted truncate max-w-[150px]">{user.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => signOut()}
                title="Sign out of MUZ"
                className="group flex h-10 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3 text-xs font-medium text-slate-300 hover:border-muz-danger/50 hover:bg-muz-danger/10 hover:text-muz-danger transition-colors"
              >
                <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </header>

          {/* User Stats Grid */}
          <section className="grid gap-4 md:grid-cols-3">
            {statCards.map(({ label, value, sub, icon: Icon, color, bg }) => (
              <div key={label} className="rounded-2xl border border-slate-700 bg-muz-panelStrong p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${bg} ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs text-slate-500 font-medium">{sub}</span>
                </div>
                <p className="text-sm text-muz-muted">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
              </div>
            ))}
          </section>

          {/* Practice flow and verification */}
          <section className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
            <div className="rounded-3xl border border-slate-700 bg-muz-panel p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Practice flow</h2>
                  <p className="text-xs text-muz-muted mt-0.5">Dual-stream AI pose estimation + chromagram pitch tracking</p>
                </div>
                <span className="rounded-full border border-muz-accent/40 bg-muz-accent/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-muz-accent">
                  Live Engine
                </span>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
                  <div className="flex justify-between items-center text-sm">
                    <p className="text-muz-muted">Listening / Latching window</p>
                    <span className="text-xs font-mono text-muz-accent">400 ms</span>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-muz-accent to-muz-accentStrong" />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
                  <p className="text-sm font-semibold text-slate-200">Dual-criteria verification criteria</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-muz-accent" />
                      <span><strong>Posture:</strong> elbow 80°–110° and wrist 150°–180°</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-muz-accent" />
                      <span><strong>Acoustic:</strong> monophonic pitch ±35¢ or chord match ≥ 0.72</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-muz-accent" />
                      <span><strong>Latch window:</strong> 400 ms stability lock</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <aside className="rounded-3xl border border-slate-700 bg-muz-panel p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="h-5 w-5 text-muz-accent" />
                <h2 className="text-lg font-semibold text-white">System guarantees</h2>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-slate-200">
                <li className="flex items-start gap-2">
                  <span className="text-muz-accent mt-0.5">•</span>
                  <span>Browser-only inference, no external biometric uploads</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muz-accent mt-0.5">•</span>
                  <span>WASM + model weight lazy-loading after route mount</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muz-accent mt-0.5">•</span>
                  <span>60 FPS canvas overlay, zero React re-renders for HUD</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muz-accent mt-0.5">•</span>
                  <span>IndexedDB sync queue + exponential backoff</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muz-accent mt-0.5">•</span>
                  <span>Supabase RLS secured session active for {user.email}</span>
                </li>
              </ul>
            </aside>
          </section>
        </div>
      </main>
    </>
  );
}
