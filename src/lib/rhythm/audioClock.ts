/**
 * The audible-time clock shared by tap stamping, the beat highway and the tap test.
 *
 * `getOutputTimestamp()` says which AudioContext time is leaving the speakers at a given
 * performance.now() time, so a key press can be placed on the same clock the clicks were
 * scheduled on. It is missing in some browsers (Safari) and returns performanceTime 0 until
 * output has started (Chrome); calling it unguarded threw or stamped taps seconds off.
 * The fallback uses currentTime minus the time since the event and the reported output
 * latency. Any constant error left is the same for every tap, and the tap test measures it.
 */

export interface AudioClockSource {
  currentTime: number;
  outputLatency?: number;
  getOutputTimestamp?: () => { contextTime?: number; performanceTime?: number };
}

/** AudioContext time that was audible at performance-clock time `perfMs` (e.g. a KeyboardEvent.timeStamp). */
export function audioTimeAt(ctx: AudioClockSource, perfMs: number, nowPerfMs: number = performance.now()): number {
  const ts = typeof ctx.getOutputTimestamp === 'function' ? ctx.getOutputTimestamp() : undefined;
  if (ts && ts.contextTime !== undefined && ts.performanceTime !== undefined && ts.performanceTime > 0) {
    return ts.contextTime + (perfMs - ts.performanceTime) / 1000;
  }
  const latency = Number.isFinite(ctx.outputLatency) ? (ctx.outputLatency as number) : 0;
  return ctx.currentTime - (nowPerfMs - perfMs) / 1000 - latency;
}
