import { CheckCircle2, CloudOff, RefreshCw } from 'lucide-react';

interface ConnectionStatusProps {
  online: boolean;
  /** Lesson results waiting in the offline queue for this learner. */
  pending: number;
  /** How many results were just synced (shown briefly), 0 when none. */
  justSynced: number;
}

function results(n: number): string {
  return `${n} lesson result${n === 1 ? '' : 's'}`;
}

/**
 * T-13 feedback: always tells the learner when the connection is gone and that
 * their results are being kept on this device, and when they have synced.
 * Sits above the lesson player (z-50) so it is visible during a lesson.
 */
export default function ConnectionStatus({ online, pending, justSynced }: ConnectionStatusProps) {
  let body: { icon: typeof CloudOff; text: string; tone: string } | null = null;
  if (!online) {
    body = {
      icon: CloudOff,
      text:
        pending > 0
          ? `You're offline. ${results(pending)} saved on this device, will sync when you reconnect.`
          : "You're offline. Keep practising: results are saved on this device and sync when you reconnect.",
      tone: 'border-amber-400/50 bg-amber-950/90 text-amber-100',
    };
  } else if (pending > 0) {
    body = { icon: RefreshCw, text: `Back online. Syncing ${results(pending)}…`, tone: 'border-sky-400/50 bg-sky-950/90 text-sky-100' };
  } else if (justSynced > 0) {
    body = { icon: CheckCircle2, text: `Synced ${results(justSynced)}. Your progress is up to date.`, tone: 'border-emerald-400/50 bg-emerald-950/90 text-emerald-100' };
  }
  if (!body) return null;
  const Icon = body.icon;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed left-1/2 top-3 z-[55] flex -translate-x-1/2 items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold shadow-lg backdrop-blur ${body.tone}`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {body.text}
    </div>
  );
}
