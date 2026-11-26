# Phase 1: Execution Guides A–D Reconciled Against the Code (2026-11-26)

| | |
|---|---|
| **Code assessed** | `origin/main` = `b32f3e1`. Working branch `rescue/submission-stabilization` = `7810694` plus uncommitted rescue changes: Lesson Notes tab, Settings copy, `supabase/.temp` untracked. |
| **Checks run today** | `npm test`: 58 files / 661 tests pass (657 on `main` + 4 new). `npm run build`: passes. `seed:lessons:check`: up to date (59 lessons). |
| **Live checks** | Guest flow on https://muz-dawgz.vercel.app/ works. Signed-out request to `profiles` now returns 401 (F2 applied by the owner today). Google provider is enabled. |
| **Jira** | Readable (site `givepremiumplease03`). **No KAN issue updated since 2026-11-16.** Jira is therefore not evidence for anything in this document. |
| **Not verified** | Signed-in flows, camera, microphone, Google round-trip, the Vercel build of this branch. |

## 0. Which documents are authoritative

| Source | Status | Evidence |
|---|---|---|
| `MUZ_SRS-Latest.pdf` (v01.01) and `MUZ_SDD-Latest.pdf` (v01.00), dated 2026-11-19 | **CURRENT.** These are not outdated. They are byte-identical to `docs/execution/MUZ_S*-Latest.pdf` in the repo (md5 match). They already contain the T-02 rulings: streak D9, rhythm formula D13, HUD hysteresis D12, the SDD 3.3 known limitation D14, three placement tiers D8. | md5 `5c7d07b3…` (SRS) and `5ba6a0ba…` (SDD) match the repo copies. |
| `MUZ_SRS.pdf` / `MUZ_SDD.pdf` (2026-11-07) | **OUTDATED.** Pre-rulings. | Older timestamps and different md5. |
| `docs/decisions/RULINGS.md` (D1–D14, M1–M5, U-xx) | **Authoritative** for the rulings it records | Chair-decided 2026-11-16 |
| `docs/audit/PROGRESSION_ARCHITECTURE_DECISION.md` + `CONSOLIDATED_HANDOFF.md` X1–X11 | Approved by the owner 2026-11-21, **not team-ratified** (X8). The server-RPC path (option a) was never started, so **option (c) applies in practice**: D14 stands, offline sync deferred. | No RPC migration exists. PR #46 is unmerged. |
| Member guides A–D | **Plans, not evidence.** Their status columns are stale (dated 11-16 to 11-22). | See §1 |
| Jira | **Stale** (last update 11-16) | JQL `updated >= 2026-11-16` returns 0 issues |

Order of authority used below: **RULINGS + owner-approved decisions > SRS/SDD-Latest > guides > Jira.**

## 1. Guide items reconciled

Status key:
- **IV**: implemented and verified
- **IU**: implemented but unverified
- **PART**: partial
- **MISS**: missing
- **OBS**: obsolete
- **UNCLEAR**: requirements unclear

"Verified" means automated tests plus a code read. Where a live check was made it is named.

### Member A

| Task | Requirement | Files | Status | Evidence | Blockers | Action |
|---|---|---|---|---|---|---|
| T-01 Integration baseline | Process | repo | **PART** | `main` is the single baseline and CI is green on `b32f3e1`. **`main` is unprotected** (API 404). | — | Turn on protection (admin, 2 min) |
| T-02 Rulings | Change control | `docs/decisions/RULINGS.md` | **IV** | Rulings recorded; Latest specs contain the edits | — | Leave |
| T-06 Hearts lost mid-drill persist on quit | SRS 3.1.2.4 | `LessonPlayer.tsx:159` (`quitLesson(run, …, inFlightHeartsLost)`), `PracticeDrillView` `onHeartsSpent` | **IU** | Code and runner tests present | Signed-in live check | Verify |
| T-09 Vision hardening + perf overlay | SRS 3.4 | `PerfOverlay.tsx` + test, `CameraPanel`, `inferenceStats.ts` | **IU** | Tests pass | Camera hardware | Verify |
| T-08 Pitchy wired into the live pipeline (D4) | SRS 3.1.6.2 | `PitchVerifier.ts`, worklet f0 (PR #31) | **IU** | Synthetic-piano tests pass, including octave rejection | Mic + piano | Verify |
| T-19 Hardware benchmark | SRS 3.4 | `docs/test/PERFORMANCE_REPORT.md` | **MISS** | Report is still a scaffold | Hardware, people | Manual; do not block release |
| T-24 Triage + regression | Process | `DEFECT_LOG_AND_TRIAGE.md` | **MISS** | Log not updated since 11-19 | T-19–T-23 | Update log (docs only) |
| AUX-TEST-ACCESS-01 (`is_dev`) | Test access | `devAccess.ts`, migrations 3–4 | **IU** | `is_dev` and `dev_test_results` exist live; `dev_test_results` denied to anon | — | Leave |

### Member B

| Task | Requirement | Files | Status | Evidence | Blockers | Action |
|---|---|---|---|---|---|---|
| T-03 Profile bootstrap cannot wipe progress | SDD C-01, DEF-002 | `lib/auth/profileBootstrap.ts` + test (PR #40) | **IU** | Tests pass | Signed-in check | Verify |
| T-04 Close `features-integration` | Process | — | **OBS** | PR #22 reverted (#26); T-11/T-12 re-implemented on `main` | — | Leave |
| T-11 Achievements | SRS 3.1.7.4, U-04 | `achievements.ts`, `saveLessonResult.ts`, `clientAchievements.ts`, `AchievementToast` (#42/#47/#48) | **IU** with a caveat | Server path writes `user_achievements`. **Caveat:** when the server save fails, badges are still "unlocked" in localStorage (`DashboardScreen.tsx` `evaluateClientSide`). That contradicts X10 ("no fake unlocked badges"). | Signed-in check | Verify; **leave the caveat** unless it misleads in the demo (note in §3) |
| T-12 Analytics with real data | SRS 3.1.7.1–3, M2 | `useAnalyticsData.ts` (real queries), `aggregate.ts` + tests, `ProfileAnalyticsView.tsx` (7d/30d/all) | **IU** | Guest shows correct empty states | Signed-in check with sessions | Verify |
| T-10 Recovery + Google + resend | SRS 3.1.1.1, C-01 | `LoginPage.tsx` (recovery mode, `updatePassword`, `resendVerificationEmail`, Google button), `AuthContext.tsx` | **IU** | Google enabled live (`/auth/v1/settings`) | Supabase redirect-URL config (owner) | Verify |
| T-23 support / T-24 fixes | Process | — | **MISS** | No reports | — | Manual |
| T-25 Production deploy + demo | Release | Vercel | **PART** | `b32f3e1` deployed (GitHub status: success) | Final merge | After freeze |

### Member C

| Task | Requirement | Files | Status | Evidence | Blockers | Action |
|---|---|---|---|---|---|---|
| F2 `profiles` access fix | SRS 3.5.2, DEF-001 | `20261119120000_profiles_rls_hardening.sql` | **IV (live)** | Applied by the owner 2026-11-26. Signed-out request returns 401 / 42501. | — | Signed-in profile load to be confirmed by the smoke test |
| T-05 Staging + CI (Part 1) | Process | `.github/workflows/ci.yml`, `configGuard.ts` (DEF-004) | **IV** | CI `verify` green on `b32f3e1` | — | Leave |
| T-05 Part 2 (staging E1, V1–V10) | Process | — | **OBS** for this release | U-08 ("use the existing project"); X3 never done | — | Leave |
| T-07 PitchVerifier | SRS 3.1.6.2 | `audio/notes/PitchVerifier.ts` | **IV (tests)** | Merged via T-08. Branch `task/T-07-pitch-verifier` is superseded (8 stale commits). | — | Leave; branch can be deleted later |
| **T-13 Offline cache + sync** | **SRS 3.3.2, SDD C-08** | `lib/sync/queue.ts` (**imported nowhere**); PR #46 adds `syncLoop.ts`, `run_id` migration, runner changes | **PART** | Queue unit-tested only. PR #46 open and unreviewed. | Schema change (`run_id`), the save path, 36 h to demo | **Decision needed (Q1)** |
| T-20 RLS verification | SRS 3.5.2 | — | **PART** | Signed-out probe done today (all 7 tables). No authenticated cross-user test. | Two test accounts | Optional manual |
| T-23 E2E checklist | Process | — | **MISS** | No report. Smoke checklist exists in `RESCUE_AUDIT_2026-11-26.md` §F. | People | Manual |
| SEC-01 grants matrix | Hardening | — | **OBS** for this release | RLS returns 0 rows to anon on all other tables | — | Leave |

### Member D

| Task | Requirement | Files | Status | Evidence | Blockers | Action |
|---|---|---|---|---|---|---|
| T-16 Rhythm tests + D13 formula | SRS 3.1.4.3–4 | `lib/rhythm/timing.ts:53-58` (omitted beats contribute 0, capped at 100), tests (#41, #43) | **IV (tests)** | Formula matches D13 | — | Leave |
| T-15 Eight UI fixes | SDD 6.3, U-20 | HUD `profileStatus` (#44); `expReward` label; `lessonNeedsHearts` in both places; `blockingLesson` banner; ViewportGuard `z-[60]` everywhere; rhythm `Score` counter | **IV (code)** | All 8 items confirmed in code | — | Leave |
| T-18 Remove dead code | Hygiene | #45 | **IV** | Merged; build OK | — | Leave |
| **T-14 Onboarding welcome (Piano selected, others disabled)** | KAN-235; supports SRS 3.1.1.2–3 | `OnboardingWelcome.tsx` (absent) | **MISS** | No component. The U-25 decision exists: X11 says "once per account, using placement". | — | **Implement** (small, unambiguous) |
| T-17 Draw flats | — | — | **OBS** (cut, U-36) | — | — | Leave |
| T-21 Media-privacy audit | SRS 3.5.1 | — | **MISS** | No report | DevTools session | Manual (15 min) |
| T-22 Compatibility matrix | Process | — | **MISS** | No report | People | Manual |
| T-26 SRS/SDD v01.02 + test appendix | Docs | — | **PART** | Spec edits from T-02 are in the Latest PDFs. Appendix missing. | Test results | Docs, after testing |

## 2. Consolidated lists

**2.1 Original features still missing or incomplete**
1. Offline progress cache + sync (SRS 3.3.2 / SDD C-08, T-13). **Partial.** This is the only missing *SRS* feature.
2. Onboarding welcome with Piano locked (KAN-235, T-14). **Missing.** Small.

Everything else in SRS 3.1 has an implementation.

**2.2 Complete in code but need live/manual verification**
- Signed-in: sign-up and confirmation, placement, save, EXP, streak, prerequisite gating, hearts (timeout, 3 misses, regeneration, theory restore, quit), analytics, achievements, password recovery, Google.
- Hardware: posture HUD, pitch (±35 c), chords (≥ 0.72), 400 ms latch, camera-deny modal, perf overlay.

**2.3 Contradictions, stale docs, unclear items**
- **Your premise that the SRS/SDD are outdated is not supported.** The "Latest" files are the newest versions and match the repo. The older ones are `MUZ_SRS.pdf` / `MUZ_SDD.pdf`.
- **Member guides' status columns are stale.** They still say "BLOCKED"/"READY" for work that is merged (T-15, T-16, T-11, T-12, T-10, F2). Do not hand a guide to anyone or any AI without §1 of this file.
- **`CONSOLIDATED_HANDOFF.md` §4** plans staging E1, RPCs and the outbox. None of that is in scope now.
- **`DEFECT_LOG_AND_TRIAGE.md`:**
  - **Fixed in code:** DEF-001 through DEF-007 and DEF-009.
  - **Retest:** DEF-008 and DEF-010.
- **X10 vs code:** badges are evaluated in localStorage when the server save fails (§1, T-11).
- **SkillTreeView "current" node** says "0 of 3 units complete", but it is counting lesson *stages*, not units. Misleading label; fix inside the Skill Tree redesign.
- **Guest demo** shows 58/59 mastered and 2,450 EXP, but 0/5 badges and empty analytics. Internally inconsistent.
- **UNCLEAR:** whether the demo should show sample analytics. The SRS says nothing; it is a demo-only choice (Q2).

## 3. Plan (dependency and value order)

| # | Unit | Type | Files (no overlap between units except where noted) | Risk |
|---|---|---|---|---|
| 1 | Commit the rescue changes already made (Lesson Notes, Settings copy, `.temp` untrack) | Housekeeping | — | None |
| 2 | **Skill Tree redesign** (winding path, unit stages, SVG art, a11y) | Requested UI | `SkillTreeView.tsx` (rewrite), new `components/dashboard/skilltree/*`, `index.css` (keyframes only) | Medium: visual only; status logic (`nodeStatus`) untouched |
| 3 | **Demo mode** made discoverable and clearly labelled (design in §4) | Requested UI | `AuthContext.tsx` (`enterDemoMode` roles only), new `DemoBanner.tsx`, `DashboardScreen.tsx` (banner mount) | Low |
| 4 | **Landing page** for signed-out visitors | Requested UI | new `components/landing/LandingPage.tsx`, `App.tsx` | Low |
| 5 | T-14 Onboarding welcome before placement | Original feature | new `OnboardingWelcome.tsx`, `DashboardScreen.tsx` (placement mount only) | Low |
| 6 | Docs: banner on the stale handoff, defect-log statuses | Docs | `docs/**` | None |
| — | T-13 offline sync | Original feature | PR #46 | **High** (Q1) |

**Sequence:** 1 → 2 → 3 → 4 → 5 → 6, on one branch. Units 2, 3 and 5 all touch `DashboardScreen.tsx`, but in separate blocks, so they are done one after another, never in parallel. After each unit: focused tests, `npm test`, `npm run build`, a diff check, and a browser check in guest mode.

## 4. Proposed demo-mode design (safest option)

The existing guest mode is already the safe design:
- It never calls Supabase for data (`useDashboardData`, `useAnalyticsData`).
- It writes nothing (`handleLessonComplete` returns early).
- It holds no keys beyond the public anon key.
- It does not bypass auth: there is no session, so RLS blocks everything.

So no new auth path is needed. Changes:
- On the landing page and the login page, rename "Continue as Guest" to **"Try the demo (nothing is saved)"**. Offer two demo learners: *Beginner* (the existing `beginner` profile) and *Advanced* (the existing `virtuoso` profile).
- A persistent **"DEMO MODE: sample learner, nothing is saved · Exit demo"** banner across the dashboard. Exit uses the existing `signOut` demo branch.
- **Q2 decides whether the demo also gets:**
  - (a) in-session progress, so finishing a lesson unlocks the next one in demo, kept in memory only;
  - (b) labelled sample analytics and badges.

  Without them the demo stays honest but static.

## 5. Risk assessment
- **Biggest risk is regressions from UI work 36 h before the demo.** Mitigations:
  - The Skill Tree redesign keeps `nodeStatus` / `handleSelect` / `onSelect` unchanged; only presentation changes.
  - Every unit is verified in the browser before the next starts.
  - No schema, RLS or secret changes.
- **T-13 merged now** would touch `runner.ts`, `applyResult.ts` and the schema, all on the save path, with no review and no staging. **Recommend: do not merge.**
- **Nothing reaches the live site** until this branch is merged into `main`. A teammate should click through the Vercel preview first.

## 6. Implementation log (2026-11-26, branch `rescue/submission-stabilization`)

| Unit | Result | Evidence |
|---|---|---|
| Checkpoint commit | Done | `5eaa2be` |
| Skill Tree redesign | Done. Winding SVG path, tier sections, unit banners with original SVG art, 3 node states + checkpoint trophy, "Start" bubble, auto-scroll to the next step, `aria-label`/`aria-current`, focus rings. `nodeStatus`/`onSelect` unchanged. | `pathLayout.ts` + 5 tests; browser: 59 nodes, correct current node, tray opens, locked node shakes and names the blocker |
| Demo mode | Done. Reuses guest mode (no DB access, nothing saved); renamed "Try Demo Mode"; amber DEMO MODE banner with **Exit demo** on every dashboard view | Browser: enter from landing and login, exit returns to landing |
| Landing page | Done. `/` for signed-out visitors; `/login` and `/signup` open the auth form; Back to home; signed-in users skip it | Browser: all routes plus browser Back |
| T-14 Onboarding welcome | Done (P1 per U-25/X11: shows until placement is finished; no new DB writes) | Type-check only. **Needs a fresh sign-up to see it.** |
| T-13 Offline sync (PR #46) | Merged locally (`git merge --no-ff`) plus fixes: restored `achievements`, `run_id` written, pre-migration fallback, duplicate replay = success, per-user queue, broken `scripts/syncLoop.ts` removed, **wired into the lesson save path** | 677/677 tests. **Not verified with a real offline save.** The `run_id` migration is **not applied** to the live DB (optional; the app works without it) |
| Full checks | `npm test` 60 files / 677 pass; `npm run build` OK; seed up to date; initial bundle 0.90 MB / 5 MB | — |
