/**
 * Smart practice suggestion (owner request 2026-11-27): rule-based and free. From the last 30
 * days of the learner's own results, find the weakest skill and the lesson to replay for it,
 * and say plainly how it was chosen.
 *
 * Data used, and only when it was really measured:
 * - performance_records (one row per finished lesson that ran a playing or rhythm exercise):
 *   rhythm_consistency for lessons with a rhythm exercise; pitch_accuracy for lessons with a
 *   note drill ("notes") or a chord drill ("chords"); posture_score for lessons with any camera
 *   exercise. A metric the lesson did not measure is stored as 0 and is ignored here.
 * - user_progress.accuracy_percentage (first-try accuracy) of finished theory lessons ("theory").
 * A playing skill is judged on its last RECENT measurements (at least MIN_SAMPLES); theory on
 * every finished theory lesson (it has no session time), so one weak lesson among strong ones
 * is not called the weakest skill.
 * Locked lessons are never suggested. Nothing is sent anywhere; this runs in the browser.
 */
import { lessonsInOrder, type CurriculumNode, type NodeStatus, type ProgressMap } from '../dashboard/curriculum';
import { isLessonPayload, type ExerciseType } from '../../types/lesson.types';

export type Skill = 'rhythm' | 'notes' | 'chords' | 'posture' | 'theory';

export const SKILL_LABEL: Record<Skill, string> = {
  rhythm: 'Rhythm consistency',
  notes: 'Note accuracy',
  chords: 'Chord accuracy',
  posture: 'Posture',
  theory: 'Theory (first try)',
};

/** A skill below this average is worth practising. */
export const GOOD_ENOUGH = 80;
export const MIN_SAMPLES = 2;
/** Average over at most this many recent measurements. */
export const RECENT = 5;
export const WINDOW_DAYS = 30;

export interface RecentRow {
  lesson_id: string;
  session_timestamp: string;
  pitch_accuracy: number;
  rhythm_consistency: number;
  posture_score: number;
}

export type Trend = 'up' | 'down' | 'steady' | 'unknown';

export type Suggestion =
  | { kind: 'none' }
  | { kind: 'all-good'; skills: Array<{ skill: Skill; average: number }> }
  | {
      kind: 'replay';
      skill: Skill;
      average: number;
      samples: number;
      trend: Trend;
      lesson: CurriculumNode;
      status: NodeStatus;
      lastScore: number;
      explanation: string;
    };

const NOTE_TYPES: ExerciseType[] = ['play-note', 'play-sequence'];

/** Which skills a lesson's performance row actually measured, from its exercises. */
export function measuredSkills(lesson: CurriculumNode | undefined): Set<Exclude<Skill, 'theory'>> {
  const out = new Set<Exclude<Skill, 'theory'>>();
  if (!lesson || !isLessonPayload(lesson.payload)) return out;
  for (const stage of lesson.payload.stages) {
    for (const ex of stage.exercises) {
      if (ex.type.startsWith('tap-')) out.add('rhythm');
      if (ex.type === 'play-chord') out.add('chords');
      if (NOTE_TYPES.includes(ex.type)) out.add('notes');
      if (ex.type === 'posture-hold' || ex.type === 'play-note' || ex.type === 'play-chord' || ex.type === 'play-sequence') out.add('posture');
    }
  }
  return out;
}

interface Sample {
  lessonId: string;
  value: number;
  t: number;
}

function trendOf(samples: Sample[]): Trend {
  // samples: newest first.
  if (samples.length < 4) return 'unknown';
  const half = Math.floor(samples.length / 2);
  const avg = (xs: Sample[]) => xs.reduce((s, x) => s + x.value, 0) / xs.length;
  const diff = avg(samples.slice(0, half)) - avg(samples.slice(half));
  return diff > 5 ? 'up' : diff < -5 ? 'down' : 'steady';
}

export function practiceSuggestion(
  rows: readonly RecentRow[],
  lessons: CurriculumNode[],
  progress: ProgressMap,
  exp: number,
  now: Date = new Date(),
): Suggestion {
  const ordered = lessonsInOrder(lessons, progress, exp);
  const byId = new Map(ordered.map((x) => [x.lesson.id, x]));
  const since = now.getTime() - WINDOW_DAYS * 86_400_000;
  const samples = new Map<Skill, Sample[]>();
  const add = (skill: Skill, s: Sample) => samples.set(skill, [...(samples.get(skill) ?? []), s]);

  for (const row of rows) {
    const t = Date.parse(row.session_timestamp);
    if (!Number.isFinite(t) || t < since || t > now.getTime() + 60_000) continue;
    const measured = measuredSkills(byId.get(row.lesson_id)?.lesson);
    if (measured.has('rhythm')) add('rhythm', { lessonId: row.lesson_id, value: row.rhythm_consistency, t });
    // A lesson with both note and chord drills reports one pitch accuracy: count it for chords.
    if (measured.has('chords')) add('chords', { lessonId: row.lesson_id, value: row.pitch_accuracy, t });
    else if (measured.has('notes')) add('notes', { lessonId: row.lesson_id, value: row.pitch_accuracy, t });
    if (measured.has('posture')) add('posture', { lessonId: row.lesson_id, value: row.posture_score, t });
  }

  // Theory: first-try accuracy of finished theory lessons (no timestamp needed; one value per lesson).
  for (const { lesson } of ordered) {
    const p = progress[lesson.id];
    if (lesson.kind === 'theory' && p?.completed && typeof p.accuracy_percentage === 'number' && p.accuracy_percentage > 0) {
      add('theory', { lessonId: lesson.id, value: p.accuracy_percentage, t: 0 });
    }
  }

  const judged: Array<{ skill: Skill; average: number; recent: Sample[] }> = [];
  for (const [skill, list] of samples) {
    // Theory has no session time: average over every finished theory lesson.
    const recent = skill === 'theory' ? [...list] : [...list].sort((a, b) => b.t - a.t).slice(0, RECENT);
    if (recent.length < (skill === 'theory' ? 1 : MIN_SAMPLES)) continue;
    judged.push({ skill, average: Math.round(recent.reduce((s, x) => s + x.value, 0) / recent.length), recent });
  }
  if (judged.length === 0) return { kind: 'none' };

  const weakest = [...judged].sort((a, b) => a.average - b.average)[0];
  if (weakest.average >= GOOD_ENOUGH) {
    return { kind: 'all-good', skills: judged.map(({ skill, average }) => ({ skill, average })).sort((a, b) => b.average - a.average) };
  }

  // The open lesson with the lowest latest score for that skill.
  const latestByLesson = new Map<string, Sample>();
  for (const s of weakest.recent) if (!latestByLesson.has(s.lessonId)) latestByLesson.set(s.lessonId, s);
  const candidates = [...latestByLesson.values()]
    .map((s) => ({ s, entry: byId.get(s.lessonId) }))
    .filter((c): c is { s: Sample; entry: { lesson: CurriculumNode; status: NodeStatus } } => !!c.entry && c.entry.status !== 'locked')
    .sort((a, b) => a.s.value - b.s.value);
  const pick = candidates[0];
  if (!pick) return { kind: 'all-good', skills: judged.map(({ skill, average }) => ({ skill, average })) };

  const label = SKILL_LABEL[weakest.skill];
  const n = weakest.recent.length;
  const what = weakest.skill === 'theory' ? `your ${n} finished theory ${n === 1 ? 'lesson' : 'lessons'}` : `your last ${n} sessions that measured it`;
  const lastScore = Math.round(pick.s.value);
  return {
    kind: 'replay',
    skill: weakest.skill,
    average: weakest.average,
    samples: n,
    trend: weakest.skill === 'theory' ? 'unknown' : trendOf(weakest.recent),
    lesson: pick.entry.lesson,
    status: pick.entry.status,
    lastScore,
    explanation: `${label} averaged ${weakest.average}% over ${what}, your lowest skill right now. "${pick.entry.lesson.title}" scored ${lastScore}% the last time, so it is the best one to replay.`,
  };
}
