import { describe, expect, it } from 'vitest';
import { COURSE_LESSONS, COURSE_UNITS } from '../../../content';
import { buildLessonNotes, NOTES_MAX_UNIT } from '../lessonNotes';

describe('buildLessonNotes', () => {
  const notes = buildLessonNotes(COURSE_LESSONS, COURSE_UNITS);

  it('covers every unit that has notes (unit 12 is a performance unit with none)', () => {
    expect(NOTES_MAX_UNIT).toBe(12);
    expect(notes.map((u) => u.unit)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('tags each unit with its tier for the Lessons filter', () => {
    expect(notes.find((u) => u.unit === 1)?.tier).toBe('novice');
    expect(notes.find((u) => u.unit === 6)?.tier).toBe('proficient');
    expect(notes.find((u) => u.unit === 10)?.tier).toBe('virtuoso');
  });

  it('takes every concept card from those units, in course order', () => {
    const cards = notes.flatMap((u) => u.lessons.flatMap((l) => l.cards));
    // 31 concept cards in units 1–4 and 41 in units 5–11.
    expect(cards).toHaveLength(72);
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
