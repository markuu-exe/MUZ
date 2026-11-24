import { describe, expect, it, vi } from 'vitest';
import type { SaveLessonInput } from '../../progress/saveLessonResult';
import { backoffMs, createMemorySyncQueue, flushQueue, isNetworkError, reviveInput, serializeInput } from '../queue';

function input(lessonId: string, now = new Date('2026-11-24T10:00:00Z')): SaveLessonInput {
  return {
    userId: 'user-1',
    lesson: { passMark: 0.8, expReward: 120 },
    result: { lessonId } as unknown as SaveLessonInput['result'],
    now,
  };
}

function counterClock() {
  let t = 1000;
  return () => t++;
}

describe('isNetworkError', () => {
  it('is true for a failed fetch', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
  });
  it('is true when the store wraps a failed fetch in its own message', () => {
    expect(isNetworkError(new Error('Could not read your profile: TypeError: Failed to fetch'))).toBe(true);
  });
  it('is false for a rejected save', () => {
    expect(isNetworkError(new Error('Could not read your profile: permission denied'))).toBe(false);
  });
  it('is false for things that are not errors', () => {
    expect(isNetworkError('boom')).toBe(false);
  });
  it('is true when the browser reports offline', () => {
    vi.stubGlobal('navigator', { onLine: false });
    expect(isNetworkError(new Error('anything'))).toBe(true);
    vi.unstubAllGlobals();
  });
});

describe('backoffMs', () => {
  it('doubles from 1 s and stops at 30 s', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(backoffMs)).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000]);
  });
});

describe('serialising', () => {
  it('keeps the save time as a Date after a round trip', () => {
    const now = new Date('2026-11-24T10:00:00Z');
    const back = reviveInput(serializeInput(input('a', now)));
    expect(back.now).toEqual(now);
    expect(back.userId).toBe('user-1');
    expect(back.result.lessonId).toBe('a');
  });
});

describe('flushQueue', () => {
  it('saves oldest first and empties the queue', async () => {
    const queue = createMemorySyncQueue(counterClock());
    await queue.enqueue(input('first'));
    await queue.enqueue(input('second'));
    const order: string[] = [];
    const result = await flushQueue(queue, async (i) => void order.push(i.result.lessonId));
    expect(order).toEqual(['first', 'second']);
    expect(result).toEqual({ saved: 2, failed: 0 });
    expect(await queue.list()).toEqual([]);
  });

  it('keeps a failed item and raises its retry count', async () => {
    const queue = createMemorySyncQueue(counterClock());
    await queue.enqueue(input('a'));
    const result = await flushQueue(queue, async () => {
      throw new Error('Failed to fetch');
    });
    expect(result).toEqual({ saved: 0, failed: 1 });
    const items = await queue.list();
    expect(items).toHaveLength(1);
    expect(items[0].retryCount).toBe(1);
  });

  it('keeps saving the others when one fails', async () => {
    const queue = createMemorySyncQueue(counterClock());
    await queue.enqueue(input('bad'));
    await queue.enqueue(input('good'));
    const result = await flushQueue(queue, async (i) => {
      if (i.result.lessonId === 'bad') throw new Error('nope');
    });
    expect(result).toEqual({ saved: 1, failed: 1 });
    expect((await queue.list()).map((i) => i.payload.result.lessonId)).toEqual(['bad']);
  });

  it('stops retrying an item after maxRetries but keeps it', async () => {
    const queue = createMemorySyncQueue(counterClock());
    await queue.enqueue(input('a'));
    const save = vi.fn(async () => {
      throw new Error('nope');
    });
    await flushQueue(queue, save, { maxRetries: 2 });
    await flushQueue(queue, save, { maxRetries: 2 });
    await flushQueue(queue, save, { maxRetries: 2 });
    expect(save).toHaveBeenCalledTimes(2);
    expect(await queue.list()).toHaveLength(1);
  });

  it('stops retrying after the default of 6 tries but keeps the item', async () => {
    const queue = createMemorySyncQueue(counterClock());
    await queue.enqueue(input('a'));
    const save = vi.fn(async () => {
      throw new Error('nope');
    });
    for (let i = 0; i < 8; i++) await flushQueue(queue, save);
    expect(save).toHaveBeenCalledTimes(6);
    expect(await queue.list()).toHaveLength(1);
  });
});
