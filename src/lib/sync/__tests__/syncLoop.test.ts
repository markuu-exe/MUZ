import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SaveLessonInput } from '../../progress/saveLessonResult';
import { createMemorySyncQueue } from '../queue';
import { queueForUser, saveOrQueue, startQueueSync } from '../syncLoop';

function input(lessonId = 'a', userId = 'user-1'): SaveLessonInput {
  return {
    userId,
    lesson: { passMark: 0.8, expReward: 120 },
    result: { lessonId } as unknown as SaveLessonInput['result'],
    now: new Date('2026-11-25T10:00:00Z'),
  };
}

describe('saveOrQueue', () => {
  it('returns the saved value and queues nothing when the save works', async () => {
    const queue = createMemorySyncQueue();
    const out = await saveOrQueue(async () => 'ok', queue, input());
    expect(out).toEqual({ queued: false, value: 'ok' });
    expect(await queue.list()).toEqual([]);
  });

  it('queues the input when the network is down', async () => {
    const queue = createMemorySyncQueue();
    const out = await saveOrQueue(
      async () => {
        throw new TypeError('Failed to fetch');
      },
      queue,
      input(),
    );
    expect(out).toEqual({ queued: true });
    expect(await queue.list()).toHaveLength(1);
  });

  it('rethrows a rejected save and queues nothing', async () => {
    const queue = createMemorySyncQueue();
    await expect(
      saveOrQueue(
        async () => {
          throw new Error('Could not save lesson progress: permission denied');
        },
        queue,
        input(),
      ),
    ).rejects.toThrow('permission denied');
    expect(await queue.list()).toEqual([]);
  });
});

describe('startQueueSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('flushes the queue as soon as it starts', async () => {
    const queue = createMemorySyncQueue();
    await queue.enqueue(input());
    const save = vi.fn(async () => undefined);
    const onSynced = vi.fn();
    const stop = startQueueSync({ queue, save, onSynced, target: new EventTarget() });
    await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenCalledTimes(1);
    expect(onSynced).toHaveBeenCalledWith(1);
    expect(await queue.list()).toEqual([]);
    stop();
  });

  it('flushes again when the browser goes online', async () => {
    const queue = createMemorySyncQueue();
    await queue.enqueue(input());
    const save = vi
      .fn<(i: SaveLessonInput) => Promise<unknown>>()
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValue(undefined);
    const target = new EventTarget();
    const onSynced = vi.fn();
    const stop = startQueueSync({ queue, save, onSynced, target });
    await vi.advanceTimersByTimeAsync(0);
    expect(await queue.list()).toHaveLength(1);
    target.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(0);
    expect(await queue.list()).toEqual([]);
    expect(onSynced).toHaveBeenCalledWith(1);
    stop();
  });

  it('retries after the backoff delay', async () => {
    const queue = createMemorySyncQueue();
    await queue.enqueue(input());
    const save = vi
      .fn<(i: SaveLessonInput) => Promise<unknown>>()
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValue(undefined);
    const stop = startQueueSync({ queue, save, target: new EventTarget() });
    await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(999);
    expect(save).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(2);
    expect(await queue.list()).toEqual([]);
    stop();
  });

  it('does nothing after it is stopped', async () => {
    const queue = createMemorySyncQueue();
    const save = vi.fn(async () => undefined);
    const target = new EventTarget();
    const stop = startQueueSync({ queue, save, target });
    await vi.advanceTimersByTimeAsync(0);
    stop();
    await queue.enqueue(input());
    target.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(5000);
    expect(save).not.toHaveBeenCalled();
  });
});

describe('queueForUser', () => {
  it("lists and replays only the signed-in learner's saves", async () => {
    const shared = createMemorySyncQueue();
    await shared.enqueue(input('a', 'user-1'));
    await shared.enqueue(input('b', 'user-2'));
    const mine = queueForUser(shared, 'user-1');
    expect((await mine.list()).map((i) => i.payload.result.lessonId)).toEqual(['a']);

    const save = vi.fn(async () => undefined);
    const stop = startQueueSync({ queue: mine, save, target: new EventTarget() });
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    stop();
    expect((await shared.list()).map((i) => i.payload.userId)).toEqual(['user-2']);
  });
});
