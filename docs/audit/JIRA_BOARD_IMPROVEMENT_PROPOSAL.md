# Jira Board Improvement Proposal

**For human review. Nothing in Jira has been changed.**

- Keep all existing keys and history. Edit or reopen issues; do not delete and recreate them.
- Task IDs (T-xx) refer to [TASK_DECOMPOSITION.md](TASK_DECOMPOSITION.md).
- Proposed new issues are numbered NEW-01 … NEW-16. Real keys are assigned on creation.

## 1. Board-level fixes

| Problem | Evidence | Proposal |
|---|---|---|
| No descriptions or acceptance criteria | Export has 14 columns, none of them a description | Paste each task's objective and acceptance criteria from `TASK_DECOMPOSITION.md` into the matching issue |
| All 66 issues are Medium | Export | Set the priority from the T-xx table: P0 → Highest, P1 → High, P2 → Medium, P3 → Low |
| Subtasks may lack a recorded parent | Export has no Parent column | Confirm parents in the Jira UI against the inferred map in §7 |
| No dependency links | Export | Add "is blocked by" links for every HARD dependency in [DEPENDENCY_AND_PARALLEL_WORK_PLAN.md](DEPENDENCY_AND_PARALLEL_WORK_PLAN.md) §2 |
| Due dates before creation dates, and 15 open issues overdue | 15 issues each | Re-baseline due dates from the roadmap (D-days → real dates) |
| Shared-looking `dev_account` | It is B's account | Rename its display name to "Aaron Barnaija" if possible, or note the mapping in the board description |
| No Bug issue type in use | — | Use Bug for defects (NEW-04, NEW-06, and the T-22 log) |
| Done is applied without evidence | Reconciliation §5 | Add the Done evidence rule (integration plan §6) to the board description, or as a workflow condition |

## 2. Status corrections

| Key | Current | Proposed | Reason (detail in the reconciliation) |
|---|---|---|---|
| KAN-229 | Done | **In progress** | Password reset cannot be completed |
| KAN-228 | Done | **In progress** | No OAuth UI |
| KAN-10 | Done | **In progress** | Child issues are partial |
| KAN-11 | Done | **In progress** (or In review) | Performance unverified; non-functional end to end until Nov 15 |
| KAN-258 | Done | **In review** | 60 FPS not measured (T-19) |
| KAN-9 | To do | **In progress** | Mostly implemented |
| KAN-12 | To do | **In progress** | Chord path and most gamification implemented |
| KAN-259 | To do | **In progress** | — |
| KAN-270 | To do | **In progress** | About 75 % implemented (COURSE-6) |
| KAN-269 | To do | **In progress** | UI shell exists |
| KAN-261 | To do | **In progress** | Drills exist, without pitchy |
| KAN-262 | To do | **In progress** | Partial helpers |
| KAN-264 | To do | **Done**, after ruling D2 | Mic stream is implemented through the worklet |
| KAN-278 | To do | **Done**, after T-05 | 0.87 MB, below the 5 MB limit |
| KAN-232, 234, 236, 237, 238 | In progress | **Done**, after T-15 / T-22 evidence | Implemented; small defects remain |
| KAN-5 | Done | Keep Done; add child NEW-08 | v01.02 needed |

## 3. Edits to existing issues (summary, assignee, decomposition)

| Key | Change |
|---|---|
| KAN-244 | Retitle to "Timing window evaluation (Perfect ≤ 25 ms / Good ≤ 50 ms / Miss), per SRS 3.1.4.3" |
| KAN-246 | Edit to "Web Audio metronome clicks scheduled at lesson BPM, per SRS 3.1.4.1". Adjustable BPM is not an SRS requirement (ruling in T-02). |
| KAN-270 | Retitle to "EXP, daily streak, heart depletion and regeneration rules". Move badges to NEW-15. Close as Done after T-06 with evidence from the `applyResult`, `streak`, `heartRegen` and `gate` tests. |
| KAN-233 | Reassign to B. Add T-03 acceptance criteria. |
| KAN-283 | Assign to B. Split: NEW-03 (staging + CI, C) is a prerequisite. |
| KAN-264 | Reassign to A (T-08) |
| KAN-271, 274 | Reassign to C (T-23) |
| KAN-272, 277, 273, 282 | Reassign to A |
| KAN-276, 279, 280 | Reassign to D |
| KAN-278 | Reassign to C |
| KAN-281 | Reassign to A (triage owner). Seed it with the defects listed in `MISSING_FEATURES_AND_TASKS.md` §2. |
| KAN-260 | Add subtask NEW-16: real-piano validation |

## 4. New issues

### Integration, process and environment

#### NEW-01: Establish integration baseline on `main` and repo hygiene (T-01)

| Field | Value |
|---|---|
| Type | Task |
| Epic | KAN-13 |
| Priority | Highest |
| Assignee | A |
| Blocks | Every development issue |

**Description:** Push and merge `course-handoff`. Delete the `Lag-in`, `dashboard` and `login-bins` branches (and `features-integration` after NEW-02 / KAN-259 review). Untrack the tsbuildinfo files and the generated `vite.config.js` / `.d.ts`. Turn on branch protection for `main`.

**Acceptance criteria:** `origin/main` contains `59448bd`; no generated files are tracked; the CI commands pass on a fresh clone.

#### NEW-02: Requirements rulings / change-control record (T-02)

| Field | Value |
|---|---|
| Type | Task |
| Epic | KAN-5 |
| Priority | Highest |
| Assignee | A |

**Description:** Decide D1–D14, listed in `PROJECT_REQUIREMENTS_AUDIT.md` §5. Record them in `docs/decisions/RULINGS.md`.

**Acceptance criteria:** 14 decisions, each with a reason, the affected tasks, and whether a document edit is needed.

#### NEW-03: Staging environment and CI pipeline (T-05)

| Field | Value |
|---|---|
| Type | Task |
| Epic | KAN-14 |
| Priority | Highest |
| Assignee | C |
| Blocks | KAN-275, KAN-274, KAN-283 |

**Description:** Set up a staging Supabase project with the migrations and seed applied. Set up a Vercel project with an SPA fallback. Add a GitHub Actions workflow (test, typecheck, build, seed check, size gate) and an env-var guard.

**Acceptance criteria:** a failing test blocks the PR; staging signup creates a profile; the size gate prints the measured size.

### Defects

#### NEW-04: Hearts lost mid-drill are refunded when the learner quits (T-06)

| Field | Value |
|---|---|
| Type | Bug |
| Epic | KAN-12 |
| Priority | High |
| Assignee | A |
| Links | relates to KAN-267 |

**Description:** `LessonPlayer.quit()` uses `run.hearts`, and in-drill heart losses only reach the run when the drill ends.

**Acceptance criteria:** a runner test shows that 2 in-drill losses followed by a quit give `heartsEnd = start − 2`.

#### NEW-06: Flats cannot be drawn or labelled, so B♭ shows as A♯ (T-17)

| Field | Value |
|---|---|
| Type | Bug |
| Epic | KAN-10 |
| Priority | Medium |
| Assignee | D |
| Reviewer | C |
| Links | relates to KAN-243 |

**Acceptance criteria:** `midiToName(70, 'flat') = 'Bb4'`; the F-major card shows B♭; the seed check passes.

### Hardening and cleanup

#### NEW-05: Vision runtime hardening and performance instrumentation (T-09)

| Field | Value |
|---|---|
| Type | Task |
| Epic | KAN-11 |
| Priority | High |
| Assignee | A |
| Blocks | KAN-277 |

**Description:** Fix the timestamp clamping after a stream restart and the FrameLoop in-flight race. Add a 30 Hz cap and a performance overlay.

**Acceptance criteria:** as in T-09.

#### NEW-07: Remove dead test pages and unused hooks (T-18)

| Field | Value |
|---|---|
| Type | Task |
| Epic | KAN-13 |
| Priority | Medium |
| Assignee | D |

**Description:** Delete the exact file list in T-18.

**Acceptance criteria:** tsc, tests and build pass; grep finds no references.

### Documentation

#### NEW-08: SRS/SDD v01.02 and test appendix (T-26)

| Field | Value |
|---|---|
| Type | Task |
| Epic | KAN-5 |
| Priority | High |
| Assignee | D (drafts), A (approves) |
| Blocked by | NEW-02 |

**Acceptance criteria:** every ruling that needs a document edit is applied; the SDD §7 matrix is updated; the revision history is updated.

### Retroactive tracking of untracked work

**NEW-09 … NEW-14** are Task issues, created directly as **Done** so the board reflects the work actually delivered. All are assigned to A, with links to the commits. Their acceptance criteria are the existing unit tests.

| New | Summary | Epic | Commit | Tests |
|---|---|---|---|---|
| NEW-09 | COURSE-1 Curriculum v2: 12 units, 59 lessons, tier settings | KAN-10 | `2b0b314` | `curriculum.test.ts` |
| NEW-10 | COURSE-2 Lesson seed generator and `--check` mode | KAN-10 | — | `seed:lessons:check` |
| NEW-11 | COURSE-3 Lesson runner and LessonPlayer | KAN-10 | — | `runner.test.ts` |
| NEW-12 | COURSE-4 Rhythm game (tap-along / echo / read) | KAN-10 | — | `plan.test.ts`, `notation.test.ts` |
| NEW-13 | COURSE-5 Practice drills, PracticeRig, NoteVerifier, posture hold | KAN-12 | — | `PracticeDrill.test.ts`, `PostureHold.test.ts`, `notes.test.ts` |
| NEW-14 | COURSE-6 Progress save, hearts persistence, regeneration, placement | KAN-12 | `317844d`, `59448bd` | `applyResult`, `heartRegen`, `placement`, `saveLessonResult`, `streak`, `gate` tests |

### Gamification and validation

#### NEW-15: Achievement badges: evaluate, award, credit `exp_reward` (T-11)

| Field | Value |
|---|---|
| Type | Subtask of KAN-259 |
| Priority | High |
| Assignee | B |
| Blocked by | KAN-259 salvage review (T-04) |

**Description:** Build a pure `evaluateAchievements` covering the 5 seeded ids. Add `ProgressStore.insertAchievements` (plain insert; ignore error 23505). Credit the bonus EXP in the same profile write.

**Acceptance criteria:** as in T-11.

#### NEW-16: Validate chord and note detection on a real piano (part of T-19)

| Field | Value |
|---|---|
| Type | Subtask of KAN-260 |
| Priority | High |
| Assignee | A |
| Support | C |

**Acceptance criteria:**
- Correct-chord pass rate ≥ 95 % over 20 strikes × 5 chords, on 2 microphones.
- The wrong-chord rejection rate is recorded.
- Any threshold changes are recorded with before and after values.

## 5. Missing epics

None. The seven existing epics cover all the remaining work. Map new issues to them as shown above.

## 6. Duplicates and tasks to decompose

| Item | Observation | Proposal |
|---|---|---|
| KAN-231 vs KAN-235 | They overlap (onboarding, piano selection) | Keep both. KAN-235 = UI (T-14). KAN-231 = parent; close it when KAN-233, 234 and 235 are Done. |
| KAN-259 vs KAN-270 / 269 | Parent and children | Keep. Add NEW-15. |
| KAN-271 vs KAN-274 / 275 / 276 | Parent and children | Keep |
| KAN-272 vs KAN-277 / 278 / 279 | Parent and children | Keep |
| KAN-273 vs KAN-280 / 281 / 282 | Parent and children | Keep |
| KAN-283 | Too broad (build + deploy + presentation) | Add subtasks: "Production Supabase + Auth config", "Deploy and smoke test", "Demo script and backup video" |
| KAN-261 | Spans two owners | Keep the parent. KAN-262 / 263 = C (T-07); KAN-264 = A (T-08). |

## 7. Inferred hierarchy

Confirm these parents in Jira.

| Epic | Tasks | Subtasks |
|---|---|---|
| KAN-5 | KAN-6, 7, 8 | — |
| KAN-9 | KAN-228 | KAN-229, 230 |
| KAN-9 | KAN-231 | KAN-233, 234, 235 |
| KAN-9 | KAN-232 | KAN-236, 237, 238 |
| KAN-10 | KAN-240 | KAN-241, 242, 243 |
| KAN-10 | KAN-239 | KAN-244, 245, 246 |
| KAN-11 | KAN-249 | KAN-250, 251, 252 |
| KAN-11 | KAN-248 | KAN-253, 254, 255 |
| KAN-11 | KAN-247 | KAN-256, 257, 258 |
| KAN-12 | KAN-261 | KAN-262, 263, 264 |
| KAN-12 | KAN-260 | KAN-265, 266, 267 |
| KAN-12 | KAN-259 | KAN-268, 269, 270 |
| KAN-13 | KAN-271 | KAN-274, 275, 276 |
| KAN-13 | KAN-272 | KAN-277, 278, 279 |
| KAN-13 | KAN-273 | KAN-280, 281, 282 |
| KAN-14 | KAN-283 | — |
