# Jira ↔ Codebase Reconciliation

This document compares the Jira export `JIRA tasks as of Nov 15.csv` (66 issues) against the code on branch `course-handoff` @ `59448bd`. It also covers the unmerged branch `origin/features-integration` @ `dec609e`.

Rule applied throughout: **Jira status is never treated as evidence that work is implemented.**

## 1. How each issue was checked

| Method | Used? | Notes |
|---|---|---|
| Static code inspection | Yes, every issue | Six read-only investigators, plus the coordinator's own spot-checks of the most important claims (marked ✔ below) |
| Automated tests | Yes | `npx vitest run`: **27 files, 387 tests, all pass**. `tsc -p tsconfig.json`: clean. `vite build`: passes. `seed:lessons:check`: up to date. Unit tests only; no integration or end-to-end tests exist. |
| Runtime behaviour | **No** | No browser session, no live Supabase project and no camera/microphone were used |
| Manual validation | **No** | None performed |

**State codes.** Each issue gets one of the following. "Implemented and verified" here means **verified at unit-test level only**.

| Code | Meaning |
|---|---|
| **1** | Implemented and verified (unit tests) |
| **2** | Implemented but not verified |
| **3** | Partially implemented |
| **4** | Not implemented |
| **5** | Implemented but broken or regressed |
| **6** | Cannot be verified statically |

## 2. Data completeness of the Jira export

The export has 14 columns. Most of the planning detail a reconciliation needs is absent:

| Field | Present? | Effect on this audit |
|---|---|---|
| Descriptions | **No** | Each ticket was judged from its summary line plus the SRS/SDD |
| Acceptance criteria | **No** | Taken from the SRS/SDD; new criteria are proposed in [JIRA_BOARD_IMPROVEMENT_PROPOSAL.md](JIRA_BOARD_IMPROVEMENT_PROPOSAL.md) |
| Parent / epic links | **No** (no Parent or Epic Link column) | Subtask → task → epic structure was **inferred** from key order and creation time, e.g. KAN-229/230 → KAN-228 → KAN-9 |
| Dependencies / issue links | **No** | Built from the code and SPMP 4.2.1 instead |
| Comments | **No** | — |
| Sprints, story points, labels, components | **No** | — |
| Assignees | Yes; 5 issues unassigned | KAN-5, 6, 7, 8 and KAN-283 |
| Statuses | Yes: 33 Done, 25 To do, 8 In progress | — |
| Priorities | Yes, but **all 66 are "Medium"** | Priority carries no information |
| Due dates | Yes, with anomalies | 15 issues are due **before** they were created (e.g. KAN-231 created 16 Oct, due 30 Sep). 15 open issues are overdue against 16 Nov. |
| Key gaps | — | KAN-1…4 and KAN-15…227 are absent. They were probably deleted or are in another project; this cannot be determined. |

**Account mapping**, confirmed by the user on 2026-11-16:

| Jira account | Person | Member |
|---|---|---|
| Mark Lawrence | Amatong | A |
| dev_account | Barnaija | B |
| ashwwyr | Rosales | C |
| Neve | Bernante | D |

`dev_account` is the reporter of every task, so the reporter field cannot be used to infer authorship.

**Git authorship** gives evidence that Jira lacks. Who actually built each area:

| Area | Built by (git) | Jira assignee |
|---|---|---|
| Vision (KAN-247…258) | A (markuu-exe) | A ✔ |
| Chord audio and wait-state (KAN-260…267) | A | A ✔ |
| Lesson player, curriculum, progress, placement (COURSE-1…6) | A | *untracked* |
| Rhythm timing hooks, GrandStaff, PianoKeyboard, theory test pages | C (ashwwyr) | C ✔ |
| Single-note pitch (KAN-261…264) | *nobody* (only a dead prototype by A, Oct 10) | C |
| Auth stack, LoginPage, ProfileAnalytics mock, `features-integration` gamification | B (Confusion 996) | KAN-228/229/230 are assigned to dev_account (B) ✔ |
| Initial dashboard and skill tree (Nov 2) | D (Bins) | D (KAN-232, 236–238) ✔ |
| Schema migration | "LAB64_USER ON WS25" (lab PC; person unknown) | — |

## 3. Issue-by-issue reconciliation

### Epics

| Key | Jira status | Actual | Recommended status | Note |
|---|---|---|---|---|
| KAN-5 Project Documentation | Done | 2 | Reopen, or add child NEW-08 | SRS/SDD now conflict with the code ([PROJECT_REQUIREMENTS_AUDIT.md](PROJECT_REQUIREMENTS_AUDIT.md) §5); v01.02 needed (T-26) |
| KAN-9 Core User Mgmt & Navigation | To do | 3 | **In progress** | Most UI exists; OAuth and recovery are broken or missing |
| KAN-10 Learning & Practice Module | Done | 3 | **In progress** | Flats bug, consistency formula, KAN-246 "adjustable BPM" not in live app |
| KAN-11 Edge Processing & CV | Done | 2 / 6 | **In progress** until T-19 evidence | Model could not load until Nov 15; performance never measured |
| KAN-12 Audio Verification & Gamification | To do | 3 | **In progress** | Chord path done; gamification ~75 % done; pitchy, achievements, analytics, offline missing |
| KAN-13 System Integration & QA | To do | 4 | To do (correct) | Only unit tests exist |
| KAN-14 Deployment | To do | 4 | To do (correct) | No deploy config |

### KAN-9: Core User Management & Navigation

| Key | Summary (short) | Jira | Actual | Codebase evidence | Recommended | Remaining work |
|---|---|---|---|---|---|---|
| KAN-228 | Supabase Authentication | Done | **3** | Email auth works (`AuthContext.tsx:225-300`). `signInWithOAuth` is defined but never called ✔. | **Reopen → In progress** | T-10 |
| KAN-230 | Auth SDK hooks, persistent session | Done | 2 | `client.ts:15-21` persistSession / autoRefresh. Risk: async `onAuthStateChange` callback (`AuthContext.tsx:189-216`). | Keep Done; risk fixed in T-03 | T-03 |
| KAN-229 | Signup, Login, Password Reset UI | Done | **5** | Reset has no new-password form; `updatePassword` is never called ✔; a reload skips recovery | **Reopen → In progress** | T-10 |
| KAN-231 | Onboarding flow & piano profile init | In progress | 3 | Trigger creates the profile; placement modal exists; no welcome / instrument step | In progress (correct) | T-14 |
| KAN-235 | Onboarding screens: instrument + self-assessment | In progress | 3 | Self-assessment done (3 tiers, `PlacementModal.tsx`); no instrument card | In progress | T-14 |
| KAN-234 | Permission prompt UI (webcam / mic) | In progress | **2** | Pre-prompt + `MediaDiagnostics.tsx` with retry, used in `PostureHoldView` and `PracticeDrillView` | **Done**, once T-22 confirms on hardware | T-22 |
| KAN-233 | DB mutations to init profile | In progress | **5** | Client fallback upsert overwrites progress on any read error ✔ (`AuthContext.tsx:70-118`) | In progress; **reassign to B** | T-03 |
| KAN-232 | Main dashboard & skill tree navigation | In progress | 2 | `DashboardScreen.tsx`; the Profile view is mock data (tracked under KAN-269) | **Done** after T-15 | T-15 |
| KAN-238 | Layout shell, nav, header, streak/hearts | In progress | 2 | `DashboardScreen.tsx:192-320`; placeholder values when the profile is null | **Done** after T-15 item 1 | T-15 |
| KAN-237 | Node-based skill tree | In progress | 2 | `SkillTreeView.tsx:104-240`; wrong XP label at :199 | **Done** after T-15 item 2 | T-15 |
| KAN-236 | Client lock/unlock logic | In progress | 2 | `curriculum.ts:122-145`; no tests; inconsistent 0-heart rule | **Done** after T-15 items 3–4 + tests | T-15 |

### KAN-10: Learning & Practice Module

| Key | Summary (short) | Jira | Actual | Codebase evidence | Recommended | Remaining work |
|---|---|---|---|---|---|---|
| KAN-240 | Interactive theory lesson modules | Done | 3 | Live player `components/lesson/theory/*`, 59 lessons. The SDD's audio samples are replaced by synth; flats cannot be drawn. | Keep Done; open bug NEW-06 | T-17, T-02 D7 |
| KAN-243 | Grand Staff / piano-roll notation | Done | 3 | `GrandStaff.tsx` is live (author C). No piano roll; no flats. | Keep Done; NEW-06 links here | T-17 |
| KAN-242 | Theory quiz mechanics | Done | **1** | Five exercise types; graders tested in `runner.test.ts`. The original `lib/theory/quiz.ts` is **dead**. | Done (correct) | T-18 removes the dead copy |
| KAN-241 | Instant correct/incorrect feedback | Done | 2 | `OptionGrid.tsx`, `LessonPlayer.tsx:260-289` | Done (correct) | — |
| KAN-239 | Rhythm engine & timing validation | Done | 3 | Live: `useRhythmSession`, `plan.ts` (tested). `summarize` consistency ignores omitted beats. | Keep Done; fix in T-16 | T-16 |
| KAN-246 | Web Audio metronome, adjustable BPM / measures | Done | 3 | Live clicks on the Web Audio clock. BPM is **not** learner-adjustable in the live app; only the dead `MetronomeTest` page has a slider. | Edit the summary to match the SRS (adjustable BPM is not an SRS requirement), or reopen | T-02 |
| KAN-245 | Keyboard listener, high-precision timestamps | Done | 2 | `useSpacebarTap.ts:19-31` (author C); no tests | Done; tests in T-16 | T-16 |
| KAN-244 | Timing windows (Perfect, Great, Late, Early, Miss) | Done | 2 | Code implements the **SRS** Perfect / Good / Miss at 25 / 50 ms (`timing.ts:4-18`). "Great" does not exist; Early/Late is only label text. | **Retitle** to "Perfect / Good / Miss (SRS 3.1.4.3)" | T-16 |

### KAN-11: Edge Processing & Computer Vision

All tickets are assigned to A and all are Done.

**Caveat for every ticket in this epic.** End to end, the feature could not work before **Nov 15**: the WASM binaries were added in `1d65680`, and the module-worker loader was fixed in `bcff618`. The tickets were closed on Nov 14. The `bcff618` commit message says the production-preview runtime check is still pending.

| Key | Summary (short) | Actual | Evidence | Recommended |
|---|---|---|---|---|
| KAN-249 | Webcam + MediaPipe WASM | 2 / 6 | `CameraService.ts`, `posture.worker.ts:57`; `public/models/wasm/*` | Keep Done, **conditional on T-19's prod-preview check** |
| KAN-252 | getUserMedia capture | 2 | `CameraService.ts:54-61,140-166,178,263-272` | Done |
| KAN-251 | Async loading of WASM + model | 3 | Lazy load inside the worker on "Turn on camera". No route-level split. 18.8 MB vs the 10 MB cap (ruling D3). | Done once D3 is ruled |
| KAN-250 | Webcam error UI | 2 | `VisionError.ts` (9 codes), `MediaDiagnostics.tsx` | Done |
| KAN-248 | 3D joint-angle calculations | 1 | `metrics.ts`, `vec3.ts`; `metrics.test.ts`, `vec3.test.ts` | Done |
| KAN-255 | Extract 3D landmark coordinates | 1 | `landmarks.ts:93-110,214-274`; tested | Done |
| KAN-254 | Vector math functions | 1 | `vec3.ts:134-162`; tested | Done |
| KAN-253 | Threshold rules (slouch, wrist, arm) | 1 | `rules.ts:78-88`; `rules.test.ts`. Slouch is advisory; calibration is unreachable. | Done; calibration deferred (T-29) |
| KAN-247 | Real-time posture HUD canvas | 2 / 6 | `HudEngine.ts`, `PostureHud.tsx`; reachable via `posture-hold` | Done, pending T-19 |
| KAN-258 | 60 FPS overlay | 6 | Canvas2D rAF; `budget.test.ts` measures JS cost only | **In review** until T-19 measures FPS |
| KAN-257 | Green/red skeleton | 1 | `palette.ts:25-30`, `skeleton.ts:91-110`; `skeleton.test.ts` | Done |
| KAN-256 | Posture correction prompts | 1 | `cues.ts`, `PromptLayer.ts`; `cues.test.ts` | Done |

Open defects found during the audit, to be tracked under NEW-05 / T-09: timestamp clamping after a stream restart (`FrameLoop.ts:97`, `posture.worker.ts:89`), the FrameLoop in-flight race (`FrameLoop.ts:86-92`), and no ≤ 30 Hz cap.

### KAN-12: Audio Verification & Gamification

| Key | Summary (short) | Jira | Actual | Codebase evidence | Recommended | Remaining work |
|---|---|---|---|---|---|---|
| KAN-261 | Web Audio + Pitchy single-note verification | To do | **3** | Single-note drills **ship**, graded by chroma pitch class (`NoteMatcher.ts`, `NoteVerifier.ts`, by A, untracked). pitchy is used only in dead `useAudioAnalysis.ts` ✔. No cents or clarity check; octave ignored. | **In progress**; owner C for T-07, A for T-08 | T-07, T-08 |
| KAN-264 | AudioContext + AnalyserNode mic stream | To do | **2** (differently) | Mic stream and AudioContext done in `AudioInputService.ts`, but through an AudioWorklet, not an AnalyserNode | **Done** once ruling D2 accepts the worklet | T-02 |
| KAN-263 | Pitchy extraction (< 50 ms) | To do | 4 | Dead prototype only | To do → In progress with T-07 | T-07 |
| KAN-262 | Hz → note-name matching | To do | 3 | `freqToMidi`, `PITCH_CLASS_NAMES` (`dsp/pitch.ts`); no Hz → "C4" function | In progress with T-07 | T-07 |
| KAN-260 | Polyphonic chord verification (chromagram) | Done | **1** | `ChromaFrameProcessor`, `ChordMatcher`, `ChordVerifier`; `dsp`, `chords` and `scenarios` tests (synthetic audio only) | Done; add a real-piano validation subtask | T-19 |
| KAN-265 | 12-bin chromagram pipeline | Done | 1 | `ChromaFrameProcessor.ts:256-312` | Done | — |
| KAN-266 | Chord recognition matching | Done | 1 | `ChordMatcher.ts`; 84-chord vocabulary; `chords.test.ts` | Done | — |
| KAN-267 | Wait-state holds until correct chord | Done | **5** (one bug) | `WaitStateMachine.ts`, dual posture + audio latch, tested. **Bug:** hearts lost mid-drill are refunded on quit ✔ (`LessonPlayer.tsx:143-151`). | Keep Done; open bug NEW-04 | T-06 |
| KAN-259 | Gamification mechanics & analytics dashboard | To do | **3** | See KAN-270 / 269 | **In progress** | T-04, T-11, T-12 |
| KAN-270 | EXP, streak, heart depletion, badges | To do | **3** (≈ 75 %) | EXP, streak, hearts, regen, theory restore and gate are **implemented and tested** under COURSE-6 by A (`lib/progress/*`; `applyResult`, `streak`, `heartRegen`, `gate` tests). **Badges: not implemented** on `course-handoff`. | **In progress**. Split: close the EXP / streak / hearts part as Done after T-06; new child for badges = T-11. | T-11 |
| KAN-269 | Profile analytics dashboard with charts | To do | 3 (UI shell only) | `ProfileAnalyticsView.tsx` is entirely hard-coded; `performance_records` is written but never read | **In progress** | T-12 |
| KAN-268 | Local caching + background sync | To do | 4 | `idb` is never imported; no queue | To do (correct); owner C | T-13 |

### KAN-13: System Integration & QA

All of these are To do, and To do is correct for all of them except KAN-278. Nothing exists beyond unit tests.

| Key | Summary (short) | Actual | Recommended | Task |
|---|---|---|---|---|
| KAN-271 | Functional, integration & security testing | 4 | To do | T-23, T-20 |
| KAN-272 | Usability, performance, browser/hardware | 4 | To do | T-19, T-22 |
| KAN-273 | Bug fixes & regression | 4 | To do | T-24 |
| KAN-274 | E2E integration tests | 4 | To do | T-23 |
| KAN-275 | RLS unauthorised-access tests | 4 (policies exist; not tested live) | To do | T-20 |
| KAN-276 | No raw media transmitted | 2 (static evidence only) | To do; needs the HAR audit | T-21 |
| KAN-277 | Benchmark MediaPipe Hz, HUD FPS, pitch latency | 4 (no instrumentation) | To do | T-09, T-19 |
| KAN-278 | Bundle < 5 MB | **1** (this audit's build: 0.87 MB initial) | **Done** once T-05 adds the CI size gate | T-05 |
| KAN-279 | Chrome / Edge / Firefox compatibility | 4 | To do | T-22 |
| KAN-280 | Defect log with priorities | 4 | To do | T-22 |
| KAN-281 | Resolve edge-case bugs | 4 | To do; seed it with the defects in §5 | T-24 |
| KAN-282 | Regression suite | 3 (387 unit tests exist) | To do | T-24 |

### KAN-14: Deployment

| Key | Summary (short) | Actual | Recommended | Task |
|---|---|---|---|---|
| KAN-283 | Production build, deployment & presentation | 4 (the build passes; nothing is deployed) | To do; **assign B** | T-05, T-25 |

### KAN-5: Documentation

| Key | Summary (short) | Actual | Recommended |
|---|---|---|---|
| KAN-6 | SRS | Done; now inconsistent | Keep Done; v01.02 under NEW-08 |
| KAN-7 | SDD | Done; now inconsistent | Keep Done; v01.02 under NEW-08 |
| KAN-8 | SPMP | Done | Keep Done |

## 4. Unmerged branch `origin/features-integration` (B, `dec609e`, Nov 15)

This branch is invisible in Jira and is not on `course-handoff`. It adds about 3,000 lines across 11 files.

| Piece | What it is | Verdict |
|---|---|---|
| `LessonSessionModal.tsx` (835 lines) | A **simulated** lesson runner: "Simulate Wrong Attempt" and "Simulate 15s Timeout" buttons, hard-coded metrics | **Discard.** The live `LessonPlayer` + `runner.ts` uses the real engines. |
| `lib/gamification/engine.ts` (818 lines) | EXP with replay pay and bonuses; streak; hearts; regen; 8 achievements (5 match the DB seed) | **Re-implement only the achievement catalogue and evaluator** (T-11). EXP replay and bonus rules conflict with SRS 3.1.2.3 and `applyResult`. |
| `useGamification.ts` (547 lines) | Writes absolute exp / hearts / streak; marks lessons completed **without** the accuracy gate; swallows errors; uses a localStorage snapshot that can override the server; ships demo defaults (exp 1240) to real users | **Discard** |
| `gamification.test.ts` (14 tests) | Achievement tests are useful | Port and adapt in T-11 |
| `ProfileAnalyticsView.tsx` changes | chart.js `Line` layout, but **still hard-coded datasets** | Reuse the layout only (T-12) |
| `useHeartRegen` / `useDashboardData` / `database.types.ts` | Weaker than the `course-handoff` versions: absolute-value writes, dead `profile_id` fallback, loosened types | **Discard** |

`git merge-tree` reports 4 conflicting files: `DashboardScreen.tsx`, `useDashboardData.ts`, `useHeartRegen.ts`, `database.types.ts`. **Do not merge the branch.** T-04 confirms the salvage list with B.

Other remote branches with commits not on `course-handoff`:
- `dashboard` (3 commits; would regress the dashboard) → delete.
- `Lag-in` (net zero change, but its tree still tracks `.env.local`) → delete.
- `login-bins` (an older auth UI, superseded) → delete.

Nothing on them is needed (T-01). All other branches are fully merged.

## 5. Discrepancy summary

### Marked Done but not complete or broken (FINAL Q3)

| Key | Actual state | Why |
|---|---|---|
| **KAN-229** | 5: broken | Password reset cannot be completed |
| **KAN-228** | 3: partial | No OAuth UI, although SRS 3.1.1.1 requires it |
| **KAN-246** | 3: partial against its own summary | BPM is not adjustable in the live app |
| **KAN-244** | Implements a different spec | Ticket says Perfect / Great / Late / Early / Miss; code (correctly) implements the SRS Perfect / Good / Miss |
| **KAN-267** | 5: one bug | Hearts refunded on quit |
| **KAN-240 / 243** | 3: partial | No flats; synth instead of the SDD's audio samples; no piano roll |
| **KAN-258** (and the KAN-11 epic) | 6: unverified | 60 FPS / 20–30 Hz never measured. The whole epic was non-functional end to end until Nov 15, after the tickets were closed. |
| **KAN-10 epic** | 3: partial | Contains the partial items above |

### To do or In progress but already implemented (FINAL Q4)

| Key | Jira | Actual | Implemented by |
|---|---|---|---|
| **KAN-270** (EXP, streak, hearts, regen) | To do | ~75 % implemented and unit-tested | A, COURSE-6, untracked |
| **KAN-264** (AudioContext + mic stream) | To do | Implemented through an AudioWorklet | A, KAN-265 work |
| **KAN-261** (single-note drills) | To do | Drills work and ship, but not by the method the SRS requires (pitchy) | A, COURSE-5 |
| **KAN-262** | To do | Partial helpers exist | — |
| **KAN-234, 232, 236, 237, 238** | In progress | Implemented; only small defects remain (T-15) | — |
| **KAN-278** | To do | Already passes (0.87 MB) | — |
| **KAN-9, 12 epics** | To do | In progress in reality | — |

### Implemented but never tracked (J4)

Built by A, Nov 14–16, with no ticket:

| Item | Code |
|---|---|
| COURSE-1 | Curriculum v2: 12 units, 59 lessons, tiers |
| COURSE-2 | Seed generator + check mode |
| COURSE-3 | Lesson runner and player |
| COURSE-4 | Rhythm game (tap-along / echo / read) |
| COURSE-5 | Practice drills, PracticeRig, NoteVerifier, posture hold |
| COURSE-6 | Progress saving, hearts persistence, regen, placement, streak, mastery gate |
| Vision extras | One-Euro filter, hysteresis |
| Lessons view | Lessons catalogue view |
| Guest mode | Guest / demo mode |
| Placement | Third placement tier |

Proposed tracking is in [JIRA_BOARD_IMPROVEMENT_PROPOSAL.md](JIRA_BOARD_IMPROVEMENT_PROPOSAL.md) §4 (NEW-09 … NEW-14).
