/**
 * AUX-TEST-ACCESS-01: developer lesson-access override.
 * Design: docs/auxiliary/AUX_TEST_ACCESS_IS_DEV_DESIGN.md
 *
 * `profiles.is_dev` can only be changed by the project owner (guard trigger in
 * supabase/migrations/20261120000000_profiles_is_dev.sql). It lets an account OPEN
 * lessons that `nodeStatus` reports as locked. It is an access override, never a
 * progress override: nothing here writes EXP, progress, streaks, hearts or badges,
 * and the normal progression rules in `nodeStatus` are not touched.
 *
 * This controls the app's lesson-lock experience only. Lesson content is readable
 * by every signed-in user and bundled in the client, so it is not a content boundary.
 */
import type { NodeStatus } from '../dashboard/curriculum';

/** True only for a real (non-demo) profile whose row says `is_dev = true`. Fails closed. */
export function isDevAccount(profile: { is_dev?: boolean } | null | undefined, isDemo: boolean): boolean {
  return !isDemo && profile?.is_dev === true;
}

/** Normal progression decides, unless the account is a developer account. */
export function canOpenLesson(status: NodeStatus, isDev: boolean): boolean {
  return isDev || status !== 'locked';
}
