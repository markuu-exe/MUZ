import type { LessonSettings, SettingsOverride, Tier } from '../types/lesson.types';

export interface TierInfo {
  id: Tier;
  label: string;
  level: string;
  blurb: string;
  /** Units (module_index) that belong to this tier, inclusive. */
  units: [number, number];
  defaults: LessonSettings;
}

/**
 * Tier defaults. Change a number here and every lesson in the tier follows,
 * unless a unit/lesson/exercise overrides it.
 */
export const TIERS: Readonly<Record<Tier, TierInfo>> = Object.freeze({
  novice: {
    id: 'novice',
    label: 'Novice',
    level: 'Beginner',
    blurb: 'Find your way around the keyboard, read the staff and play your first chords.',
    units: [1, 4],
    defaults: {
      passMark: 0.7,
      timeoutSec: 15,
      bpm: 66,
      countInBeats: 4,
      rhythmRepeats: 2,
      postureHoldSec: 5,
      rhythmFailHeartCost: 0,
      exp: 20,
      checkpointExp: 50,
    },
  },
  proficient: {
    id: 'proficient',
    label: 'Proficient',
    level: 'Intermediate',
    blurb: 'Richer rhythms, scales and keys, minor harmony and real progressions.',
    units: [5, 8],
    defaults: {
      passMark: 0.8,
      timeoutSec: 15,
      bpm: 84,
      countInBeats: 4,
      rhythmRepeats: 2,
      postureHoldSec: 10,
      rhythmFailHeartCost: 0,
      exp: 30,
      checkpointExp: 75,
    },
  },
  virtuoso: {
    id: 'virtuoso',
    label: 'Virtuoso',
    level: 'Advanced',
    blurb: 'Syncopation and speed, seventh chords, colour chords and performance runs.',
    units: [9, 12],
    defaults: {
      passMark: 0.85,
      timeoutSec: 15, // SRS 3.1.2.4; ruling D5: 15 s in every tier
      bpm: 100,
      countInBeats: 4,
      rhythmRepeats: 2,
      postureHoldSec: 20,
      rhythmFailHeartCost: 0,
      exp: 45,
      checkpointExp: 120,
    },
  },
});

export function tierOfUnit(unit: number): Tier {
  for (const t of Object.values(TIERS)) {
    if (unit >= t.units[0] && unit <= t.units[1]) return t.id;
  }
  throw new Error(`Unit ${unit} is outside every tier range.`);
}

/** Merge overrides left to right on top of the tier defaults. `undefined` values never overwrite. */
export function resolveSettings(tier: Tier, ...overrides: Array<SettingsOverride | undefined>): LessonSettings {
  const out: LessonSettings = { ...TIERS[tier].defaults };
  for (const o of overrides) {
    if (!o) continue;
    for (const [k, v] of Object.entries(o) as Array<[keyof LessonSettings, number | undefined]>) {
      if (v !== undefined) out[k] = v;
    }
  }
  return out;
}
