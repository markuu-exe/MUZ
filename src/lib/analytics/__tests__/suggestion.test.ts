import { describe, expect, it } from 'vitest';
import { DEMO_CURRICULUM } from '../../dashboard/curriculum';
import { measuredSkills, practiceSuggestion, type RecentRow } from '../suggestion';

const byTitle = (t: string) => {
  const l = DEMO_CURRICULUM.find((x) => x.title === t);
  if (!l) throw new Error(`no lesson ${t}`);
  return l;
};
const RHYTHM = byTitle('Steady Pulse');
const NOTE = byTitle('Finding Middle C');
const POSTURE = byTitle('Hand Shape & Posture');
const CHORD = byTitle('C Major');
const THEORY = byTitle('The Musical Alphabet');

const NOW = new Date('2026-11-27T12:00:00Z');
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();
const allDone = Object.fromEntries(DEMO_CURRICULUM.map((l) => [l.id, { completed: true, accuracy_percentage: 100 }])) as never;
const BIG_EXP = 1_000_000;

const row = (lesson: { id: string }, d: number, m: Partial<RecentRow>): RecentRow => ({
  lesson_id: lesson.id,
  session_timestamp: daysAgo(d),
  pitch_accuracy: 0,
  rhythm_consistency: 0,
  posture_score: 0,
  ...m,
});

describe('which skills a lesson really measured', () => {
  it('reads them from the lesson’s exercises', () => {
    expect([...measuredSkills(RHYTHM)]).toEqual(['rhythm']);
    expect(measuredSkills(NOTE).has('notes')).toBe(true);
    expect(measuredSkills(CHORD).has('chords')).toBe(true);
    expect(measuredSkills(POSTURE).has('posture')).toBe(true);
    expect(measuredSkills(POSTURE).has('notes')).toBe(false); // a posture-only lesson's pitch 0 is not a score
    expect(measuredSkills(THEORY).size).toBe(0);
  });
});

describe('smart practice suggestion', () => {
  it('no data yet: no suggestion', () => {
    expect(practiceSuggestion([], DEMO_CURRICULUM, {}, 0, NOW)).toEqual({ kind: 'none' });
  });

  it('suggests replaying the weakest skill’s lowest-scoring open lesson, and explains why', () => {
    const rows = [
      row(RHYTHM, 1, { rhythm_consistency: 60 }),
      row(RHYTHM, 2, { rhythm_consistency: 55 }),
      row(RHYTHM, 3, { rhythm_consistency: 71 }),
      row(CHORD, 1, { pitch_accuracy: 90, posture_score: 95 }),
      row(CHORD, 2, { pitch_accuracy: 92, posture_score: 93 }),
    ];
    const s = practiceSuggestion(rows, DEMO_CURRICULUM, allDone, BIG_EXP, NOW);
    expect(s).toMatchObject({ kind: 'replay', skill: 'rhythm', average: 62, samples: 3, lastScore: 60 });
    if (s.kind !== 'replay') throw new Error();
    expect(s.lesson.id).toBe(RHYTHM.id);
    expect(s.explanation).toContain('Rhythm consistency averaged 62%');
    expect(s.explanation).toContain(`"${RHYTHM.title}" scored 60%`);
  });

  it('ignores the zeros a lesson did not measure (no fake 0% pitch from a posture-only lesson)', () => {
    const rows = [row(POSTURE, 1, { posture_score: 90 }), row(POSTURE, 2, { posture_score: 92 }), row(THEORY, 1, {})];
    const s = practiceSuggestion(rows, DEMO_CURRICULUM, allDone, BIG_EXP, NOW);
    expect(s.kind).toBe('all-good');
  });

  it('needs at least two measurements before judging a playing skill', () => {
    const s = practiceSuggestion([row(RHYTHM, 1, { rhythm_consistency: 10 })], DEMO_CURRICULUM, {}, 0, NOW);
    expect(s).toEqual({ kind: 'none' });
  });

  it('all skills at 80%+: says so instead of inventing a weakness', () => {
    const rows = [row(RHYTHM, 1, { rhythm_consistency: 85 }), row(RHYTHM, 2, { rhythm_consistency: 88 })];
    const s = practiceSuggestion(rows, DEMO_CURRICULUM, allDone, BIG_EXP, NOW);
    expect(s.kind).toBe('all-good');
    if (s.kind !== 'all-good') throw new Error();
    expect(s.skills).toContainEqual({ skill: 'rhythm', average: 87 });
    expect(s.skills).toContainEqual({ skill: 'theory', average: 100 });
  });

  it('never suggests a locked lesson', () => {
    const rows = [row(RHYTHM, 1, { rhythm_consistency: 40 }), row(RHYTHM, 2, { rhythm_consistency: 45 })];
    // No progress: Steady Pulse is locked, so there is nothing open to replay for rhythm.
    expect(practiceSuggestion(rows, DEMO_CURRICULUM, {}, 0, NOW).kind).toBe('all-good');
  });

  it('only looks at the last 30 days', () => {
    const rows = [row(RHYTHM, 31, { rhythm_consistency: 20 }), row(RHYTHM, 40, { rhythm_consistency: 20 })];
    expect(practiceSuggestion(rows, DEMO_CURRICULUM, {}, 0, NOW)).toEqual({ kind: 'none' });
  });

  it('reports a trend from the recent half versus the older half', () => {
    const up = [70, 72, 50, 52].map((v, i) => row(RHYTHM, i + 1, { rhythm_consistency: v }));
    const down = [50, 52, 72, 74].map((v, i) => row(RHYTHM, i + 1, { rhythm_consistency: v }));
    expect(practiceSuggestion(up, DEMO_CURRICULUM, allDone, BIG_EXP, NOW)).toMatchObject({ trend: 'up' });
    expect(practiceSuggestion(down, DEMO_CURRICULUM, allDone, BIG_EXP, NOW)).toMatchObject({ trend: 'down' });
  });

  it('uses first-try accuracy of finished theory lessons, averaged over all of them', () => {
    const theory = DEMO_CURRICULUM.filter((l) => l.kind === 'theory');
    const oneWeak = { ...(allDone as object), [THEORY.id]: { completed: true, accuracy_percentage: 50 } } as never;
    expect(practiceSuggestion([], DEMO_CURRICULUM, oneWeak, BIG_EXP, NOW).kind).toBe('all-good'); // one weak lesson among strong ones
    const progress = Object.fromEntries(
      DEMO_CURRICULUM.map((l) => [l.id, { completed: true, accuracy_percentage: l.kind === 'theory' ? (l.id === THEORY.id ? 50 : 70) : 100 }]),
    ) as never;
    expect(theory.length).toBeGreaterThan(1);
    const s = practiceSuggestion([], DEMO_CURRICULUM, progress, BIG_EXP, NOW);
    expect(s).toMatchObject({ kind: 'replay', skill: 'theory', lastScore: 50 });
    if (s.kind !== 'replay') throw new Error();
    expect(s.lesson.id).toBe(THEORY.id);
  });
});
