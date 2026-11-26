# MUZ Submission Rescue Audit — 2026-11-26

| | |
|---|---|
| **Assessed code** | `main` = `origin/main` = `b32f3e1` (PR #48). Local branch `rescue/submission-stabilization` = `7810694`, one commit ahead of `main`. That commit only adds `supabase/.temp/*` (Supabase CLI cache), and it is pushed to origin. |
| **Live app** | https://muz-dawgz.vercel.app/. GitHub shows a successful Vercel deployment and a green CI `verify` check for `b32f3e1`. The live CSS bundle hash (`index-DFDQZiuf.css`) matches a local build of `b32f3e1`, so the live app very likely runs `main`. The JS hash differs, as expected, because env vars are inlined at build time. |
| **Local checks run today on `b32f3e1` source** | `npm test`: **57 files, 657 tests, all passed**. `npm run build` (`tsc -b && vite build`): **passed**, main JS 854.7 kB (257 kB gzip). `npm run seed:lessons:check`: **up to date (59 lessons)**. |
| **Live checks run today** | Login page renders with no console errors. Guest mode works: Skill Tree, Lessons, Profile and a theory lesson all opened. Read-only anonymous REST probe of the live Supabase project (results below). |
| **Not verified** | Anything that needs a signed-in account: sign-up, login, placement, saving progress, hearts, analytics with real data, achievements, Google OAuth round-trip. Also anything that needs camera or microphone hardware (posture HUD, pitch, chords). I had no test account, and the browser pane has no instrument. |
| **Branch protection** | `main` is **not protected** (GitHub API 404). |
| **Open PRs** | #46 `t-13` (offline outbox + `run_id` migration). |
| **Update (later 2026-11-26)** | Owner took a SQL-editor snapshot (policies, grants, user data), then applied the F2 migration to live. Re-probe with the anon key: `profiles` → HTTP 401 / `42501 permission denied`. **Blocker C1 / DEF-001 closed.** `dev_test_results` is still protected (42501). Other tables still return 0 rows to anon. Owner reports the lesson check was done; the result was not shared, and anon reads cannot see `lessons`, so it is confirmed only by the owner. |

Older audits in `docs/audit/` and `docs/execution/` describe baselines `59448bd`, `67dc05e`, `f2c79ed` and `e96c34c`. Their claims were rechecked against `b32f3e1` and the live system. Where they disagree, this document wins.

---

## A. Executive summary

**Readiness: demonstrable, but with one P0 security hole on the live database and one unverified dependency that could break every signed-in save.**

- The code is in good shape. Tests, build and seed check are green. Every SRS flow has real code behind it: auth with email, Google and guest; placement; skill tree; hearts and regeneration; streak; EXP; theory; rhythm; posture HUD; pitch and chord verification; the wait-state FSM; analytics; achievements.
- **P0, verified live:** the production `profiles` table can be read **without signing in**. 9 rows come back with every column, including `username`, `exp`, `hearts` and `is_dev`. The F2 hardening migration (`20261119120000_profiles_rls_hardening.sql`) was not applied, or a later change undid it. The `is_dev` migration *was* applied, which is the exact ordering its own header warns against. This breaks SRS 3.5.2 and anyone on the panel can show it with one `curl`.
- **Unverified, possibly critical:** whether the live `lessons` table holds the 59 v2 lessons. Anonymous reads cannot see it (RLS returns 0 rows to anon). If it is empty or stale, the app silently uses the bundled course (`useDashboardData.ts`). Placement then never appears (it needs `!usingFallback`), and every progress save fails the `user_progress.lesson_id → lessons.id` foreign key. The user would see "Your result could not be saved." **This must be checked first with a real account.**
- **Absent:** offline caching and sync (SRS 3.3.2, SDD C-08). `src/lib/sync/queue.ts` exists but nothing imports it. The full outbox is in unmerged PR #46.
- **Misleading in the UI:** the Lessons tab is a second copy of the Skill Tree (same nodes, same launch button). The Settings tab shows hard-coded "Active" and "Enabled" badges, including "MediaPipe **Hand** & Wrist Pose Lock", but the SRS forbids a hand model. Guest mode shows 58/59 lessons mastered and 2,450 EXP but 0/5 badges.

**Do not attempt before Saturday:** merging PR #46 (outbox; touches `runner.ts`, `applyResult.ts` and the schema), the server-side RPC / "Stage A" progression rewrite, a new staging project, Stage B grant revocation, analytics redesign, new curriculum content, or any refactor. Do not run destructive SQL on the live database without a backup.

---

## B. Feature audit

Status key:
- **IV**: implemented and verified (tests or live check today)
- **IU**: implemented but unverified
- **P/B**: partial or broken
- **ABS**: absent
- **OBS**: obsolete

| Requirement / feature | Evidence in code / docs | Live verification (today) | Status | Priority | Action |
|---|---|---|---|---|---|
| 3.1.1.1 Email auth | `AuthContext.tsx` signIn/signUp; `LoginPage.tsx` | Login page renders. Auth settings: `email: true`, `mailer_autoconfirm: false` (confirmation email required) | IU | P0 (demo path) | Smoke test with a fresh account. Check the confirmation email arrives and redirects to the Vercel URL. |
| 3.1.1.1 Google OAuth | `signInWithOAuth('google')` `AuthContext.tsx:319`; button in `LoginPage.tsx:182` | `/auth/v1/settings` → `google: true` (old DEF-009 is **resolved** at the provider) | IU | P1 | Do one round-trip on the live URL. Check the Supabase Site URL / redirect allow-list includes `https://muz-dawgz.vercel.app`. |
| Password reset (SDD C-01) | `resetPasswordForEmail` + `updateUser`, `isPasswordRecovery` routing in `App.tsx` | — | IU | P2 | Smoke test only. Old DEF-010 likely stale. |
| Guest / demo mode | `enterDemoMode` `AuthContext.tsx:423` | **Works.** Skill Tree, Lessons, Profile and the theory player all open. | IV | P0 (fallback for demo) | Keep as the demo fallback. |
| 3.1.1.2–3 Piano lock | `instrument_focus` default `'piano'`; lessons `check instrument='piano'`; queries `.eq('instrument','piano')` | Settings shows "Acoustic Piano" | IV (code) | — | None |
| 3.1.1.4 Placement (1/5/9) | `PlacementModal.tsx`, `savePlacement` `supabaseStore.ts`, `placement.test.ts` | Not reachable in guest mode | IU | P0 | Verify with a new account. **Depends on the `lessons` table being seeded.** |
| 3.1.2.1 Skill tree | `SkillTreeView.tsx`, `nodeStatus` (+ test) | Renders 12 units / 59 nodes in guest mode | IV | — | None |
| 3.1.2.2 Streak | `streak.ts` + test; `applyResult.ts` | Guest shows 14 days (static demo profile) | IU | P1 | Covered by the signed-in smoke test. |
| 3.1.2.3 EXP + bar | `applyResult.ts`, `expProgress`; tests | Guest bar shows 2,450/4,000 | IU | P1 | Signed-in smoke test |
| 3.1.2.4 Hearts (15 s timeout, 3 misses, 15-min regen, ≥80% theory restore) | `PracticeDrill.ts` (`consecutiveMisses`), `useHeartRegen.ts`, `heartRegen.ts`, tier `timeoutSec: 15` all tiers (`tiers.ts`) | Not exercised | IU | P1 | Signed-in smoke test: miss one drill and watch the heart drop. |
| 3.1.2.5 Prerequisite gating | `nodeStatus`, `blockingLesson`, locked banner | Guest has nothing locked | IU | P1 | Signed-in smoke test: click a locked node and check the banner. |
| 3.1.3 Theory cards / quiz / gating | `components/lesson/theory/*`, `runner.ts` + tests | Theory lesson opened; Learn card with keyboard and "Listen" rendered | IV (render) | — | None |
| 3.1.4 Rhythm ±25/±50 ms, omitted = 0 | `lib/rhythm/timing.ts` (`PERFECT_MS=25`, `GOOD_MS=50`), `plan.test.ts`, T-16 merged (#41, #43) | Not exercised | IU (unit-tested) | P1 | Smoke test one rhythm lesson. Old DEF-007 probably resolved by T-16; confirm. |
| 3.1.5 Posture HUD (MediaPipe worker, 3D angles, bands 80–110 / 150–180) | `workers/posture.worker.ts`, `vision/posture/config.ts`, `vision/hud/*`; WASM and model in `public/models/` | Not exercised (no camera in audit) | IU | P0 (core demo) | Hardware smoke test on the demo laptop. |
| 3.1.6.1–2 Pitch (worklet, ±35 c, clarity 0.85) | `audio/worklet/chroma.worklet.ts`, `audio/config.ts:127-134`, `PitchVerifier` synthetic tests pass (octave errors rejected → old DEF-006 resolved in code) | Not exercised | IU | P0 (core demo) | Test with a real piano or keyboard on the demo laptop. |
| 3.1.6.3–4 Chords (chroma, cos ≥ 0.72, 200 ms) | `ChordMatcher.ts`, `audio/config.ts:84`, `chords.test.ts` | Not exercised | IU | P0 | Same hardware test |
| 3.1.6.5 400 ms latch FSM | `WaitStateMachine.ts`, `waitState.test.ts` | Not exercised | IU | P1 | Same hardware test |
| 3.1.7.1–3 Analytics from `performance_records` | `useAnalyticsData.ts` (real queries), `aggregate.ts` + tests, `ProfileAnalyticsView.tsx` | Guest: empty states render ("No practice sessions yet") | IU | P1 | Play 1 rhythm + 1 practice lesson on a real account, then confirm the charts fill. |
| 3.1.7.4 Achievements | `achievements.ts`, `saveLessonResult.ts` writes `user_achievements`; `clientAchievements.ts` localStorage fallback; `AchievementToast` | Guest: 0/5 unlocked despite 2,450 EXP and a 14-day streak | IU / P/B (guest only) | P2 | Optional: seed demo badges, or leave as is. Signed-in path untested. |
| 3.2.1 Dark UI, canvas HUD | Tailwind dark theme; `HudEngine.ts` | Dark UI confirmed | IV | — | None |
| 3.2.2 <1024 px alert | `ViewportGuard.tsx:22` | Pane at exactly 1024 px, no alert (correct) | IV | — | None |
| 3.3.1 Device-denial modal | `MediaDiagnostics.tsx`, `AudioError`, `VisionError` | Not exercised | IU | P1 | Smoke test: deny the camera and check for a modal instead of a crash. |
| 3.3.2 Offline cache + sync / C-08 | `lib/sync/queue.ts` + test, **imported nowhere**. PR #46 has the outbox, unmerged. | — | **ABS** | DEFER | Record as a known limitation. Do not merge #46. |
| 3.4 Worker inference, bundle ≤ 5 MB, lazy WASM | `posture.worker`, `vision_bundle` split chunk; `check-bundle-size.mjs` | Initial load fetched only `index-*.js` and `.css` (WASM not loaded on login) | IV (load behaviour) | — | None. FPS and latency are unmeasured (`PERFORMANCE_REPORT.md` blank). Say so if asked. |
| 3.5.1 No media leaves the browser | Worklet posts only features; no upload code | — | IU | P2 | Optional DevTools network check during a drill |
| **3.5.2 RLS on all tables** | Migrations define owner-only policies; F2 migration exists | **FAIL:** anon `GET /rest/v1/profiles` → HTTP 206, `content-range 0-0/9`, all 10 columns. Other tables return 0 rows to anon. `dev_test_results` → 42501 (protected). | **P/B** | **P0** | Apply `20261119120000_profiles_rls_hardening.sql` to live, then re-probe. |
| 3.5.2 No secrets in bundle | Bundle holds only the anon JWT (expected) | Confirmed: only the anon key found | IV | — | None |
| Lessons tab (team scope) | `DashboardScreen.tsx:574-664`: filterable copy of the curriculum nodes that launches activities | Confirmed live: it duplicates the Skill Tree | P/B (vs. intended scope) | P1 | SIMPLIFY into read-only notes (task T4). |
| Settings tab | `DashboardScreen.tsx:666-…`: static badges, "MediaPipe Hand & Wrist Pose Lock" | Confirmed live | P/B (misleading) | P2 | Copy fix only (task T5). |
| Dev access (`is_dev`, `dev_test_results`) | Migrations 3 and 4; `devAccess.ts` | `is_dev` column and `dev_test_results` table exist live | IU | — | None |

**Older defect log (`docs/test/DEFECT_LOG_AND_TRIAGE.md`) reconciled:**

| Defect | Status now |
|---|---|
| DEF-001 | **Still open on live** |
| DEF-002 | Likely fixed by T-03 `profileBootstrap.ts` (PR #40) |
| DEF-004 | Fixed (`configGuard.ts`) |
| DEF-005 | Fixed in code (all tiers 15 s). Live seed state unknown. |
| DEF-006 | Fixed in code (f0 verifier, tests) |
| DEF-007 | Likely fixed (T-16) |
| DEF-009 | Fixed at provider |
| DEF-003, DEF-008, DEF-010 | Need retest |

---

## C. Critical blockers (ordered by impact, then dependency)

1. **Live `profiles` publicly readable (P0, verified).** Apply F2 to the live project and re-probe. This has no dependency on anything else. It is 10 minutes of work with a backup.
2. **Unknown `lessons` seed state on live (P0 if wrong, unverified).** It blocks placement, progress saving, analytics and achievements for signed-in users. To check: sign in with a fresh test account, open the Skill Tree, and see whether the placement modal appears. Or, in the Supabase SQL editor, run `select count(*), min((payload->>'schemaVersion')::int) from lessons;` and expect `59, 2`. To fix: run `supabase/seed.sql`.
3. **End-to-end signed-in flow never verified on live (P0).** Steps: sign up → confirm email → placement → theory lesson → save → EXP and streak update → analytics. This depends on items 1 and 2.
4. **Camera and microphone on the demo machine never verified (P0 for the demo).** This is independent of items 1–3. It needs the actual demo laptop, browser and piano or keyboard.
5. **Lessons tab duplicates the Skill Tree (P1 scope).** Independent work.
6. **`supabase/.temp/` committed on the rescue branch (hygiene).** It includes the project ref and pooler host. It is not a secret, but it should not merge to `main`.

---

## D. Scope decisions

| Item | Decision | Reason |
|---|---|---|
| Profiles RLS on live (F2) | **FIX** | P0, SRS 3.5.2, demonstrable by anyone; migration already written |
| Lessons seed on live | **FIX** (verify first) | Everything signed-in depends on it |
| Signed-in E2E + hardware check | **FIX** (test only) | Core demo; nothing has been witnessed live |
| Lessons tab | **SIMPLIFY** | Read-only notes from existing concept cards, Units 1–4 (Novice) only. 31 cards already exist; no new content. |
| Settings tab copy | **SIMPLIFY** | Remove fake status badges and the "Hand" wording; keep account and sign-out |
| `supabase/.temp/` on rescue branch | **FIX** | Untrack and gitignore before merging the rescue branch |
| Offline sync (3.3.2 / C-08), PR #46 | **DEFER** | Touches the save path and schema 48 h before the demo. Document as a known limitation. |
| Server-side RPC progression (Stage A/B, T-28) | **DROP** for submission | SDD 3.3 already accepts client-side writes as a known limitation |
| Guest badges 0/5 | **DEFER** (optional SIMPLIFY) | Cosmetic, guest only |
| Performance/FPS measurement report | **DEFER** | Say "not measured" honestly if asked. A 5-minute DevTools FPS reading on the demo laptop is optional. |
| Branch protection on `main` | **FIX** (2 min, admin) | Prevents an accidental push during the freeze |
| New features, content, refactors, docs rewrite | **DROP** | No time; risk to a green baseline |

---

## E. Task plan

**Owner assignments are PROVISIONAL.** I could not see current member status. Letters follow `TEAM_ASSIGNMENT_MATRIX.md`: A = Amatong (lead, Supabase admin), B = Barnaija, C = Rosales, D = Bernante. Confirm before work starts.

| # | Task | Owner (provisional) | Depends on | Exact files / areas | Acceptance check | Effort / risk |
|---|---|---|---|---|---|---|
| T1 | Back up live DB, apply F2 RLS hardening | A | Supabase dashboard access | `supabase/migrations/20261119120000_profiles_rls_hardening.sql` (run as-is in SQL editor) | Anonymous `GET /rest/v1/profiles?select=id` returns `[]`. A signed-in user still loads their own profile. | 15 min / Low (idempotent, only touches profiles policies) |
| T2 | Verify and, if needed, apply lesson seed + badge catalog | A | T1 (same session) | `supabase/seed.sql` | `select count(*) from lessons where instrument='piano'` = 59, all `schemaVersion` 2. `achievements` has 5 rows. | 15 min / Low (seed is idempotent upserts) |
| T3 | Signed-in live smoke test (checklist §F, parts 1–4) | B | T1, T2 | Live app only | Every row in §F parts 1–4 marked pass/fail with screenshots; failures logged in `DEFECT_LOG_AND_TRIAGE.md` | 1.5 h / — |
| T4 | Lessons tab → read-only lesson notes | D (B reviews) | none | `src/components/dashboard/DashboardScreen.tsx` (replace the `view === 'lessons'` block, lines ~574–664, and the now-unused `lessonFilter` / `filteredLessons`); new `src/components/dashboard/LessonNotesView.tsx`; reuse `NoteFigure` from `src/components/lesson/theory/NoteFigure.tsx`; data from `COURSE_LESSONS` / `COURSE_UNITS` in `src/content/index.ts` | Lessons tab lists Units 1–4. Each lesson shows its concept-card titles, bodies and keyboard/staff figure with Listen. No Start button, no grading, no writes. `npm test` and `npm run build` pass. | 3–4 h / Low-Med (UI only) |
| T5 | Settings copy cleanup | D | none | `DashboardScreen.tsx` settings block (~666–740) | No "Active"/"Enabled" status claims; no "Hand"; account + sign-out still work | 30 min / Low |
| T6 | Hardware demo rehearsal on the actual demo laptop | C (A on call) | none | Live app; practice lessons in Units 1 and 4 | §F part 5 all pass: posture HUD draws, middle C passes, C-major chord passes, 15 s timeout deducts a heart, camera-deny modal shows | 1.5 h / — (findings may create fixes for A) |
| T7 | Repo hygiene + freeze | A | T4, T5 merged | `.gitignore` (add `supabase/.temp/`), `git rm -r --cached supabase/.temp`; enable branch protection on `main` | `git ls-files supabase/.temp` empty; protection API returns 200 | 15 min / Low |
| T8 | Doc corrections (§G) | C | T1–T3 results | Listed in §G | Docs match the verified state | 45 min / Low |

**Timeline:**
- **Thu 11-26 evening:** T1, T2, T4 started, T5.
- **Fri 11-27 morning:** T3, T6, T4 PR merged.
- **Fri 11-27 midday:** code freeze, then T7 and a final redeploy smoke test (§F part 1).
- **Fri 11-27 afternoon:** T8.
- **After the freeze:** only fixes for failures found in T3 or T6.

---

## F. Live smoke-test checklist (human tester)

Use Chrome or Edge on a desktop at ≥1280×720, at https://muz-dawgz.vercel.app/. Record pass/fail, a screenshot, and the time for each step.

**Part 1: Public / guest (2 min)**
1. Page loads to the sign-in screen with no blank screen. DevTools Console shows no red errors.
2. Narrow the window below 1024 px. An "expand your window" alert appears and goes away when you widen it again.
3. Click "Continue as Guest". The Skill Tree loads, and the HUD shows hearts, streak and EXP.

**Part 2: Account (10 min, fresh email)**
4. Sign Up with a new email. A confirmation email arrives and its link returns to the Vercel URL, signed in.
5. The placement modal appears. Choose **Novice** and you land on Unit 1 with node 1 available and the rest locked.
6. Click a locked node. It shakes and a "Finish … first" banner appears.
7. Sign out and sign in again with the password. You return to the same state.
8. In a private window, use "Continue with Google". It lands on the Vercel URL, signed in.
9. Use "Forgot?" on the test account. The email arrives, the link opens the reset form, and the new password works.

**Part 3: Progression (15 min)**
10. Play *The Musical Alphabet* (theory) to the end. The results screen shows the score and EXP. Back on the dashboard, EXP has increased, the streak is 1, and node 2 is unlocked.
11. Reload the page. The progress is still there (it was saved to the server).
12. Play *Steady Pulse* (rhythm, Unit 1 node 4; may need the earlier nodes first). Spacebar taps show Perfect/Good/Miss, and the results show a consistency %.
13. Profile & Analytics shows the session count and the rhythm histogram populated, and "First Note" unlocked with a toast.

**Part 4: Hearts (5 min)**
14. Start a practice drill and do nothing for 15 s. Hearts go from 5 to 4.
15. Play 3 wrong notes in a row. Hearts drop by one more.
16. Score ≥80% on a theory lesson. One heart is restored (up to 5).

**Part 5: Hardware (demo laptop + piano, 15 min)**
17. Open *Hand Shape & Posture*. The browser asks for camera access. Allow it. The skeleton overlay draws and turns green or red as you move your elbow and wrist.
18. Deny the camera (reset the site permission, then reopen). A diagnostic modal appears, not a crash.
19. *Finding Middle C* play stage: middle C passes, and C5 is rejected.
20. *C Major* (Unit 4): play a C-major chord and it passes. A wrong chord does not pass.
21. Check that the Lessons tab (after T4) shows notes only, with no Start buttons.

---

## G. Documentation to fix before submission (only these)

1. **`docs/test/DEFECT_LOG_AND_TRIAGE.md`.** Update statuses per §B. Add DEF-011 (live profiles still public, until T1 closes it) and DEF-012 (offline sync absent, deferred). Fill one row of the regression table with today's numbers: 657/657 tests, build OK, seed OK.
2. **`docs/audit/CONSOLIDATED_HANDOFF.md`.** Add a one-line banner at the top: "Superseded by `RESCUE_AUDIT_2026-11-26.md`; baseline e96c34c is stale." Its plan (E1 staging, Stage A RPCs, outbox) is no longer in scope and could mislead a reader.
3. **`docs/ENVIRONMENTS.md`.** State which Supabase project the production Vercel deployment uses, and that F2 and the seed were applied (after T1/T2), with the date.
4. **SRS/SDD known limitations (only if the panel expects them current).** One line each:
   - SRS 3.3.2 / SDD C-08: offline sync is not delivered.
   - SRS 3.4: performance targets are not measured.

   SDD 3.3 already covers client-side writes.

Do **not** rewrite the `docs/execution/*` guides, the other `docs/audit/*` files, or `docs/auxiliary/*`. They are historical; the banner in item 2 is enough.

---

## H. Handoff for the implementation AI (approved concrete tasks only)

> Work on a branch off `main` (`b32f3e1`). Do not touch `src/audio`, `src/vision`, `src/practice`, `src/workers`, `src/lesson`, `src/lib/progress`, `supabase/migrations`, or `supabase/seed.sql`. Do not merge or rebase PR #46. Run `npm test` and `npm run build` before declaring done; both must pass (baseline: 57 files / 657 tests).
>
> **Task H1: Lessons tab becomes read-only lesson notes.**
> - Create `src/components/dashboard/LessonNotesView.tsx`. Build it from `COURSE_LESSONS` and `COURSE_UNITS` (`src/content/index.ts`), filtered to `module_index` 1–4.
> - Group the notes by unit (unit title + blurb), then by lesson (title + description).
> - Under each lesson, list every `concept-card` exercise from its stages: `title`, `body`, and `NoteFigure` (`src/components/lesson/theory/NoteFigure.tsx`) with `notes`, `display` and `chord` when `notes` is non-empty. Skip lessons with no concept cards.
> - No Start button, no grading, no Supabase calls, no progress writes.
> - In `src/components/dashboard/DashboardScreen.tsx`:
>   - Replace the `view === 'lessons'` block with `<LessonNotesView />`.
>   - Remove the now-unused `lessonFilter` state and `filteredLessons` memo.
>   - Change the header title for the `'lessons'` view to "Lesson Notes".
> - Add one unit test that exercises the pure data function (not the React component). It must assert that units 1–4 are included, unit 5 is excluded, and that the card count equals the concept cards in those units (31 at `b32f3e1`).
>
> **Task H2: Settings copy.** In the `view === 'settings'` block of `DashboardScreen.tsx`:
> - Remove the "Active" and "Enabled" status pills.
> - Rename "MediaPipe Hand & Wrist Pose Lock" to "Posture tracking (camera, on-device)".
> - Rename "Chromagram Pitch Tracking" to "Pitch & chord detection (microphone, on-device)".
> - Replace the descriptions with "Runs only in your browser during practice lessons. Nothing is recorded or uploaded."
> - Keep the instrument row and the Account & Session card unchanged.
>
> **Task H3: Repo hygiene.** Add `supabase/.temp/` to `.gitignore` and run `git rm -r --cached supabase/.temp`. Make no other changes.
>
> Out of scope (do not do): offline sync, RPCs, schema changes, analytics changes, achievements changes, new content, styling refactors, dependency upgrades.
