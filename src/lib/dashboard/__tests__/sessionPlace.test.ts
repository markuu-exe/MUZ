import { describe, expect, it } from 'vitest';
import { PLACE_KEY, findLessonStatus, parsePlace, readPlace, savePlace } from '../sessionPlace';
import { DEMO_CURRICULUM } from '../curriculum';

function memoryStore() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
}

describe('refresh returns to the same place (owner request 2026-11-27)', () => {
  it('round-trips the view and the open lesson for the same account', () => {
    const s = memoryStore();
    savePlace({ account: 'u1', view: 'profile', lessonId: 'pno-mod2-node1' }, s);
    expect(readPlace('u1', s)).toEqual({ view: 'profile', lessonId: 'pno-mod2-node1' });
  });

  it("never restores another account's place (sign-out, demo vs real account)", () => {
    const s = memoryStore();
    savePlace({ account: 'demo', view: 'settings', lessonId: 'pno-mod1-node1' }, s);
    expect(readPlace('u1', s)).toBeNull();
  });

  it('ignores missing, corrupt or unknown values', () => {
    expect(parsePlace(null, 'u1')).toBeNull();
    expect(parsePlace('{oops', 'u1')).toBeNull();
    expect(parsePlace(JSON.stringify({ account: 'u1', view: 'admin', lessonId: null }), 'u1')).toBeNull();
    expect(parsePlace(JSON.stringify({ account: 'u1', view: 'lessons', lessonId: 42 }), 'u1')).toEqual({ view: 'lessons', lessonId: null });
  });

  it('works without storage (private mode)', () => {
    expect(readPlace('u1', null)).toBeNull();
    expect(() => savePlace({ account: 'u1', view: 'skill-tree', lessonId: null }, null)).not.toThrow();
    const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(readPlace('u1', broken)).toBeNull();
    expect(() => savePlace({ account: 'u1', view: 'skill-tree', lessonId: null }, broken)).not.toThrow();
    expect(PLACE_KEY).toBe('muz-place');
  });

  it('finds the reopened lesson with its current unlock status (so a locked lesson is not reopened)', () => {
    const first = DEMO_CURRICULUM[0];
    const last = DEMO_CURRICULUM[DEMO_CURRICULUM.length - 1];
    expect(findLessonStatus(first.id, DEMO_CURRICULUM, {}, 0)).toMatchObject({ lesson: { id: first.id }, status: 'current' });
    expect(findLessonStatus(last.id, DEMO_CURRICULUM, {}, 0)?.status).toBe('locked');
    expect(findLessonStatus('no-such-lesson', DEMO_CURRICULUM, {}, 0)).toBeNull();
  });
});
