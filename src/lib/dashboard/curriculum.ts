import type { Lesson, UserProgress } from '../../types/database.types';
import type { UserProfile } from '../../types/auth.types';

export type LessonKind = 'theory' | 'practice' | 'rhythm';
export type NodeStatus = 'mastered' | 'current' | 'locked';
export type DashboardView = 'skill-tree' | 'lessons' | 'profile' | 'settings';

export interface CurriculumNode extends Lesson {
  kind: LessonKind;
  unitCount?: number;
  unitCompleted?: number;
}

export const DEMO_PROFILE_OVERRIDES = {
  current_streak: 7,
  exp: 1240,
  hearts: 4,
} as const;

export const DEMO_CURRICULUM: CurriculumNode[] = [
  {
    id: 'pno-mod1-node1',
    instrument: 'piano',
    module_index: 1,
    node_index: 1,
    title: 'Note Reading',
    description: 'Identify notes on the treble stave and match them to piano keys.',
    required_exp: 0,
    payload: { lessonType: 'theory', unitCount: 4, unitCompleted: 4 },
    kind: 'theory',
    unitCount: 4,
    unitCompleted: 4,
  },
  {
    id: 'pno-mod1-node2',
    instrument: 'piano',
    module_index: 1,
    node_index: 2,
    title: 'Basic Scales',
    description: 'Play C major with consistent finger numbering and even timing.',
    required_exp: 50,
    payload: { lessonType: 'practice', unitCount: 3, unitCompleted: 3 },
    kind: 'practice',
    unitCount: 3,
    unitCompleted: 3,
  },
  {
    id: 'pno-mod1-node3',
    instrument: 'piano',
    module_index: 1,
    node_index: 3,
    title: 'Finger Positioning',
    description: 'Hold a relaxed curved-hand posture while tapping the home-position rhythm.',
    required_exp: 120,
    payload: { lessonType: 'rhythm', unitCount: 5, unitCompleted: 2 },
    kind: 'rhythm',
    unitCount: 5,
    unitCompleted: 2,
  },
  {
    id: 'pno-mod1-node4',
    instrument: 'piano',
    module_index: 1,
    node_index: 4,
    title: 'Simple Chords',
    description: 'Build C, G, and F major triads from stacked thirds.',
    required_exp: 220,
    payload: { lessonType: 'theory' },
    kind: 'theory',
  },
  {
    id: 'pno-mod1-node5',
    instrument: 'piano',
    module_index: 1,
    node_index: 5,
    title: 'Chord Progressions',
    description: 'Practice I–V–vi–IV with both hands and posture lock.',
    required_exp: 350,
    payload: { lessonType: 'practice' },
    kind: 'practice',
  },
  {
    id: 'pno-mod2-node1',
    instrument: 'piano',
    module_index: 2,
    node_index: 1,
    title: 'Hands Together',
    description: 'Coordinate independent left-hand accompaniment with a right-hand melody.',
    required_exp: 500,
    payload: { lessonType: 'practice' },
    kind: 'practice',
  },
];

export const DEMO_PROGRESS: Record<string, Pick<UserProgress, 'lesson_id' | 'completed'>> = {
  'pno-mod1-node1': { lesson_id: 'pno-mod1-node1', completed: true },
  'pno-mod1-node2': { lesson_id: 'pno-mod1-node2', completed: true },
  'pno-mod1-node3': { lesson_id: 'pno-mod1-node3', completed: false },
};

export const MODULE_COPY: Record<number, { title: string; blurb: string }> = {
  1: {
    title: 'Fundamentals of Keyboard Mastery',
    blurb: 'Learn keys, stave lines, and essential finger drills.',
  },
  2: {
    title: 'Harmony and Two-Hand Coordination',
    blurb: 'Unlock after finishing Module 1. Hands-together piano fluency.',
  },
};

function asRecord(payload: Lesson['payload']): Record<string, unknown> {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return {};
}

export function inferLessonKind(lesson: Lesson): LessonKind {
  const payload = asRecord(lesson.payload);
  const raw = String(payload.lessonType ?? payload.type ?? '').toLowerCase();
  if (raw === 'theory' || raw === 'practice' || raw === 'rhythm') return raw;
  const title = lesson.title.toLowerCase();
  if (title.includes('rhythm') || title.includes('finger')) return 'rhythm';
  if (title.includes('scale') || title.includes('chord progression') || title.includes('practice')) {
    return 'practice';
  }
  return 'theory';
}

export function toCurriculumNode(lesson: Lesson, progress?: UserProgress): CurriculumNode {
  const payload = asRecord(lesson.payload);
  const kind = inferLessonKind(lesson);
  const unitCount = typeof payload.unitCount === 'number' ? payload.unitCount : undefined;
  const unitCompleted =
    typeof payload.unitCompleted === 'number'
      ? payload.unitCompleted
      : progress?.completed
        ? unitCount
        : undefined;

  return {
    ...lesson,
    kind,
    unitCount,
    unitCompleted,
  };
}

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
  progress: Record<string, UserProgress | Pick<UserProgress, 'lesson_id' | 'completed'>>,
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
