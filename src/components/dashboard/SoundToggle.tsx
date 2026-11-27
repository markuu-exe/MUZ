import { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { cn } from '../../lib/cn';
import { isSfxEnabled, playSfx, setSfxEnabled } from '../../lib/sfx';

/** Settings card: switch feedback sounds on or off (saved on this device). */
export default function SoundToggle() {
  const [on, setOn] = useState(isSfxEnabled);
  const toggle = () => {
    const next = !on;
    setSfxEnabled(next);
    setOn(next);
    if (next) playSfx('correct');
  };
  const Icon = on ? Volume2 : VolumeX;
  return (
    <div className="flex items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
      <div className="flex items-center gap-3">
        <Icon className={cn('h-5 w-5', on ? 'text-violet-300' : 'text-slate-400')} aria-hidden="true" />
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Sound effects</h3>
          <p className="mt-0.5 text-xs text-slate-400">Chimes for right and wrong answers and finished lessons. Never during microphone drills.</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Sound effects"
        onClick={toggle}
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400',
          on ? 'bg-violet-600' : 'bg-slate-700',
        )}
      >
        <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all', on ? 'left-6' : 'left-1')} />
      </button>
    </div>
  );
}
