/**
 * COURSE-6: placement. A learner who already plays can start at the first unit
 * of a later tier; every earlier lesson is recorded as completed and EXP is
 * raised to the start lesson's required_exp so it unlocks.
 */
import { TIERS } from '../../content';
import type { Tier } from '../../types/lesson.types';

export interface PlacementOption {
  startUnit: number;
  tier: Tier;
  label: string;
  blurb: string;
}

export const PLACEMENT_OPTIONS: readonly PlacementOption[] = (Object.values(TIERS) as Array<(typeof TIERS)[Tier]>).map((t) => ({
  startUnit: t.units[0],
  tier: t.id,
  label: `${t.label} · ${t.level}`,
  blurb: t.blurb,
}));

/** Key in auth user metadata that records the choice, so the question is asked once. */
export const PLACEMENT_METADATA_KEY = 'placement';

interface LessonLike {
  id: string;
  module_index: number;
  node_index: number;
  required_exp: number;
}

export function placementPlan(
  lessons: readonly LessonLike[],
  startUnit: number,
  currentExp: number,
): { completedLessonIds: string[]; exp: number } {
  const first = lessons
    .filter((l) => l.module_index === startUnit)
    .sort((a, b) => a.node_index - b.node_index)[0];
  if (!first) throw new Error(`No lessons in unit ${startUnit}.`);

  const completedLessonIds = lessons
    .filter((l) => l.module_index < startUnit)
    .sort((a, b) => a.module_index - b.module_index || a.node_index - b.node_index)
    .map((l) => l.id);

  return { completedLessonIds, exp: Math.max(currentExp, first.required_exp) };
}
