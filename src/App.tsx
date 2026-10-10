import { Activity, Headphones, ShieldCheck, Sparkles } from 'lucide-react';
import ViewportGuard from './components/common/ViewportGuard';

const statCards = [
  { label: 'Posture compliance', value: '96%', icon: Activity },
  { label: 'Pitch lock', value: '±35¢', icon: Headphones },
  { label: 'Offline resilience', value: 'Active', icon: ShieldCheck },
];

export default function App() {
  return (
    <>
      <ViewportGuard />

      <main className="min-h-screen bg-muz-bg text-muz-text">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
          <header className="flex items-center justify-between rounded-2xl border border-slate-700/80 bg-muz-panel p-5 shadow-glow">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-muz-muted">MUZ</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">Piano practice command center</h1>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-muz-accent/40 bg-muz-accent/10 px-4 py-2 text-sm text-muz-accent">
              <Sparkles className="h-4 w-4" />
              Edge-first learning loop
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            {statCards.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl border border-slate-700 bg-muz-panelStrong p-5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-muz-accent/10 text-muz-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm text-muz-muted">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
            <div className="rounded-3xl border border-slate-700 bg-muz-panel p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Practice flow</h2>
                <span className="rounded-full border border-muz-accent/40 bg-muz-accent/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-muz-accent">
                  Live
                </span>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
                  <p className="text-sm text-muz-muted">Listening / Latching window</p>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-muz-accent to-muz-accentStrong" />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
                  <p className="text-sm text-muz-muted">Dual-criteria verification</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-200">
                    <li>• Posture: elbow 80°–110° and wrist 150°–180°</li>
                    <li>• Acoustic: monophonic pitch ±35¢ or chord match ≥ 0.72</li>
                    <li>• Latch window: 400 ms</li>
                  </ul>
                </div>
              </div>
            </div>

            <aside className="rounded-3xl border border-slate-700 bg-muz-panel p-6">
              <h2 className="text-lg font-semibold text-white">Hard constraints</h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-200">
                <li>• Browser-only inference, no external biometric uploads</li>
                <li>• WASM + model weight lazy-loading after route mount</li>
                <li>• 60 FPS canvas overlay, no React re-renders for HUD</li>
                <li>• IndexedDB sync queue + exponential backoff</li>
                <li>• Supabase RLS scoped to piano only</li>
              </ul>
            </aside>
          </section>
        </div>
      </main>
    </>
  );
}
