import { AlertTriangle, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ViewportGuard() {
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 720,
  });

  useEffect(() => {
    const update = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const isCompact = dimensions.width < 1024;

  if (!isCompact) {
    return null;
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="viewport-guard-title"
      aria-describedby="viewport-guard-desc"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/95 p-6 backdrop-blur-md"
    >
      <div className="relative max-w-lg overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-8 text-center shadow-[0_0_50px_rgba(245,158,11,0.25)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
          <Monitor className="h-8 w-8 motion-safe:animate-pulse" aria-hidden="true" />
        </div>

        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          Display Viewport Notice
        </div>

        <h2 id="viewport-guard-title" className="mt-4 text-2xl font-black tracking-tight text-white">
          Expanded Desktop Display Required
        </h2>

        <p id="viewport-guard-desc" className="mt-3 text-sm leading-relaxed text-slate-300">
          MUZ interactive piano instruction is engineered exclusively for desktop and laptop displays at a minimum native resolution of <strong className="text-white">1280 × 720</strong>.
        </p>

        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Current Window Width:</span>
            <span className="font-mono font-bold text-amber-400">{dimensions.width} px</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-400">Required Minimum Width:</span>
            <span className="font-mono font-bold text-emerald-400">1024 px (1280px+ recommended)</span>
          </div>
        </div>

        <p className="mt-5 text-xs text-slate-400">
          Please maximize or expand your browser window to resume your piano practice flow.
        </p>
      </div>
    </div>
  );
}
