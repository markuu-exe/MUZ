import ViewportGuard from './components/common/ViewportGuard';
import AuthBoot from './components/auth/AuthBoot';
import AuthScreen from './components/auth/AuthScreen';
import OnboardingScreen from './components/auth/OnboardingScreen';
import SkillTreeScreen from './components/dashboard/SkillTreeScreen';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const auth = useAuth();

  return (
    <>
      <ViewportGuard />

      {auth.loading || (auth.session && !auth.profile && !auth.needsOnboarding) ? (
        <AuthBoot />
      ) : !auth.session ? (
        <AuthScreen
          busy={auth.busy}
          banner={auth.banner}
          onSignIn={auth.signIn}
          onSignUp={auth.signUp}
          onGoogle={auth.signInWithGoogle}
          onForgotPassword={auth.forgotPassword}
        />
      ) : auth.needsOnboarding ? (
        <OnboardingScreen busy={auth.busy} banner={auth.banner} onComplete={auth.completeOnboarding} />
      ) : auth.profile ? (
        <SkillTreeScreen profile={auth.profile} onSignOut={auth.signOut} />
      ) : (
        <AuthBoot />
      )}
    </>
  );
}
