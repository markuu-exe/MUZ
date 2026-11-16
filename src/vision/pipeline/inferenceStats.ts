/**
 * T-09: rolling posture-worker figures for the ?debug performance overlay and the
 * T-19 hardware benchmark (SRS 3.4: 20–30 Hz, ≤ 35 ms per inference).
 */
const WINDOW = 120;

export interface InferenceSummary {
  samples: number;
  /** Worker-side detectForVideo time (ms). */
  inferenceP50: number | null;
  inferenceP95: number | null;
  /** Time between results arriving on the main thread (ms). */
  intervalP50: number | null;
  intervalP95: number | null;
  /** Result rate implied by the median interval. */
  hz: number | null;
}

/** Nearest-rank percentile of an ascending array. */
function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}

export class InferenceStats {
  private readonly inference: number[] = [];
  private readonly interval: number[] = [];
  private lastAtMs: number | null = null;

  /** One worker RESULT: its `inferenceMs`, and when it arrived (main-thread ms). */
  record(inferenceMs: number, atMs: number): void {
    push(this.inference, inferenceMs);
    if (this.lastAtMs !== null) push(this.interval, atMs - this.lastAtMs);
    this.lastAtMs = atMs;
  }

  summary(): InferenceSummary {
    const inf = [...this.inference].sort((a, b) => a - b);
    const gap = [...this.interval].sort((a, b) => a - b);
    const intervalP50 = percentile(gap, 50);
    return {
      samples: inf.length,
      inferenceP50: percentile(inf, 50),
      inferenceP95: percentile(inf, 95),
      intervalP50,
      intervalP95: percentile(gap, 95),
      hz: intervalP50 ? 1000 / intervalP50 : null,
    };
  }
}

function push(window: number[], value: number): void {
  window.push(value);
  if (window.length > WINDOW) window.shift();
}
