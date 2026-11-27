import { describe, expect, it } from 'vitest';
import { DEMO_CURRICULUM, lessonsInOrder, nextLessonAfter } from '../curriculum';

const done = (...ids: string[]) => Object.fromEntries(ids.map((id) => [id, { completed: true }])) as never;

describe('continue and next lesson (UX 2026-11-27)', () => {
  const [a, b, c] = DEMO_CURRICULUM;

  it('lists lessons in path order with their status', () => {
    const ordered = lessonsInOrder(DEMO_CURRICULUM, {}, 0);
    expect(ordered[0]).toMatchObject({ lesson: { id: a.id }, status: 'current' });
    expect(ordered[1].status).toBe('locked');
  });

  it('after finishing a lesson, offers the next open, unmastered one', () => {
    expect(nextLessonAfter(a.id, DEMO_CURRICULUM, done(a.id), 1000)?.lesson.id).toBe(b.id);
  });

  it('skips lessons already mastered, and never offers a locked one', () => {
    expect(nextLessonAfter(a.id, DEMO_CURRICULUM, done(a.id, b.id), 1000)?.lesson.id).toBe(c.id);
    expect(nextLessonAfter(a.id, DEMO_CURRICULUM, {}, 0)).toBeNull(); // b is still locked
  });

  it('when everything later is mastered (replay / demo), offers the very next lesson', () => {
    const all = done(...DEMO_CURRICULUM.map((l) => l.id));
    expect(nextLessonAfter(a.id, DEMO_CURRICULUM, all, 100000)?.lesson.id).toBe(b.id);
  });

  it('returns null at the end of the course or for an unknown lesson', () => {
    const all = done(...DEMO_CURRICULUM.map((l) => l.id));
    const last = DEMO_CURRICULUM[DEMO_CURRICULUM.length - 1];
    expect(nextLessonAfter(last.id, DEMO_CURRICULUM, all, 100000)).toBeNull();
    expect(nextLessonAfter('nope', DEMO_CURRICULUM, all, 100000)).toBeNull();
  });
});
