import { AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ViewportGuard() {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const update = () => setIsCompact(window.innerWidth < 1024);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  if (!isCompact) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-6">
      <div className="max-w-lg rounded-3xl border border-amber-500/50 bg-slate-900 p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="mt-5 text-2xl font-semibold text-white">Expanded layout required</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          MUZ is optimized for desktop practice sessions at 1280 × 720 and above. Please open the app on a larger display to continue your piano training flow.
        </p>
      </div>
    </div>
  );
}
