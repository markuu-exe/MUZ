/**
 * T-13: offline progress queue (SRS 3.3.2b, SDD C-08).
 * Saves that fail because the network is down are stored here and replayed later.
 */
import { openDB } from 'idb';
import type { SaveLessonInput } from '../progress/saveLessonResult';

/** SaveLessonInput with `now` as an ISO string, so it can be stored. */
export type SerializedSaveInput = Omit<SaveLessonInput, 'now'> & { now: string };

export interface SyncQueueItem {
  id: string;
  endpoint: 'saveLessonResult';
  payload: SerializedSaveInput;
  retryCount: number;
  timestamp: number;
}

export interface SyncQueue {
  enqueue(input: SaveLessonInput): Promise<void>;
  list(): Promise<SyncQueueItem[]>;
  remove(id: string): Promise<void>;
  bump(id: string): Promise<void>;
}

export function serializeInput(input: SaveLessonInput): SerializedSaveInput {
  const plain = JSON.parse(JSON.stringify({ ...input, now: undefined })) as Omit<SaveLessonInput, 'now'>;
  return { ...plain, now: (input.now ?? new Date()).toISOString() };
}

export function reviveInput(payload: SerializedSaveInput): SaveLessonInput {
  return { ...payload, now: new Date(payload.now) };
}

/** True when the failure looks like a lost connection, not a rejected save. */
export function isNetworkError(e: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  if (!(e instanceof Error)) return false;
  return /failed to fetch|networkerror|load failed|network request failed/i.test(e.message);
}

/** Wait before retry number `retryCount`: 1 s, 2 s, 4 s ... capped at 30 s. */
export function backoffMs(retryCount: number): number {
  return Math.min(30_000, 1000 * 2 ** retryCount);
}

/**
 * Replays queued saves oldest first. A saved item is removed. A failed item gets
 * its retry count raised and stays queued until it reaches maxRetries.
 */
export async function flushQueue(
  queue: SyncQueue,
  save: (input: SaveLessonInput) => Promise<unknown>,
  opts: { maxRetries?: number } = {},
): Promise<{ saved: number; failed: number }> {
  const maxRetries = opts.maxRetries ?? 6;
  const items = (await queue.list()).sort((a, b) => a.timestamp - b.timestamp);
  let saved = 0;
  let failed = 0;
  for (const item of items) {
    if (item.retryCount >= maxRetries) {
      failed++;
      continue;
    }
    try {
      await save(reviveInput(item.payload));
      await queue.remove(item.id);
      saved++;
    } catch {
      await queue.bump(item.id);
      failed++;
    }
  }
  return { saved, failed };
}

/** In-memory queue: used by the tests, and as a fallback if IndexedDB is unavailable. */
export function createMemorySyncQueue(clock: () => number = Date.now): SyncQueue {
  const items = new Map<string, SyncQueueItem>();
  let counter = 0;
  return {
    async enqueue(input) {
      const id = `mem-${counter++}`;
      items.set(id, { id, endpoint: 'saveLessonResult', payload: serializeInput(input), retryCount: 0, timestamp: clock() });
    },
    async list() {
      return [...items.values()].map((item) => ({ ...item }));
    },
    async remove(id) {
      items.delete(id);
    },
    async bump(id) {
      const item = items.get(id);
      if (item) items.set(id, { ...item, retryCount: item.retryCount + 1 });
    },
  };
}

const STORE = 'sync_queue';

/** IndexedDB-backed queue (survives page reloads). */
export async function openSyncQueue(dbName = 'muz-sync'): Promise<SyncQueue> {
  const db = await openDB(dbName, 1, {
    upgrade(database) {
      database.createObjectStore(STORE, { keyPath: 'id' });
    },
  });
  return {
    async enqueue(input) {
      const item: SyncQueueItem = {
        id: crypto.randomUUID(),
        endpoint: 'saveLessonResult',
        payload: serializeInput(input),
        retryCount: 0,
        timestamp: Date.now(),
      };
      await db.put(STORE, item);
    },
    async list() {
      return (await db.getAll(STORE)) as SyncQueueItem[];
    },
    async remove(id) {
      await db.delete(STORE, id);
    },
    async bump(id) {
      const tx = db.transaction(STORE, 'readwrite');
      const item = (await tx.store.get(id)) as SyncQueueItem | undefined;
      if (item) await tx.store.put({ ...item, retryCount: item.retryCount + 1 });
      await tx.done;
    },
  };
}
