/**
 * COURSE-6: Supabase side of progress saving. Kept thin; the rules live in
 * applyResult / placement / heartRegen and are tested there.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { MAX_HEARTS } from '../../lesson/runner';
import type { Database } from '../../types/database.types';
import type { PerformanceRow, ProfileSnapshot, ProgressSnapshot } from './applyResult';
import { nextHeartUpdateTimestamp } from './heartRegen';
import { PLACEMENT_METADATA_KEY, placementPlan } from './placement';
import type { DevTestRow, DevTestStore } from './devTestResults';
import type { ProgressStore } from './saveLessonResult';

type Client = SupabaseClient<Database>;

function check(error: { message: string } | null, what: string): void {
  if (error) throw new Error(`${what}: ${error.message}`);
}

/** PostgREST / Postgres errors meaning "performance_records has no run_id column". */
export function isMissingRunIdColumn(error: { code?: string; message?: string }): boolean {
  return (error.code === 'PGRST204' || error.code === '42703') && /run_id/.test(error.message ?? '');
}

/** PostgREST / Postgres errors meaning "profiles has no last_heart_update column". */
export function isMissingLastHeartUpdateColumn(error: { code?: string; message?: string }): boolean {
  return (error.code === 'PGRST204' || error.code === '42703') && /last_heart_update/.test(error.message ?? '');
}

export function supabaseProgressStore(client: Client): ProgressStore {
  const heartAnchors = new Map<string, { hearts: number; lastHeartUpdate: string | null }>();

  return {
    async getProfile(userId) {
      let { data, error } = await client
        .from('profiles')
        .select('exp, hearts, current_streak, last_activity_date, last_heart_update')
        .eq('id', userId)
        .maybeSingle();
      if (error && isMissingLastHeartUpdateColumn(error)) {
        ({ data, error } = await client
          .from('profiles')
          .select('exp, hearts, current_streak, last_activity_date')
          .eq('id', userId)
          .maybeSingle());
      }
      check(error, 'Could not read your profile');
      if (!data) return null;
      heartAnchors.set(userId, {
        hearts: data.hearts,
        lastHeartUpdate: (data as { last_heart_update?: string | null }).last_heart_update ?? null,
      });
      return {
        exp: data.exp,
        hearts: data.hearts,
        current_streak: data.current_streak,
        last_activity_date: data.last_activity_date,
      };
    },
    async getProgress(userId, lessonId) {
      const { data, error } = await client
        .from('user_progress')
        .select('completed, accuracy_percentage, posture_stability_score, completed_at')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .maybeSingle();
      check(error, 'Could not read lesson progress');
      return data;
    },
    async upsertProgress(userId, lessonId, row: ProgressSnapshot) {
      const { error } = await client
        .from('user_progress')
        .upsert({ user_id: userId, lesson_id: lessonId, ...row }, { onConflict: 'user_id,lesson_id' });
      check(error, 'Could not save lesson progress');
    },
    async insertPerformance(userId, lessonId, row: PerformanceRow) {
      let { error } = await client.from('performance_records').insert({ user_id: userId, lesson_id: lessonId, ...row });
      // T-13: a database without migration 20261125120000 has no run_id column. Save without it.
      if (error && isMissingRunIdColumn(error)) {
        const { run_id: _omit, ...withoutRunId } = row;
        ({ error } = await client.from('performance_records').insert({ user_id: userId, lesson_id: lessonId, ...withoutRunId }));
      }
      // T-13: the same run replayed from the offline queue is already stored; nothing to do.
      if (error?.code === '23505' && row.run_id) return;
      check(error, 'Could not save the performance record');
    },
    async getUnlockedAchievements(userId) {
      const { data, error } = await client
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', userId);
      check(error, 'Could not read your achievements');
      return new Set((data ?? []).map((row) => row.achievement_id));
    },
    async getAchievementRewards() {
      const { data, error } = await client.from('achievements').select('id, exp_reward');
      check(error, 'Could not read achievement rewards');
      const rewards: Record<string, number> = {};
      for (const row of data ?? []) {
        rewards[row.id] = row.exp_reward;
      }
      return rewards;
    },
    async insertAchievements(userId, ids) {
      if (ids.length === 0) return;
      const { error } = await client
        .from('user_achievements')
        .insert(ids.map((achievement_id) => ({ user_id: userId, achievement_id })));
      if (error?.code === '23505' && ids.length > 1) {
        for (const achievement_id of ids) {
          const { error: singleError } = await client
            .from('user_achievements')
            .insert({ user_id: userId, achievement_id });
          if (singleError && singleError.code !== '23505') {
            check(singleError, 'Could not save unlocked achievements');
          }
        }
        return;
      }
      if (error && error.code !== '23505') {
        check(error, 'Could not save unlocked achievements');
      }
    },
    async updateProfile(userId, patch: ProfileSnapshot) {
      const prev = heartAnchors.get(userId) ?? { hearts: MAX_HEARTS, lastHeartUpdate: null };
      const lastHeartUpdate = nextHeartUpdateTimestamp(
        prev.hearts,
        patch.hearts,
        prev.lastHeartUpdate,
        new Date().toISOString(),
      );
      let { error } = await client
        .from('profiles')
        .update({ ...patch, last_heart_update: lastHeartUpdate })
        .eq('id', userId);
      if (error && isMissingLastHeartUpdateColumn(error)) {
        ({ error } = await client.from('profiles').update(patch).eq('id', userId));
      }
      check(error, 'Could not update your profile');
      heartAnchors.set(userId, { hearts: patch.hearts, lastHeartUpdate });
    },
  };
}

/** D1: storage for developer test runs. Writes dev_test_results and profiles.hearts only. */
export function supabaseDevTestStore(client: Client): DevTestStore {
  const heartAnchors = new Map<string, { hearts: number; lastHeartUpdate: string | null }>();

  return {
    async getHearts(userId) {
      let { data, error } = await client
        .from('profiles')
        .select('hearts, last_heart_update')
        .eq('id', userId)
        .maybeSingle();
      if (error && isMissingLastHeartUpdateColumn(error)) {
        ({ data, error } = await client.from('profiles').select('hearts').eq('id', userId).maybeSingle());
      }
      check(error, 'Could not read your profile');
      if (!data) return null;
      heartAnchors.set(userId, {
        hearts: data.hearts,
        lastHeartUpdate: (data as { last_heart_update?: string | null }).last_heart_update ?? null,
      });
      return data.hearts;
    },
    async insertDevTestResult(userId, lessonId, row: DevTestRow) {
      const { error } = await client.from('dev_test_results').insert({ user_id: userId, lesson_id: lessonId, ...row });
      check(error, 'Could not save the developer test result');
    },
    async updateHearts(userId, hearts) {
      const prev = heartAnchors.get(userId) ?? { hearts: MAX_HEARTS, lastHeartUpdate: null };
      const lastHeartUpdate = nextHeartUpdateTimestamp(
        prev.hearts,
        hearts,
        prev.lastHeartUpdate,
        new Date().toISOString(),
      );
      let { error } = await client
        .from('profiles')
        .update({ hearts, last_heart_update: lastHeartUpdate })
        .eq('id', userId);
      if (error && isMissingLastHeartUpdateColumn(error)) {
        ({ error } = await client.from('profiles').update({ hearts }).eq('id', userId));
      }
      check(error, 'Could not update your hearts');
      heartAnchors.set(userId, { hearts, lastHeartUpdate });
    },
  };
}

/**
 * Write regenerated hearts and the next `last_heart_update` anchor only if the stored
 * value is still `from`, so a lesson saved at the same moment is never overwritten.
 * Returns whether the row changed.
 */
export async function persistRegeneratedHearts(
  client: Client,
  userId: string,
  from: number,
  to: number,
  nextAnchorIso: string | null = to >= MAX_HEARTS ? null : new Date().toISOString(),
): Promise<boolean> {
  let { data, error } = await client
    .from('profiles')
    .update({ hearts: to, last_heart_update: nextAnchorIso })
    .eq('id', userId)
    .eq('hearts', from)
    .select('id');
  if (error && isMissingLastHeartUpdateColumn(error)) {
    ({ data, error } = await client
      .from('profiles')
      .update({ hearts: to })
      .eq('id', userId)
      .eq('hearts', from)
      .select('id'));
  }
  check(error, 'Could not restore hearts');
  return (data?.length ?? 0) > 0;
}

/**
 * Persist an initial `last_heart_update` anchor when hearts < 5 and DB has none yet,
 * or clear a stale anchor when hearts === 5. Returns whether the row changed.
 */
export async function persistHeartAnchor(
  client: Client,
  userId: string,
  expectedHearts: number,
  anchorIso: string | null,
): Promise<boolean> {
  const query = client.from('profiles').update({ last_heart_update: anchorIso }).eq('id', userId).eq('hearts', expectedHearts);
  const { data, error } = await (anchorIso === null
    ? query.not('last_heart_update', 'is', null).select('id')
    : query.is('last_heart_update', null).select('id'));
  if (error && isMissingLastHeartUpdateColumn(error)) {
    return false;
  }
  check(error, 'Could not sync heart timer');
  return (data?.length ?? 0) > 0;
}

interface LessonLike {
  id: string;
  module_index: number;
  node_index: number;
  required_exp: number;
}

/** Record the learner's starting unit: earlier lessons completed, EXP raised, choice stored in auth metadata. */
export async function savePlacement(client: Client, userId: string, startUnit: number, lessons: readonly LessonLike[]): Promise<void> {
  const { data: profile, error: readError } = await client.from('profiles').select('exp').eq('id', userId).maybeSingle();
  check(readError, 'Could not read your profile');
  const plan = placementPlan(lessons, startUnit, profile?.exp ?? 0);

  if (plan.completedLessonIds.length > 0) {
    const now = new Date().toISOString();
    const { error } = await client.from('user_progress').upsert(
      plan.completedLessonIds.map((lessonId) => ({
        user_id: userId,
        lesson_id: lessonId,
        completed: true,
        // Placed, not played: no accuracy is claimed for these lessons.
        accuracy_percentage: 0,
        posture_stability_score: 0,
        completed_at: now,
      })),
      { onConflict: 'user_id,lesson_id' },
    );
    check(error, 'Could not save your placement');
  }
  if (plan.exp > (profile?.exp ?? 0)) {
    const { error } = await client.from('profiles').update({ exp: plan.exp }).eq('id', userId);
    check(error, 'Could not update your EXP');
  }
  const { error: metaError } = await client.auth.updateUser({ data: { [PLACEMENT_METADATA_KEY]: `unit-${startUnit}` } });
  check(metaError, 'Could not remember your placement');
}
