/** Bench view for practice drills (UX 2026-11-27): big type readable from the piano bench. Per device. */
export const BENCH_VIEW_KEY = 'muz-bench-view';

export function readBenchView(): boolean {
  try {
    return window.localStorage.getItem(BENCH_VIEW_KEY) === 'on';
  } catch {
    return false;
  }
}

export function saveBenchView(on: boolean): void {
  try {
    window.localStorage.setItem(BENCH_VIEW_KEY, on ? 'on' : 'off');
  } catch {
    // Storage unavailable: the choice lasts for this page only.
  }
}
