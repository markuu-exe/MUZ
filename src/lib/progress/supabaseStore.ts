/**
 * COURSE-6: Supabase side of progress saving. Kept thin; the rules live in
 * applyResult / placement / heartRegen and are tested there.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';
import type { PerformanceRow, ProfileSnapshot, ProgressSnapshot } from './applyResult';
import { PLACEMENT_METADATA_KEY, placementPlan } from './placement';
import type { ProgressStore } from './saveLessonResult';

type Client = SupabaseClient<Database>;

function check(error: { message: string } | null, what: string): void {
  if (error) throw new Error(`${what}: ${error.message}`);
}

export function supabaseProgressStore(client: Client): ProgressStore {
  return {
    async getProfile(userId) {
      const { data, error } = await client
        .from('profiles')
        .select('exp, hearts, current_streak, last_activity_date')
        .eq('id', userId)
        .maybeSingle();
      check(error, 'Could not read your profile');
      return data;
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
      const { error } = await client.from('performance_records').insert({ user_id: userId, lesson_id: lessonId, ...row });
      check(error, 'Could not save the performance record');
    },
    async updateProfile(userId, patch: ProfileSnapshot) {
      const { error } = await client.from('profiles').update(patch).eq('id', userId);
      check(error, 'Could not update your profile');
    },
  };
}

/**
 * Write regenerated hearts only if the stored value is still `from`, so a lesson
 * saved at the same moment is never overwritten. Returns whether the row changed.
 */
export async function persistRegeneratedHearts(client: Client, userId: string, from: number, to: number): Promise<boolean> {
  const { data, error } = await client
    .from('profiles')
    .update({ hearts: to })
    .eq('id', userId)
    .eq('hearts', from)
    .select('id');
  check(error, 'Could not restore hearts');
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
