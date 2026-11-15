/** COURSE-5: small display pieces shared by the practice views. */
import { Heart } from 'lucide-react';
import { MAX_HEARTS } from '../../../lesson/runner';
import { cn } from '../../../lib/cn';
import { isBlackKey } from '../../../lib/theory/notes';
import PianoKeyboard from '../../theory/PianoKeyboard';

/** Circular countdown / progress ring. `fraction` is how much of the ring is filled (0–1). */
export function Ring({ fraction, label, tone }: { fraction: number; label: string; tone: 'violet' | 'rose' | 'emerald' }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const stroke = tone === 'rose' ? '#fb7185' : tone === 'emerald' ? '#34d399' : '#a78bfa';
  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
        <circle cx={36} cy={36} r={r} fill="none" stroke="rgba(148,163,184,0.2)" strokeWidth={6} />
        <circle
          cx={36}
          cy={36}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(1, fraction)))}
          style={{ transition: 'stroke-dashoffset 120ms linear', filter: `drop-shadow(0 0 6px ${stroke})` }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-white">{label}</span>
    </div>
  );
}

export function HeartRow({ hearts }: { hearts: number }) {
  return (
    <div className="flex gap-1" aria-label={`${hearts} of ${MAX_HEARTS} hearts`}>
      {Array.from({ length: MAX_HEARTS }, (_, i) => (
        <Heart key={i} className={cn('h-5 w-5', i < hearts ? 'fill-rose-500 text-rose-500' : 'text-slate-700')} />
      ))}
    </div>
  );
}

/** Input level bar: −60 dBFS (empty) to −10 dBFS (full). */
export function MicMeter({ rmsDb }: { rmsDb: number }) {
  const level = Number.isFinite(rmsDb) ? Math.max(0, Math.min(1, (rmsDb + 60) / 50)) : 0;
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <span>Mic</span>
      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-cyan-400 transition-[width] duration-100" style={{ width: `${level * 100}%` }} />
      </div>
    </div>
  );
}

const WHITE_W = 48; // PianoKeyboard key width

/** A silent, non-interactive keyboard scaled to fit `maxWidth`, with `notes` lit. */
export function TargetKeyboard({ notes, maxWidth = 440 }: { notes: number[]; maxWidth?: number }) {
  const lo = Math.min(...notes);
  const hi = Math.max(...notes);
  const start = Math.floor(lo / 12) * 12;
  const end = Math.max(start + 11, Math.ceil((hi + 1) / 12) * 12 - 1);
  let whites = 0;
  for (let m = start; m <= end; m++) if (!isBlackKey(m)) whites++;
  const width = whites * WHITE_W;
  const scale = Math.min(1, maxWidth / width);
  return (
    <div className="pointer-events-none mx-auto" style={{ width: width * scale, height: 160 * scale }} aria-hidden="true">
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width }}>
        <PianoKeyboard startMidi={start} endMidi={end} highlighted={notes} playSound={false} />
      </div>
    </div>
  );
}
