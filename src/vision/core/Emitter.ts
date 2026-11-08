/**
 * Minimal typed event emitter. Zero dependencies, no allocations on emit
 * beyond the listener snapshot, safe against listeners unsubscribing mid-emit.
 */
export type Listener<T> = (payload: T) => void;

export class Emitter<Events extends Record<string, unknown>> {
  private listeners: { [K in keyof Events]?: Set<Listener<Events[K]>> } = {};

  on<K extends keyof Events>(event: K, fn: Listener<Events[K]>): () => void {
    const set = (this.listeners[event] ??= new Set());
    set.add(fn);
    return () => set.delete(fn);
  }

  protected emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const set = this.listeners[event];
    if (!set || set.size === 0) return;
    for (const fn of [...set]) {
      try {
        fn(payload);
      } catch (err) {
        // A broken UI listener must never take down the capture pipeline.
        console.error(`[vision] listener for "${String(event)}" threw`, err);
      }
    }
  }

  protected clearListeners(): void {
    this.listeners = {};
  }
}
