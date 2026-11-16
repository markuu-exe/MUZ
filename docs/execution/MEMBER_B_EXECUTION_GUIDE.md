# Member B Execution Guide: Barnaija (Full-Stack Development)

> **Self-contained.** This guide covers everything B needs. Task IDs match `docs/audit/TASK_DECOMPOSITION.md`. Days are relative working days: D1 is the first day after the plan is accepted. No calendar dates are set yet.
>
> **Repo facts verified 2026-11-16:**
> - Unit tests: 27 files, 387 tests, all passing.
> - Commands that exist (`package.json`): `npm test` (= `vitest run`), `npm run build` (= `tsc -b && vite build`), `npm run dev` (port 5173), `npm run preview` (port 4173), `npm run seed:lessons`, `npm run seed:lessons:check`.
> - Typecheck: `npx tsc -p tsconfig.json`.
> - Single test file: `npx vitest run <path>`.
> - The test environment is Node. jsdom and React Testing Library are **not installed**, so put logic in pure functions and test those.
> - No `gh` CLI: open PRs at `https://github.com/markuu-exe/MUZ`.
> - Jira Atlassian connector was unavailable; only the CSV export was read.

---

## A. Role overview

| Item | Detail |
|---|---|
| Role | Full-stack developer. Owns authentication, gamification persistence and analytics, which make up the project's **critical path**. Also deploys production. |
| Ownership areas | `src/context/AuthContext.tsx`, `src/types/auth.types.ts`, `src/components/auth/LoginPage.tsx`, `src/lib/progress/*` (the save path and achievements), `src/components/dashboard/ProfileAnalyticsView.tsx`, new `src/hooks/useAnalyticsData.ts` and `src/lib/analytics/*`, deployment config in T-25 |
| Delivers | T-03, T-04, T-11, T-12, T-10, T-25; supports T-23; fixes defects in your areas during T-24 |
| Can change independently | The files above |
| Needs approval | Changes to the `ProgressStore` interface (tell C and A first); any change to `applyResult.ts` rules (A); `DashboardScreen.tsx` and `App.tsx` (shared with D: props and routing only); production configuration (A) |
| Reports to | A, through the daily status post |
| Coordinates directly with | A (reviewer for all your PRs); C (staging access, Google provider, the `ProgressStore` handoff before T-13); D (you review D's T-14; D merges dashboard and `App.tsx` changes before yours) |

---

## B. Personal task schedule

| Task | Jira | Priority | Effort | Earliest start (reason) | Target done | Reviewer | Status (Jira Nov 15 → plan) |
|---|---|---|---|---|---|---|---|
| T-03 Profile bootstrap fix | KAN-233 (reassign to you) | P0 | 1 d | D1 (after T-01 push, ~2 h) | D1 code; D2 staging check | A | In progress (ashwwyr) → pending |
| T-04 Close `features-integration` | KAN-259 | P0 | 0.5 d | D1 (no dependency) | D1 | A approves | To do → pending |
| T-11 Achievements | KAN-270 / NEW-15 | P1 | 2 d | D2 (**hard:** T-04) | D3, merged before C starts T-13 | A | To do → pending |
| T-12 Analytics with real data | KAN-269 | P1 | 4 d | D4 (**hard:** T-04; soft: T-11) | D7 **(critical path)** | A | To do → pending |
| T-10 Recovery + Google + resend | KAN-229, KAN-228 (reopen) | P1 | 2 d | D8 (**hard:** T-03; staging from T-05) | D9 | A | Done → reopen |
| T-23 support | KAN-271 / 274 | P1 | 1 d | D10 (**hard:** IC-3) | D12 | — | To do |
| T-24 fixes in your areas | KAN-281 | P1 | as assigned | D12 | D13 | the original reviewer | — |
| T-25 Production deploy + demo | KAN-283 (assign to you) | P0 | 1.5 d | D14 (**hard:** RC on D13); prep D13 | D14 | A | To do, unassigned |

**Load: about 12 ideal days in 14.** This is at capacity, and the risky part is T-12. **Tell A by midday D6** if T-12 will miss D7; A then takes the rhythm histogram.

**While waiting**
- D2, before T-05 staging is live: write T-03's unit tests and T-11's pure evaluator, both offline.
- D9 PM, after T-10: pre-read `docs/ENVIRONMENTS.md` (from C) for T-25.
- D10–D11: pair with C on the T-23 auth and analytics steps.

---

## C. Detailed implementation instructions

### T-03 Fix the profile bootstrap so it cannot wipe progress

**1. Purpose**

A transient error while reading `profiles` at sign-in currently overwrites the learner's real EXP, streak and hearts. That destroys progress, so it is a P0.

**2. Current implementation (verified in `src/context/AuthContext.tsx`)**
- `fetchProfile(userId, email, preferredUsername, preferredInstrument)`, lines 57–129:
  - It runs `select('*').eq('id', userId).single()`.
  - Lines 70–72: on an error other than `PGRST116` it only warns, then falls through to the default-profile path.
  - Lines 101–118: it **upserts** `{ exp: 100, current_streak: 1, hearts: 5, last_activity_date: now }`.
  - Lines 120–122: if that insert fails, it returns an unsaved fake profile.
- Lines 76–96: on every load it copies `user_metadata.username` and the instrument back onto `profiles`, which undoes trigger suffixes and renames.
- The DB trigger `handle_new_user` (`supabase/migrations/20260509120000_initial_schema.sql:143-179`) already creates the profile on signup with `instrument_focus 'piano'`, hearts 5, exp 0, streak 0, and de-duplicates the username.
- `onAuthStateChange(async (event, newSession) => …)`, lines ~186–216, awaits `fetchProfile` inside the callback. supabase-js documents this as a deadlock risk.
- `initializeAuth` also calls `fetchProfile`, so a sign-in fetches 2–3 times.
- `getMetadataInstrument` (lines 16–22) and `InstrumentFocus` (`src/types/auth.types.ts:6`) still allow `'guitar' | 'violin' | 'vocals'`. The DB check `profiles_instrument_piano` rejects those values.
- Demo mode (lines 24–45, 135–151, `enterDemoMode`) must keep working.

**3. Required changes**
- **New** `src/lib/auth/profileBootstrap.ts`, a pure function so it can be tested in Node without React:

```ts
export interface ProfileClient {
  select(userId: string): Promise<{ data: UserProfile | null; error: { code?: string; message: string } | null }>;
  insert(row: { id: string; username: string; instrument_focus: 'piano' }): Promise<{ data: UserProfile | null; error: { code?: string; message: string } | null }>;
}
export type BootstrapResult = { profile: UserProfile } | { profile: null; error: string };
export async function bootstrapProfile(client: ProfileClient, userId: string, username: string, wait?: (ms: number) => Promise<void>): Promise<BootstrapResult>;
```

  Rules:
  1. `select` returns data → return it, with no writes.
  2. `select` returns an error → return `{ profile: null, error }`. **Never write.**
  3. No row and no error → wait 500 ms, then select again (the trigger normally creates the row). If the row is still missing, `insert` **only** `id`, `username` and `instrument_focus`, so the DB defaults apply (exp 0, hearts 5, streak 0).
  4. `insert` error with code `23505` (duplicate: the trigger won the race) → select once more and return that row.
  5. Any other insert error → `{ profile: null, error }`.

- `AuthContext.tsx`:
  - Replace the body of `fetchProfile` with a call to `bootstrapProfile`, using an adapter over `supabase.from('profiles')` (`.select('*').eq('id', id).maybeSingle()`, `.insert(row).select().single()`).
  - Delete the metadata-sync block (lines 76–96).
  - Add `profileError: string | null` to the context value and to `AuthContextType`.
- **Auth listener:**
  - Make the callback synchronous.
  - Set `session` and `user` immediately.
  - Do nothing more on `TOKEN_REFRESHED`.
  - On `INITIAL_SESSION`, `SIGNED_IN` and `USER_UPDATED`, schedule `setTimeout(() => void loadProfile(user), 0)`.
  - Remove the `fetchProfile` call inside `initializeAuth`, keeping its `getSession` and the `loading` handling, so one sign-in produces exactly one fetch.
- `auth.types.ts`: change to `export type InstrumentFocus = 'piano';`. Then fix the compile errors in `getMetadataInstrument`; it should always return `'piano'`.

**4. Step-by-step**
1. Branch `task/T-03-profile-bootstrap`.
2. Write `src/lib/auth/__tests__/profileBootstrap.test.ts` first, with a fake `ProfileClient` covering rules 1–5. Also assert that `insert` is **never** called when `select` errors.
3. Implement `profileBootstrap.ts` until the tests pass: `npx vitest run src/lib/auth`.
4. Wire it into `AuthContext.tsx`. Remove the old upsert and the metadata sync.
5. Rework the listener as described above.
6. Narrow `InstrumentFocus`. Run `npx tsc -p tsconfig.json` and fix each error. The places that pass `preferredInstrument` should simply drop the argument.
7. Run `npm test` (all green) and `npm run dev`. Smoke-test sign-in, sign-out and "Continue as Guest".

**5. Expected output**

Signing in reads the profile once. A failed read never writes. A brand-new account gets the trigger's row.

**6. Testing procedure**
- **Unit:** `npx vitest run src/lib/auth`, then `npm test`.
- **Manual, on staging (available from D2, after C's T-05):**
  1. Sign in with an account that has non-zero EXP. In the Supabase table editor, note `exp`, `current_streak` and `hearts`.
  2. In DevTools → Network → request blocking, block `*rest/v1/profiles*`. Sign out, then sign in.
  3. Unblock the requests. The values in Supabase must be unchanged.
  4. Sign up a new account. Exactly one profile row should exist, with exp 0, streak 0, hearts 5.
  5. In DevTools, filter for `profiles`. A single sign-in shows exactly one `GET`.

**7. Acceptance criteria**
1. All 5 `bootstrapProfile` rules are unit-tested and passing.
2. Manual steps 3, 4 and 5 hold.
3. Guest mode still works.
4. `grep -n "upsert" src/context/AuthContext.tsx` returns nothing.

**8. Evidence**
- PR link.
- Test output.
- Before/after screenshots of the profile row from the blocked-request test.
- A network screenshot showing a single profile `GET`.
- Comment on KAN-233.

### T-04 Close `features-integration` and confirm what to salvage

**1. Purpose**

There must be one gamification implementation. Your `dec609e` on `origin/features-integration` overlaps the merged `src/lib/progress/*` (COURSE-6), and `git merge-tree` reports 4 conflicting files: `DashboardScreen.tsx`, `useDashboardData.ts`, `useHeartRegen.ts` and `database.types.ts`.

**2. Current state (from the audit)**

| Piece of `dec609e` | Problem |
|---|---|
| `LessonSessionModal.tsx` | A simulated runner, with "Simulate 15s Timeout" buttons |
| `useGamification.ts` | Writes absolute exp/hearts with no accuracy gate, swallows errors, and ships demo defaults such as exp 1240 |
| `lib/gamification/engine.ts` | EXP replay and bonus rules conflict with `applyResult`; the achievement catalogue is useful |
| `gamification.test.ts` | Its achievement tests are useful |
| `ProfileAnalyticsView` changes | Chart.js layout, but still hard-coded data |

**3. Required changes**

None to code. This task is a written agreement plus archiving the branch.

**4. Steps**
1. Inspect the branch read-only:
   - `git fetch origin`
   - `git show origin/features-integration --stat`
   - `git show origin/features-integration:src/lib/gamification/engine.ts`
2. Compare it against `main`: `src/lib/progress/applyResult.ts`, `streak.ts`, `heartRegen.ts`, `src/lesson/runner.ts`.
3. Comment on KAN-259 with the agreed list:
   - **keep:** the achievement catalogue and evaluator, the achievement tests, the chart layout;
   - **discard:** everything else.
   If you disagree with any line, give the reason.
4. After A approves, tag and delete the branch:
   - `git tag archive/features-integration origin/features-integration`
   - `git push origin archive/features-integration`
   - delete the branch on GitHub.

**5. Expected output**

The salvage list is agreed, and the branch is archived as a tag.

**6. Testing**

None.

**7. Acceptance**
- A approves the KAN-259 comment.
- `git ls-remote --heads origin features-integration` returns nothing.
- `git ls-remote --tags origin archive/features-integration` returns the tag.

**8. Evidence**

The KAN-259 comment link and the tag name.

### T-11 Achievements: evaluate, award and credit

**1. Purpose**

SRS 3.1.7.4 and SDD 4.2. Today nothing writes `user_achievements`, and the badges in the UI are hard-coded with ids that do not match the database.

**2. Current implementation (verified)**
- **Seeded badges** (`supabase/seed.sql:441-447`):

  | id | title | `exp_reward` |
  |---|---|---|
  | `first-lesson` | First Note | 50 |
  | `streak-7-days` | Week of Practice | 50 |
  | `streak-30-days` | Month of Practice | 100 |
  | `exp-500` | Rising Pianist | 50 |
  | `posture-stable` | Steady Hands | 50 |

- **Grants** (migration lines 276–277): `achievements` is `select`; `user_achievements` is `select, insert`. There is **no update**, so an upsert would fail.
- **Save path** (`src/lib/progress/saveLessonResult.ts:27-44`): `getProfile` → `getProgress` → `applyResult` → `upsertProgress` → `insertPerformance` → `updateProfile`.
- **`ProgressStore`** (lines 11–17): 5 methods, implemented in `src/lib/progress/supabaseStore.ts:17-53`.
- **`AppliedResult`** (`applyResult.ts`) provides `profile` (after the lesson), `performance` (`posture_score` etc., or null), `completedNow` and `note`.
- **Existing test:** `src/lib/progress/__tests__/saveLessonResult.test.ts` has a `MemoryStore implements ProgressStore` (lines 6–40). It asserts the exact call order at lines 74 and 84, so adding store calls **will break these expectations**. Update them deliberately.

**3. Required changes**
- **New** `src/lib/progress/achievements.ts`, pure:

```ts
export type AchievementId = 'first-lesson' | 'streak-7-days' | 'streak-30-days' | 'exp-500' | 'posture-stable';
export interface AchievementInput {
  completedNow: boolean; exp: number; currentStreak: number;
  postureScore: number | null;          // this run's performance.posture_score, null if no practice ran
  unlocked: ReadonlySet<string>;
}
export function evaluateAchievements(i: AchievementInput): AchievementId[]; // newly unlocked only
```

  Proposed rules. **Confirm them with A before coding: open decision U-04.**

  | Badge | Unlocks when |
  |---|---|
  | `first-lesson` | `completedNow` |
  | `streak-7-days` | `currentStreak ≥ 7` |
  | `streak-30-days` | `currentStreak ≥ 30` |
  | `exp-500` | `exp ≥ 500`, evaluated on post-lesson EXP **before** badge bonuses (single pass, no cascade) |
  | `posture-stable` | `postureScore !== null && postureScore ≥ 90` |

- **Extend `ProgressStore`** (an interface change: post it in the team chat for C and A before merging):

```ts
getUnlockedAchievements(userId: string): Promise<Set<string>>;
getAchievementRewards(): Promise<Record<string, number>>;   // from achievements(id, exp_reward)
insertAchievements(userId: string, ids: string[]): Promise<void>; // plain insert; ignore error code 23505
```

  Implement all three in `supabaseStore.ts`, using `check()` for errors other than 23505.
- **`saveLessonResult`:**
  1. After writing progress and performance, and **before** `updateProfile`, call the evaluator unless the run was a quit (`applied.progress === null`).
  2. Insert the new ids.
  3. Add the sum of their rewards to `applied.profile.exp`.
  4. Write the profile once.
  5. Append a note line, for example "Badge unlocked: First Note".
  6. Return the unlocked ids on `AppliedResult`, as an optional `achievements?: string[]`.
- **Port** the relevant achievement test ideas from `origin/features-integration:src/lib/gamification/__tests__/gamification.test.ts` into a new `src/lib/progress/__tests__/achievements.test.ts`. Adapt them to the 5 ids.

**4. Step-by-step**
1. Branch `task/T-11-achievements`.
2. Write `achievements.test.ts` first, covering each rule, no re-award when an id is already in `unlocked`, and quit producing nothing.
3. Implement `achievements.ts`.
4. Extend `ProgressStore`. Update `MemoryStore` in `saveLessonResult.test.ts` with the 3 methods. Update the call-order expectations at lines 74 and 84 to the new order, and state the new order in the PR.
5. Add `saveLessonResult` tests:
   - the first completion inserts `first-lesson` and EXP rises by `expReward + 50`;
   - a second completion inserts nothing.
6. Implement `supabaseStore` and wire `saveLessonResult`.
7. Run `npm test` and `npx tsc -p tsconfig.json`.
8. Post the final `ProgressStore` interface in the team chat (C builds T-13 on it). Merge **by D3**.

**5. Expected output**

Badges are written once each, and their bonus EXP is credited in the same profile write.

**6. Testing**
- `npx vitest run src/lib/progress`, then `npm test`.
- **Manual, on staging:**
  1. Use a new account and complete the first lesson.
  2. `user_achievements` has one row, `first-lesson`.
  3. `profiles.exp` = lesson EXP + 50.
  4. Replaying the lesson adds no new row.

**7. Acceptance**
1. All new tests pass; the existing progress tests pass with the updated call order.
2. The staging check passes.
3. No `upsert` call on `user_achievements` (grep confirms).

**8. Evidence**

PR link, test output, a screenshot of the staging table rows, and a NEW-15 / KAN-270 comment.

### T-12 Profile analytics with real data (critical path)

**1. Purpose**

SRS 3.1.7.1–3.1.7.4 and SDD C-07 / 6.3. The Profile view is 100 % mock today.

**2. Current implementation (verified)**
- **`ProfileAnalyticsView.tsx`** (694 lines):
  - Props: `{ profile, userEmail, masteredCount, totalLessons }` (lines 51–56).
  - Passed from `DashboardScreen.tsx:382-387`.
  - Chart.js is registered at line 37. `Line` charts at lines 546, 570 and 594; `Bar` is imported.
  - Hard-coded parts: `summaryStats` (line 85), `chartDatasets` (line 125), `achievements` (line 289), and fallbacks `exp ?? 1240` / `streak ?? 7` (lines 79–80).
  - The range state is `'7d' | '30d' | 'all'` (line 77).
- **Data written today:** `performance_records(user_id, lesson_id, session_timestamp, pitch_accuracy, rhythm_consistency, posture_score, drill_duration_sec)` is inserted only for runs where a rhythm or practice exercise ran (`applyResult.ts:91-92,120-127`).
  - **Trap:** the columns are NOT NULL. A rhythm-only lesson writes `pitch_accuracy = 0` and `posture_score = 0` (no measurement). A practice-only lesson writes `rhythm_consistency = 0`. Plotting those zeros would be wrong.
- **Index:** `performance_records_user_time_idx (user_id, session_timestamp desc)` exists.
- **Bundled content:** `getCourseLesson(id)` in `src/content/index.ts:107` returns each lesson's payload, so you can tell which engines a lesson contains.

**3. Required changes**
- **New** `src/lib/analytics/aggregate.ts`, pure and unit-tested:
  - `metricsMeasured(lessonId)` → `{ pitch, rhythm, posture }` booleans, derived from the lesson payload's exercise engines (`EXERCISE_ENGINE` in `src/types/lesson.types.ts`). pitch/posture = the lesson has a `practice` exercise; rhythm = it has a `rhythm` exercise.
  - `toSessions(rows)` → `{ day: 'YYYY-MM-DD', pitch: number|null, rhythm: number|null, posture: number|null, minutes: number }[]`. Group rows by **local** day, average only the measured metrics, and set unmeasured ones to `null`.
  - `rhythmHistogram(rows)` → 5 buckets (`0–59`, `60–69`, `70–79`, `80–89`, `90–100`) over measured `rhythm_consistency` values.
- **New** `src/hooks/useAnalyticsData.ts`:

```ts
useAnalyticsData(userId: string | null, range: '7d' | '30d' | 'all') →
  { loading: boolean; error: string | null;
    sessions: ReturnType<typeof toSessions>;
    rhythmHistogram: { bucket: string; count: number }[];
    badges: { id: string; title: string; unlockedAt: string | null }[] }
```

  Queries:
  1. `performance_records`: `.select('lesson_id, session_timestamp, pitch_accuracy, rhythm_consistency, posture_score, drill_duration_sec').eq('user_id', userId).order('session_timestamp')`, plus `.gte('session_timestamp', since)` unless the range is `'all'`.
  2. `achievements`: `.select('id, title')`.
  3. `user_achievements`: `.select('achievement_id, unlocked_at').eq('user_id', userId)`.

  Skip all queries in demo mode (`isDemo` from `useAuth()`) and return empty data.
- **`ProfileAnalyticsView.tsx`:**
  - Replace every hard-coded array with hook data. Remove `?? 1240` and `?? 7`.
  - Charts:
    - a pitch line;
    - a posture line;
    - a rhythm histogram, using `Bar`;
    - the badges grid (locked/unlocked);
    - summary stats computed from `sessions` (total minutes, sessions count, mastered count from props).
  - Add an empty state: "No practice sessions yet. Finish a rhythm or practice lesson to see your progress."
  - Keep your Chart.js layout from `dec609e` as visual reference only.
- **`DashboardScreen.tsx`:** pass `userId` only, if it is needed. This file is shared with D; change nothing else.

**4. Step-by-step**
1. Branch `task/T-12-analytics`, from `main` **after** D's T-15 is merged (D3).
2. Write `src/lib/analytics/__tests__/aggregate.test.ts`:
   - a rhythm-only row gives pitch `null`;
   - two rows on the same day average;
   - histogram bucket edges 59/60 and 89/90;
   - an empty input gives an empty output.
3. Implement `aggregate.ts`.
4. Implement the hook and test it manually on staging.
5. Rewrite the view sections one at a time, keeping the range tabs.
6. Run `npm test`, `npx tsc -p tsconfig.json` and `npm run build`.
7. Run `grep -n "1240\|142.8\|14.2 hrs" src/components/dashboard/ProfileAnalyticsView.tsx`; it must print nothing.

**5. Expected output**

The Profile view shows only the learner's own data, with honest empty states.

**6. Testing**
- **Unit:** `npx vitest run src/lib/analytics`.
- **Manual, on staging:**
  1. A new account shows empty states and no numbers.
  2. Complete one rhythm lesson: one rhythm point today, and no pitch or posture point.
  3. Complete one practice lesson: a pitch point and a posture point.
  4. Switching 7d / 30d / all issues a new `performance_records` request (check the Network tab).
  5. An unlocked badge from T-11 shows as unlocked.

**7. Acceptance**
1. The aggregate tests pass.
2. Manual steps 1–5 pass.
3. The grep is clean.
4. No changes to `DashboardScreen.tsx` beyond props.

**8. Evidence**

PR link, test output, screenshots for each of manual steps 1–4, and a KAN-269 comment.

**Contingency.** If T-12 will miss D7, tell A by midday D6. A takes `rhythmHistogram` and the Bar chart; you keep the rest.

### T-10 Finish authentication: password recovery, Google OAuth, unverified email

**1. Purpose**

SRS 3.1.1.1 and SDD C-01 / 6.3. KAN-229 is marked Done, but a password reset cannot be completed.

**2. Current implementation (verified)**
- **Recovery request:** `resetPasswordForEmail` sends the link with `redirectTo: window.location.origin` (`AuthContext.tsx`, around line 353). The client has `detectSessionInUrl: true` (`src/lib/supabase/client.ts`), so the link signs the user in and fires `PASSWORD_RECOVERY`.
- **Recovery state:** that event sets `isPasswordRecovery` (lines ~193–195), which lives in React state only. `App.tsx:27` then renders `<LoginPage />`.
- **No form:** `LoginPage` has modes `'signin' | 'signup' | 'forgot'` (line 20) and **no** new-password form.
- **Unused API:** `updatePassword` (around line 362) already calls `supabase.auth.updateUser({ password })` and clears `isPasswordRecovery` on success, but nothing calls it.
- **OAuth:** `signInWithOAuth(provider)` (around line 302) uses `redirectTo: window.location.origin`. No button calls it.
- **Verification resend:** `resendVerificationEmail(email)` (around line 336) exists and is never called.
- **Errors:** the error banner truncates long text (`LoginPage.tsx:470-482`, `className="truncate"`).
- **Signup validation:** requires ≥ 6 characters (line 91). Use the same minimum for consistency.
- **Labels:** form labels have no `htmlFor` / `id` (e.g. lines 488, 507).

**3. Required changes**
- **`AuthContext.tsx`:**
  - On load, if `window.location.hash` contains `type=recovery`, set `isPasswordRecovery` to true.
  - Persist the flag in `sessionStorage['muz_password_recovery']`, set on the event and cleared in `updatePassword`'s success branch and in `signOut`.
  - Initialise state from it, so a reload keeps the user in recovery.
- **`LoginPage.tsx`:**
  - Add `'recovery'` to `AuthMode`. When `isPasswordRecovery` is true, force mode `'recovery'`.
  - The form has New password and Confirm password fields: ≥ 6 characters, must match.
  - Submit calls `updatePassword`. On success, show "Password updated", then `App` renders the dashboard, because `isPasswordRecovery` is now false.
- **Google:** add a "Continue with Google" button to the signin and signup modes, calling `signInWithOAuth('google')`. Show errors in the existing banner.
- **Unverified email:** when the sign-in error message or code indicates an unconfirmed email (Supabase returns "Email not confirmed"), show the full message (remove `truncate`) and a "Resend verification email" button that calls `resendVerificationEmail(email)`.
- **Labels:** add `htmlFor` / `id` pairs to every form label.
- **`App.tsx`:** routing already shows `LoginPage` while `isPasswordRecovery`. Only rebase onto D's ViewportGuard change (T-15); no other change should be needed.
- **Staging setup (ask C):**
  - Supabase Dashboard → Authentication → Providers → Google: enabled, with the Google Cloud OAuth client ID and secret.
  - Redirect URLs: the staging host and `http://localhost:5173`.
  - **Who owns the Google Cloud project is unresolved; see U-07.**

**4. Step-by-step**
1. Branch `task/T-10-auth-completion`, from `main` after T-03 and T-15 are merged.
2. Persist the recovery flag and detect the URL hash. Test it manually:
   1. Request a reset on staging and open the link.
   2. The recovery form shows.
   3. Reload: the form is still shown.
3. Build the recovery form. Test: set a new password, sign out, sign in with the new password (works) and with the old one (fails).
4. Add the Google button. Test on staging once C confirms the provider is configured.
5. Add unverified-email handling. Test: sign up, do not confirm, sign in, then resend.
6. Add the label `htmlFor`/`id` pairs.
7. Run `npm test`, `npx tsc -p tsconfig.json` and `npm run build`.

**5. Expected output**

Recovery, Google sign-in and verification resend all work on staging.

**6. Testing**

The manual steps above, each with a screenshot. `npm test` must stay green.

**7. Acceptance**
1. Reset → new password → dashboard; the old password fails.
2. A reload during recovery keeps the form.
3. Google sign-in creates exactly one `profiles` row (the trigger) and lands on the dashboard.
4. An unverified login shows the full message and the resend button, and the email arrives.
5. Guest mode still works.

**8. Evidence**

PR link, screenshots of each step, and comments reopening and then closing KAN-228 and KAN-229.

### T-25 Production deployment and presentation

**1. Purpose**

SRS 3.6.1 and SPMP 3.1.9 / 3.2: ship v1.0.0 and prepare the defence demo.

**2. Current state**

Nothing is deployed. C's T-05 (D1–D2) creates `vercel.json`, the CI workflow, the staging project and `docs/ENVIRONMENTS.md`.

**3. Required changes**

No code. This task is configuration plus the release tag.

**4. Steps (D14; prepare on D13)**
1. Decide with A whether production is a new Supabase project or a promoted staging project. **Open decision U-06.**
2. If it is a new project:
   1. Apply `supabase/migrations/*` in timestamp order, including C's `run_id` migration, through the SQL editor.
   2. Apply `supabase/seed.sql`.
   3. Set the Auth Site URL and redirect URLs to the production host.
   4. Enable the Google provider.
3. In the host (Vercel), set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for Production. **Never commit them.**
4. Deploy `main` and confirm the build log shows no errors.
5. Smoke-test 5 flows:
   - signup;
   - placement;
   - a theory lesson;
   - a practice lesson (camera and mic);
   - the analytics page.
6. Tag the release: `git tag v1.0.0 && git push origin v1.0.0`.
7. With A, write the demo script. Record a backup screen video of the 5 flows, in case the hardware fails at the defence.

**5. Expected output**

A working production URL, tag `v1.0.0`, a demo script and a backup video.

**6. Testing**

The smoke test above.

**7. Acceptance**
1. All 5 flows pass on production.
2. The tag exists.
3. The rehearsal happened on D15.

**8. Evidence**

Production URL, the smoke-test checklist with screenshots, the tag link, and a KAN-283 comment.

---

## D. Git and pull-request instructions

| Item | Rule |
|---|---|
| Branches | `task/T-03-profile-bootstrap`, `task/T-11-achievements`, `task/T-12-analytics`, `task/T-10-auth-completion`, all from `main` |
| Wait for | T-12 and T-10 must be cut **after** D's T-15 is merged (D3), because `DashboardScreen.tsx` and `App.tsx` are shared. T-10 after T-03. |
| Do not touch | `src/audio/**`, `src/vision/**`, `src/practice/**`, `src/lesson/runner.ts` (A); `src/lib/sync/**`, `supabase/migrations/**` (C, approved by A); D's dashboard edits (`DashboardScreen.tsx` beyond props, `SkillTreeView.tsx`, `OnboardingWelcome.tsx`) |
| Commits | One logical change per commit, with a descriptive message citing the task (e.g. "T-03: never write the profile after a failed read"). **No placeholder messages** ("adsad", "things") and no delete-then-revert cycles. Squash noisy local history before opening the PR. |
| PR contents | Acceptance checklist with evidence, anything not verified, screenshots for UI |
| Reviewer | A (for every PR) |
| Must pass | `npm test`, `npx tsc -p tsconfig.json`, `npm run build`, `npm run seed:lessons:check` (from D2 these run in CI automatically) |

---

## E. Coordination and handoffs

| Task | You depend on | Depends on you | Agree on | Notify when | Handoff content |
|---|---|---|---|---|---|
| T-03 | A (T-01); C (staging, for the manual check) | T-10 (you) | — | PR open (D1) | The new `profileError` field in the auth context |
| T-04 | — | T-11, T-12 (you); A (deletes nothing until you finish) | Salvage list with A | D1 | KAN-259 comment |
| T-11 | T-04 | **C (T-13 builds on your `ProgressStore`)**, T-12 | `ProgressStore` methods (post on D2) | Merged (D3) | The exact interface, and how 23505 is handled |
| T-12 | T-04, T-11 (soft), D's T-15 merged | IC-3, T-23 | `useAnalyticsData` shape (in this guide) | Midday D6 if late; merged D7 | Screenshots; any metric caveats |
| T-10 | T-03; C (Google provider + redirect URLs); D's T-15 merged | IC-3, T-23 | Google project owner (U-07) | Ask C on D7 to configure the provider | Staging test log |
| T-23 support | IC-3 | C | Which steps you execute | D10 | Results for your steps |
| T-25 | T-24 (RC), C (production Supabase) | Release | Production project decision (U-06) | D13 | URL, tag, video |

---

## F. Daily working checklist

**Start of day**
1. `git switch main && git pull`, then rebase your task branch onto `main`.
2. Check that CI on `main` is green and read review comments on your PRs.
3. Check the master schedule for today's task.

**During the day**
- Work on one task at a time.
- Push at least once per half day.
- Ask A if you are blocked for more than half a day, or if a contract (`ProgressStore`, the analytics shape) must change.

**End of day**
- Push your work.
- Update the Jira status.
- Answer any review comments.

**Daily status (post by 09:30):**
```
Yesterday's progress:
Today's target:
Current blocker:
Jira ticket:
Expected deliverable:
```
