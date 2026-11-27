/**
 * E9: loading and error states for parts of the app that are downloaded only when
 * opened (React.lazy). A failed download is usually a dropped connection or a new
 * deployment that replaced the old file names; reloading the page fetches the
 * current files. React.lazy remembers a failed import, so "Try again" reloads.
 */
import { Component, Suspense, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface LazyBoundaryProps {
  children: ReactNode;
  /** What is loading, for the status text ("lesson", "profile"). */
  label: string;
  /** Cover the screen (the lesson player) instead of filling the content area. */
  overlay?: boolean;
  /** Offered beside "Try again" when the part could not be loaded (e.g. close the lesson). */
  onCancel?: () => void;
}

function Frame({ overlay, children }: { overlay?: boolean; children: ReactNode }) {
  return overlay ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-muz-bg/95 px-4">{children}</div>
  ) : (
    <div className="flex min-h-[240px] items-center justify-center px-4">{children}</div>
  );
}

class LoadErrorBoundary extends Component<LazyBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    const { overlay, label, onCancel, children } = this.props;
    if (!this.state.failed) return children;
    return (
      <Frame overlay={overlay}>
        <div role="alert" className="max-w-md rounded-2xl border border-rose-500/40 bg-slate-900 p-6 text-center">
          <p className="text-base font-bold text-white">The {label} could not be loaded.</p>
          <p className="mt-1 text-sm text-slate-400">Check your internet connection, then try again.</p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-500"
            >
              Try again
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={() => {
                  this.setState({ failed: false });
                  onCancel();
                }}
                className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-slate-400"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </Frame>
    );
  }
}

export default function LazyBoundary(props: LazyBoundaryProps) {
  const fallback = (
    <Frame overlay={props.overlay}>
      <p role="status" className="flex items-center gap-2 text-sm font-medium text-slate-300">
        <Loader2 className="h-4 w-4 animate-spin text-violet-400" aria-hidden="true" />
        Loading the {props.label}…
      </p>
    </Frame>
  );
  return (
    <LoadErrorBoundary {...props}>
      <Suspense fallback={fallback}>{props.children}</Suspense>
    </LoadErrorBoundary>
  );
}
