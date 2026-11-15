import { describe, expect, it } from 'vitest';
import { COURSE_LESSONS } from '../../../content';
import { PLACEMENT_OPTIONS, placementPlan } from '../placement';

describe('PLACEMENT_OPTIONS', () => {
  it('offers the first unit of each tier', () => {
    expect(PLACEMENT_OPTIONS.map((o) => o.startUnit)).toEqual([1, 5, 9]);
    expect(PLACEMENT_OPTIONS.map((o) => o.tier)).toEqual(['novice', 'proficient', 'virtuoso']);
  });
});

describe('placementPlan', () => {
  it('starting at unit 1 completes nothing and leaves EXP alone', () => {
    expect(placementPlan(COURSE_LESSONS, 1, 0)).toEqual({ completedLessonIds: [], exp: 0 });
  });

  it('starting at unit 5 completes every lesson in units 1–4', () => {
    const plan = placementPlan(COURSE_LESSONS, 5, 0);
    const expected = COURSE_LESSONS.filter((l) => l.module_index < 5).map((l) => l.id);
    expect(plan.completedLessonIds).toEqual(expected);
    expect(plan.completedLessonIds).toHaveLength(20);
  });

  it('raises EXP to the start unit’s first required_exp, so its first lesson unlocks', () => {
    const first = COURSE_LESSONS.find((l) => l.module_index === 9 && l.node_index === 1)!;
    expect(first.required_exp).toBeGreaterThan(0);
    expect(placementPlan(COURSE_LESSONS, 9, 0).exp).toBe(first.required_exp);
  });

  it('never lowers EXP the learner already has', () => {
    expect(placementPlan(COURSE_LESSONS, 5, 99_999).exp).toBe(99_999);
  });

  it('rejects a start unit that has no lessons', () => {
    expect(() => placementPlan(COURSE_LESSONS, 40, 0)).toThrow();
  });
});
