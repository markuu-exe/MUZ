import MuzMark from './MuzMark';
import AuthAtmosphere from './AuthAtmosphere';

export default function AuthBoot() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muz-bg text-muz-text">
      <AuthAtmosphere />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <MuzMark />
        <p className="text-xs uppercase tracking-[0.42em] text-muz-muted">Loading</p>
      </div>
    </div>
  );
}
