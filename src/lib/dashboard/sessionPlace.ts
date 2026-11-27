/**
 * Where the learner was, so a page refresh returns there instead of the Skill Tree
 * (owner request 2026-11-27). Kept in sessionStorage: it survives a reload of this tab,
 * not a new tab or a new visit. Stored per account ("demo" for demo mode) so one account
 * never reopens another's lesson.
 *
 * A reopened lesson starts again from its beginning: the lesson's in-progress state is not
 * saved. It is only reopened if the same unlock and heart rules that guard the Start button
 * still allow it (checked by the dashboard), otherwise the learner lands on the Skill Tree.
 */
import { groupByModule, nodeStatus, type CurriculumNode, type DashboardView, type NodeStatus, type ProgressMap } from './curriculum';

export const PLACE_KEY = 'muz-place';

const VIEWS: readonly DashboardView[] = ['skill-tree', 'perform', 'lessons', 'sandbox', 'profile', 'settings'];

export interface Place {
  account: string;
  view: DashboardView;
  /** The lesson that was open, if any. */
  lessonId: string | null;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function storage(): StorageLike | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function parsePlace(raw: string | null, account: string): Omit<Place, 'account'> | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<Place>;
    if (v.account !== account || !VIEWS.includes(v.view as DashboardView)) return null;
    return { view: v.view as DashboardView, lessonId: typeof v.lessonId === 'string' && v.lessonId ? v.lessonId : null };
  } catch {
    return null;
  }
}

export function readPlace(account: string, store: StorageLike | null = storage()): Omit<Place, 'account'> | null {
  try {
    return parsePlace(store?.getItem(PLACE_KEY) ?? null, account);
  } catch {
    return null;
  }
}

export function savePlace(place: Place, store: StorageLike | null = storage()): void {
  try {
    store?.setItem(PLACE_KEY, JSON.stringify(place));
  } catch {
    // Storage unavailable: a refresh simply starts on the Skill Tree.
  }
}

/** The lesson with `lessonId` and its current unlock status, or null if it is not in the course. */
export function findLessonStatus(
  lessonId: string,
  lessons: CurriculumNode[],
  progress: ProgressMap,
  exp: number,
): { lesson: CurriculumNode; status: NodeStatus } | null {
  for (const group of groupByModule(lessons)) {
    const index = group.lessons.findIndex((l) => l.id === lessonId);
    if (index >= 0) {
      const lesson = group.lessons[index];
      return { lesson, status: nodeStatus(lesson, index, group.lessons, progress, exp, lessons) };
    }
  }
  return null;
}
