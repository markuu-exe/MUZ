import { AlertCircle, Info, WifiOff } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ErrorBannerProps {
  tone?: 'error' | 'info';
  message: string;
}

export default function ErrorBanner({ tone = 'error', message }: ErrorBannerProps) {
  const offline = message.toLowerCase().includes('offline') || message.toLowerCase().includes('network');
  const Icon = tone === 'info' ? Info : offline ? WifiOff : AlertCircle;

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-6',
        tone === 'info'
          ? 'border-muz-accent/40 bg-muz-accent/10 text-muz-accent'
          : 'border-muz-danger/40 bg-muz-danger/10 text-rose-200',
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
