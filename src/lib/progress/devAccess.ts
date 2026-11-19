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

/** D1: where a finished run is saved. */
export type ResultDestination = 'learner' | 'dev-test';

/**
 * Decision D1: a lesson opened while it was `locked` is test data. Only a developer can
 * open a locked node (canOpenLesson), so the status at open identifies a test run, and
 * deciding from it alone fails closed: if `is_dev` is revoked mid-run the run still goes
 * to test storage, where RLS rejects it, instead of becoming learner progress.
 * Decide once, when the lesson opens. Every other run, including a developer replaying
 * an unlocked lesson, is saved as normal learner progress.
 */
export function resultDestination(statusAtOpen: NodeStatus | null): ResultDestination {
  return statusAtOpen === 'locked' ? 'dev-test' : 'learner';
}
