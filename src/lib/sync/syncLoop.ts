/**
 * T-13: glue between the save call and the offline queue.
 * No React in here, so it can be tested without a browser.
 */
import type { SaveLessonInput } from '../progress/saveLessonResult';
import { backoffMs, flushQueue, isNetworkError, type SyncQueue } from './queue';

export const OFFLINE_NOTE = 'Saved offline. It will sync when you are back online.';

export type SaveOutcome<T> = { queued: false; value: T } | { queued: true };

/**
 * The part of a shared browser queue that belongs to one learner. Another
 * account's saves are never listed, so they are never replayed under the wrong
 * session (RLS would reject them and they would retry forever).
 */
export function queueForUser(queue: SyncQueue, userId: string): SyncQueue {
  return {
    enqueue: (input) => queue.enqueue(input),
    list: async () => (await queue.list()).filter((item) => item.payload.userId === userId),
    remove: (id) => queue.remove(id),
    bump: (id) => queue.bump(id),
  };
}

/** Try the save. If the network is down, queue it. Any other failure is rethrown. */
export async function saveOrQueue<T>(
  save: (input: SaveLessonInput) => Promise<T>,
  queue: SyncQueue,
  input: SaveLessonInput,
): Promise<SaveOutcome<T>> {
  try {
    return { queued: false, value: await save(input) };
  } catch (e) {
    if (!isNetworkError(e)) throw e;
    await queue.enqueue(input);
    return { queued: true };
  }
}

export interface QueueSyncOptions {
  queue: SyncQueue;
  save: (input: SaveLessonInput) => Promise<unknown>;
  /** Called after items were saved, so the screen can refresh. */
  onSynced?: (saved: number) => void;
  /** Where to listen for "online". Defaults to window. */
  target?: EventTarget;
  maxRetries?: number;
}

/**
 * Flushes the queue now, again whenever the browser goes online, and retries
 * with backoff while items keep failing. Returns a function that stops it.
 */
export function startQueueSync(opts: QueueSyncOptions): () => void {
  const target: EventTarget = opts.target ?? window;
  const maxRetries = opts.maxRetries ?? 6;
  let stopped = false;
  let running = false;
  let attempt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const run = async (): Promise<void> => {
    if (stopped || running) return;
    running = true;
    try {
      const { saved, failed } = await flushQueue(opts.queue, opts.save, { maxRetries });
      if (saved > 0) opts.onSynced?.(saved);
      if (stopped) return;
      const retryable = failed > 0 && (await opts.queue.list()).some((item) => item.retryCount < maxRetries);
      if (retryable) {
        timer = setTimeout(() => {
          void run();
        }, backoffMs(attempt++));
      } else {
        attempt = 0;
      }
    } finally {
      running = false;
    }
  };

  const onOnline = (): void => {
    attempt = 0;
    if (timer) clearTimeout(timer);
    void run();
  };

  target.addEventListener('online', onOnline);
  void run();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    target.removeEventListener('online', onOnline);
  };
}
