import { describe, expect, it } from 'vitest';
import { COURSE_LESSONS, COURSE_UNITS } from '../../../content';
import { buildLessonNotes, NOTES_MAX_UNIT } from '../lessonNotes';

describe('buildLessonNotes', () => {
  const notes = buildLessonNotes(COURSE_LESSONS, COURSE_UNITS);

  it('covers the Novice units (1–4) only', () => {
    expect(NOTES_MAX_UNIT).toBe(4);
    expect(notes.map((u) => u.unit)).toEqual([1, 2, 3, 4]);
  });

  it('takes every concept card from those units, in course order', () => {
    const cards = notes.flatMap((u) => u.lessons.flatMap((l) => l.cards));
    // 11 + 8 + 6 + 6 concept cards in units 1–4 at b32f3e1.
    expect(cards).toHaveLength(31);
    expect(cards[0].title).toBe('Seven letters');
    for (const card of cards) {
      expect(card.title.length).toBeGreaterThan(0);
      expect(card.body.length).toBeGreaterThan(0);
    }
  });

  it('skips lessons that have no concept cards', () => {
    for (const unit of notes) {
      for (const lesson of unit.lessons) expect(lesson.cards.length).toBeGreaterThan(0);
    }
  });

  it('respects a different unit limit', () => {
    expect(buildLessonNotes(COURSE_LESSONS, COURSE_UNITS, 1).map((u) => u.unit)).toEqual([1]);
  });
});
