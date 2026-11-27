/**
 * Dashboard view of the course (COURSE-2).
 *
 * The curriculum now comes from src/content (the same source that generates
 * supabase/seed.sql), so the offline/demo tree and the database can no longer
 * disagree. Lesson kind is derived from the payload's stages, never guessed
 * from the title.
 */
import { COURSE_LESSONS, COURSE_UNITS, TIERS, lessonBadge, lessonExp } from '../../content';
import { isLessonPayload, type Tier } from '../../types/lesson.types';
import type { Lesson, UserProgress } from '../../types/database.types';
import type { UserProfile } from '../../types/auth.types';

export type LessonKind = 'theory' | 'practice' | 'rhythm';
export type NodeStatus = 'mastered' | 'current' | 'locked';
export type DashboardView = 'skill-tree' | 'perform' | 'lessons' | 'profile' | 'settings';

/** Minimal progress row the dashboard needs. */
export type ProgressLike = Pick<UserProgress, 'lesson_id' | 'completed'> &
  Partial<Pick<UserProgress, 'accuracy_percentage' | 'posture_stability_score'>>;
export type ProgressMap = Record<string, UserProgress | ProgressLike>;

export interface CurriculumNode extends Lesson {
  kind: LessonKind;
  tier: Tier | null;
  isCheckpoint: boolean;
  /** Stages in the lesson (shown as "x of y units"). */
  unitCount?: number;
  unitCompleted?: number;
  /** EXP awarded on completion. */
  expReward: number;
}

export const DEMO_PROFILE_OVERRIDES = {
  current_streak: 7,
  exp: 1240,
  hearts: 4,
} as const;

function asRecord(payload: Lesson['payload']): Record<string, unknown> {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return {};
}

/** Kind from the v2 payload; legacy payloads fall back to their `lessonType`, else theory. */
export function inferLessonKind(lesson: Lesson): LessonKind {
  if (isLessonPayload(lesson.payload)) return lessonBadge(lesson.payload);
  const raw = String(asRecord(lesson.payload).lessonType ?? '').toLowerCase();
  if (raw === 'theory' || raw === 'practice' || raw === 'rhythm') return raw;
  return 'theory';
}

export function toCurriculumNode(lesson: Lesson, progress?: ProgressLike): CurriculumNode {
  const payload = isLessonPayload(lesson.payload) ? lesson.payload : null;
  const unitCount = payload ? payload.stages.length : undefined;
  return {
    ...lesson,
    kind: inferLessonKind(lesson),
    tier: payload?.tier ?? null,
    isCheckpoint: payload?.isCheckpoint ?? false,
    unitCount,
    unitCompleted: progress?.completed ? unitCount : 0,
    expReward: payload ? lessonExp(payload) : 50,
  };
}

/** The bundled course as dashboard nodes (offline / demo / empty database). */
export const DEMO_CURRICULUM: CurriculumNode[] = COURSE_LESSONS.map((row) => toCurriculumNode(row as unknown as Lesson));

/** Unit titles for the skill tree, from src/content. */
export const MODULE_COPY: Record<number, { title: string; blurb: string; tier: Tier }> = Object.fromEntries(
  COURSE_UNITS.map((u) => [
    u.index,
    { title: `Unit ${u.index}: ${u.title}`, blurb: `${TIERS[u.tier].label} · ${u.blurb}`, tier: u.tier },
  ]),
);

/**
 * Demo progress: mark lessons complete in course order while their cumulative
 * EXP fits inside the demo profile's EXP, so each demo persona sees a plausible tree.
 */
export function demoProgressForExp(exp: number): Record<string, ProgressLike> {
  const out: Record<string, ProgressLike> = {};
  let spent = 0;
  for (const node of DEMO_CURRICULUM) {
    if (spent + node.expReward > exp) break;
    spent += node.expReward;
    out[node.id] = { lesson_id: node.id, completed: true, accuracy_percentage: 100 };
  }
  return out;
}

/** Kept for existing imports: the first two lessons completed. */
export const DEMO_PROGRESS: Record<string, ProgressLike> = Object.fromEntries(
  DEMO_CURRICULUM.slice(0, 2).map((n) => [n.id, { lesson_id: n.id, completed: true, accuracy_percentage: 100 }]),
);

export function learnerTier(exp: number): { label: string; nextAt: number; currentFloor: number } {
  if (exp >= 4000) return { label: 'Platinum Tier Learner', nextAt: 4000, currentFloor: 4000 };
  if (exp >= 2000) return { label: 'Gold Tier Learner', nextAt: 4000, currentFloor: 2000 };
  if (exp >= 1000) return { label: 'Silver Tier Learner', nextAt: 2000, currentFloor: 1000 };
  return { label: 'Bronze Tier Learner', nextAt: 1000, currentFloor: 0 };
}

export function expProgress(exp: number): {
  label: string;
  nextAt: number;
  currentFloor: number;
  percent: number;
} {
  const tier = learnerTier(exp);
  const span = Math.max(1, tier.nextAt - tier.currentFloor);
  const gained = Math.min(span, Math.max(0, exp - tier.currentFloor));
  return {
    ...tier,
    percent: tier.nextAt === tier.currentFloor ? 100 : Math.round((gained / span) * 100),
  };
}

export function nodeStatus(
  lesson: CurriculumNode,
  indexInModule: number,
  moduleLessons: CurriculumNode[],
  progress: ProgressMap,
  exp: number,
  catalog: CurriculumNode[] = moduleLessons,
): NodeStatus {
  const own = progress[lesson.id];
  if (own?.completed) return 'mastered';

  const previousModule = catalog
    .filter((item) => item.module_index === lesson.module_index - 1)
    .sort((a, b) => a.node_index - b.node_index);
  const previousModuleDone =
    previousModule.length === 0 || previousModule.every((item) => progress[item.id]?.completed);

  const prev = indexInModule > 0 ? moduleLessons[indexInModule - 1] : undefined;
  const prevDone = !prev || Boolean(progress[prev.id]?.completed);
  const expOk = exp >= (lesson.required_exp ?? 0);

  if (previousModuleDone && prevDone && expOk) return 'current';
  return 'locked';
}

export function blockingLesson(
  lesson: CurriculumNode,
  catalog: CurriculumNode[],
  progress: ProgressMap,
): CurriculumNode | null {
  const moduleLessons = catalog
    .filter((item) => item.module_index === lesson.module_index)
    .sort((a, b) => a.node_index - b.node_index);
  const indexInModule = moduleLessons.findIndex((item) => item.id === lesson.id);
  if (indexInModule > 0) {
    const previousNode = moduleLessons[indexInModule - 1];
    if (!progress[previousNode.id]?.completed) return previousNode;
  }

  if (lesson.module_index > 1) {
    const previousModule = catalog
      .filter((item) => item.module_index === lesson.module_index - 1)
      .sort((a, b) => a.node_index - b.node_index);
    const incomplete = previousModule.find((item) => !progress[item.id]?.completed);
    if (incomplete) return incomplete;
  }

  return null;
}

export function groupByModule(lessons: CurriculumNode[]): Array<{ moduleIndex: number; lessons: CurriculumNode[] }> {
  const map = new Map<number, CurriculumNode[]>();
  for (const lesson of lessons) {
    const list = map.get(lesson.module_index) ?? [];
    list.push(lesson);
    map.set(lesson.module_index, list);
  }

  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([moduleIndex, nodes]) => ({
      moduleIndex,
      lessons: [...nodes].sort((a, b) => a.node_index - b.node_index),
    }));
}

export function displayNameFromProfile(profile: UserProfile | null, email?: string | null): string {
  return profile?.username || email?.split('@')[0] || 'Pianist';
}

/**
 * The text shown under a Skill Tree node (and read out in its label). A locked node names what
 * unlocks it right on the node: the lesson to finish first, or the EXP it needs (UX request
 * 2026-11-27: the reason used to appear only in a banner after clicking).
 */
export function nodeStatusLabel(
  lesson: CurriculumNode,
  status: NodeStatus,
  exp: number,
  catalog: CurriculumNode[],
  progress: ProgressMap,
): string {
  if (status === 'mastered') return `Mastered · +${lesson.expReward} XP`;
  if (status === 'current') return `Up next · +${lesson.expReward} XP`;
  const blocking = blockingLesson(lesson, catalog, progress);
  if (blocking) return `Locked · finish "${blocking.title}" first`;
  const required = lesson.required_exp ?? 0;
  return required > exp ? `Locked · needs ${required} XP (you have ${exp})` : 'Locked · finish the previous step';
}

/** Every lesson in path order (unit by unit), each with its current status. */
export function lessonsInOrder(
  lessons: CurriculumNode[],
  progress: ProgressMap,
  exp: number,
): Array<{ lesson: CurriculumNode; status: NodeStatus }> {
  const out: Array<{ lesson: CurriculumNode; status: NodeStatus }> = [];
  for (const group of groupByModule(lessons)) {
    group.lessons.forEach((lesson, index) => out.push({ lesson, status: nodeStatus(lesson, index, group.lessons, progress, exp, lessons) }));
  }
  return out;
}

/**
 * "Next lesson" after finishing `lessonId` (UX 2026-11-27): the first later lesson that is open
 * and not yet mastered; if every later open lesson is mastered (a replay, or demo mode), the
 * very next open one. Locked lessons are never offered. Null at the end of the course.
 */
export function nextLessonAfter(
  lessonId: string,
  lessons: CurriculumNode[],
  progress: ProgressMap,
  exp: number,
): { lesson: CurriculumNode; status: NodeStatus } | null {
  const ordered = lessonsInOrder(lessons, progress, exp);
  const index = ordered.findIndex((x) => x.lesson.id === lessonId);
  if (index < 0) return null;
  const later = ordered.slice(index + 1).filter((x) => x.status !== 'locked');
  return later.find((x) => x.status !== 'mastered') ?? later[0] ?? null;
}
