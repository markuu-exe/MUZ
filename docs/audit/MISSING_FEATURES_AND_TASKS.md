# Missing Features and Tasks

This document lists the work that remains, grouped by category. Each item is tagged with its scope class:

| Tag | Meaning |
|---|---|
| **REQ** | Required project scope: the SRS or the SPMP calls for it |
| **TECH** | Technical work needed to complete or correct what exists |
| **REC** | Recommended improvement |
| **OPT** | Optional future enhancement |

Task IDs refer to [TASK_DECOMPOSITION.md](TASK_DECOMPOSITION.md). "Jira today" means the Nov 15 export.

## 1. Required features missing or incomplete

| Feature | SRS / SDD | Scope | Jira today | Gap | Task |
|---|---|---|---|---|---|
| Single-note pitch check with pitchy (±35 cents, clarity ≥ 0.85, octave-exact) | 3.1.6.2, 3.6.2c, 3.7.3, C-06 | REQ | KAN-261…263 To do | pitchy is used only in dead code. Live drills compare pitch class only (any octave passes). | T-07, T-08 |
| Achievement badges: evaluate, award, credit `exp_reward` | 3.1.7.4, SDD 4.2 | REQ | KAN-270 To do | Nothing writes `user_achievements`. The UI badges are hard-coded and their ids do not match the seed. | T-11 |
| Analytics backed by real data (pitch trend, posture stability, rhythm distribution, date range) | 3.1.7.1–3.1.7.3, C-07, 6.3 | REQ | KAN-269 To do | `ProfileAnalyticsView.tsx` is 100 % mock data. `performance_records` is written but never read. | T-12 |
| Offline cache and sync | 3.3.2b, C-08 | REQ | KAN-268 To do | Not started. A save that fails while offline loses the run. | T-13 |
| Third-party OAuth (Google) | 3.1.1.1, 6.3 | REQ | KAN-228 Done | The API exists but no UI calls it, and no provider is configured | T-10 |
| Password recovery completion | SDD C-01 | REQ | KAN-229 Done | There is no new-password step. A reload skips recovery. | T-10 |
| Unverified-email handling (resend) | SDD C-01 | REQ | — | The message is truncated and there is no resend button | T-10 |
| Piano-only instrument step in onboarding | 3.1.1.3, KAN-235 | REQ (per Jira/SDD) | KAN-235 In progress | Piano is implicit and no alternatives are shown as disabled | T-14 |
| Viewport alert below 1024 px on every screen | 3.2.2b | REQ | — | Mounted only after login, and probably hidden under the lesson overlay | T-15 |
| Static-hosting deployment | 3.6.1b, SPMP 3.2 | REQ | KAN-283 To do | No host config, no CI, no production project | T-05, T-25 |

## 2. Necessary technical completion: defects and corrections

| Item | Evidence | Scope | Task |
|---|---|---|---|
| Profile bootstrap can overwrite progress (`exp: 100`, `streak: 1`) after any read error | `AuthContext.tsx:70-118` | TECH, P0 | T-03 |
| Username is overwritten on every load; `InstrumentFocus` allows non-piano values | `AuthContext.tsx:76-96`, `auth.types.ts:6` | TECH | T-03 |
| Async `onAuthStateChange` callback awaits queries (known deadlock pattern); profile fetched 2–3 times per sign-in | `AuthContext.tsx:189-216` | TECH | T-03 |
| Hearts lost mid-drill are refunded on quit | `LessonPlayer.tsx:143-151`, `runner.ts:162` | TECH | T-06 |
| Vision timestamps are clamped after a stream restart, so cues and smoothing lag | `FrameLoop.ts:97`, `posture.worker.ts:89` | TECH | T-09 |
| FrameLoop can have two frames in flight; `createImageBitmap` rejections are unhandled | `FrameLoop.ts:86-92` | TECH | T-09 |
| No inference cap at 30 Hz, and performance is not measurable in the app | `CameraService.ts:12-14`, `HudEngine.getStats()` unused | TECH | T-09 |
| Placeholder values (EXP 1240, hearts 4, streak 7) shown to real users | `DashboardScreen.tsx:77-81` | TECH | T-15 |
| Mastered nodes show the unlock threshold instead of the EXP reward | `SkillTreeView.tsx:199` | TECH | T-15 |
| The 0-heart rule differs between the two dashboard views | `DashboardScreen.tsx:164` vs `SkillTreeView.tsx:117` | TECH | T-15 |
| Prerequisite banner does not name the blocking lesson | `DashboardScreen.tsx:144-162` | TECH | T-15 |
| Rhythm consistency ignores omitted beats (1 hit out of 10 scores 100 %) | `timing.ts:53-54` | TECH | T-16 |
| Flats cannot be drawn or labelled | `notes.ts:7-23`, `GrandStaff.tsx:30-41` | TECH | T-17 |
| About 15 dead files that duplicate live features | see T-18 | TECH | T-18, T-07 |
| Generated files tracked in git; `vite.config.js` shadows `vite.config.ts` | `git ls-files` | TECH | T-01 |
| Missing env vars cause a white screen | `client.ts:6-21` | TECH | T-05 |
| A divergent unmerged gamification branch | `origin/features-integration` | TECH, P0 | T-04 |

## 3. Integration tasks

| Item | Task |
|---|---|
| Push and merge `course-handoff` (two commits are unpushed); make `main` the single baseline | T-01 |
| Reconcile `features-integration`: discard the duplicates, re-implement achievements and analytics on `main` | T-04, T-11, T-12 |
| Agree the `AcousticFrame` extension (`pitchHz`, `clarity`) between C and A | T-07, T-08 |
| Extend `ProgressStore` with achievement methods (B), then add offline queuing behind the same seam (C), in that merge order | T-11, T-13 |
| Integration checkpoints IC-0…IC-4 | [INTEGRATION_AND_COORDINATION_PLAN.md](INTEGRATION_AND_COORDINATION_PLAN.md) |

## 4. Testing and QA gaps

Only unit tests exist today (387, all passing). None of the SPMP §6 test categories beyond unit level has been run.

| Gap | SRS / SPMP | Task |
|---|---|---|
| Performance: MediaPipe 20–30 Hz, ≤ 35 ms; HUD 60 FPS; pitch < 50 ms | SRS 3.4, SPMP 6 | T-09, T-19 |
| Real-piano accuracy for chords and notes (all tuning so far used synthetic audio) | SRS 3.1.6 | T-19 |
| Production-preview runtime check of the MediaPipe loader | KAN-249 | T-19 |
| Live RLS cross-user tests; TLS version | SRS 3.5.2 | T-20 |
| Network capture proving no media is transmitted; CV and pitch keep working offline | SRS 3.5.1, 3.7.4 | T-21 |
| Chrome / Edge / Firefox × integrated and USB hardware; camera and mic denial | SRS 3.7.2, 3.3.1 | T-22 |
| End-to-end functional checklist across all flows | SPMP 3.2, 6 | T-23 |
| Defect log (SPMP §10 fields) and regression rerun | SPMP 6, 10 | T-22, T-24 |
| No tests yet for: `nodeStatus`, `classifyDelta` boundaries, the consistency formula, the 80 % heart restore, `AudioInputService` / `CameraService` error mapping, the worker | — | T-15, T-16 (the rest are REC) |

## 5. Security requirements

| Item | Status | Task |
|---|---|---|
| RLS on all tables, owner-only access | Present in the migration; not yet tested live | T-20 |
| Client can PATCH its own `exp`, `hearts` and completion (client-trusted gamification) | Accepted risk, pending ruling D14 | T-02; T-28 deferred |
| No secrets in the bundle or git history | Verified statically: only publishable keys | T-01 (delete `Lag-in`) |
| TLS 1.3 | Cannot be verified statically | T-20 |
| No transmission of raw media | Static evidence only | T-21 |

## 6. Performance requirements

| Item | Status | Task |
|---|---|---|
| Initial bundle ≤ 5 MB | Met: 0.87 MB in this audit's build | T-05 (CI gate) |
| 10 MB cap on WASM + model | Ambiguous; 18.8 MB combined | T-02 D3 |
| 2048 vs 4096 audio window | The SRS contradicts itself | T-02 D1 |
| Inference rate, HUD FPS, latency | Unmeasured; no instrumentation | T-09, T-19 |

## 7. Reliability and offline requirements

| Item | Status | Task |
|---|---|---|
| Lessons keep running when the network drops | Likely, since all processing is local. Not tested. | T-21 |
| Progress is cached and synced | Not implemented | T-13 |
| Camera and mic denial handled gracefully | Implemented; not tested on hardware | T-22 |
| A failed save is reported to the user | `saveLessonResult` throws, but the result is lost | T-13 |

## 8. Deployment and release requirements

| Item | Task |
|---|---|
| Supabase staging project: migrations, seed, Auth URLs, Google provider | T-05, T-10 |
| Host config with SPA fallback; environment variables set on the host | T-05 |
| CI running test, typecheck, build, seed check and size gate | T-05 |
| Production project, tag `v1.0.0`, smoke test, demo script and backup video | T-25 |
| SRS/SDD v01.02, test appendix, matching traceability | T-26 |

## 9. Recommended improvements and optional enhancements (not scheduled)

| Item | Class | Task |
|---|---|---|
| Contrast and readability pass (12 px minimum, AA contrast, one palette) | REC | T-27 |
| Server-authoritative save through an RPC; restrict profile updates by column | REC | T-28 |
| Posture calibration UI | OPT | T-29 |
| Heart-regen anchor stored on the server | OPT | T-30 |
| Playwright end-to-end automation | OPT | (after T-23, if time allows) |
| Learner-adjustable BPM, piano-roll view, tap-latency calibration, a router | OPT | Not proposed; outside SRS scope |
| Move the 38 MB of WASM out of git (copy at build time, or LFS) | OPT | — |
