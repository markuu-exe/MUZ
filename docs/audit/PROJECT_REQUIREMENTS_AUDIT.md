# MUZ Project Requirements Audit

| | |
|---|---|
| **Audit date** | 2026-11-16 |
| **Phase** | Audit and planning only. No source code, Jira or git state was changed. |
| **Baseline** | Local branch `course-handoff` @ `59448bd`. That is 2 commits ahead of `origin/course-handoff` and 117 commits ahead of local `main`. `origin/main` is @ `11bf8ef`. |
| **Inputs** | MUZ SRS v01.01, SDD v01.00, SPMP v01.00 (PDF), `JIRA tasks as of Nov 15.csv`, the full source tree, the gitignored handoff notes in `TASKS/` (COURSE-1…6, KAN-247/248/249/260), git history across all 31 local and remote branches |

## 1. Executive summary

The **core learning experience is largely built and mostly unit-tested.** It covers the theory lessons, rhythm game, posture HUD, chord verification, dual-criteria wait-state, hearts, streak, EXP, mastery gating and placement.

- About 60 % of it was built in the last three days, under untracked "COURSE-1…6" work by Member A.
- 387 unit tests pass, the TypeScript compile is clean, and the production build is 0.87 MB.

**What is not done:**

| Area | Status |
|---|---|
| SRS 3.1.6.2: pitchy-based single-note verification | Not implemented; drills grade by pitch class only |
| SRS 3.1.7: analytics | 100 % mock data |
| Achievements | Not implemented |
| SRS 3.3.2: offline sync | Not implemented |
| OAuth and password recovery | Not finished |
| Deployment | Not started |
| Testing beyond unit tests | None performed (SPMP §6) |
| Performance figures in SRS 3.4 | Never measured |

**Three defects need attention before anything else:**

1. **Data loss risk, P0.** A transient profile-read error at sign-in overwrites the learner's EXP, streak and hearts (`AuthContext.tsx:70-118`).
2. **Password reset cannot be completed.** KAN-229 is marked Done.
3. **Hearts lost mid-drill are refunded on quit** (`LessonPlayer.tsx:143-151`).

**Jira is not a reliable picture of the project.**
- 8 Done items are incomplete, broken or unverified.
- About 10 To-do or In-progress items are already largely implemented.
- The largest body of recent work has no tickets.
- The export has no descriptions, acceptance criteria, links or priorities: all 66 issues are "Medium".

**An unmerged 3,000-line gamification branch** by Member B, `origin/features-integration`, duplicates and conflicts with the merged progress module. It must be reconciled, not merged (T-04).

The remaining work is decomposed into **26 scheduled tasks** (T-01…T-26) plus 4 optional or deferred ones. They run over **about 15 working days in 4 parallel streams**. The critical path runs through analytics (B) and the testing/deploy tail. See [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md).

## 2. Methodology

Superpowers workflows applied:

| Workflow | How it was applied |
|---|---|
| `using-superpowers` | Skill check before acting |
| `dispatching-parallel-agents` | Six bounded, read-only investigators: frontend/auth; learning/practice; audio/wait-state; vision/HUD; data/security/deploy; unmerged gamification branch. Each was given its SRS/SDD sections, its Jira keys, its files and "no modifications" rules. |
| `systematic-debugging` | Root-cause tracing for three defects, each confirmed independently by the coordinator: profile wipe, heart refund, password recovery |
| `writing-plans` | Task decomposition with exact files, contracts and acceptance criteria |
| `verification-before-completion` | Every "verified" claim is tied to a command run in this audit, or to a file:line read |

`brainstorming` was **not** used. No design question needed open exploration; the open questions are requirement conflicts, which need a team ruling (T-02), not invention.

Commands run by the coordinator:

| Command | Result |
|---|---|
| `npx vitest run` | 27 files, **387 passed**, 0 failed |
| `npx tsc -p tsconfig.json` | exit 0 |
| `npx vite build --outDir <scratchpad>` | success, as detailed below |
| `npx tsx scripts/generate-lesson-seed.ts --check` | "seed.sql is up to date (59 lessons)" |

Build output in detail:

| Asset | Size |
|---|---|
| `index-*.js` | 814.5 kB (244.9 kB gzip) |
| CSS | 59.2 kB |
| `vision_bundle` | 144 kB, imported only by the worker |
| `posture.worker` | 20 kB |
| `chroma.worklet` | 9 kB |
| `dist/` total | 44 MB, including three 12–13 MB WASM variants and the 5.8 MB model |

The build was written to the scratchpad so the repo's tracked `tsconfig.tsbuildinfo` was not touched. `git status` was clean after every command.

**Verification limits.** No browser, camera, microphone, piano or live Supabase project was used. Anything marked "runtime", "FPS", "Hz", "latency", "RLS live" or "TLS" is **unverified**.

## 3. Source authority and how conflicts were treated

The hierarchy given in the brief was used:

| Source | Authority for |
|---|---|
| SRS | Intended behaviour |
| SDD | Design |
| SPMP | Team and process |
| Code | What exists |
| Jira | What was recorded |

Conflicts are **listed, not silently resolved** (§5). Each has a recommended ruling for T-02.

## 4. State of the system by subsystem

| Subsystem | State | Key evidence | Main gaps |
|---|---|---|---|
| Auth & onboarding (C-01) | Mostly built | `AuthContext.tsx`, `LoginPage.tsx`, DB trigger `handle_new_user`, `PlacementModal.tsx` | No OAuth UI; broken recovery; profile-wipe bug; no piano-only welcome step |
| Skill tree & progression (C-02) | Built and tested | `curriculum.ts`, `lib/progress/*` (gate, streak, heartRegen, applyResult: 6 test files) | Placeholder values; inconsistent 0-heart rule; no `nodeStatus` tests; client-trusted writes |
| Theory (C-03) | Built | `components/lesson/theory/*`, 59 lessons in `src/content` | Flats cannot be drawn; synth instead of samples |
| Rhythm (C-04) | Built | `useRhythmSession`, `plan.ts` (tested), `timing.ts` | Consistency formula ignores misses; no boundary tests |
| Posture vision (C-05) | Built, unit-tested, not measured | `src/vision/**` (7 HUD + 4 posture test files), worker | Timestamp-clamp defect; no rate cap; FPS/Hz unmeasured; runtime confirmed only since Nov 15 |
| Audio & wait-state (C-06) | Chord path built and tested; single-note by pitchy **missing** | `src/audio/**` (5 test files), `WaitStateMachine` | pitchy; heart refund; tuned on synthetic audio only |
| Analytics (C-07) | UI mock only | `ProfileAnalyticsView.tsx` hard-coded | Everything data-related; achievements |
| Sync / offline (C-08) | Not started | `idb` never imported | Everything |
| Backend / security | Schema + RLS present | Migration: RLS on all 6 tables, owner-only policies | Not tested live; users can PATCH their own EXP/hearts |
| Deployment | Not started | No host config, no CI | Everything |

Dead code found:
- **Theory/rhythm test pages:** `components/theory/{Quiz,LessonModule,NotationTest,QuizTest}`, `LessonTest` (no extension), `components/rhythm/*`.
- **Hooks:** `useMetronome`, `useQuiz`, `useChordDrill`, `usePostureWorker`, `useAudioAnalysis`.
- **Libraries:** `lib/theory/{quiz,lesson}`, `lib/audio/noteFrequencies`.
- **Components:** `common/SkillTree`.

## 5. Conflicts between sources and recommended rulings (input to T-02)

| ID | Conflict | Sources | Recommended ruling | Doc edit? |
|---|---|---|---|---|
| D1 | Audio window: "between 2048 and 4096" (3.1.6.1) vs "maximum 2048" (3.4); code uses 4096 | SRS vs SRS; code | Keep 4096 (chord resolution needs it). Edit SRS 3.4 to "4096-sample window, 512-sample hop". | SRS |
| D2 | SDD 4.2 requires `AnalyserNode.getFloatFrequencyData`; code uses an AudioWorklet with its own FFT | SDD vs code | Accept the worklet (more precise timing, no raw-buffer polling). Edit SDD 4.2 / C-06. | SDD |
| D3 | "pose_landmarker_lite model weight asset (maximum 10 MB)": does the cap include the 13 MB WASM? | SRS ambiguous; measured 18.8 MB combined | Read the cap as applying to the model asset (5.8 MB): the sentence attaches it to the model. Clarify the SRS wording. | SRS |
| D4 | SRS 3.1.6.2 requires pitchy, ±35 cents, clarity ≥ 0.85; code grades notes by chroma pitch class (any octave) | SRS vs code | Keep the SRS. Implement pitchy (T-07/T-08), keeping chroma as a fallback during T-19. | No |
| D5 | Drill timeout 15 s (3.1.2.4, C-06) vs tier overrides of 12 s (`tiers.ts:62`) and 10 s (`proficient.ts:318`) | SRS vs code | Either set all tiers to 15 s, or amend the SRS to "15 s default, tier-adjustable". **Recommend 15 s everywhere**; it is the lower-risk change. | No (if 15 s) |
| D6 | KAN-244 says Perfect / Great / Late / Early / Miss; SRS and code say Perfect / Good / Miss | Jira vs SRS | SRS wins; retitle KAN-244 | No |
| D7 | SDD C-03 `audioSampleUrl` / `notationUrl` / `diagramUrl` payloads vs synthesised previews and SVG notation | SDD vs code | Accept synth + SVG (zero hosting cost, SRS 3.6.1). Edit SDD C-03. | SDD |
| D8 | SDD C-01 has Beginner → Module 1, Intermediate → Module 2; code has 3 tiers → units 1/5/9 | SDD vs code | Accept 3 tiers; edit SDD C-01 | SDD |
| D9 | Streak "based on lesson completion timestamps" (3.1.2.2) vs code counting any finished, non-quit run (including failed ones) | SRS vs code | Accept (it rewards practice). Edit the SRS wording to "lesson activity". | SRS |
| D10 | +1 heart on ≥ 80 % theory: replays can farm hearts | SRS silent | Allow (the SRS permits it; low impact). Document it. | No |
| D11 | "Third-party OAuth providers" names no provider | SRS vague; SDD 6.3 shows Google | Google only | No |
| D12 | HUD uses a 2° recovery hysteresis, so red persists to 82° | SRS 3.1.5.4 strict band | Accept (prevents flicker); scoring uses the strict band (`inBandStrict`). Note it in the SDD. | SDD |
| D13 | "Aggregated rhythm consistency score" undefined; code ignores omitted beats | SRS vague | `100 × Σ max(0, 1 − abs(Δ)/50) / targetCount` (T-16) | SDD C-04 |
| D14 | SRS 3.5.2 (owner-only RLS) is met, but the client can PATCH its own `exp` / `hearts` / completion | Security posture | Accept as a known risk for the capstone and document it. RPC deferred (T-28). | SDD 3.3 |
| — | SRS 3.4 "route-level code splitting": the app has no router; MediaPipe is split at the worker | SRS vs code | Accept; the intent (lazy load) is met. Edit the SRS wording. | SRS |
| — | SDD 6.3: date-range picker in analytics | SDD vs code (mock) | Keep; implement in T-12 | No |
| — | SRS 3.7.1 "musical note stave indicators" on the HUD | SRS vs code | Target shown in the side panel next to the HUD. Accept and reword. | SRS |
| — | SPMP milestones (weeks 4–9) and Jira due dates (Sep 27 – Oct 31) have passed; 15 due dates precede their creation | SPMP / Jira vs calendar | Rebaseline the dates in Jira from the roadmap | Jira |
| — | SPMP lists 4 roles; Jira uses a shared-looking `dev_account` for B | SPMP vs Jira | Record the mapping on the board (proposal §6) | No |

## 6. Missing work (summary)

The full list is in [MISSING_FEATURES_AND_TASKS.md](MISSING_FEATURES_AND_TASKS.md).

| Category | Items |
|---|---|
| Required features missing | pitchy single-note (T-07/T-08); achievements (T-11); analytics with real data (T-12); offline sync (T-13); Google OAuth and password recovery (T-10) |
| Necessary technical completion | Profile wipe (T-03); heart refund (T-06); vision hardening (T-09); UI defects (T-15); rhythm consistency (T-16); flats (T-17); dead code (T-18); branch reconciliation (T-01, T-04) |
| Testing & QA | Performance benchmarks (T-19); RLS (T-20); media privacy (T-21); compatibility (T-22); end-to-end (T-23); regression (T-24) |
| Deployment & release | Staging and CI (T-05); production (T-25); documentation v01.02 (T-26) |
| Recommended / optional | Contrast pass (T-27); server-side save RPC (T-28); posture calibration UI (T-29); server heart-regen anchor (T-30) |

Scope expansions considered and **not** recommended:
- Playwright automation (a manual checklist suffices for SPMP);
- a learner-adjustable BPM;
- a piano-roll view;
- latency calibration UI;
- a router.

## 7. Biggest delivery risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | No confirmed final deadline in the materials; the SPMP schedule (11 weeks, deployment in week 9) has already elapsed | High | High | A maps roadmap Day 1 to a date today. Cut order is in the roadmap §9. |
| R2 | Real-hardware behaviour unknown: posture FPS/Hz, chord pass rate on a real piano, mic quality. All tuning used synthetic audio. | High | High | T-19 early (Day 7–8), with a tuning budget; keep `NoteVerifier` as a fallback |
| R3 | Profile-wipe bug destroys demo data or test data | Medium | High | T-03 on Day 1 |
| R4 | Two gamification implementations → merge conflicts or a wrong merge | Medium | High | T-04 on Day 1; branch archived; T-11/T-12 re-implement on `main` |
| R5 | Critical path through B (T-11 → T-12, 6 days) with little slack | Medium | Medium | A takes the rhythm histogram if T-12 slips past Day 7 |
| R6 | The vision pipeline worked end to end only from Nov 15; the production build was never runtime-checked | Medium | High | T-19 includes the `vite preview` check; a demo backup video (T-25) |
| R7 | No staging Supabase project, so auth, RLS and save behaviour are unverified | High | Medium | T-05 Day 1–2 |
| R8 | Shared-file conflicts: `DashboardScreen.tsx`, `App.tsx`, `saveLessonResult.ts`, `supabaseStore.ts` | Medium | Medium | Merge order fixed in [INTEGRATION_AND_COORDINATION_PLAN.md](INTEGRATION_AND_COORDINATION_PLAN.md) §3 |
| R9 | Member D's code quality on live components (T-15, T-17) | Medium | Low–Medium | Small tasks with explicit line ranges; mandatory review; T-17 provisional with a 1-day escape hatch |
| R10 | Client-trusted gamification is questioned at the defence | Low | Medium | Document it as an accepted risk (D14); T-28 is ready as a follow-up |
| R11 | About 38 MB of WASM committed to git (3 variants); repo weight and hosting size | Low | Low | Acceptable; optional later cleanup |

## 8. Verified facts, assumptions and uncertainties

| | Items |
|---|---|
| **Verified (this audit)** | Test, type and build results above; seed is in sync; all file:line evidence in the matrix; the three confirmed defects (✔ in the reconciliation); no secret key in git history (only `sb_publishable_` keys); the account mapping (confirmed by the user) |
| **Assumptions** | The subtask → task → epic hierarchy (inferred from key order); "Medium" priority means "unset"; the person behind "LAB64_USER ON WS25"; effort estimates |
| **Uncertain / unverifiable** | Live Supabase state (were migrations pushed? are RLS and the Google provider set up?); TLS version; all runtime performance; real-piano accuracy; the final deadline; deleted Jira keys KAN-1…4 and KAN-15…227 |

## 9. Answers to the final questions

1. **Does Jira adequately cover the SRS and SDD?**
   - **No.** Feature coverage by summary line is broad (36 of 66 matrix rows are J1).
   - But the export has no descriptions, acceptance criteria, links or meaningful priorities.
   - SRS 3.2.2, 3.5.2b/c, 3.6 and the SDD-only items are not represented.
   - The most recent ~60 % of the implementation (COURSE-1…6) is untracked.
2. **Which requirements or tasks are missing?**
   - From Jira entirely: viewport alert (3.2.2), TLS/secrets checks (3.5.2b/c), deployment config details, branch integration, the change-control rulings, the staging environment and CI, the real-piano validation, documentation v01.02, the defects found here, and retroactive tickets for COURSE-1…6.
   - Unimplemented despite tickets: pitchy single-note, achievements, analytics, offline sync, OAuth, password recovery, and all of testing and deployment.
3. **Which tasks are incorrectly marked Done?**
   - KAN-229 (broken);
   - KAN-228 (no OAuth);
   - KAN-267 (heart-refund bug);
   - KAN-246 (BPM not adjustable, against its own summary);
   - KAN-244 (implements a different label set from its title);
   - KAN-240 / KAN-243 (no flats, no samples or piano roll);
   - KAN-258 and the KAN-11 epic (unverified; non-functional end to end until after closure);
   - the KAN-10 epic.
4. **Which To-do tasks are already implemented?**
   - KAN-270: EXP, streak, hearts and regen are ~75 % done and tested.
   - KAN-264: mic stream and AudioContext, via a worklet.
   - KAN-278: bundle passes at 0.87 MB.
   - KAN-261: single-note drills ship, but not via pitchy.
   - KAN-262: partial.
   - In progress but effectively done: KAN-232, 234, 236, 237, 238.
5. **What is genuinely left to develop?**
   - pitchy verification;
   - achievements;
   - real analytics;
   - offline sync;
   - OAuth and password recovery;
   - profile-bootstrap and heart-refund fixes;
   - vision hardening and instrumentation;
   - flats;
   - a set of small UI fixes;
   - then all of testing, staging/CI, deployment and documentation updates.
6. **What should each member work on?**
   - **A:** baseline, rulings, heart refund, vision hardening, pitchy wiring, benchmarks, integration and triage.
   - **B:** profile-wipe fix, branch reconciliation, achievements, analytics, auth completion, production deploy.
   - **C:** staging and CI, the PitchVerifier, offline sync, RLS tests, the end-to-end checklist.
   - **D:** rhythm tests, UI fixes, dead-code removal, onboarding welcome, flats, the media-privacy audit, the compatibility matrix and doc updates.
   - Details are in [TEAM_EXECUTION_OVERVIEW.md](TEAM_EXECUTION_OVERVIEW.md).
7. **Which tasks can proceed simultaneously?** After T-01 (half a day), these are all independent: T-03, T-04, T-05, T-06, T-09, T-15, the tests part of T-16, T-17 and T-18. T-07 ∥ T-08 run against an agreed interface; T-11 ∥ T-13 are ordered by merge only. See [DEPENDENCY_AND_PARALLEL_WORK_PLAN.md](DEPENDENCY_AND_PARALLEL_WORK_PLAN.md).
8. **Which tasks have hard dependencies?** All code tasks wait on T-01.

   | Task(s) | Hard dependency |
   |---|---|
   | T-11, T-12 | T-04 |
   | T-20, T-23, T-25 | T-05 |
   | T-10 | T-03 (same file) |
   | T-08 (merge) | T-07 |
   | T-19 | T-08, T-09 |
   | T-21 | T-08 |
   | T-22, T-23 | feature freeze (IC-3) |
   | T-24 | T-19…T-23 |
   | T-25 | T-24 |
   | T-26 | T-02 |
   | Formula part of T-16 | ruling D13 |
9. **What should A and B prioritise?**
   - **A:** T-01 and T-02 on Day 1, then the audio/vision runtime chain (T-06, T-09, T-08, T-19), which is the highest technical risk. Also integration.
   - **B:** T-03 (data loss) on Day 1, then T-04 → T-11 → T-12, the critical path, then T-10.
10. **What should C handle?**
    - T-05: staging and CI, a precise checklist.
    - T-07: the PitchVerifier, a pure module with an existing interface and exact numeric acceptance tests.
    - T-13: offline sync, behind the existing `ProgressStore` seam.
    - T-20: the RLS test script.
    - T-23: the end-to-end checklist.
    - All are clearly bounded; none requires architectural change.
11. **Which tasks suit D?**
    - T-16: tests, plus a formula given in full.
    - T-15: 8 enumerated line-level fixes.
    - T-18: an exact file list.
    - T-14: one new component, no DB writes.
    - T-21 and T-22: scripted manual testing.
    - T-26: drafting document edits.
    - T-17 (flats) is provisional, with C as reviewer and a 1-day hand-off rule.
    - All require review before merge; none is on the critical path.
12. **What requires additional review?**
    - Any migration (T-13 `run_id`).
    - Any change to `AcousticFrame`, `ProgressStore`, `applyResult`, `saveLessonResult`, `AuthContext` or the worker protocol.
    - All of D's PRs.
    - The T-04 salvage list.
    - Threshold tuning in T-19.
    - The production Supabase configuration.
13. **What are the biggest delivery risks?** R1 (no deadline; schedule elapsed), R2 (unknown real-hardware behaviour), R3 (profile wipe), R4 (duplicate gamification), R5 (critical path through B). See §7.
14. **What is the most efficient execution sequence?**
    1. Day 1: baseline and rulings.
    2. Days 1–3: blockers and small fixes in parallel.
    3. Days 2–9: four parallel feature streams, with integration checkpoints IC-1 (D3), IC-2 (D6) and IC-3 (D9, feature freeze).
    4. Days 7–8: hardware benchmarks, started early.
    5. Days 10–12: system testing.
    6. Days 12–13: fixes and regression.
    7. Day 14: production.
    8. Day 15: rehearsal and buffer.
    The schedule is in [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md).
15. **What must be complete before integration, testing and deployment?**

    | Before | Must be complete |
    |---|---|
    | **Integration** | T-01 (one baseline); T-02 (rulings); the interface contracts (`AcousticFrame` extension, `ProgressStore` additions, `useAnalyticsData` shape) |
    | **System testing** | Feature freeze IC-3 (T-07…T-17 merged); staging (T-05) with migrations and seed applied; T-09 instrumentation |
    | **Deployment** | T-24 with no open P0/P1 defects; T-20 RLS pass; T-21 privacy pass; production Supabase configured (Auth URLs, Google provider); CI green on `main` |
