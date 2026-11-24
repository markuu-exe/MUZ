import { Loader2, Music2 } from 'lucide-react';
import ViewportGuard from './components/common/ViewportGuard';
import { LoginPage } from './components/auth/LoginPage';
import DashboardScreen from './components/dashboard/DashboardScreen';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { user, loading, isPasswordRecovery } = useAuth();

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

  // If not authenticated or in password recovery flow, show the Login Page
  if (!user || isPasswordRecovery) {
    return (
      <>
        <ViewportGuard />
        <LoginPage />
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
