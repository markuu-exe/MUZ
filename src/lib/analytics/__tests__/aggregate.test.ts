import { describe, expect, it } from 'vitest';
import { COURSE_LESSONS, lessonEngines } from '../../../content';
import {
  metricsMeasured,
  rhythmHistogram,
  toSessions,
  type PerformanceSample,
} from '../aggregate';

function findLessonId(predicate: (engines: ReturnType<typeof lessonEngines>) => boolean): string {
  const found = COURSE_LESSONS.find((l) => predicate(lessonEngines(l.payload)));
  if (!found) throw new Error('Expected matching course lesson');
  return found.id;
}

const RHYTHM_ONLY_LESSON_ID = findLessonId(
  (e) => e.includes('rhythm') && !e.includes('practice'),
);
const PRACTICE_LESSON_ID = findLessonId((e) => e.includes('practice'));

describe('analytics aggregate (T-12)', () => {
  it('returns empty sessions and zeroed histogram buckets for empty input', () => {
    expect(toSessions([])).toEqual([]);
    expect(rhythmHistogram([])).toEqual([
      { bucket: '0–59', count: 0 },
      { bucket: '60–69', count: 0 },
      { bucket: '70–79', count: 0 },
      { bucket: '80–89', count: 0 },
      { bucket: '90–100', count: 0 },
    ]);
  });

  it('derives measured engines from bundled course content', () => {
    expect(metricsMeasured(RHYTHM_ONLY_LESSON_ID)).toEqual({
      pitch: false,
      rhythm: true,
      posture: false,
    });
    expect(metricsMeasured(PRACTICE_LESSON_ID).pitch).toBe(true);
    expect(metricsMeasured(PRACTICE_LESSON_ID).posture).toBe(true);
  });

  it('gives null pitch and posture for a rhythm-only row', () => {
    const rows: PerformanceSample[] = [
      {
        lesson_id: RHYTHM_ONLY_LESSON_ID,
        session_timestamp: '2026-11-24T10:00:00',
        pitch_accuracy: 0,
        rhythm_consistency: 84,
        posture_score: 0,
        drill_duration_sec: 90,
      },
    ];

    expect(toSessions(rows)).toEqual([
      {
        day: '2026-11-24',
        pitch: null,
        rhythm: 84,
        posture: null,
        minutes: 1.5,
      },
    ]);
  });

  it('averages measured metrics across multiple rows on the same local day', () => {
    const rows: PerformanceSample[] = [
      {
        lesson_id: RHYTHM_ONLY_LESSON_ID,
        session_timestamp: '2026-11-24T09:00:00',
        pitch_accuracy: 0,
        rhythm_consistency: 80,
        posture_score: 0,
        drill_duration_sec: 60,
      },
      {
        lesson_id: PRACTICE_LESSON_ID,
        session_timestamp: '2026-11-24T15:00:00',
        pitch_accuracy: 92,
        rhythm_consistency: 0,
        posture_score: 96,
        drill_duration_sec: 120,
      },
      {
        lesson_id: PRACTICE_LESSON_ID,
        session_timestamp: '2026-11-24T16:00:00',
        pitch_accuracy: 98,
        rhythm_consistency: 0,
        posture_score: 90,
        drill_duration_sec: 60,
      },
    ];

    const sessions = toSessions(rows, (id) =>
      id === RHYTHM_ONLY_LESSON_ID
        ? { pitch: false, rhythm: true, posture: false }
        : { pitch: true, rhythm: false, posture: true },
    );

    expect(sessions).toEqual([
      {
        day: '2026-11-24',
        pitch: 95,
        rhythm: 80,
        posture: 93,
        minutes: 4,
      },
    ]);
  });

  it('places rhythm scores at bucket edges (59/60, 89/90) and ignores non-rhythm rows', () => {
    const makeRow = (lesson_id: string, rhythm_consistency: number): PerformanceSample => ({
      lesson_id,
      session_timestamp: '2026-11-24T12:00:00',
      pitch_accuracy: 0,
      rhythm_consistency,
      posture_score: 0,
      drill_duration_sec: 30,
    });

    const rows = [
      makeRow(RHYTHM_ONLY_LESSON_ID, 59),
      makeRow(RHYTHM_ONLY_LESSON_ID, 60),
      makeRow(RHYTHM_ONLY_LESSON_ID, 69.9),
      makeRow(RHYTHM_ONLY_LESSON_ID, 70),
      makeRow(RHYTHM_ONLY_LESSON_ID, 89),
      makeRow(RHYTHM_ONLY_LESSON_ID, 90),
      makeRow(RHYTHM_ONLY_LESSON_ID, 100),
      // Non-rhythm row with 0 should not pollute the 0–59 bucket.
      makeRow('practice-only-id', 0),
    ];

    const hist = rhythmHistogram(rows, (id) =>
      id === RHYTHM_ONLY_LESSON_ID
        ? { pitch: false, rhythm: true, posture: false }
        : { pitch: true, rhythm: false, posture: true },
    );

    expect(hist).toEqual([
      { bucket: '0–59', count: 1 },
      { bucket: '60–69', count: 2 },
      { bucket: '70–79', count: 1 },
      { bucket: '80–89', count: 1 },
      { bucket: '90–100', count: 2 },
    ]);
  });
});
