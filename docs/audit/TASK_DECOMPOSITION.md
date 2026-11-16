# Task Decomposition: Remaining Work

This document is the single source of task IDs (**T-01 … T-30**). Every other audit document refers to these IDs.

**Baseline.** Branch `course-handoff` @ `59448bd`, audited 2026-11-16. Unit tests pass: 27 files, 387 tests. `tsc` is clean, `vite build` passes, and `seed:lessons:check` is up to date (59 lessons).

## Team key

| | Member | Name | Jira account | Git author |
|---|---|---|---|---|
| **A** | Tech lead / PM | Amatong, Mark Lawrence | Mark Lawrence | markuu-exe |
| **B** | Full-stack | Barnaija, Aaron | dev_account | Confusion 996 |
| **C** | Backend, conservative | Rosales, Alejandro Ashlley | ashwwyr | ashwwyr |
| **D** | Frontend, needs structured tasks | Bernante, Vince | Neve | Bins |

## Complexity scale

| Size | Ideal developer-days | Typical shape |
|---|---|---|
| S | ≤ 1 | One file area, pure logic or copy fixes |
| M | 1–2 | Several files in one subsystem, or one integration seam |
| L | 3+ | New subsystem or cross-cutting change |

Estimates are planning figures, not measurements. Member D's estimates already include extra time.

## Priority scale

| Priority | Meaning |
|---|---|
| P0 | Blocker: other work or data integrity depends on it |
| P1 | Required by the SRS/SPMP for delivery |
| P2 | Required by Jira or the SDD but deferrable if the schedule slips |
| P3 | Recommended improvement |
| Deferred | Not scheduled unless a ruling in T-02 asks for it |

## Rules that apply to every task

1. **Branching.** Each task gets one branch, `task/T-xx-short-name`, cut from `main` **after T-01 lands**.
2. **CI must be green.** `npm test`, `npx tsc -p tsconfig.json`, `npm run build` and `npm run seed:lessons:check` all pass. After T-05 they run in CI automatically.
3. **Review.** The named reviewer approves the PR before merge. A merges, as integrator, unless stated otherwise.
4. **Done evidence.** Jira moves to Done only with the evidence listed in [INTEGRATION_AND_COORDINATION_PLAN.md](INTEGRATION_AND_COORDINATION_PLAN.md) §6.

---

## Phase 0: Immediate blockers

### T-01 Establish the integration baseline and repo hygiene

| Field | Value |
|---|---|
| Objective | One trusted `main` that every task branches from |
| Requirement | SPMP 3.3 (change control), SPMP 12 (version-controlled artifacts), SRS 3.5.2c |
| Jira | New NEW-01 under KAN-13 |
| Priority / size | P0 / S |
| Owner / support / reviewer | A / — / B |
| Dependencies | None. Hard prerequisite for every code task. |

**Description**
1. Push local `course-handoff` (2 unpushed commits: `317844d`, `59448bd`). Open a PR into `main` and merge it. `origin/main` is at `11bf8ef` and lacks COURSE-6.
2. Delete stale remote branches after confirming they hold nothing needed. The audit found nothing needed in them.
   - Delete: `Lag-in` (its tree still tracks `.env.local` with the publishable key), `dashboard` (would regress the dashboard) and `login-bins` (superseded).
   - Delete `features-integration` only after T-04.
3. Untrack the generated files `tsconfig.tsbuildinfo`, `tsconfig.node.tsbuildinfo`, `scripts/tsconfig.tsbuildinfo`, `vite.config.js` and `vite.config.d.ts`, and add them to `.gitignore`. Today `tsc -b` regenerates `vite.config.js`, and Vite loads `.js` before `.ts`, so the two can drift.
4. Turn on GitHub branch protection for `main`: PRs only, 1 approval.

**Deliverables:** the merged PR; the branch list; the `.gitignore` diff.

**Acceptance criteria**
- `origin/main` contains `59448bd`.
- `git ls-files` lists no `*.tsbuildinfo` and no `vite.config.js`.
- The `Lag-in` branch no longer exists on origin.
- `npm test` / `tsc` / `build` pass on `main`.

**Testing:** run the four CI commands on a fresh clone of `main`.

### T-02 Requirements rulings (change-control record)

| Field | Value |
|---|---|
| Objective | Resolve every SRS/SDD/Jira conflict the audit found before work depends on it |
| Requirement | SPMP 3.3 |
| Jira | New NEW-02 under KAN-5 |
| Priority / size | P0 / S |
| Owner / support / reviewer | A decides; B, C and D attend the meeting / — / whole team agrees in the meeting |
| Dependencies | None |

**Description.** Hold one 45-minute team meeting and record each decision, with its reason, in `docs/decisions/RULINGS.md`. Recommended answers are in [PROJECT_REQUIREMENTS_AUDIT.md](PROJECT_REQUIREMENTS_AUDIT.md) §5.

| ID | Decision |
|---|---|
| D1 | Audio window 4096 vs ≤ 2048 |
| D2 | AudioWorklet accepted in place of AnalyserNode |
| D3 | Does the 10 MB cap cover WASM + model or the model alone |
| D4 | pitchy is required for single-note drills (keep the SRS) |
| D5 | Tier timeouts of 12 s / 10 s vs the SRS 15 s |
| D6 | KAN-244 labels become Perfect/Good/Miss |
| D7 | Synthesised previews instead of audio samples |
| D8 | Three placement tiers vs two |
| D9 | Do failed runs count toward the streak |
| D10 | Heart restore on replays |
| D11 | OAuth provider = Google |
| D12 | 2° HUD hysteresis |
| D13 | Rhythm consistency formula |
| D14 | Client-trusted gamification accepted for the capstone (yes / RPC) |

**Deliverables:** `RULINGS.md` with 14 decisions.

**Acceptance criteria**
- Every decision has an outcome, a reason, the affected tasks, and whether the SRS/SDD needs an edit (feeds T-26).

**Testing:** none. This is a review artifact.

### T-03 Fix the profile bootstrap so it cannot wipe progress

| Field | Value |
|---|---|
| Objective | Signing in must never overwrite an existing learner's EXP, streak or hearts |
| Requirement | SDD C-01; SRS 3.1.1.2; SRS 3.1.2.2–3.1.2.4 (data integrity) |
| Jira | KAN-233 (reassign from C to B, who wrote `AuthContext.tsx`) |
| Priority / size | P0 / S |
| Owner / support / reviewer | B / A (session-handling review) / A |
| Dependencies | T-01 (hard) |

**Description.** All changes are in `src/context/AuthContext.tsx`.
1. In `fetchProfile`, create a profile only when the error code is `PGRST116` (no row). On any other error, return `null` and surface an error state. Never upsert.
2. If creation is needed, use `insert(...)` with no upsert. Use the defaults the DB trigger uses (`exp 0`, `current_streak 0`, `hearts 5`, `instrument_focus 'piano'`). Better still, re-read after a 500 ms retry, because the trigger normally creates the row.
3. Stop copying `user_metadata.username` and the instrument into `profiles` on every load (lines 76–96).
4. Narrow `InstrumentFocus` to `'piano'` in `src/types/auth.types.ts:6` and `AuthContext.tsx:16-22`.
5. Make the `onAuthStateChange` callback synchronous. Defer `fetchProfile` with `setTimeout(…, 0)` and skip it on `TOKEN_REFRESHED`. Supabase-js documents a deadlock risk when queries are awaited inside this callback.

**Deliverables:** a PR; a short note on manual test results.

**Acceptance criteria**
1. With the network throttled to "offline" right after sign-in, the profile's `exp` / `current_streak` / `hearts` in Supabase are unchanged.
2. A brand-new signup gets exactly one profile row with exp 0, streak 0, hearts 5.
3. A username suffixed by the trigger (`name_ab12`) is not overwritten on the next login.
4. `fetchProfile` runs once per sign-in. Confirm by counting network requests.

**Testing:** manual on staging (T-05). Optionally add a unit test with a mocked supabase client covering the error-code branch.

### T-04 Close `features-integration` and confirm what to salvage

| Field | Value |
|---|---|
| Objective | Avoid two competing gamification systems |
| Requirement | SRS 3.1.2.2–3.1.2.4, 3.1.7 |
| Jira | KAN-259 |
| Priority / size | P0 / S |
| Owner / support / reviewer | B (author of `dec609e`) / — / A approves |
| Dependencies | None. Hard prerequisite for T-11 and T-12. |

**Description.** Review the audit's salvage list in [JIRA_CODEBASE_RECONCILIATION.md](JIRA_CODEBASE_RECONCILIATION.md) §4 and agree it with A.
- **Discard:** `LessonSessionModal` (a simulated lesson runner), the save path and localStorage snapshot in `useGamification`, the branch's `useHeartRegen` / `useDashboardData` / `database.types.ts` changes, and the EXP replay and bonus rules.
- **Re-implement on `main`, not cherry-pick:** the achievement catalogue and evaluator (→ T-11), and the chart.js layout (→ T-12).
- Then archive the branch, or tag it `archive/features-integration`, and delete it.

**Deliverables:** a confirmed salvage list as a comment on KAN-259; the branch archived.

**Acceptance criteria:** A signs off on the salvage list; `features-integration` is no longer an open merge candidate.

**Testing:** none.

### T-05 Staging environment and CI pipeline

| Field | Value |
|---|---|
| Objective | A shared environment where Supabase-dependent work can be verified, plus automatic checks on every PR |
| Requirement | SRS 3.3.2, 3.4d (bundle ≤ 5 MB), 3.6.1b; SPMP 3.2, 3.1.9 |
| Jira | New NEW-03 under KAN-14; closes KAN-278 |
| Priority / size | P0 / M |
| Owner / support / reviewer | C / B (Vercel account access) / A |
| Dependencies | T-01 (hard). Hard prerequisite for T-20, T-23, T-25, and for the acceptance (not the coding) of T-03 and T-10. |

**Description**
1. Create a Supabase **staging** project. Apply `supabase/migrations/20260509120000_initial_schema.sql` and `supabase/seed.sql`. Record in `docs/ENVIRONMENTS.md` the project URL and which person holds the dashboard login. Never commit keys.
2. Set the Auth Site URL and redirect allow-list to the staging host.
3. Create the hosting project on Vercel (or Netlify; pick one and record it).
   - Add `vercel.json` with an SPA fallback: `{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}`.
   - Set the env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the host, not in git.
4. Add `.github/workflows/ci.yml`, running on `pull_request` and on push to `main`. Steps: `npm ci` → `npm test` → `npx tsc -p tsconfig.json` → `npx vite build` → `npm run seed:lessons:check` → a bundle-size check.
   - The size check is a Node one-liner that fails if `dist/assets/index-*.js` + `*.css` exceed 5 MB.
5. Add a guard in `src/lib/supabase/client.ts`: if either env var is missing, throw a readable error message instead of a white screen.

**Deliverables:** the staging URL, the CI workflow, `vercel.json`, `docs/ENVIRONMENTS.md`, the env-guard PR.

**Acceptance criteria**
- A PR shows the CI checks, and a deliberately failing test blocks merge.
- The staging URL loads; email signup creates a profile row in staging.
- The size check prints the measured size. The audit build measured 0.87 MB initial.
- A deep-link refresh does not 404.

**Testing:** open a throwaway PR containing a failing test, then delete it.

---

## Phase 1: Parallel implementation

### T-06 Hearts lost mid-drill must persist when the learner quits

| Field | Value |
|---|---|
| Objective | Quitting must not refund hearts |
| Requirement | SRS 3.1.2.4; `applyResult.ts:7-8` states this intent |
| Jira | New NEW-04 (bug) under KAN-12; link to KAN-267 |
| Priority / size | P1 / S |
| Owner / support / reviewer | A / — / B |
| Dependencies | T-01 (hard) |

**Description.** Hearts lost inside an unfinished drill are reported only through `onOutcome` when the drill ends (`PracticeDrillView.tsx:66-71`). `LessonPlayer.quit()` (`:143-151`) uses `run.hearts`, which never received the in-drill loss.
- Report each heart loss to the run as it happens. For example, add an `onHeartLost` callback in `ExerciseViewProps` that calls a new pure `loseHeart(run)` in `runner.ts`.
- Alternatively, report a partial outcome on unmount.

**Deliverables:** a PR with a runner test.

**Acceptance criteria**
- New test in `runner.test.ts`: start with 5 hearts, the drill reports 2 heart losses, quit, and `buildLessonResult(...).heartsEnd === 3`.
- The 387 existing tests still pass.
- Manual: lose a heart to a timeout, press Quit, and the dashboard shows one fewer heart.

**Testing:** unit test plus a manual check on staging.

### T-07 PitchVerifier: a pitchy single-note verifier (pure module)

| Field | Value |
|---|---|
| Objective | Meet SRS 3.1.6.2 exactly: ±35 cents of the target f0, octave included; reject clarity < 0.85 |
| Requirement | SRS 3.1.6.2, 3.6.2c, 3.7.3; SDD C-06 step 1 |
| Jira | KAN-262, KAN-263 (C is already the assignee) |
| Priority / size | P1 / M |
| Owner / support / reviewer | C / A (audio pipeline questions) / A |
| Dependencies | T-01 (hard); T-02 D4 (soft); T-08 interface agreement (soft: agree it on Day 1) |

**Description.** Create `src/audio/notes/PitchVerifier.ts` implementing the existing `AcousticVerifier` interface (`src/audio/practice/ChordVerifier.ts:35-39`). It reads two new **optional** fields on `AcousticFrame`, `pitchHz: number | null` and `clarity: number`. A adds these in T-08; until then, C declares them in a local test type.

Functions to add:
- `centsOff(hz, targetMidi)` and `midiToNoteName(midi)`, giving e.g. `"C4"` or `"F#3"`. Put them in `src/audio/dsp/pitch.ts`, and use the existing `freqToMidi` for Hz → MIDI instead of adding a duplicate.

Behaviour, mirroring `NoteVerifier` so the wait-state machine works unchanged:
- An attempt opens on `frame.onset`.
- Over `[onset + attackSkipMs, onset + 200 ms]`, a frame **passes** when `clarity >= 0.85` and `|centsOff(pitchHz, target)| <= 35`.
- A `match` is decided when ≥ 80 % of voiced frames pass. Use the thresholds in `src/audio/config.ts` and add a `pitch` section there.
- Otherwise decide `miss` at onset + 350 ms.

Also delete the dead `src/hooks/useAudioAnalysis.ts` and `src/lib/audio/noteFrequencies.ts`, which this task replaces.

**Deliverables:** `PitchVerifier.ts`, the helpers, `src/audio/__tests__/pitch.test.ts`, and the config entries.

**Acceptance criteria.** All of these are unit tests on synthetic frames:
| Input | Expected |
|---|---|
| Target A4 (440 Hz) at +30 cents | match |
| Target A4 at +40 cents | miss |
| A5 (880 Hz) while the target is A4 | miss (octave error) |
| Clarity 0.84 | ignored as not passing |
| Clarity 0.85 | passes |
| No onset | no attempt |

- `midiToNoteName(61) === 'C#4'`.
- `Math.round(freqToMidi(261.63)) === 60`.

**Testing:** `npx vitest run src/audio/__tests__/pitch.test.ts`, and the full suite.

**Must not change:** `NoteMatcher`, `ChordVerifier` and `WaitStateMachine` logic.

### T-08 Wire pitchy into the live audio pipeline

| Field | Value |
|---|---|
| Objective | Single-note drills in the real app grade by f0, not by pitch class only |
| Requirement | SRS 3.1.6.1, 3.1.6.2, 3.6.2c |
| Jira | KAN-261, KAN-264 |
| Priority / size | P1 / M |
| Owner / support / reviewer | A / C / B |
| Dependencies | T-07 (hard for merge, soft to start); T-02 D1/D2/D4 |

**Description**
1. Extend `AcousticFrame` with the optional fields `pitchHz` and `clarity`.
2. Compute them per hop from the same 4096-sample buffer.
   - Preferred: run `pitchy`'s `PitchDetector.forFloat32Array(4096)` inside `src/audio/worklet/chroma.worklet.ts`, and add the fields to the message in `worklet/protocol.ts`.
   - Fallback, if bundling pitchy into the worklet fails: an `AnalyserNode` on the same source in `AudioInputService.ts`, run on the main thread.
   - In both cases, raw samples never leave the device.
3. In `src/practice/PracticeDrill.ts:192-196`, use `PitchVerifier` for `kind: 'note'`. Keep `NoteVerifier` behind a config flag for comparison during T-19.
4. Check the content: every `play-note` target in `src/content/units/*` must carry an exact MIDI note (octave). Run `npm run seed:lessons:check` and regenerate if needed.

**Deliverables:** a PR; a short latency note covering onset → verdict (feeds T-19).

**Acceptance criteria**
- `notes.test.ts` / `PracticeDrill.test.ts` updated: a wrong-octave note now fails.
- The existing chord tests are unchanged and pass.
- In the browser, a sung or played A4 against an A4 target passes; A3 fails.
- No new network requests (DevTools).

**Testing:** unit tests, then manual on a keyboard (T-19).

### T-09 Vision runtime hardening and performance instrumentation

| Field | Value |
|---|---|
| Objective | Remove the timestamp and race defects; make 20–30 Hz / 60 FPS measurable |
| Requirement | SRS 3.4a, 3.4c, 3.1.5.3, 3.1.6.5 |
| Jira | New NEW-05 under KAN-11 |
| Priority / size | P1 / M |
| Owner / support / reviewer | A / — / B (code review only) |
| Dependencies | T-01 (hard) |

**Description**
1. In `src/vision/pipeline/FrameLoop.ts:97`, always send `performance.now()` as the timestamp, or send `RESET` to the worker on stream restart. Today the worker clamps timestamps to be strictly increasing (`posture.worker.ts:89`), so a `mediaTime` restart near 0 makes cues and One-Euro smoothing lag.
2. In `FrameLoop.ts:86-92`, set `awaitingResult` before `await createImageBitmap`, and catch its rejection.
3. Cap inference at ≤ 30 Hz: skip frames if fewer than 33 ms have passed since the last one sent.
4. Add a debug overlay, toggled by `?debug=perf` or the backtick key, in `CameraPanel.tsx`. It shows the `HudEngine.getStats()` p50/p95 frame time, the worker result interval and `inferenceMs` p50/p95.
5. Optional: in `WaitStateMachine.tick`, hold the latch for the posture-worker latency before expiring it (the audio report's item 4).

**Deliverables:** a PR; tests for items 1–3 with a fake clock.

**Acceptance criteria**
- Unit test: after a simulated stream restart, a violation cue still appears after `cueDelayMs` (600 ms).
- The overlay shows live numbers.
- No more than one frame is in flight.

**Testing:** unit tests, plus a manual run with the overlay.

### T-10 Finish authentication: password recovery, Google OAuth, unverified email

| Field | Value |
|---|---|
| Objective | Make KAN-228 and KAN-229 actually complete |
| Requirement | SRS 3.1.1.1; SDD C-01 error handling, SDD 6.3 (Google button) |
| Jira | Reopen KAN-229 and KAN-228 |
| Priority / size | P1 / M |
| Owner / support / reviewer | B / C (Supabase Google provider config) / A |
| Dependencies | T-03 (hard: same file); T-05 (hard for acceptance); T-02 D11 |

**Description**
1. **Recovery.** Detect `type=recovery` in the URL hash on load, as well as the `PASSWORD_RECOVERY` event, so a reload cannot skip the step.
   - Add a `recovery` mode to `LoginPage.tsx` with new-password and confirm fields (min 6 characters, matching the existing signup rule at `LoginPage.tsx:91`; must match) that calls `updatePassword` (`AuthContext.tsx:362-374`).
   - On success, clear `isPasswordRecovery` and go to the dashboard.
2. **Google.** Add a "Continue with Google" button that calls `signInWithOAuth('google')`. Errors appear in the existing banner. C enables the Google provider in the staging Supabase project and adds the redirect URL.
3. **Unverified email.** On the `email_not_confirmed` error, show a full, non-truncated message (`LoginPage.tsx:470-482`) and a "Resend verification email" button that calls `resendVerificationEmail`.
4. Add `htmlFor`/`id` to the form labels.

**Deliverables:** a PR; a staging test log.

**Acceptance criteria**
1. Reset email → link → new password → dashboard. Signing out and back in works with the new password; the old one fails.
2. Reloading on the recovery screen keeps the recovery form.
3. Google sign-in on staging creates exactly one profile through the trigger.
4. An unverified login shows the resend button, and the resend email arrives.

**Testing:** manual on staging; screenshots attached to KAN-229.

### T-11 Achievements: evaluate, award and credit

| Field | Value |
|---|---|
| Objective | Badges unlock from real progress and credit `exp_reward` once |
| Requirement | SRS 3.1.7.4; SDD 4.2 (achievements, user_achievements) |
| Jira | KAN-270 (split: the EXP / streak / hearts parts are already implemented; see the reconciliation) |
| Priority / size | P1 / M |
| Owner / support / reviewer | B / A (`applyResult` owner) / A |
| Dependencies | T-04 (hard); T-02 D14 (soft); merge **before** T-13 (both touch `saveLessonResult.ts` / `supabaseStore.ts`) |

**Description**
- Create the pure module `src/lib/progress/achievements.ts`:

```ts
export interface AchievementInput {
  exp: number; currentStreak: number; completedLessonIds: string[];
  performance: { posture_score: number }[]; unlocked: Set<string>;
}
export function evaluateAchievements(i: AchievementInput): { newlyUnlocked: string[] };
```

- Rules cover only the 5 seeded ids (`supabase/seed.sql:441-447`): `first-lesson`, `streak-7-days`, `streak-30-days`, `exp-500`, `posture-stable`. Write the exact thresholds in the PR description and have A confirm them.
- Extend `ProgressStore` (`saveLessonResult.ts:11-17`) with `getUnlockedAchievements(userId)`, `getAchievementRewards()` (reads `achievements.exp_reward`) and `insertAchievements(userId, ids)`. The insert is a plain `insert`; ignore Postgres error `23505`. **Do not** upsert: there is no UPDATE grant on `user_achievements`.
- Call the evaluator in `saveLessonResult` after the profile is computed. Add the sum of `exp_reward` for newly unlocked badges to the profile EXP in the same profile write.
- Port and adapt the achievement tests from `origin/features-integration:src/lib/gamification/__tests__/gamification.test.ts`.

**Deliverables:** a PR; `achievements.test.ts`.

**Acceptance criteria**
- Tests:
  - first completion → `first-lesson`;
  - streak 7 → `streak-7-days`;
  - an already-unlocked badge is not re-awarded;
  - the EXP bonus is applied once.
- Staging: completing a first lesson inserts one `user_achievements` row, and the profile EXP rises by lesson EXP + 50.

**Testing:** unit tests, then staging.

### T-12 Profile analytics with real data

| Field | Value |
|---|---|
| Objective | Replace the hard-coded Profile view with the learner's own data |
| Requirement | SRS 3.1.7.1–3.1.7.4; SDD C-07, 6.3 (date range) |
| Jira | KAN-269 |
| Priority / size | P1 / L |
| Owner / support / reviewer | B / D (badges-grid styling only, if B asks) / A |
| Dependencies | T-04 (hard); T-11 (soft: build against an empty `user_achievements` list) |

**Description**
1. Create `src/hooks/useAnalyticsData.ts` with:

```ts
useAnalyticsData(userId: string, range: '7d'|'30d'|'all') →
  { loading; error;
    sessions: { day: string; pitch: number|null; rhythm: number|null; posture: number|null; minutes: number }[];
    rhythmHistogram: { bucket: string; count: number }[];
    lessonsCompleted: number;
    badges: { id: string; title: string; unlockedAt: string|null }[] }
```

   It reads `performance_records` (where `session_timestamp >= now - range`; the index `performance_records_user_time_idx` exists), `user_progress` and `achievements` + `user_achievements`.
2. Put the aggregation in a pure module, `src/lib/analytics/aggregate.ts`, with unit tests.
3. In `ProfileAnalyticsView.tsx`, delete every hard-coded value: the stats at lines 85–122, the chart arrays at 125–200 and the badges at 289+. Add:
   - a pitch-accuracy line;
   - a posture-stability line (per-session `posture_score`; ruling: SRS "angular deviation logs" is satisfied by session aggregates);
   - a rhythm-consistency histogram;
   - the badges grid.
4. Add an empty state for learners with no sessions.

**Deliverables:** a PR; aggregation tests.

**Acceptance criteria**
- A new account shows empty states and no fake numbers.
- After one practice lesson on staging, the pitch and posture charts show one point dated today.
- Switching 7d / 30d / all changes the query; confirm by network request.
- `grep -n "142.8\|14.2 hrs" src` returns nothing.

**Testing:** unit tests for the aggregation; manual on staging.

**Must not change:** `DashboardScreen.tsx` beyond passing props. D is working there in T-14 and T-15.

### T-13 Offline progress cache and sync

| Field | Value |
|---|---|
| Objective | A lesson finished while offline is saved once connectivity returns |
| Requirement | SRS 3.3.2b; SDD C-08, 4.2 SyncQueueItem |
| Jira | KAN-268 |
| Priority / size | P1 / L |
| Owner / support / reviewer | C / A (`ProgressStore` seam) / A |
| Dependencies | T-01 (hard); T-11 merged first (soft: shared files); any migration needs A's approval |

**Description**
1. Create `src/lib/sync/queue.ts` using `idb` (already a dependency). The store `sync_queue` holds `{ id, endpoint: 'saveLessonResult', payload: SaveLessonInput (serialised), retryCount, timestamp }`, as in SDD 4.2.
2. Wrap the save in `DashboardScreen`'s save handler, or add a `QueuedProgressStore` decorator. If `saveLessonResult` throws a **network** error (`TypeError: Failed to fetch`, or `navigator.onLine === false`), enqueue the input. Do not enqueue validation errors.
3. Flush on the `online` event and on app start, sequentially, with backoff `min(30 s, 1 s · 2^retryCount)`. After 6 failures, keep the item and show a warning.
4. **Idempotency.** Add a client `run_id uuid` to the lesson result. Write a **new** migration file, `supabase/migrations/<timestamp>_performance_run_id.sql`, adding `performance_records.run_id uuid unique`. Skip the insert on `23505`. `applyResult` re-reads fresh rows, so replaying a queued save stays correct.
5. Show a small "Saved offline, will sync" note in `LessonResults.tsx`.

**Deliverables:** a PR; the migration; `queue.test.ts` using `fake-indexeddb`, which must be added as a dev dependency. Any new dependency needs A's approval.

**Acceptance criteria**
- Unit tests:
  - enqueue on network error;
  - no enqueue on a validation error;
  - flush order;
  - the backoff schedule;
  - the duplicate `run_id` is skipped.
- Staging: in DevTools set "Offline", finish a lesson, go back "Online"; exactly one `performance_records` row appears and EXP is credited once.

**Testing:** unit tests, then the manual offline test.

### T-14 Onboarding: welcome step with a Piano-only instrument card

| Field | Value |
|---|---|
| Objective | Show the Piano lock that SRS 3.1.1.2–3.1.1.3 and KAN-235 describe |
| Requirement | SRS 3.1.1.2, 3.1.1.3; SDD 6.3 |
| Jira | KAN-235, KAN-231 |
| Priority / size | P2 / S |
| Owner / support / reviewer | D / B / B |
| Dependencies | T-01 (hard); T-15 merged first (soft: same file, same owner); T-02 D8 (soft) |

**Description.** Create one new component, `src/components/dashboard/OnboardingWelcome.tsx`.
- It shows before `PlacementModal`, whenever `PlacementModal` would show (the `DashboardScreen.tsx:96-103,651` condition).
- It holds one selected "Piano" card and two disabled cards ("Guitar: coming soon", "Voice: coming soon") with `aria-disabled="true"`, plus a "Continue" button that opens the placement modal.
- No database writes.
- Reuse the visual style of `PlacementModal.tsx`.

**Deliverables:** a PR with screenshots.

**Acceptance criteria**
- A new account sees Welcome → Placement → Dashboard.
- A returning account never sees Welcome.
- Disabled cards cannot be selected by mouse or keyboard.
- No new Supabase calls.

**Testing:** manual on staging; `tsc` and tests green.

**Must not change:** `placement.ts`, `supabaseStore.ts`, `AuthContext.tsx`.

### T-15 Dashboard and lesson UI fixes

| Field | Value |
|---|---|
| Objective | Fix the small, verified UI defects |
| Requirement | SRS 3.1.2.1, 3.1.2.3, 3.1.2.4, 3.2.2b, SDD 6.3 |
| Jira | KAN-236, KAN-237, KAN-238 |
| Priority / size | P1 / M |
| Owner / support / reviewer | D / A (answers questions) / A |
| Dependencies | T-01 (hard). Merge **before** T-10 and T-12 (shared files `App.tsx` and `DashboardScreen.tsx`). |

**Description.** Eight exact changes, one commit each:
1. `DashboardScreen.tsx:77-81`: remove the fallbacks `exp ?? 1240`, `hearts ?? 4` and streak `7`. Show `—` while the profile is null.
2. `SkillTreeView.tsx:199`: mastered nodes show the lesson's EXP reward, not `required_exp`. The reward is already on the node as `expReward` (`curriculum.ts:65`, computed with `lessonExp` from `src/content/index.ts:112`).
3. Unify the 0-heart rule so `DashboardScreen.tsx:164` and `SkillTreeView.tsx:117` agree. **Rule:** at 0 hearts, a lesson is blocked only if it contains an exercise whose engine is `practice`. Use the same test as `runner.ts:45` (`EXERCISE_ENGINE[e.type] === 'practice'`); export that helper rather than copying it. Rhythm and theory lessons stay open: every tier sets `rhythmFailHeartCost: 0` (`tiers.ts:31,49,67`). Today `SkillTreeView` wrongly blocks rhythm lessons.
4. `DashboardScreen.tsx:144-162`: the locked-node banner names the blocking lesson, e.g. "Finish *Lesson title* first".
5. `App.tsx`: render `<ViewportGuard>` once at the top level, above `LoginPage` and above the lesson overlay. Set its z-index above `z-50`.
6. `TapExerciseView.tsx:180`: show "You will try this rhythm again" only outside checkpoint lessons.
7. `MediaDiagnostics.tsx:75`: in posture-only exercises, say "This exercise needs the camera" instead of "both".
8. `TapExerciseView.tsx`: show the running score counter (Perfect +100, Good +70) during the rhythm game (SDD 6.3). `summary.score` already exists.

**Deliverables:** a PR with before/after screenshots for each item.

**Acceptance criteria**
- Each item is visibly fixed.
- `npm test` passes.
- New unit tests for `nodeStatus` in `src/lib/dashboard/__tests__/curriculum.test.ts`: locked, available, and completed with an EXP threshold.

**Testing:** manual plus the new unit tests.

**Must not change:** `runner.ts`, `applyResult.ts`, `AuthContext.tsx`, or any styling outside the lines named.

### T-16 Rhythm timing tests, consistency formula, heart-restore tests

| Field | Value |
|---|---|
| Objective | Lock SRS 3.1.4.3 boundaries in tests and fix the consistency score |
| Requirement | SRS 3.1.4.3, 3.1.4.4, 3.1.2.4 (≥ 80 % restore) |
| Jira | KAN-244 (retitle per D6), KAN-239 |
| Priority / size | P1 / S |
| Owner / support / reviewer | D / C (wrote `timing.ts`) / A |
| Dependencies | Tests can start immediately after T-01. The formula change needs T-02 D13 (hard). |

**Description**
1. New `src/lib/rhythm/__tests__/timing.test.ts` asserting:
   - `classifyDelta(25) = Perfect`, `classifyDelta(25.01) = Good`;
   - `classifyDelta(50) = Good`, `classifyDelta(50.01) = Miss`;
   - negative deltas give the same results;
   - omitted beats count as Miss in `summarize`.
2. Change `summarize` in `timing.ts:53-54` to the ruled formula. Recommended: `consistency = 100 × Σ_targets max(0, 1 − |Δ|/50) / targetCount`, with omitted beats contributing 0.
   - Test: 1 perfect hit out of 10 targets gives 10, not 100.
3. In `src/lesson/__tests__/runner.test.ts`, add theory-score cases:
   - 80 → heart restored;
   - 79.99 → not restored;
   - already at 5 hearts → not restored.

**Deliverables:** a PR.

**Acceptance criteria:** the new tests pass and all existing tests pass. If a `plan.test.ts` expectation has to change, the PR explains why.

**Testing:** `npx vitest run src/lib/rhythm src/lesson`.

**Must not change:** `plan.ts` scoring or the timing windows.

### T-17 Draw flats on the staff and in labels

| Field | Value |
|---|---|
| Objective | F-major and B♭ content shows B♭, not A♯ |
| Requirement | SRS 3.1.3.1 |
| Jira | New NEW-06 (bug) under KAN-10; link to KAN-243 |
| Priority / size | P2 / M (provisional for D) |
| Owner / support / reviewer | D / C (author of `GrandStaff.tsx` and `notes.ts`) / C, then A |
| Dependencies | T-01 (hard) |

**Description**
- Add an optional `spelling?: 'sharp' | 'flat'` (default `'sharp'`) to `midiToName` and `staffPosition` in `src/lib/theory/notes.ts:7-23`. A flat note sits one staff step higher with a ♭ glyph.
- Pass it through `GrandStaff.tsx:30-41` and `NoteFigure.tsx`.
- Add `spelling: 'flat'` to the content that needs it: the "F Major (One Flat)" card in `src/content/units/proficient.ts:154-161`, plus any `Bb`/`Eb` labels found with `grep -rn "flat\|Bb\|Eb" src/content`.
- Regenerate the seed with `npm run seed:lessons` and commit `seed.sql`.

**Deliverables:** a PR; screenshots; `notes.test.ts` cases.

**Acceptance criteria**
- `midiToName(70, 'flat') === 'Bb4'`.
- The `staffPosition` flat for B♭4 is the B line.
- The F-major card shows B♭.
- `seed:lessons:check` passes.

**Testing:** unit tests, then a visual check.

**If stuck:** after 1 day without progress, hand it to C.

### T-18 Remove dead code

| Field | Value |
|---|---|
| Objective | Delete unreachable test pages and hooks so no one maintains two implementations |
| Requirement | Maintainability; SPMP 6 |
| Jira | New NEW-07 under KAN-13 |
| Priority / size | P2 / S |
| Owner / support / reviewer | D / — / A, plus C for the theory files C wrote |
| Dependencies | T-01 (hard) |

**Description.** Delete exactly these files. Each is imported only by others in this list; this was verified on 2026-11-16.
- `src/components/theory/Quiz.tsx`, `LessonModule.tsx`, `NotationTest.tsx`, `QuizTest.tsx`, `LessonTest` (no extension)
- `src/components/rhythm/MetronomeTest.tsx`, `RhythmJudgeTest.tsx`, `SpacebarTapTest.tsx`
- `src/hooks/useMetronome.ts`, `useQuiz.ts`, `useChordDrill.ts`, `usePostureWorker.ts`
- `src/lib/theory/quiz.ts`, `src/lib/theory/lesson.ts`
- `src/components/common/SkillTree.tsx`

Also remove the unused imports listed in the frontend audit: `ShieldAlert`, `ChevronRight`, `Flame`, `Music2` in `DashboardScreen.tsx`; `Maximize2` in `ViewportGuard.tsx`.

**Do not delete:** `GrandStaff.tsx`, `PianoKeyboard.tsx`, `lib/theory/notes.ts`, `lib/theory/playNote.ts`, `useSpacebarTap.ts`, `useRhythmJudge.ts`, `lib/rhythm/timing.ts` (all live); `src/vision/posture/session.ts` (exported and tested); `useAudioAnalysis.ts` and `noteFrequencies.ts` (T-07 removes those).

**Acceptance criteria**
- `tsc`, `npm test` and `npm run build` pass.
- `grep -rn "useMetronome\|useQuiz\|useChordDrill\|usePostureWorker" src` returns nothing.

**Testing:** the CI commands.

---

## Phase 2: Integration

Integration is A's ongoing responsibility at checkpoints IC-0 … IC-4; see [INTEGRATION_AND_COORDINATION_PLAN.md](INTEGRATION_AND_COORDINATION_PLAN.md). It is not a separate ticket.

## Phase 3: Testing and quality assurance

### T-19 Hardware benchmark and audio tuning session

| Field | Value |
|---|---|
| Objective | Produce the performance evidence the SRS demands, and validate the audio on a real piano |
| Requirement | SRS 3.4a–c, 3.1.5.3, 3.1.6.1, 3.1.6.4; SPMP 6 (performance quality) |
| Jira | KAN-277; validation subtask for KAN-260 |
| Priority / size | P1 / M |
| Owner / support / reviewer | A / C (records the pitch results), D (records the table) / B |
| Dependencies | T-08 and T-09 merged (hard) |

**Description.** Run on at least two machines: one mid-range laptop with a 720p30 webcam, and one other. Use Chrome and Edge, a digital or acoustic piano, and both a laptop mic and a USB mic. Record each figure in `docs/test/PERFORMANCE_REPORT.md`:

| Measure | Target |
|---|---|
| HUD frame time | p95 < 16.7 ms |
| Worker result interval | 33–50 ms |
| `inferenceMs` | p95 ≤ 35 ms on GPU, also recorded on CPU |
| Onset → verdict latency | chord ≈ 200 ms; note per T-08 |
| Correct-chord pass rate | ≥ 95 % over 20 strikes per chord, 5 chords |
| Wrong-chord rejection | Report the rate |
| Single-note pass rate | ±35 cents |

Production preview check: run `npm run build && npm run preview`. The model must load, and the WASM and `.task` files must be fetched only after "Turn on camera".

If the pass rate is below target, tune the thresholds in `src/audio/config.ts` and record the before/after values.

**Deliverables:** `PERFORMANCE_REPORT.md` with the raw numbers; any tuning PR.

**Acceptance criteria:** every SRS 3.4 figure has a measured value marked pass or fail. Any fail becomes a defect logged in T-22's log.

### T-20 Verify RLS with unauthorised access attempts

| Field | Value |
|---|---|
| Objective | Prove SRS 3.5.2 on the live staging database |
| Requirement | SRS 3.5.2a, 3.5.2b |
| Jira | KAN-275 |
| Priority / size | P1 / M |
| Owner / support / reviewer | C / — / A |
| Dependencies | T-05 (hard) |

**Description.** Write `scripts/rls-check.ts`, run with `npx tsx`, using `@supabase/supabase-js` with the **publishable** key and two test users, A and B, created on staging. For each of the 6 tables, assert:
1. Anonymous select / insert / update / delete is denied.
2. User B cannot select / update / delete user A's rows.
3. User B cannot insert a row with `user_id = A`.
4. `lessons` and `achievements` are read-only for authenticated users.

Also record, as a **known accepted risk** unless D14 ruled otherwise, that a user *can* PATCH their own `profiles.exp`.

Record the TLS version from the browser's security panel.

**Deliverables:** the script; `docs/test/SECURITY_TEST_REPORT.md`.

**Acceptance criteria**
- The script exits 0 on staging and prints a pass/fail table.
- Every cross-user attempt is denied.
- The report states the TLS version.

**Testing:** run it twice: with a fresh DB, and after T-23 data exists.

### T-21 Media-leak and offline-execution audit

| Field | Value |
|---|---|
| Objective | Evidence that no raw video or audio leaves the device, and that CV and pitch work with no network |
| Requirement | SRS 3.5.1, 3.3.1a, 3.7.4 |
| Jira | KAN-276 |
| Priority / size | P1 / S |
| Owner / support / reviewer | D / — / A |
| Dependencies | T-08 merged (hard) |

**Description.** Follow the exact steps in [INDIVIDUAL_DELEGATION_PACKAGES.md](INDIVIDUAL_DELEGATION_PACKAGES.md) (Member D, T-21). In short:
1. On staging, open DevTools → Network → "Preserve log". Run one posture-hold exercise and one play-chord exercise for 60 s each, then export a HAR.
2. List every request. Expected: only the model / WASM / JS assets and Supabase REST JSON.
3. Check that no request body exceeds 10 kB other than the asset downloads.
4. Set DevTools to "Offline" mid-exercise; the HUD and chord detection must keep working.

**Deliverables:** `docs/test/MEDIA_PRIVACY_REPORT.md`, plus the HAR file (kept locally, not committed).

**Acceptance criteria:** the report lists every request host and type, and states pass/fail for each step.

### T-22 Browser and hardware compatibility matrix, plus the defect log

| Field | Value |
|---|---|
| Objective | Execute SRS 3.7.2 / KAN-279 and start the SPMP issue log |
| Requirement | SRS 3.7.2, 3.3.1b, 3.2.2; SPMP 6 (defect management), 10 |
| Jira | KAN-279, KAN-280 |
| Priority / size | P1 / M |
| Owner / support / reviewer | D / A triages the defects / A |
| Dependencies | IC-3 feature freeze (hard) |

**Description**
- Run the scripted checklist in the delegation package on Chrome, Edge and Firefox. Add Safari if anyone has a Mac.
- Use an integrated webcam and mic, and a USB webcam and mic.
- Include the denial cases: block the camera, block the mic, unplug mid-drill, and a window narrower than 1024 px.
- Log every failure in the SPMP Issue Log sheet with all 9 SPMP §10 fields, and mirror P0/P1 defects as Jira Bugs.

**Deliverables:** `docs/test/COMPATIBILITY_MATRIX.md`; the issue-log entries.

**Acceptance criteria**
- Every cell of the matrix is pass, fail or n/a, with a defect ID for each fail.
- Every defect has a priority assigned by A within 1 working day.

### T-23 End-to-end integration checklist

| Field | Value |
|---|---|
| Objective | Scripted functional and integration test of every flow against staging |
| Requirement | SPMP 3.2 (pre-deployment testing list), 6 (functional quality) |
| Jira | KAN-274, KAN-271 |
| Priority / size | P1 / M |
| Owner / support / reviewer | C / B (pairs on the auth and analytics flows) / A |
| Dependencies | IC-3 (hard); T-05 (hard) |

**Description.** Write `docs/test/E2E_CHECKLIST.md`, then execute it, covering every SPMP §6 functional item:
- auth;
- onboarding and placement;
- skill tree gating;
- theory;
- rhythm;
- posture;
- single-note;
- chord;
- wait-state;
- hearts (timeout, 3 misses, regen, ≥ 80 % restore, quit);
- EXP and streak;
- achievements;
- analytics;
- offline sync.

Each step has a precondition, action, expected result and actual result. Automated Playwright tests are **not** required (see the audit's scope note), but add them if time remains.

**Deliverables:** the checklist with results; defects logged in T-22's log.

**Acceptance criteria:** 100 % of steps executed; every failure has a defect ID.

---

## Phase 4: Bug fixing and regression

### T-24 Defect triage, fixes and regression

| Field | Value |
|---|---|
| Objective | Close the P0/P1 defects from T-19 to T-23 without new regressions |
| Requirement | SPMP 6 (defect management) |
| Jira | KAN-273, KAN-281, KAN-282 |
| Priority / size | P1 / M (timeboxed to 2 days) |
| Owner / support / reviewer | A (triage and assignment) / everyone fixes defects in their own area / the reviewer of the original task |
| Dependencies | T-19 to T-23 (hard) |

**Description**
- A assigns each defect to the member who owns that area (see [TEAM_ASSIGNMENT_MATRIX.md](TEAM_ASSIGNMENT_MATRIX.md) §3).
- Each fix includes a unit test where the defect is reproducible in logic.
- After all fixes, re-run the full unit suite, the T-23 checklist steps for the affected flows, and the T-20 script.

**Acceptance criteria**
- No open P0/P1 defects.
- The regression rerun is recorded in `docs/test/REGRESSION_LOG.md`.

---

## Phase 5: Deployment and delivery

### T-25 Production deployment and presentation

| Field | Value |
|---|---|
| Objective | Ship the release candidate and prepare the defence demo |
| Requirement | SRS 3.6.1; SPMP 3.1.9, 3.2 |
| Jira | KAN-283 (assign to B), KAN-14 |
| Priority / size | P0 at end / M |
| Owner / support / reviewer | B / A (demo script), C (Supabase production) / A |
| Dependencies | T-24 (hard) |

**Description**
1. Create the Supabase **production** project, or promote staging; record the decision. Apply the migrations and seed.
2. Configure the Auth URLs and the Google provider.
3. Deploy `main` to the production host.
4. Run a smoke test of 5 core flows on production.
5. Tag `v1.0.0`.
6. Prepare the demo script and backup video. The video guards against hardware failure during the defence.

**Acceptance criteria**
- The production URL works for signup → lesson → analytics.
- The tag exists.
- The demo script is rehearsed once with the whole team.

### T-26 Update SRS/SDD to v01.02 and write the test documentation

| Field | Value |
|---|---|
| Objective | Keep the SRS, SDD and SPMP consistent with the delivered system (SPMP 3.3, 12) |
| Jira | New NEW-08 under KAN-5 (reopen KAN-5 or add a child) |
| Priority / size | P1 / M |
| Owner / support / reviewer | D drafts / A provides the technical content / A approves |
| Dependencies | T-02 (hard). The test reports come from T-19 to T-23. |

**Description**
- Apply every T-02 ruling marked "doc edit" to the SRS and SDD.
- Add a revision-history row to each.
- Update the SDD §7 matrix to match [REQUIREMENTS_TRACEABILITY_MATRIX.md](REQUIREMENTS_TRACEABILITY_MATRIX.md).
- Collect the T-19 to T-23 reports into a test appendix.

**Acceptance criteria:** every ruling is reflected; A signs off on the revision history.

---

## P3 and deferred (not scheduled)

| ID | Task | Why deferred | Trigger to schedule |
|---|---|---|---|
| T-27 | Contrast and readability pass: minimum 12 px text, AA contrast, shared colour tokens (D, P3) | SRS 3.2.1 is only partly met, and the fix is cosmetic | Time remains after T-24 |
| T-28 | Server-authoritative save via a `security definer` RPC; revoke client UPDATE on gamification columns | Not required by SRS 3.5.2 (owner-only RLS is met); large change | Ruling D14 = "RPC" |
| T-29 | Posture calibration UI that sends `CALIBRATE` | No SRS requirement; slouch cues are advisory | Usability tests show false slouch cues |
| T-30 | Server-side heart-regen anchor (`profiles.hearts_regen_at`) | The per-device anchor works; low impact | Multi-device use becomes a requirement |
