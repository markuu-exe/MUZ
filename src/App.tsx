import { Loader2, Music2 } from 'lucide-react';
import ViewportGuard from './components/common/ViewportGuard';
import { LoginPage } from './components/auth/LoginPage';
import DashboardScreen from './components/dashboard/DashboardScreen';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#0b0e18] text-white">
        <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
          <Music2 className="h-8 w-8 animate-pulse" />
        </div>
        <div className="flex items-center gap-2 text-sm text-white/70">
          <Loader2 className="h-4 w-4 animate-spin text-violet-300" />
          Loading your piano dashboard...
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <>
      <ViewportGuard />
      <DashboardScreen />
    </>
  );
}
