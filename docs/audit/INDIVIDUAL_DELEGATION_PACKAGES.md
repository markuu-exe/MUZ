# Individual Delegation Packages

Each brief below can be copied and sent as-is. Every task has **one primary owner**.

- **Task IDs** match [TASK_DECOMPOSITION.md](TASK_DECOMPOSITION.md).
- **Days** match [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md).
- **Before you start any task:**
  1. Pull `main` after T-01 has landed.
  2. Branch as `task/T-xx-short-name`.
  3. Run `npm ci && npm test` and make sure all 387 tests are green.
- **To finish any task:** open a PR to `main` and fill in the Done-evidence checklist (integration plan §6). Do not move the Jira issue to Done yourself; A does that after merging.

---

# Member A: Amatong (tech lead / integrator)

### A-1 · T-01 Establish the integration baseline (D1, morning)

| # | Field | Content |
|---|---|---|
| 1 | Title | Establish the integration baseline and repo hygiene |
| 2 | Assigned | A. Reviewer: B. |
| 3 | Objective | One trusted `main` that every task branches from |
| 4 | Why | `origin/main` (`11bf8ef`) lacks COURSE-6. Local `course-handoff` has 2 unpushed commits. Stale branches include one whose tree still tracks `.env.local`. |
| 5 | Scope | Push `course-handoff`, open a PR, merge. Delete `Lag-in`, `dashboard` and `login-bins` on origin. Untrack `tsconfig*.tsbuildinfo`, `scripts/tsconfig.tsbuildinfo`, `vite.config.js` and `vite.config.d.ts`, and add them to `.gitignore`. Turn on branch protection. |
| 6 | Requirements | SPMP 3.3, SPMP 12, SRS 3.5.2c |
| 7 | Inspect | `git log origin/main..course-handoff`, `.gitignore`, `git ls-files` |
| 8 | Expected behaviour | A fresh clone of `main` builds and tests green |
| 9 | Constraints | No code changes beyond the `.gitignore` and untracking |
| 10 | Dependencies | None. Everyone else waits on this; announce it in the team chat when it is done. |
| 11 | Acceptance | `origin/main` contains `59448bd`; `git ls-files` shows no generated files; `Lag-in` is gone; the 4 CI commands pass |
| 12 | Testing | Fresh clone, then `npm ci && npm test && npx tsc -p tsconfig.json && npm run build && npm run seed:lessons:check` |
| 13 | Handoff | Chat message: "main is the baseline at `<sha>`" |
| 14 | Do NOT change | Any source file |
| 15 | Ask / approve | Before deleting any branch not listed here |

### A-2 · T-02 Requirements rulings (D1)

| # | Field | Content |
|---|---|---|
| 1 | Title | Run the change-control meeting and record rulings D1–D14 |
| 2 | Assigned | A. Attendees: B, C, D. |
| 3 | Objective | Settle every SRS/SDD/Jira conflict before work depends on it |
| 4 | Why | 14 conflicts listed in `PROJECT_REQUIREMENTS_AUDIT.md` §5. Several tasks (T-07, T-14, T-16, T-26) depend on them. |
| 5 | Scope | 45-minute meeting. Write `docs/decisions/RULINGS.md` with one row per decision. |
| 6 | Requirements | SPMP 3.3 |
| 7 | Inspect | Audit §5: recommended rulings |
| 8 | Expected behaviour | Each decision records the outcome, the reason, the tasks affected, and whether a document edit is needed (yes/no) |
| 9 | Constraints | Do not expand scope. Prefer the recommendation unless the team has new evidence. |
| 10 | Dependencies | None |
| 11 | Acceptance | 14 decisions are recorded and shared in the team chat |
| 12 | Testing | — |
| 13 | Handoff | Link `RULINGS.md` to NEW-02; D uses it for T-26 |
| 14 | Do NOT change | The SRS/SDD files themselves (that is T-26) |
| 15 | Ask / approve | Escalate to the adviser if a ruling changes a graded requirement (for example, D4 if pitchy were dropped) |

### A-3 · T-06 Hearts lost mid-drill must persist on quit (D1–D2)

| # | Field | Content |
|---|---|---|
| 1 | Title | Persist in-drill heart losses when the learner quits |
| 2 | Assigned | A. Reviewer: B. |
| 3 | Objective | Quitting never refunds hearts |
| 4 | Why | `LessonPlayer.quit()` (`:143-151`) uses `run.hearts`. Drill losses reach the run only through `onOutcome` when the drill ends (`PracticeDrillView.tsx:66-71`). |
| 5 | Scope | Add `onHeartLost` to `ExerciseViewProps`, plus a pure `loseHeart(run)` in `runner.ts`. Call it from `PracticeDrillView` on every loss. Make sure the end-of-drill `heartsLost` is not counted twice. |
| 6 | Requirements | SRS 3.1.2.4 |
| 7 | Inspect | `src/lesson/runner.ts:85-115,151-180`, `src/components/lesson/practice/PracticeDrillView.tsx`, `LessonPlayer.tsx`, `src/hooks/usePracticeDrill.ts` |
| 8 | Expected behaviour | Lose 2 hearts, quit, and the profile shows 2 fewer hearts |
| 9 | Constraints | Keep `runner.ts` pure |
| 10 | Dependencies | T-01 |
| 11 | Acceptance | A `runner.test.ts` case passes for 2 losses followed by a quit; no double count when the drill ends normally; all existing tests green |
| 12 | Testing | Unit tests, plus a staging manual check after T-05 |
| 13 | Handoff | PR; evidence comment on NEW-04 |
| 14 | Do NOT change | `WaitStateMachine` rules |
| 15 | Ask / approve | — |

### A-4 · T-09 Vision runtime hardening and instrumentation (D2–D4)

| # | Field | Content |
|---|---|---|
| 1 | Title | Fix the vision timestamp and race defects; add a 30 Hz cap and a performance overlay |
| 2 | Assigned | A. Reviewer: B. |
| 3 | Objective | Correct cue timing after a camera restart, and make SRS 3.4 measurable |
| 4 | Why | `FrameLoop.ts:97` sends `mediaTime`, and the worker clamps timestamps to keep them increasing (`posture.worker.ts:89`). After a restart, the clamped timestamps make cues and smoothing lag. There is a race at `FrameLoop.ts:86-92`. There is no rate cap, and `getStats()` / `inferenceMs` are never read. |
| 5 | Scope | Items 1–5 of T-09 |
| 6 | Requirements | SRS 3.4a and 3.4c, 3.1.5.3, 3.1.6.5 |
| 7 | Inspect | `src/vision/pipeline/FrameLoop.ts`, `src/workers/posture.worker.ts`, `src/practice/PracticeRig.ts`, `src/vision/hud/HudEngine.ts`, `CameraPanel.tsx` |
| 8 | Expected behaviour | `?debug=perf` shows the HUD p50/p95, the result interval and `inferenceMs` |
| 9 | Constraints | No main-thread MediaPipe import; the HUD must not cause React re-renders |
| 10 | Dependencies | T-01 |
| 11 | Acceptance | A fake-clock unit test shows the restart cue appears after 600 ms; at most 1 frame in flight; the overlay works |
| 12 | Testing | Unit tests, then manual with a webcam |
| 13 | Handoff | PR; NEW-05 evidence |
| 14 | Do NOT change | Angle thresholds |
| 15 | Ask / approve | — |

### A-5 · T-08 Wire pitchy into the live pipeline (D5–D6)

| # | Field | Content |
|---|---|---|
| 1 | Title | Compute f0 and clarity per hop; use `PitchVerifier` for single-note drills |
| 2 | Assigned | A. Support: C. Reviewer: B. |
| 3 | Objective | Single-note grading meets SRS 3.1.6.2 in the real app |
| 4 | Why | Live drills check pitch class only (any octave passes). pitchy is unused. |
| 5 | Scope | Extend `AcousticFrame` with `pitchHz?` and `clarity?` (contract agreed with C on D1). Run pitchy in `chroma.worklet.ts`, or fall back to an AnalyserNode. Update `protocol.ts`. In `PracticeDrill.arm`, use `PitchVerifier` for `kind:'note'`, keeping `NoteVerifier` behind a flag. Audit `play-note` targets for exact MIDI notes and regenerate the seed. |
| 6 | Requirements | SRS 3.1.6.1, 3.1.6.2, 3.6.2c |
| 7 | Inspect | `src/audio/worklet/*`, `src/audio/input/AudioInputService.ts`, `src/practice/PracticeDrill.ts:192-196`, `src/audio/config.ts` |
| 8 | Expected behaviour | Target A4: playing A4 passes, A3 fails |
| 9 | Constraints | Raw samples never leave the device; chord path unchanged |
| 10 | Dependencies | T-07 merged (hard) |
| 11 | Acceptance | `notes`, `PracticeDrill` and `chords` tests green; wrong-octave test added; no new network requests |
| 12 | Testing | Unit tests, plus a manual keyboard check at IC-2 |
| 13 | Handoff | PR; latency note for T-19 |
| 14 | Do NOT change | `WaitStateMachine`, `ChordMatcher` thresholds |
| 15 | Ask / approve | — |

### A-6 · T-19 Hardware benchmark and audio tuning (D7–D8)

| # | Field | Content |
|---|---|---|
| 1 | Title | Measure the SRS 3.4 figures and validate the audio on a real piano |
| 2 | Assigned | A. Support: C (pitch runs), D (records the tables). Reviewer: B. |
| 3 | Objective | Produce performance evidence, and tune the thresholds if needed |
| 4 | Why | No figure in SRS 3.4 has ever been measured. All audio tuning used synthetic signals. The production preview was never checked at runtime. |
| 5 | Scope | The full T-19 measurement table, on 2 machines, Chrome and Edge, 2 microphones, a real piano. Also `npm run build && npm run preview`. |
| 6 | Requirements | SRS 3.4, 3.1.5.3, 3.1.6.1, 3.1.6.4 |
| 7 | Inspect | T-09 overlay, `src/audio/config.ts` |
| 8 | Expected behaviour | `docs/test/PERFORMANCE_REPORT.md` contains numbers, each marked pass or fail |
| 9 | Constraints | Change thresholds only with before/after numbers |
| 10 | Dependencies | T-08, T-09 |
| 11 | Acceptance | Every figure is measured; each fail is logged as a defect |
| 12 | Testing | — (this task *is* the test) |
| 13 | Handoff | Report, plus a tuning PR if needed |
| 14 | Do NOT change | Anything other than the config thresholds |
| 15 | Ask / approve | The team decides if pass rates are below 90 % after tuning |

### A-7 · Integration and T-24 defect triage (D9–D13)

| # | Field | Content |
|---|---|---|
| 1 | Title | Run the integration checkpoints; lead defect triage and regression |
| 2 | Assigned | A |
| 3 | Objective | Each checkpoint passes; no open P0 or P1 defects at RC |
| 4 | Why | Four parallel streams touch shared seams |
| 5 | Scope | Integration plan §4 checkpoints. Assign defects within 1 day. Keep the regression log. |
| 6 | Requirements | SPMP 6 |
| 7 | Inspect | Integration plan §3 (hotspots) and §7 (regression) |
| 8 | Expected behaviour | A pass/fail post in the team chat at each checkpoint |
| 9 | Constraints | No feature merges after IC-3 |
| 10 | Dependencies | — |
| 11 | Acceptance | RC criteria met; `docs/test/REGRESSION_LOG.md` written |
| 12 | Testing | Full suite after every merge |
| 13 | Handoff | Release go/no-go to B |
| 14 | Do NOT change | — |
| 15 | Ask / approve | — |

---

# Member B: Barnaija (full-stack)

### B-1 · T-03 Fix the profile bootstrap so it cannot wipe progress (D1)

| # | Field | Content |
|---|---|---|
| 1 | Title | Profile bootstrap must never overwrite an existing profile |
| 2 | Assigned | B. Reviewer: A. |
| 3 | Objective | A failed read at sign-in never changes a learner's EXP, streak or hearts |
| 4 | Why | `AuthContext.tsx:70-118` treats any read error other than `PGRST116` as "no profile". It then **upserts** `exp:100, current_streak:1, hearts:5`, overwriting the real row. |
| 5 | Scope | `src/context/AuthContext.tsx` and `src/types/auth.types.ts` only. Steps: (1) create a profile only on `PGRST116`; otherwise return null and set an error. (2) Insert, never upsert, using the trigger defaults (0 / 0 / 5 / piano), and re-read first. (3) Stop syncing the username and instrument on every load (`:76-96`). (4) Make `InstrumentFocus = 'piano'`. (5) Make the `onAuthStateChange` callback synchronous, defer `fetchProfile` with `setTimeout`, and skip `TOKEN_REFRESHED`. |
| 6 | Requirements | SDD C-01; SRS 3.1.1.2; data integrity for SRS 3.1.2.2–3.1.2.4 |
| 7 | Inspect | `AuthContext.tsx:50-224`; migration `handle_new_user` (`supabase/migrations/20260509120000_initial_schema.sql:143-179`) |
| 8 | Expected behaviour | New signup → exactly one row (0 / 0 / 5). Existing user with a network error → their row is untouched, and an error state is shown. |
| 9 | Constraints | Keep guest/demo mode working. Do not add dependencies. |
| 10 | Dependencies | T-01. Staging (T-05) is needed for acceptance on D2. |
| 11 | Acceptance | The 4 criteria in T-03; one profile fetch per sign-in |
| 12 | Testing | On staging: block `*/rest/v1/profiles*` in DevTools request blocking, sign in, then compare the row in the Supabase dashboard |
| 13 | Handoff | PR; a 5-line test note on KAN-233 |
| 14 | Do NOT change | `LoginPage.tsx` (that is T-10), the migration, `supabaseStore.ts` |
| 15 | Ask / approve | If you think the client should never create profiles at all, agree it with A first |

### B-2 · T-04 Close `features-integration` (D1)

| # | Field | Content |
|---|---|---|
| 1 | Title | Confirm the salvage list for `features-integration` and archive the branch |
| 2 | Assigned | B. Approver: A. |
| 3 | Objective | One gamification implementation |
| 4 | Why | `dec609e` duplicates the merged `lib/progress` work, which is gated, tested and wired. It conflicts in 4 files. |
| 5 | Scope | Read reconciliation §4. Confirm or dispute each line in a KAN-259 comment. Tag `archive/features-integration`, then delete the branch. |
| 6 | Requirements | SRS 3.1.2, 3.1.7 |
| 7 | Inspect | Your `dec609e` against `src/lib/progress/*`, `src/lesson/runner.ts` |
| 8 | Expected behaviour | An agreed list: port the achievement catalogue and evaluator, the tests, and the chart layout. Discard the rest. |
| 9 | Constraints | Do not merge or cherry-pick the branch |
| 10 | Dependencies | — |
| 11 | Acceptance | A approves the list; the branch is archived |
| 12 | Testing | — |
| 13 | Handoff | KAN-259 comment |
| 14 | Do NOT change | `main` |
| 15 | Ask / approve | If you believe a discarded piece is needed, raise it with A before T-11 starts |

### B-3 · T-11 Achievements (D2–D3)

| # | Field | Content |
|---|---|---|
| 1 | Title | Evaluate, award and credit the achievement badges |
| 2 | Assigned | B. Support and reviewer: A. |
| 3 | Objective | Badges unlock from real progress; `exp_reward` is credited once |
| 4 | Why | Nothing writes `user_achievements` (SRS 3.1.7.4) |
| 5 | Scope | New `src/lib/progress/achievements.ts` (pure, using the contract in T-11). Add `ProgressStore.getUnlockedAchievements` and `insertAchievements`, implemented in `supabaseStore.ts` as a **plain insert** that ignores error 23505. Call it from `saveLessonResult` after `applyResult`. Add the bonus EXP in the same profile write. Port the tests from your branch. |
| 6 | Requirements | SRS 3.1.7.4; SDD 4.2 |
| 7 | Inspect | `saveLessonResult.ts:11-60`, `applyResult.ts`, `supabaseStore.ts`, `seed.sql:441-447`, migration grants (`:272-277`: `user_achievements` has select + insert only) |
| 8 | Expected behaviour | First completed lesson → `first-lesson` row, and EXP = lesson EXP + that badge's `exp_reward` |
| 9 | Constraints | Use only the 5 seeded ids. Do **not** upsert. EXP is still awarded only on first completion. |
| 10 | Dependencies | T-04. Merge by D3, **before** C's T-13. |
| 11 | Acceptance | T-11 tests (first lesson, streak 7, no re-award, bonus once); staging check |
| 12 | Testing | `npx vitest run src/lib/progress`, then staging |
| 13 | Handoff | PR; NEW-15 evidence; post the final `ProgressStore` interface in the team chat for C |
| 14 | Do NOT change | `applyResult` EXP / streak / heart rules |
| 15 | Ask / approve | Agree the exact thresholds for each badge with A, written in the PR description |

### B-4 · T-12 Profile analytics with real data (D4–D7, critical path)

| # | Field | Content |
|---|---|---|
| 1 | Title | Replace the mock Profile view with real analytics |
| 2 | Assigned | B. Optional styling help: D. Reviewer: A. |
| 3 | Objective | SRS 3.1.7.1–3.1.7.4 shown from the learner's own data |
| 4 | Why | `ProfileAnalyticsView.tsx` is fully hard-coded |
| 5 | Scope | `src/hooks/useAnalyticsData.ts` (return shape as in T-12), `src/lib/analytics/aggregate.ts` (pure, tested), and `ProfileAnalyticsView.tsx` rewritten using your chart.js layout: pitch line, posture line, rhythm histogram, badges grid, 7d / 30d / all, empty states |
| 6 | Requirements | SRS 3.1.7; SDD C-07, 6.3 |
| 7 | Inspect | `performance_records` columns and index `performance_records_user_time_idx`; `supabaseStore.ts:44-47`; your branch's chart layout |
| 8 | Expected behaviour | A new user sees empty states. After one drill, there is one dated point. Changing the range triggers a new query. |
| 9 | Constraints | Touch `DashboardScreen.tsx` only to pass props (D edits it in T-14 and T-15). No fake numbers anywhere. |
| 10 | Dependencies | T-04 (hard); T-11 (soft) |
| 11 | Acceptance | T-12 criteria, including grep finding no mock strings |
| 12 | Testing | Aggregation unit tests, then staging |
| 13 | Handoff | PR with screenshots |
| 14 | Do NOT change | The `performance_records` schema |
| 15 | Ask / approve | **Tell A on D6 if you will miss D7.** A will take the histogram. |

### B-5 · T-10 Finish authentication (D8–D9)

| # | Field | Content |
|---|---|---|
| 1 | Title | Password recovery, Google OAuth, unverified-email resend |
| 2 | Assigned | B. Support: C (enables the Google provider in staging). Reviewer: A. |
| 3 | Objective | KAN-228 and KAN-229 truly complete |
| 4 | Why | No new-password step; a reload skips recovery; no OAuth button; truncated unverified error |
| 5 | Scope | T-10 items 1–4 in `LoginPage.tsx`, `AuthContext.tsx` and `App.tsx` (recovery routing) |
| 6 | Requirements | SRS 3.1.1.1; SDD C-01, 6.3 |
| 7 | Inspect | `AuthContext.tsx:193-195,302-374`, `App.tsx:27`, `LoginPage.tsx:470-655` |
| 8 | Expected behaviour | Reset link → new-password form → dashboard; survives a reload. Google sign-in works. Unverified user can resend the email. |
| 9 | Constraints | Rebase on D's T-15 (`App.tsx`). Keep guest mode. |
| 10 | Dependencies | T-03; T-05 for acceptance |
| 11 | Acceptance | T-10 criteria 1–4 |
| 12 | Testing | Manual on staging with screenshots |
| 13 | Handoff | PR; reopen and close KAN-228 / KAN-229 with evidence |
| 14 | Do NOT change | Profile bootstrap logic (done in T-03) |
| 15 | Ask / approve | Ask A if other providers are requested (ruling D11 says Google only) |

### B-6 · T-25 Production deployment and presentation (D14; read `docs/ENVIRONMENTS.md` on D13)

| # | Field | Content |
|---|---|---|
| 1 | Title | Ship v1.0.0 and prepare the demo |
| 2 | Assigned | B. Support: A (demo script), C (production Supabase). Reviewer: A. |
| 3 | Objective | A working production URL and a rehearsed demo |
| 4 | Why | SPMP 3.1.9 and 3.2 |
| 5 | Scope | T-25 items 1–6 |
| 6 | Requirements | SRS 3.6.1 |
| 7 | Inspect | `docs/ENVIRONMENTS.md` (from T-05) |
| 8 | Expected behaviour | Signup → lesson → analytics works on production |
| 9 | Constraints | Keys only in the host's environment variables |
| 10 | Dependencies | T-24 (RC) |
| 11 | Acceptance | T-25 criteria |
| 12 | Testing | Production smoke test of 5 flows |
| 13 | Handoff | Tag, URL, demo video |
| 14 | Do NOT change | Code after RC (fixes only, through A) |
| 15 | Ask / approve | A gives go/no-go |

Also on B's list: pair with C on the auth and analytics steps of T-23 (D10–D12), and fix defects in B's own areas during T-24.

---

# Member C: Rosales (backend, conservative)

Every C task has fixed boundaries. **Do not add features, dependencies or schema changes that the brief does not list.** If something seems missing, ask A first.

### C-1 · T-05 Staging environment and CI (D1–D2)

| # | Field | Content |
|---|---|---|
| 1 | Title | Create the staging Supabase and hosting setup, and the CI workflow |
| 2 | Assigned | C. Support: B (hosting account). Reviewer: A. |
| 3 | Objective | A shared place to verify Supabase behaviour, and automatic checks on every PR |
| 4 | Why | No staging project, deploy config or CI exists. T-03, T-10, T-20, T-23 and T-25 need them. |
| 5 | Scope | 1. Supabase staging project: run the migration SQL, then `seed.sql`, from the SQL editor. 2. Auth Site URL and redirect list set to the staging host. 3. Vercel project, with `vercel.json` `{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}` and env vars `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` set in Vercel. 4. `.github/workflows/ci.yml` with Node 20: `npm ci`, `npm test`, `npx tsc -p tsconfig.json`, `npx vite build`, `npm run seed:lessons:check`, then a size check script `scripts/check-bundle-size.mjs` that sums `dist/assets/index-*.js` and `*.css` and fails above 5 MB. 5. `src/lib/supabase/client.ts`: throw a readable error if either env var is missing. 6. `docs/ENVIRONMENTS.md`: URLs and who holds access. **No keys.** |
| 6 | Requirements | SRS 3.3.2, 3.4d, 3.6.1b; SPMP 3.2 |
| 7 | Inspect | `package.json` scripts, `supabase/`, `src/lib/supabase/client.ts`, `vite.config.ts` |
| 8 | Expected behaviour | Every PR shows CI checks; the staging URL loads and signup works |
| 9 | Constraints | Never commit keys. Do not change the build config other than adding the files listed. |
| 10 | Dependencies | T-01 |
| 11 | Acceptance | A deliberately failing test blocks a PR; staging signup creates a `profiles` row; the size check prints the measured size; refreshing on a deep link does not 404 |
| 12 | Testing | A throwaway PR with a failing test (then delete it) |
| 13 | Handoff | Post the staging URL and the CI link in the team chat; NEW-03 evidence; close KAN-278 with the size printout |
| 14 | Do NOT change | Application logic, the migration, `seed.sql` |
| 15 | Ask / approve | Ask A before choosing Netlify instead of Vercel, or adding any npm dependency |

### C-2 · T-07 PitchVerifier (D2–D4)

| # | Field | Content |
|---|---|---|
| 1 | Title | Pure pitchy-based single-note verifier |
| 2 | Assigned | C. Support and reviewer: A. |
| 3 | Objective | Implement SRS 3.1.6.2 exactly, as a tested pure module |
| 4 | Why | Live single-note drills ignore the octave and have no cents or clarity check. KAN-261–263 are yours. |
| 5 | Scope | New `src/audio/notes/PitchVerifier.ts` implementing `AcousticVerifier` (`src/audio/practice/ChordVerifier.ts:35-39`), reading `frame.pitchHz` and `frame.clarity`. Helpers `centsOff` and `midiToNoteName` go in `src/audio/dsp/pitch.ts`; use the existing `freqToMidi` for Hz → MIDI. Add a `pitch` section to `src/audio/config.ts` (`centsTolerance: 35`, `minClarity: 0.85`) and reuse `DEFAULT_VERIFIER_CONFIG` for the timing values. *(Refined after code inspection; see docs/execution/MEMBER_C_EXECUTION_GUIDE.md.)* Delete `src/hooks/useAudioAnalysis.ts` and `src/lib/audio/noteFrequencies.ts`. |
| 6 | Requirements | SRS 3.1.6.2, 3.6.2c |
| 7 | Inspect | `NoteVerifier.ts` (copy its attempt life-cycle), `ChordVerifier.ts:87-140`, `src/audio/__tests__/notes.test.ts` (style) |
| 8 | Expected behaviour | Verdicts: match when ≥ 80 % of the voiced frames in the window are within ±35 cents with clarity ≥ 0.85; otherwise miss at onset + 350 ms |
| 9 | Constraints | Pure TypeScript with no DOM or Web Audio calls. Frame fields: `pitchHz?: number \| null; clarity?: number` (agreed on D1). |
| 10 | Dependencies | T-01; contract agreed with A on D1 |
| 11 | Acceptance | Tests: A4 at +30 cents → match; +40 → miss; A5 vs target A4 → miss; clarity 0.84 → fail and 0.85 → pass; no onset → null; `midiToNoteName(61)='C#4'`; `Math.round(freqToMidi(261.63))===60` |
| 12 | Testing | `npx vitest run src/audio`; the full suite stays green |
| 13 | Handoff | PR; tell A it is merged (A starts T-08); evidence on KAN-262 and KAN-263 |
| 14 | Do NOT change | `NoteMatcher`, `ChordVerifier`, `WaitStateMachine`, the worklet |
| 15 | Ask / approve | If the window or timing rules are unclear, ask A. Do not invent new thresholds. |

### C-3 · T-13 Offline progress cache and sync (D5–D7, D9 buffer)

| # | Field | Content |
|---|---|---|
| 1 | Title | IndexedDB sync queue for lesson saves |
| 2 | Assigned | C. Support and reviewer: A. |
| 3 | Objective | A lesson finished offline is saved exactly once when the connection returns |
| 4 | Why | SRS 3.3.2b, SDD C-08. Today a failed save loses the run. KAN-268 is yours. |
| 5 | Scope | `src/lib/sync/queue.ts` (using `idb`) with store `sync_queue {id, endpoint, payload, retryCount, timestamp}`. Network errors are enqueued; validation errors are not. Flush on `online` and at app start, in order, with backoff `min(30s, 1s·2^n)`; after 6 failures keep the item and warn. Add `runId` to `LessonRunState` and `LessonResult`, set once in `createLessonRun` (not in `buildLessonResult`, which runs twice on quit), plus a new migration `performance_records.run_id uuid unique`, skipping duplicates on 23505. Show a "Saved offline, will sync" note in `LessonResults.tsx`. |
| 6 | Requirements | SRS 3.3.2b; SDD C-08, 4.2 |
| 7 | Inspect | `saveLessonResult.ts` (`ProgressStore` seam, after B's T-11), `supabaseStore.ts`, the `DashboardScreen` save handler (`:84-123`), `src/lesson/types.ts:36-53` |
| 8 | Expected behaviour | DevTools set to Offline → finish a lesson → back Online → one `performance_records` row, EXP credited once |
| 9 | Constraints | Start only after T-11 is merged (D3). **The migration needs A's approval before you write it.** Adding `fake-indexeddb` as a dev dependency needs A's approval. |
| 10 | Dependencies | T-11 merged; A's approval of the migration |
| 11 | Acceptance | T-13 unit tests (enqueue rules, order, backoff, duplicate skip); the manual offline test passes |
| 12 | Testing | `npx vitest run src/lib/sync`, then staging |
| 13 | Handoff | PR; migration applied to staging; KAN-268 evidence |
| 14 | Do NOT change | `applyResult` rules; the `ProgressStore` method signatures |
| 15 | Ask / approve | Ask before changing anything in the save order (progress → performance → profile) |

### C-4 · T-20 RLS verification (D8)

| # | Field | Content |
|---|---|---|
| 1 | Title | Script that proves RLS on staging |
| 2 | Assigned | C. Reviewer: A. |
| 3 | Objective | Evidence for SRS 3.5.2 |
| 4 | Why | The policies exist in the migration but have never been tested live (KAN-275) |
| 5 | Scope | `scripts/rls-check.ts`, using supabase-js with the publishable key and two test users created on staging. For all 6 tables: anonymous access is denied; B cannot read, update or delete A's rows or insert rows as A; `lessons` and `achievements` are read-only. Print a table. Record the TLS version from the browser's security panel. Note as an accepted risk (ruling D14) that a user can update their own `profiles.exp`. |
| 6 | Requirements | SRS 3.5.2a and 3.5.2b |
| 7 | Inspect | Migration `:185-277` |
| 8 | Expected behaviour | The script exits 0 when all cross-user attempts are denied |
| 9 | Constraints | Test users only; no real data; never use a service-role key |
| 10 | Dependencies | T-05 |
| 11 | Acceptance | The script passes; `docs/test/SECURITY_TEST_REPORT.md` written |
| 12 | Testing | Run on a fresh DB and again after T-23 |
| 13 | Handoff | Report; KAN-275 evidence |
| 14 | Do NOT change | Policies. If one fails, log a defect and A decides. |
| 15 | Ask / approve | Report any denied-access failure to A immediately (P0) |

### C-5 · T-23 End-to-end integration checklist (D10–D12)

| # | Field | Content |
|---|---|---|
| 1 | Title | Write and execute the functional and integration checklist on staging |
| 2 | Assigned | C. Pairs with B on the auth and analytics steps. Reviewer: A. |
| 3 | Objective | Every SPMP §6 functional item tested end to end |
| 4 | Why | Only unit tests exist (KAN-271, KAN-274) |
| 5 | Scope | `docs/test/E2E_CHECKLIST.md`. Each step has an ID, precondition, action, expected result, actual result and pass/fail. Cover: signup and login; recovery; Google; welcome and placement; skill-tree gating; a theory lesson; rhythm; posture hold; play-note; play-chord; wait-state latch; hearts (timeout, 3 misses, quit, regeneration, ≥ 80 % restore); EXP and streak; achievements; analytics; offline sync. |
| 6 | Requirements | SPMP 3.2, 6 |
| 7 | Inspect | RTM rows, each task's acceptance criteria |
| 8 | Expected behaviour | 100 % of steps executed |
| 9 | Constraints | Test, do not fix: log defects instead |
| 10 | Dependencies | IC-3 freeze; T-05 |
| 11 | Acceptance | Every failure has a defect ID in the T-22 log |
| 12 | Testing | — |
| 13 | Handoff | The completed checklist; KAN-271 / KAN-274 evidence |
| 14 | Do NOT change | Code |
| 15 | Ask / approve | When expected behaviour is unclear, check the RTM, then ask A |

Also on C's list: review D's T-16 and T-17; enable the Google provider for T-10; configure production Supabase for T-25.

---

# Member D: Bernante (frontend, structured tasks)

**Rules for all D tasks**
- Change only the files and lines named in the brief.
- Keep each PR under about 300 changed lines.
- Attach screenshots for any UI change.
- Every PR is reviewed before merge.
- If you are stuck for more than half a day, message A. That is expected, not a failure.
- Run `npm test` and `npx tsc -p tsconfig.json` before every push.

### D-1 · T-16 Rhythm timing tests and consistency formula (D1–D2)

| # | Field | Content |
|---|---|---|
| 1 | Title | Lock the SRS timing windows in tests; fix the consistency score; add heart-restore tests |
| 2 | Assigned | D. Support: C. Reviewer: A. |
| 3 | Objective | Prove SRS 3.1.4.3, and make 3.1.4.4 correct |
| 4 | Why | No test covers the 25 / 50 ms boundaries. Consistency ignores missed beats: 1 hit out of 10 scores 100. |
| 5 | Scope | (a) New file `src/lib/rhythm/__tests__/timing.test.ts`. (b) Change only `summarize` in `src/lib/rhythm/timing.ts` (lines ~40–56) to the formula ruled in D13. (c) Add 3 cases to `src/lesson/__tests__/runner.test.ts`. |
| 6 | Requirements | SRS 3.1.4.3, 3.1.4.4, 3.1.2.4 |
| 7 | Inspect | `timing.ts` (whole file, about 60 lines), `runner.test.ts` (existing style), `runner.ts:159-174` |
| 8 | Expected behaviour | `classifyDelta(25)` → Perfect; `25.01` → Good; `50` → Good; `50.01` → Miss; −25 → Perfect. `summarize` with 10 targets and 1 tap at Δ=0 → consistency 10. Theory score 80 → heart restored; 79.99 → not; 5 hearts → not. |
| 9 | Constraints | Recommended formula: `consistency = 100 * sum(max(0, 1 - abs(delta)/50)) / targetCount`, where missed beats add 0. Use A's ruling if it differs. |
| 10 | Dependencies | Tests: none. Formula: ruling D13 (D1 meeting). |
| 11 | Acceptance | All new tests pass, and all 387 existing tests pass. If `plan.test.ts` breaks, stop and ask A. |
| 12 | Testing | `npx vitest run src/lib/rhythm src/lesson` |
| 13 | Handoff | PR; comment on KAN-244 with the test names |
| 14 | Do NOT change | `PERFECT_MS`, `GOOD_MS`, `POINTS`, `plan.ts`, `runner.ts` |
| 15 | Ask / approve | Any failing existing test |

### D-2 · T-15 Dashboard and lesson UI fixes (D2–D3, provisional)

| # | Field | Content |
|---|---|---|
| 1 | Title | Eight small UI fixes, one commit each |
| 2 | Assigned | D. Support and reviewer: A. |
| 3 | Objective | Remove the verified UI defects |
| 4 | Why | Fake numbers are shown to real users, wrong XP labels, inconsistent heart lock, generic banner, viewport alert hidden, wrong copy |
| 5 | Scope | Exactly items 1–8 of T-15 in `TASK_DECOMPOSITION.md`, plus unit tests for `nodeStatus` |
| 6 | Requirements | SRS 3.1.2.1, 3.1.2.3, 3.1.2.4, 3.2.2b; SDD 6.3 |
| 7 | Inspect | `src/components/dashboard/DashboardScreen.tsx:77-81,144-164`, `SkillTreeView.tsx:117,199`, `src/App.tsx`, `src/components/common/ViewportGuard.tsx`, `src/components/lesson/rhythm/TapExerciseView.tsx:116,180`, `src/components/lesson/practice/MediaDiagnostics.tsx:75`, `src/lesson/runner.ts:45` (the `needsHearts` rule: export it, do not copy it), `src/lib/dashboard/curriculum.ts:65,122-145` |
| 8 | Expected behaviour | Item 1: shows "—" while loading. Item 2: shows `+{expReward} XP`. Item 3: at 0 hearts, only lessons with a practice-engine exercise are locked. Item 4: "Finish *X* first". Item 5: alert visible on login and in lessons when narrower than 1024 px. Item 6: no "try again" text in checkpoints. Item 7: camera-only wording. Item 8: running score shown. |
| 9 | Constraints | One commit per item, with message `T-15(n): …`. No restyling. |
| 10 | Dependencies | T-01. **Merge before B's T-10 and T-12.** |
| 11 | Acceptance | Before/after screenshot per item; `nodeStatus` tests (locked, available, completed, EXP threshold) pass |
| 12 | Testing | `npm test`; manual walk through dashboard → lesson at window widths of 1000 px and 1300 px |
| 13 | Handoff | PR; comments on KAN-236, 237 and 238 |
| 14 | Do NOT change | `runner.ts` logic (export only), `applyResult.ts`, `AuthContext.tsx`, any colour or styling |
| 15 | Ask / approve | Item 3 or 5 behaves unexpectedly → ask A |

### D-3 · T-18 Remove dead code (D4)

| # | Field | Content |
|---|---|---|
| 1 | Title | Delete unreachable test pages and hooks |
| 2 | Assigned | D. Reviewer: A, plus C for the theory files. |
| 3 | Objective | One implementation of each feature |
| 4 | Why | These files are imported only by each other (verified 2026-11-16) |
| 5 | Scope | Delete exactly the 15 files listed in T-18, and the unused imports named there |
| 6 | Requirements | — |
| 7 | Inspect | The T-18 list. Run `grep -rn "<name>" src` for each file before deleting it. |
| 8 | Expected behaviour | The app is unchanged |
| 9 | Constraints | Delete nothing else |
| 10 | Dependencies | T-01 |
| 11 | Acceptance | tsc, tests and build pass; grep for the deleted hook names returns nothing |
| 12 | Testing | `npm test && npx tsc -p tsconfig.json && npm run build` |
| 13 | Handoff | PR; NEW-07 |
| 14 | Do NOT change | `GrandStaff.tsx`, `PianoKeyboard.tsx`, `notes.ts`, `playNote.ts`, `useSpacebarTap.ts`, `useRhythmJudge.ts`, `timing.ts`, `vision/posture/session.ts`, `useAudioAnalysis.ts`, `noteFrequencies.ts` |
| 15 | Ask / approve | If grep finds a live import, stop and ask A |

### D-4 · T-14 Onboarding welcome step (D5)

| # | Field | Content |
|---|---|---|
| 1 | Title | Piano-only welcome step before placement |
| 2 | Assigned | D. Support and reviewer: B. |
| 3 | Objective | Show the Piano lock the SRS describes |
| 4 | Why | KAN-235 asks for an instrument step; piano is currently implicit |
| 5 | Scope | New `src/components/dashboard/OnboardingWelcome.tsx`, shown under the same condition as `PlacementModal` (`DashboardScreen.tsx:96-103,651`). Contents: a selected "Piano" card, disabled "Guitar: coming soon" and "Voice: coming soon" cards (`aria-disabled="true"`, not focusable), and a Continue button that opens the placement modal. |
| 6 | Requirements | SRS 3.1.1.2, 3.1.1.3 |
| 7 | Inspect | `PlacementModal.tsx` (copy its styling), `DashboardScreen.tsx:96-103,651` |
| 8 | Expected behaviour | New user: Welcome → Placement → Dashboard. Returning user: never sees Welcome. |
| 9 | Constraints | No DB writes; no new dependencies |
| 10 | Dependencies | T-15 merged |
| 11 | Acceptance | T-14 criteria |
| 12 | Testing | Manual on staging with a new account; `npm test` |
| 13 | Handoff | PR with screenshots; KAN-235 |
| 14 | Do NOT change | `placement.ts`, `supabaseStore.ts`, `AuthContext.tsx` |
| 15 | Ask / approve | Ask B about the show/hide condition |

### D-5 · T-17 Draw flats (D6–D7, provisional)

| # | Field | Content |
|---|---|---|
| 1 | Title | Flat spelling on the staff and in note labels |
| 2 | Assigned | D. Support and first reviewer: C. Final reviewer: A. |
| 3 | Objective | B♭ shows as B♭, not A♯ |
| 4 | Why | `notes.ts:7-23` and `GrandStaff.tsx:30-41` only support sharps |
| 5 | Scope | Add optional `spelling: 'sharp' \| 'flat'` (default `'sharp'`) to `midiToName` and `staffPosition`. Pass it through `GrandStaff` and `NoteFigure`. Set `spelling: 'flat'` on the F-major card (`src/content/units/proficient.ts:154-161`) and any other flat content (`grep -rn "Flat\|Bb\|Eb" src/content`). Run `npm run seed:lessons` and commit `seed.sql`. |
| 6 | Requirements | SRS 3.1.3.1 |
| 7 | Inspect | `src/lib/theory/notes.ts`, `src/components/theory/GrandStaff.tsx`, `src/components/lesson/theory/NoteFigure.tsx` |
| 8 | Expected behaviour | `midiToName(70,'flat')==='Bb4'`; the flat sits one staff step above the equivalent sharp and is drawn with a ♭ glyph |
| 9 | Constraints | The default behaviour must not change: every existing sharp lesson looks identical |
| 10 | Dependencies | T-01 |
| 11 | Acceptance | T-17 criteria; screenshots of 3 sharp lessons unchanged plus the F-major card |
| 12 | Testing | Add cases to `notes.test.ts`; `npm run seed:lessons:check` |
| 13 | Handoff | PR; NEW-06 |
| 14 | Do NOT change | Anything else in `GrandStaff` layout |
| 15 | Ask / approve | **If there is no progress after 1 day, hand the task to C.** |

### D-6 · T-21 Media-privacy and offline-execution audit (D8)

| # | Field | Content |
|---|---|---|
| 1 | Title | Network capture proving that no raw media leaves the device |
| 2 | Assigned | D. Reviewer: A. |
| 3 | Objective | Evidence for SRS 3.5.1, 3.3.1a and 3.7.4 (KAN-276) |
| 4 | Why | So far there is only static evidence |
| 5 | Scope | The exact steps below |
| 6 | Requirements | SRS 3.5.1, 3.7.4 |
| 7 | Inspect | Staging URL; one posture-hold lesson (Novice unit with "posture"); one play-chord lesson |
| 8 | Expected behaviour | Only asset downloads and small Supabase JSON requests appear |
| 9 | Constraints | Do not commit the HAR file (it contains auth tokens). Keep it locally. |
| 10 | Dependencies | T-08 merged |
| 11 | Acceptance | Report with a pass/fail for every step |
| 12 | Testing | — |
| 13 | Handoff | `docs/test/MEDIA_PRIVACY_REPORT.md`; KAN-276 |
| 14 | Do NOT change | Code |
| 15 | Ask / approve | Any request you cannot explain → ask A before marking pass |

**Steps**
1. Open Chrome on staging and sign in. Open DevTools → Network, tick "Preserve log" and "Disable cache".
2. Start the posture-hold lesson and click "Turn on camera". Stay in frame for 60 s.
3. Start the play-chord lesson and click "Turn on microphone". Play or hum for 60 s.
4. Right-click the request list → "Save all as HAR". Name the file `privacy-<date>.har`.
5. In the report, list every distinct host and file type. Expected:
   - the staging host (`.js`, `.wasm`, `.task`, `.css`);
   - `*.supabase.co/rest/v1/*` (JSON) and `/auth/v1/*`.
6. Sort by Size. Apart from the `.wasm`, `.task` and `.js` downloads, no request body or response should be larger than 10 kB. Check the "Payload" tab of each Supabase POST and PATCH: it must contain only numbers and ids, with no base64 and no blobs.
7. Filter by "WS" (WebSocket): expect none.
8. Mid-exercise, switch the Network throttling to "Offline". The skeleton overlay must keep updating, and a correct chord must still be detected.
9. Write pass/fail for steps 5–8, with screenshots.

### D-7 · T-22 Browser and hardware compatibility matrix, plus the defect log (D10–D12)

| # | Field | Content |
|---|---|---|
| 1 | Title | Run the compatibility matrix and keep the defect log |
| 2 | Assigned | D. Triage and reviewer: A. |
| 3 | Objective | Evidence for SRS 3.7.2, 3.3.1b and 3.2.2 (KAN-279); the issue log (KAN-280) |
| 4 | Why | No cross-browser or hardware testing has been done |
| 5 | Scope | The matrix below; log every failure |
| 6 | Requirements | SRS 3.7.2, 3.3.1, 3.2.2; SPMP 6, 10 |
| 7 | Inspect | Staging URL at IC-3 |
| 8 | Expected behaviour | Every cell is pass, fail or n/a |
| 9 | Constraints | Test only. Do not fix. |
| 10 | Dependencies | IC-3 |
| 11 | Acceptance | The matrix is complete; every fail has a defect ID; A assigns a priority within 1 day |
| 12 | Testing | — |
| 13 | Handoff | `docs/test/COMPATIBILITY_MATRIX.md`; issue log entries; P0/P1 defects mirrored as Jira Bugs |
| 14 | Do NOT change | Code |
| 15 | Ask / approve | Ask A about any crash or blank screen immediately |

**Matrix**
- **Columns:** Chrome, Edge, Firefox (and Safari if available) × integrated camera and mic, then USB camera and mic.
- **Rows:**
  1. Signup and login.
  2. Theory lesson with audio preview.
  3. Rhythm lesson (spacebar; the score counter shows).
  4. Posture hold: skeleton visible; green when correct, red with text when wrong.
  5. Play-note drill.
  6. Play-chord drill.
  7. Block the camera in site settings, then open posture: a diagnostic message appears, there is no crash, and the Retry button works after allowing it.
  8. Block the microphone, the same checks.
  9. Unplug the USB camera or mic mid-drill: a message appears, the timer pauses, and no heart is lost.
  10. Window narrower than 1024 px: an alert appears on login, the dashboard and in a lesson.
  11. Reload during a lesson: no crash.
- **Defect log fields (SPMP §10):** id, description, date, component, priority (set by A), assigned to (set by A), status, proposed solution, date resolved.

### D-8 · T-26 SRS/SDD v01.02 and test appendix (D9–D14)

| # | Field | Content |
|---|---|---|
| 1 | Title | Apply the rulings to the SRS and SDD; collect the test reports |
| 2 | Assigned | D drafts. A supplies the technical text and approves. |
| 3 | Objective | Documents consistent with the delivered system (SPMP 3.3, 12) |
| 4 | Why | 14 conflicts between the documents and the code |
| 5 | Scope | For each `RULINGS.md` row with "doc edit = yes", edit the named SRS or SDD section in the Word source. Add a revision-history row (v01.02). Update SDD §7 using `REQUIREMENTS_TRACEABILITY_MATRIX.md`. Add an appendix linking the T-19 to T-23 reports. |
| 6 | Requirements | SPMP 3.3, 12 |
| 7 | Inspect | `RULINGS.md`, the RTM, the SRS and SDD Word files |
| 8 | Expected behaviour | Every ruling appears in the documents with its section number |
| 9 | Constraints | Do not reword requirements that have no ruling |
| 10 | Dependencies | T-02; test reports as they arrive |
| 11 | Acceptance | A signs off on the change list |
| 12 | Testing | — |
| 13 | Handoff | v01.02 PDFs; NEW-08 |
| 14 | Do NOT change | The SPMP, unless A asks |
| 15 | Ask / approve | Ask A for the wording of any technical change |

Also on D's list: help A record the T-19 tables (D7–D8), and fix copy and layout defects in D's own area during T-24, reviewed by A.
