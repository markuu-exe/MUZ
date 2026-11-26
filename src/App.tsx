import { useCallback, useEffect, useState } from 'react';
import { Loader2, Music2 } from 'lucide-react';
import ViewportGuard from './components/common/ViewportGuard';
import { LoginPage } from './components/auth/LoginPage';
import DashboardScreen from './components/dashboard/DashboardScreen';
import LandingPage from './components/landing/LandingPage';
import { useAuth } from './context/AuthContext';

/** Signed-out screens. `/login` and `/signup` open the auth form directly; anything else is the landing page. */
type PublicScreen = 'landing' | 'signin' | 'signup';

function screenFromPath(pathname: string): PublicScreen {
  if (pathname.startsWith('/login')) return 'signin';
  if (pathname.startsWith('/signup')) return 'signup';
  return 'landing';
}

const PATH_FOR: Record<PublicScreen, string> = { landing: '/', signin: '/login', signup: '/signup' };

export default function App() {
  const { user, loading, isPasswordRecovery, enterDemoMode } = useAuth();
  const [screen, setScreen] = useState<PublicScreen>(() => screenFromPath(window.location.pathname));

  const go = useCallback((next: PublicScreen) => {
    setScreen(next);
    if (window.location.pathname !== PATH_FOR[next]) {
      window.history.pushState(null, '', PATH_FOR[next] + window.location.hash);
    }
  }, []);

  useEffect(() => {
    const onPop = () => setScreen(screenFromPath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Once signed in (or in demo mode) the app lives at "/", so a later sign-out lands on the landing page.
  useEffect(() => {
    if (user && window.location.pathname !== '/') {
      window.history.replaceState(null, '', '/' + window.location.hash);
      setScreen('landing');
    }
  }, [user]);

  // Loading state while checking session
  if (loading) {
    return (
      <>
        <ViewportGuard />
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#070b14] text-white">
          <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-300">
            <Music2 className="h-8 w-8 animate-pulse" />
            <div className="absolute -inset-1 rounded-2xl border border-violet-500/30 blur-sm animate-ping" />
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
            <span className="text-sm font-medium tracking-wide">Initializing MUZ Piano Studio...</span>
          </div>
        </div>
      </>
    );
  }

  // Password recovery always goes straight to the auth form.
  if (isPasswordRecovery) {
    return (
      <>
        <ViewportGuard />
        <LoginPage />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <ViewportGuard />
        {screen === 'landing' ? (
          <LandingPage onSignIn={() => go('signin')} onSignUp={() => go('signup')} onDemo={() => enterDemoMode('virtuoso')} />
        ) : (
          <LoginPage key={screen} initialMode={screen === 'signup' ? 'signup' : 'signin'} onBack={() => go('landing')} />
        )}
      </>
    );
  }

  // Authenticated or Demo user: render the main desktop Dashboard
  return (
    <>
      <ViewportGuard />
      <DashboardScreen />
    </>
  );
}
