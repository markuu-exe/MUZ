import { Moon, Sun } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useTheme, type Theme } from '../../lib/theme';

const OPTIONS: Array<{ id: Theme; label: string; icon: typeof Sun }> = [
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'light', label: 'Light', icon: Sun },
];

/** Settings card: dark or light appearance for the app (saved on this device). */
export default function AppearanceCard() {
  const [theme, setTheme] = useTheme();
  return (
    <div className="flex items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Appearance</h3>
        <p className="mt-0.5 text-xs text-slate-400">Dark is easier to read from the piano bench in a dim room; light suits bright rooms.</p>
      </div>
      <div className="flex shrink-0 gap-1 rounded-2xl border border-slate-800 bg-slate-950/60 p-1" role="radiogroup" aria-label="Appearance">
        {OPTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={theme === id}
            onClick={() => setTheme(id)}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition',
              theme === id ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
