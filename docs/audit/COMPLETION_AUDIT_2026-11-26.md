# MUZ Completion Audit: Pending Commits, Guides A–D, Scope (2026-11-26, evening)

| | |
|---|---|
| **Repo state** | Branch `rescue/submission-stabilization` @ `df5072e`, 13 commits ahead of `origin/main` (`b32f3e1`). 12 of them are unpushed: everything except `7810694`. Uncommitted UI work in the tree (see §1, row P5). `origin/main` is unchanged since this morning. |
| **Live app** | https://muz-dawgz.vercel.app/ serves `main` @ `b32f3e1`: GitHub Vercel status "success"; CSS hash matched a local build. None of this branch's work is live. |
| **Automated checks on the current tree** | `npm test`: 60 files, 677 tests pass. `npm run build`: OK. `seed:lessons:check`: up to date. Initial bundle 0.90 MB / 5 MB. Run at 20:30, after the last source edit (only docs changed since). |
| **Live checks done today** | Guest flow. Signed-out REST probe of all 7 tables: `profiles` → 401 / 42501 after the owner applied F2; the other 5 return 0 rows; `dev_test_results` → 42501. `/auth/v1/settings`: email and Google enabled, email confirmation on. |
| **Not verifiable by me** | Any signed-in flow, Google round-trip, camera, microphone, offline save against the real DB, Vercel preview of this branch (not pushed). |
| **Sources of authority** | `RULINGS.md` + owner-approved decisions (11-21) > `MUZ_SRS-Latest` / `MUZ_SDD-Latest` (identical to the repo copies, include the T-02 edits) > guides > Jira (no update since 11-16). |

---

## 1. Pending-commit and pending-change triage

**Nothing below has been reset, deleted, pushed or rewritten.** Recommendations only.

| # | Item | Files | What it does | Still needed? | Already elsewhere? | Risk | Recommendation |
|---|---|---|---|---|---|---|---|
| P1 | `7810694` "temp files" (pushed to `origin/rescue/...`) | `supabase/.temp/*` (9) | Commits the Supabase CLI cache (project ref, pooler host; no password) | No | Neutralised by `5eaa2be` (untracked + gitignored) | History keeps the project ref (not a secret) | **KEEP** (net effect zero). Optional REWORK: drop it with a rebase, which needs a force-push of the rescue branch. |
| P2 | `5eaa2be` rescue checkpoint | Lesson Notes view + test, Settings copy, `.gitignore`, `supabase/.temp` untracked, 2 audit docs | Lessons tab → read-only notes; honest Settings | Yes | No | Low (UI only; browser-verified in guest mode) | **KEEP** |
| P3 | PR #46 `origin/t-13`: 9 commits by ashwwyr, merged locally as `1334356` | `syncLoop.ts` + test, `runner.ts`/`types.ts` (`runId`), `applyResult.ts`, `database.types.ts`, migration `20261125120000_performance_run_id.sql`, `scripts/rls-check.ts`, `scripts/syncLoop.ts` | Offline queue loop, run ids, nullable unique `run_id`, RLS check script | Yes (SRS 3.3.2 / PA-D7) | No | **Conflicts with guide C T-13 §3 ("do not build the replay around `saveLessonResult`") unless A records interim option (b) under U-30.** See §3, item 1. | **MERGE, conditional on Q1.** Done locally; not pushed. |
| P4 | `df5072e` my review fixes on P3 | `applyResult.ts`, `supabaseStore.ts`, `syncLoop.ts`, `types.ts`, tests; deletes `scripts/syncLoop.ts` | Restores `achievements` (PR #46 broke T-11), writes `run_id`, tolerates a missing column, per-user queue, removes broken duplicate | Yes if P3 stays | No | Low; tested | **KEEP, conditional on Q1** |
| P5 | Uncommitted working-tree changes | `App.tsx`, `LoginPage.tsx`, `DashboardScreen.tsx`, `SkillTreeView.tsx`; new `LandingPage.tsx`, `DemoBanner.tsx`, `OnboardingWelcome.tsx`, `skilltree/UnitArt.tsx`, `pathLayout.ts` + test; docs | Three different things: (a) **T-14 welcome** (original), (b) **offline-queue wiring** in `DashboardScreen` (original, part of T-13), (c) **enhancements**: landing page, Skill Tree redesign, demo banner | (a), (b) yes; (c) only if scope is unfrozen | No | (c) changes the first screen and the main screen 36 h before the demo. Guest-mode verified only. | **KEEP, as 3 separate commits:** (a) T-14, (b) T-13 wiring, (c) enhancements. (c) stays off the `main` PR unless you unfreeze scope (§5). Needs your approval to commit. |
| P6 | `.mcp.json` (untracked) | Supabase MCP config with project ref | Tooling for this session | Local only | — | Would share the project ref and tooling with the team | **DISCARD from git**: add to `.git/info/exclude`; keep the local file |
| P7 | `stash@{0}` | `package.json` / lock: `supabase ^3.2.0` dev dependency | Supabase CLI as a dev dependency | No (`npx supabase` works) | — | None | **DISCARD** |
| P8 | Local `Lag-in`, `dashboard`, `new-dashboard`, `lesson-material`, `skilltree-dashboard`, `login-bins`, `schema-seed-lessons`, `learning-practice` (Oct 10 – Nov 7) | Early prototypes: auth, login, curriculum, SkillTree, rhythm hooks, schema/seed | Pre-COURSE prototypes | No | Yes. Their features live on `main` in later forms: `AuthContext`, `LoginPage`, `curriculum.ts`, `useRhythmJudge`, `useSpacebarTap`, `timing.ts`, initial migration, generated seed. Several also track `vite.config.js` / `tsbuildinfo`. | Merging would regress `main` | **DISCARD** (optional: `git tag archive/<name>` first) |
| P9 | `origin/login-bins` | `useAuth.ts`, `profile.ts` … | Oct 24 login prototype | No | Superseded | T-01 says delete | **DISCARD** (delete remote branch) |
| P10 | `origin/features-integration` (not ahead of `main`: merged as PR #22, then reverted by #26) | — | — | No | Reverted on purpose | T-04 acceptance wants a tag, then deletion | **DISCARD** after `git tag archive/features-integration` (T-04) |
| P11 | `origin/task/T-07-pitch-verifier` (8 commits) | First `PitchVerifier.ts`, dead-file deletions | Superseded | No | `main` has the evolved `PitchVerifier.ts` (155 vs 113 lines, wired via T-08 #31); dead files already gone | None | **DISCARD** |
| P12 | `task/A-audit-ai-dev-progress` (1 commit, docs) | AI blueprint, `DEVELOPER_ACCESS_ADMIN_GUIDE.md`, register | 11-19 planning docs | Mostly stale | Partly | Stale docs mislead | **DISCARD**. Optional CHERRY-PICK of `DEVELOPER_ACCESS_ADMIN_GUIDE.md` only if you will grant `is_dev` to testers. |
| P13 | `task/A-takeover-docs` (7 commits, docs; checked out in a worktree) | `T-19_SESSION_PROCEDURE.md`, branch-protection recommendation, defect-log edits | 11-19/21 lead docs | Only the T-19 procedure is useful | No | — | **CHERRY-PICK `docs/test/T-19_SESSION_PROCEDURE.md` only** if you run the hardware rehearsal from it; otherwise DISCARD |
| P14 | 6 git worktrees in an old session's scratchpad (`muz-a`, `muz-ai2`, `muz-ai3`, `muz-db`, `muz-pitch`, `muz-t05`) | — | All clean; 5 sit on commits already in `main` | No | — | None | **DISCARD** (`git worktree remove`) |

---

## 2. Execution guides A–D: item-by-item status

**"Functional"** means the behaviour the guide's acceptance criteria describe was observed (test, browser or live probe). Unit tests alone count only where the criterion is a unit-test criterion.

Status key:
- **IF**: implemented and functional
- **INV**: implemented, not verified
- **PART**: partial or defective
- **NI**: not implemented
- **OBS**: obsolete or superseded
- **UNCLEAR**: requirement unclear

### Member A (Amatong)

| Task / requirement | Evidence in current code | Verification performed | Status | Remaining work |
|---|---|---|---|---|
| T-01 baseline on `main` | `59448bd` is an ancestor of `main` | `git merge-base --is-ancestor` | IF | — |
| T-01 untrack generated files | `git ls-files` shows no `*.tsbuildinfo`, `vite.config.js/.d.ts`; `.gitignore` has them | command run | IF | — |
| T-01 delete `Lag-in`, `dashboard`, `login-bins` remotes | `origin/login-bins` **still exists**; the other two are local only | `git ls-remote --heads` | PART | Delete `origin/login-bins` (P9) |
| T-01 branch protection on `main` | GitHub API returns 404 "Branch not protected" | `gh api …/protection` | NI | Manual task M6 |
| T-01 fresh-clone check | CI `verify` green on `b32f3e1`; local test + build green | CI status + local run | IF | — |
| T-02 rulings D1–D14 recorded | `docs/decisions/RULINGS.md`; Latest SRS/SDD contain the edits | read | IF | — |
| T-06 hearts lost mid-drill persist on quit | `quitLesson(state, now, unreported)`; `LessonPlayer` `inFlightHeartsLost`; tests `runner.test.ts:136-138` | unit tests pass | INV | Manual: timeout then quit, hearts stay reduced (M3, step 10) |
| T-09 FrameLoop hardening | `FrameLoop.ts` `minIntervalMs`, `this.now()`, try/catch; `FrameLoop.test.ts` | unit tests pass | IF (unit criteria) | — |
| T-09 perf overlay `?debug` | `PerfOverlay.tsx` + test, `CameraPanel` `isPerfDebug` | unit test only | INV | Needs camera (M4) |
| T-08 pitchy wired, octave rejected | `PracticeDrill.ts` uses `PitchVerifier`; chroma path behind `useChromaNoteVerifier`; octave tests | unit tests (synthetic piano) pass | INV | Real keyboard: A4 passes, A3 fails (M4) |
| T-19 hardware benchmark | `PERFORMANCE_REPORT.md` is a scaffold; nothing measured | read | NI | Deferred (M9); say "not measured" if asked |
| T-24 triage + regression log | `DEFECT_LOG_AND_TRIAGE.md` stale (11-19); no `REGRESSION_LOG.md` | `ls` | NI | Update the defect log (docs) after testing |
| AUX-TEST-ACCESS-01 follow-up | Migrations live (`is_dev` column exists; `dev_test_results` protected); test report dated 11-19 | live REST probe | INV | Only if testers need developer access |
| §4 lead duties: independent review, IC-0…RC checkpoints, go/no-go record, demo rehearsal, backup video | No independent PR reviews recorded; no go/no-go or rehearsal record | git/GitHub | NI | Rehearsal + backup video before Saturday (M8) |

### Member B (Barnaija)

| Task / requirement | Evidence in current code | Verification performed | Status | Remaining work |
|---|---|---|---|---|
| T-03 bootstrap never writes after a failed read | `lib/auth/profileBootstrap.ts` + tests (rules 1–5); `AuthContext` uses it; `grep upsert AuthContext.tsx` = 0; `InstrumentFocus = 'piano'`; synchronous listener | unit tests + grep | INV | Manual: one sign-in = one profile GET; blocked-request test (optional) |
| T-04 close `features-integration` | PR #22 reverted (#26); T-11/T-12 re-done on `main`. **Archive tag absent; remote branch still exists.** | `git ls-remote` | OBS (purpose met) / PART (acceptance) | Tag + delete (P10) |
| T-11 achievements | `achievements.ts`, `ProgressStore` +3 methods, `saveLessonResult` awards once, toasts; no `upsert` on `user_achievements`. **Extra beyond the brief:** `clientAchievements.ts` unlocks badges in localStorage when the server save fails (contradicts X10). | unit tests | INV / UNCLEAR (the localStorage fallback) | Manual: first lesson → `first-lesson` row, EXP + 50, replay adds none (M3). Decide on the fallback (§3, item 3). |
| T-12 analytics from real data | `useAnalyticsData.ts` queries, `aggregate.ts` + tests, 7d/30d/all, empty state; grep for fake numbers clean | unit tests; guest shows empty states | INV | Manual: rhythm-only run → rhythm point only; practice run → pitch + posture (M3) |
| T-10 recovery, Google, resend, labels | Recovery mode + `updatePassword`; Google button; resend; 9 `htmlFor`; `truncate` removed | code read; live Google provider enabled | INV | Manual M3 steps 2–4 |
| T-23 support | — | — | NI | Part of the E2E (deferred) |
| T-24 fixes | — | — | n/a until defects are logged | — |
| T-25 production deploy | Vercel serves `main`. **Production uses the shared `Muz-Database`, not a fresh project (contradicts U-06).** No `v1.0.0` tag; no demo script or backup video found. | GitHub status, `git tag` | PART | Tag after release; backup video (M8). U-06 deviation: document it (§3, item 4). |

### Member C (Rosales)

| Task / requirement | Evidence in current code | Verification performed | Status | Remaining work |
|---|---|---|---|---|
| F2-1 anon cannot read `profiles` | Migration applied live by owner 2026-11-26 | Live probe → 401 / 42501 | IF (read) | — |
| F2-1 anon cannot insert/update/delete | Migration revokes all anon/PUBLIC privileges | **Not probed** (would be a write attempt on live data) | INV | Optional: covered by the RLS script on a test project |
| F2-2…F2-4 own-row only | Policies `id = auth.uid()` | PGlite tests (SELECT drift + "keeps app working") | INV | Signed-in profile load (M3 step 1) |
| F2 follow-up: tests for audited INSERT `WITH CHECK true` / UPDATE drift | Only SELECT drift and an UPDATE-policy-removal case exist; **no INSERT-drift test** | read `profilesRls.test.ts` | PART | Low value now: live drift already fixed |
| T-05 Part 1 (CI, `vercel.json`, size check, env guard, `ENVIRONMENTS.md`) | All present; CI green | CI status | IF | `ENVIRONMENTS.md` role rows (docs) |
| T-05 "failing PR blocks merge" | Needs branch protection | API 404 | NI | M6 |
| T-05 Part 2 (staging E1, V1–V10) | Not created | — | OBS (schedule gate U-30 passed Mon 11-23 without E1 → option (c)) | Record the ruling (§3, item 1) |
| T-07 PitchVerifier | `audio/notes/PitchVerifier.ts`, `pitch.test.ts`; dead files gone | unit tests | IF (unit criteria) | — |
| T-13.1 `runId` | In `runner.ts`/`types.ts` (P3/P4) | unit tests | IF (unit), unpushed | — |
| T-13.2 queue mechanics | `queue.ts`, `syncLoop.ts`, tests. **Differs from the revised brief:** no injected result classifier, no payload version; queues `SaveLessonInput` including `passMark`/`expReward` (the brief says not to). | unit tests | PART | Depends on Q1 |
| T-13.3 replay binding + wiring | Wired to `saveLessonResult` (interim option (b)); per-user; `run_id` dedupes only performance rows. I-3/I-5 (atomic, at most once) **not met** by design of (b). | unit tests only; **no real offline test** | PART / UNCLEAR (needs the U-30 ruling) | Q1; then manual M5 |
| `run_id` migration | File present; **on hold per guide**; not applied live; app tolerates its absence | unit test for the missing-column fallback | INV | Apply only if Q1 = keep (M7) |
| T-20 RLS script | `scripts/rls-check.ts` present (from PR #46). **Missing:** `RLS_TARGET` environment guard; not in `scripts/tsconfig.json` include. No report. | read | PART | Optional before demo; needs 2 throwaway accounts |
| T-23 E2E checklist (31 rows) | No `E2E_CHECKLIST.md` | `ls` | NI | Reduced smoke test M3 instead (deferred in full) |
| SEC-01 grants matrix | Not done; anon gets 0 rows on the other tables via RLS | live probe | OBS for this release (Stage A / option (c)) | Document as a known limitation |
| Support: Google provider | Enabled live | `/auth/v1/settings` | IF (provider) | Round-trip in M3 |
| Support: production Supabase | Shared project used | — | PART (U-06 deviation) | §3, item 4 |

### Member D (Bernante)

| Task / requirement | Evidence in current code | Verification performed | Status | Remaining work |
|---|---|---|---|---|
| T-16 boundary tests, D13 formula, cap at 100, 3 heart-restore tests | `timing.test.ts`; `timing.ts` consistency = Σ/passedBeats capped at 100; 5 `heartRestored` assertions in `runner.test.ts` | unit tests pass | IF (unit criteria) | — |
| T-15 items 1–8 | HUD `profileStatus` + `profileHud.test.ts`; `+expReward XP`; `lessonNeedsHearts` in both places; `blockingLesson` + `nodeStatus.test.ts`; ViewportGuard in every `App` branch, `z-[60]`, no `Maximize2`; checkpoint copy; `needsMic={false}`; Score counter | unit tests + code read; banner/XP/score seen in browser (guest) | INV (items 1, 3, 5, 7 need signed-in / camera / <1024 px checks) | M3 steps 5–6, M4 |
| T-18 remove 15 dead files | None exist; grep clean | command run | IF | — |
| T-14 welcome before placement (P1) | `OnboardingWelcome.tsx` + wiring (**uncommitted, P5a**) | type-check only | INV | M3 step 1 (fresh sign-up) |
| T-17 flats | — | — | OBS (cut, U-36) | — |
| T-21 media-privacy audit | No report | `ls` | NI | M10 (15 min, optional but cheap) |
| T-22 compatibility matrix + issue log | No report | `ls` | NI | Deferred |
| T-26 SRS/SDD v01.02 + test appendix | Ruling edits are in the Latest PDFs, but the revision rows still read v01.01 / v01.00; no appendix | read PDFs | PART | After testing; outside code |

---

## 3. Contradictions and unclear requirements

1. **T-13 design vs what is now on this branch (decision needed: Q1).**
   - What the rules say:
     - PA-D7 makes offline sync **required**.
     - U-30 option (c) was triggered on Mon 11-23 (no E1, no RPCs). That makes T-13.3 `n/a` by ruling.
     - Guide C allows an **interim queue over `saveLessonResult`** only if A records "option (b)" with its duplicate/partial-save risk written down.
   - What I did: last turn I built (b) after you chose "Review and merge PR #46", but no ruling has been recorded.
   - Choices:
     - **(i)** Record the (b) ruling and keep the code, documenting the limitation.
     - **(ii)** Revert the wiring and keep only the tested queue library, recording SRS 3.3.2 as not met.
2. **U-06 (fresh production project) vs reality.** Production is the shared `Muz-Database`. This is acceptable for a capstone demo, but it should be written down, not hidden.
3. **T-11 localStorage badge fallback vs X10** ("no fake unlocked badges"). When a save fails, badges are shown as unlocked locally. It is labelled "checked locally" in the note, but the Profile grid merges them in as if earned. **UNCLEAR**; low impact.
4. **The guides' status columns are stale.** They show 11-21 statuses for work merged later (T-15, T-16, T-11, T-12, T-10, T-18). Do not hand a guide to anyone without §2.
5. **T-26 revision rows:** the Latest SRS/SDD content includes the rulings, but the version is still v01.01 / v01.00, not v01.02.

---

## 4. Answer: are all requirements in the four execution guides implemented and functional?

**NO.**
- **Not implemented:** T-19, T-21, T-22, T-23, T-24/regression log, branch protection.
- **Partial:** T-13 (with an unresolved ruling), T-20, T-25, T-26, F2 follow-up tests, T-01/T-04 cleanup.
- **Implemented but never verified:** almost every signed-in and hardware behaviour (T-03, T-06, T-08, T-09 overlay, T-10, T-11, T-12, T-14, T-15 items 1/3/5/7).

What *is* functional is the code-level core: every unit-tested criterion passes (677 tests), the build passes, F2 is live and works for anonymous reads, and guest mode works on the live site.

---

## 5. Scope decision

**Recommendation: KEEP SCOPE FROZEN.**

Evidence:
- §4 is NO.
- The one SRS feature still in question (offline sync) has an unrecorded ruling.
- No signed-in or hardware flow has been observed working.

Conditions to unfreeze, all cheap except the hardware one:
1. Q1 answered and recorded in `RULINGS.md`.
2. M3 signed-in smoke test passes on the Vercel preview of this branch.
3. M4 hardware rehearsal passes on the demo laptop.
4. No P0/P1 open from 2–3.

The full T-19/T-22/T-23 test suites are **not** a condition. They cannot be done by Saturday and should be recorded as known gaps.

**The enhancements already built (P5c)** stay on a separate commit and out of the `main` PR until the conditions hold.

If unfrozen:

| Bucket | Items |
|---|---|
| Original features still worth completing | T-14 (done, verify); T-13 per Q1; T-20 script guard + one run on two throwaway accounts |
| Defects / quality gaps | Delete `origin/login-bins`, archive `features-integration`; branch protection; defect-log refresh; guest badges 0/5 vs 2,450 EXP; X10 fallback |
| Optional enhancements | Landing page, Skill Tree redesign, demo banner (built, unverified signed-in); 3D keyboard; sound feedback (see the proposal in chat) |
| Too risky / low value now | three.js / R3F 3D scenes; server-side RPC progression (T-28); new staging project; SEC-01 grant rework; full T-22 matrix |
