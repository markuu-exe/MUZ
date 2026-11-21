# Member D Execution Guide: Bernante (Frontend / UI / QA / Documentation)

> **Self-contained.** This guide covers everything D needs. Task IDs match `docs/audit/TASK_DECOMPOSITION.md`. Days are relative working days: D1 is the first day after the plan is accepted. Calendar due dates are in `docs/decisions/T-02_VERIFICATION_PLAN_HANDOFF.md` §E.2 and take precedence over the D-days below.
>
> **Commands that exist in this repo** (from `package.json`):
>
> | Command | What it does |
> |---|---|
> | `npm test` | Runs every unit test (vitest) |
> | `npx vitest run <path>` | Runs one test file or folder |
> | `npx tsc -p tsconfig.json` | Type-checks the app |
> | `npm run build` | Production build |
> | `npm run dev` | Local app at `http://localhost:5173` |
> | `npm run seed:lessons` | Regenerates `supabase/seed.sql` from `src/content` |
> | `npm run seed:lessons:check` | Fails if `seed.sql` is out of date |
>
> Baseline on 2026-11-16: 387 tests, all passing. The count has changed on `main` since; use the number CI reports on the day you branch. There is no `gh` CLI, so open PRs on `https://github.com/markuu-exe/MUZ`.
>
> **Re-verified 2026-11-21 against `origin/main` @ `e96c34c`:** the line references in T-15 items 1, 3 and 4, T-14, T-16 and T-17 below were re-checked and updated where they had moved. Other line references are from 2026-11-16; re-check each one before editing.

## Revision notice: security audit and progression architecture (2026-11-21)

A hosted-database security audit and an application dependency audit found that progression (EXP, hearts, streaks, completion, achievements) is calculated and written from the browser, and that the project intends to move it to a **trusted backend operation**. That architecture is **not approved yet** (U-23). This revision changes T-14, T-15, T-16, T-17, T-21, T-22 and T-26. Most of D's work is frontend-only and stays **READY**; the parts that depend on an open decision are marked **BLOCKED** or **DECISION REQUIRED** and name the decision. Proposed decision IDs (`U-22`…`U-37`) are listed in `docs/execution/SECURITY_AUDIT_GUIDE_REVISION.md` §3.

**Decisions already recorded on `main` that this revision now reflects** (`docs/decisions/RULINGS.md`, `T-02_VERIFICATION_PLAN_HANDOFF.md` §F):
- **U-17:** A reviews every PR. C has no review duties. (Handoff §F: "all of D's PRs are reviewed by A only.")
- **D's cut order:** T-17 is **cut** (D's cut #1) unless A reinstates it; T-18 is cut #2.
- **T-26:** SRS/SDD drafting moved to **A**; D writes the **test appendix only**.
- **T-14:** do it "if A keeps it".

**Status labels:** **READY** (can start now), **BLOCKED** (waits for a named decision or task), **DECISION REQUIRED** (a choice A must record before the part can be finalised), **CUT** (not scheduled unless A reinstates).

> **Decision update 2026-11-21: read this first.** The project owner approved `docs/audit/PROGRESSION_ARCHITECTURE_DECISION.md` and the defaults in `docs/audit/CONSOLIDATED_HANDOFF.md` §2. Team ratification (X8) is still pending. The §B status column has been updated; task bodies keep their original wording, so use this table to interpret them.
>
> | ID | Outcome | Effect on your tasks |
> |---|---|---|
> | U-25 | "Once" = **once per account, tied to placement** (placement is already stored on the account). That is option **P1** with acceptance criterion 2 read as "has finished placement"; no new Supabase request. | T-14 is READY (if A keeps it) |
> | U-35 | **Cap at 100 only** (upper-bound option 2); the D13 denominator is unchanged | T-16 fully specified |
> | U-36 | T-17 **stays cut** | No work |
> | U-37 | Wording for "not found" / "failed" comes from A (still to be written) | T-15 item 1 still waits for B's status value and A's wording |
> | U-31 | Profiles are created only by the signup trigger; B removes the client upsert | T-15 item 1 "not found" is a server defect to report, never filled with defaults |
> | U-23 / D14-R | PostgreSQL RPCs; staged rollout (Stage A keeps ruling D14) | T-26: A's SDD 3.3 text must describe whichever stage actually ships; T-21 may see `…/rest/v1/rpc/…` requests (expected) |
> | U-22 / U-28 | `Muz-Database` is shared dev with real users; a fresh staging project (E1) is created | Run T-15 / T-21 / T-22 checks on E1, never on real users' rows |

## Rules for every D task

These rules are part of every brief below.

1. **Scope.** Change only the files and lines named in the brief. If you think something else needs changing, ask A first.
2. **PR size.** Keep each PR under about 300 changed lines. One commit per numbered item, with the message `T-xx(n): what changed`.
3. **Checks before every push.** Run `npm test` and `npx tsc -p tsconfig.json`. Both must pass.
4. **Screenshots.** Every UI change needs before/after screenshots in the PR. Redact anything that identifies a real user (email, username) before posting.
5. **Review.** Every PR is reviewed by A before merge (U-17). A merges.
6. **Blocked?** If you are stuck for more than half a day, message A. This is expected; it is not a failure.
7. **No restyling.** Do not change colours, fonts, spacing or wording beyond what the brief says.
8. **Display is not security.** Hiding, disabling or formatting something in the UI never protects data. Do not describe a UI change as a security fix.

---

## A. Role overview

| Item | Detail |
|---|---|
| Role | Frontend developer for small, well-defined UI fixes. Also runs scripted QA (privacy audit, compatibility matrix) and writes the test appendix. |
| Ownership areas | Dashboard layout and copy: `DashboardScreen.tsx` (only the lines named), `SkillTreeView.tsx`, `DashboardHud.tsx`, a new `OnboardingWelcome.tsx`. Rhythm-view copy in `TapExerciseView.tsx`. `MediaDiagnostics.tsx` copy. `ViewportGuard.tsx`. `src/lib/dashboard/curriculum.ts` (helpers and tests). `src/lib/rhythm/timing.ts` consistency lines (T-16). `src/lib/theory/notes.ts` and `GrandStaff.tsx` (T-17, if reinstated). Test documents `docs/test/MEDIA_PRIVACY_REPORT.md` and `docs/test/COMPATIBILITY_MATRIX.md`. The SPMP issue log. The T-26 test appendix. |
| Delivers | T-16, T-15, T-18, T-14, T-21, T-22, T-26 (test appendix). T-17 only if A reinstates it. Help recording T-19 numbers if time allows. |
| Can change on your own | Only what each brief lists |
| Needs approval from A | Any change in `src/lesson/runner.ts` or `src/types/lesson.types.ts` (both small and listed below); deleting any file not on the T-18 list; changing a test that already exists; **any new Supabase request or stored value** (T-14) |
| Reports to | A, by daily status post |
| Works directly with | A (reviewer of every PR), B (owner of `AuthContext.tsx`: T-15 item 1 needs a profile-status value from B; T-14 persistence), C (shares `DashboardScreen.tsx` in T-13) |

---

## B. Personal task schedule

| Task | Jira | Priority | Effort | Earliest start (reason) | Target done | Reviewer | Status (2026-11-21) |
|---|---|---|---|---|---|---|---|
| T-16 Rhythm tests + consistency formula | KAN-244, KAN-239 | P1 | 1.5 d | D1 (D13 decided) | D2 | A | **READY.** New: upper-bound check (§C T-16), **use the cap at 100 (U-35)**. DEF-007 open. |
| T-15 Eight UI fixes *(provisional)* | KAN-236, KAN-237, KAN-238 | P1 | 2 d (+0.5 d item 1) | D2 | D3, merged **before** B's T-10 and T-12 | A | Items 2–8 **READY**. Item 1 **BLOCKED** on B (profile-status value) and A's wording (U-37). Items 2–8 may merge without item 1 if A agrees. |
| T-18 Remove dead code | NEW-07 (proposed) | P2 | 1 d | D4 | D4 | A | READY (cut #2 if behind) |
| T-14 Onboarding welcome step | KAN-235, KAN-231 | P2 | 1 d (+0.5 d if account-scoped) | D5 (after T-15 is merged; same file) | D5 | A | **READY: option P1** (U-25: once per account, tied to placement; no new request). Only if A keeps T-14. |
| T-17 Draw flats *(provisional)* | NEW-06 (proposed bug) | P2 | 2 d | D6 | D7 | A | **CUT** (handoff §E.3; confirmed by U-36). Requirements kept in case it is ever reinstated. |
| T-21 Media-privacy audit | KAN-276 | P1 | 1 d | D8 (**hard:** A's T-08 merged: done, PR #31) | D8 | A | **READY** once a staging URL exists (C's T-05) |
| T-26 Test appendix (SRS/SDD drafting moved to A) | NEW-08 (proposed) | P1 | 1–3 d spread | D9 (**hard:** T-02 rulings; test reports) | D14 | A | Decisions settled (U-23, D14-R staged). **BLOCKED** only on the test reports; the appendix must state which stage (A or current path) was tested. |
| T-22 Compatibility matrix + defect log | KAN-279, KAN-280 | P1 | 3 d | D10 (**hard:** feature freeze IC-3, D9) | D12 | A | Waits for IC-3 |
| T-24 fixes in your area | KAN-281 | P1 | as assigned | D12 | D13 | A | — |

**Workload warning.** This was about 14.5 days of small tasks in 14 days. The cuts already decided (T-17; T-26 drafting moved to A) bring it closer to capacity, but T-15 item 1 and an account-scoped T-14 add work.
- If you fall behind, **T-18 can wait** (cut #2). A decides.
- Helping with T-19 recording (D7–D8) is **optional**.

**While waiting**
- **D1:** write the timing boundary tests and the upper-bound test (part 1 of T-16).
- **While T-15 item 1 waits for B:** do items 2–8.
- **While U-25 is open:** build `OnboardingWelcome.tsx` (the component does not depend on the persistence choice).
- **D8, after T-21:** start the T-26 appendix outline (report links only).
- **D9 (freeze day):** prepare the T-22 matrix table and the issue-log columns.

---

## C. Detailed instructions for each task

### T-16 Rhythm timing tests, consistency formula, heart-restore tests

**Status:** **READY.**

**1. Purpose**

The SRS defines Perfect as ≤ 25 ms, Good as ≤ 50 ms and Miss as anything slower (SRS 3.1.4.3). No test checks those exact edges. The "consistency" score also ignores missed beats: one perfect hit out of ten beats scores 100 %. This task adds the tests and fixes the formula, and makes sure the fixed formula can never report more than 100 %.

**2. What exists now** (`src/lib/rhythm/timing.ts`, re-checked on `main` 2026-11-21)
- `PERFECT_MS = 25`, `GOOD_MS = 50`, and `POINTS` = Perfect 100 / Good 70 / Miss 0 (lines 4–11).
- `classifyDelta(deltaMs)` (lines 13–18) uses `Math.abs`. This is correct; do not change it.
- `summarize(taps, passedBeats)` (lines 37–66) counts perfect, good and miss. `matched` (line 38) is every tap with `beatIndex !== null`. `omitted` (line 42) is `Math.max(0, passedBeats - matched.length)`: the `Math.max` shows the code already allows `matched.length > passedBeats`.
- `consistency` is computed at lines 53–54 as `100 − average(|Δ|)/50 × 100`, **over matched taps only**. This is the bug.
- Where `consistency` goes: it is shown in `LessonResults.tsx:73` and saved as `performance_records.rhythm_consistency`. `plan.ts`'s pass/fail score does **not** use it, so changing it cannot change who passes.
- **Can `matched.length` exceed `passedBeats`?** Evidence found on `main`:
  - `useRhythmJudge.ts:22-25` marks every already-matched beat as claimed, so one beat is matched by at most one tap. **Each beat is matched at most once.**
  - But `getSummary` (`useRhythmJudge.ts:59-64`) counts `passed` as beats whose time is earlier than `now − 50 ms`, while a tap may be matched to a beat up to 50 ms **before** that beat. If `getSummary` runs within 50 ms after an early tap on a beat (for example right after the last tap), that beat is matched but not yet "passed", so **`matched.length > passedBeats` is reachable** unless the caller only summarises after the whole plan has finished. Whether `useRhythmSession` guarantees that has **not** been verified.
- Existing tests in `src/lib/rhythm/__tests__/`: `plan.test.ts` and `notation.test.ts`. There is no `timing.test.ts` yet.
- Hearts: `runner.ts:22` sets `THEORY_RESTORE_THRESHOLD = 80`, and `runner.ts:163-164` restores a heart when the first-try theory score is ≥ 80, the run was not a quit, and hearts are below 5.
- `src/lesson/__tests__/runner.test.ts` has helpers `payloadOf(id)` and `runAll(state, decide)` (lines 10–21). Lesson `pno-mod2-node1` has **5 graded theory exercises and no practice exercises** (checked 2026-11-16).

**3. What to change**
- New file `src/lib/rhythm/__tests__/timing.test.ts`.
- In `src/lib/rhythm/timing.ts`, change **only** the `consistency` lines (53–54) to the formula decided in ruling D13 (`consistency = 100 × Σ_targets max(0, 1 − |Δ|/50) / targetCount`, omitted beats contribute 0). The recommended implementation is:

  ```ts
  const consistency = passedBeats > 0
    ? Math.round((100 * matched.reduce((sum, t) => sum + Math.max(0, 1 - Math.abs(t.deltaMs) / GOOD_MS), 0)) / passedBeats)
    : 0;
  ```

- **Upper bound (new).** Each matched tap contributes at most 1, so this value exceeds 100 exactly when `matched.length > passedBeats`. You must do **one** of the following, and say which in the PR:
  1. **Evidence it is impossible:** show (with a test or a code reference A accepts) that every caller of `summarize` only passes a `passedBeats` that is ≥ the number of matched taps; or
  2. **Safeguard:** cap the result at 100 (for example wrap it in `Math.min(100, …)`), and add a comment saying why.

  Note for A: a cap keeps the score in range but, mid-run, counts a beat that has not yet "passed" in the numerator and not in the denominator. D13 defines the score **per target**, so the strictly correct fix is for the denominator to include every target that has a matched tap. That is a formula detail; **do not change the D13 formula itself without A's ruling** (U-35). The cap is the minimum required.
- Keep the two concepts separate: `classifyDelta` (per-tap Perfect / Good / Miss) is unchanged; `consistency` is the aggregate score. Do not reuse one to compute the other beyond what D13 says.
- In `src/lesson/__tests__/runner.test.ts`, add three new `it(...)` cases. Do **not** change the existing ones.

**4. Steps**
1. Create branch `task/T-16-rhythm-tests`.
2. Write `timing.test.ts` with these assertions:
   - `classifyDelta(25)` is `'Perfect'`, `classifyDelta(25.01)` is `'Good'`.
   - `classifyDelta(50)` is `'Good'`, `classifyDelta(50.01)` is `'Miss'`.
   - `classifyDelta(-25)` is `'Perfect'`, `classifyDelta(-50.01)` is `'Miss'`.
   - `summarize([], 4).miss` is `4`, because omitted beats count as Miss.
   - One tap `{ rating: 'Perfect', deltaMs: 0, beatIndex: 0 }` with `passedBeats = 10` gives `consistency === 10`. This fails before your fix and passes after it.
   - Four taps at `deltaMs: 0` with `passedBeats = 4` give `consistency === 100`.
   - Two taps at `deltaMs: 25` with `passedBeats = 2` give `consistency === 50`.
   - **New (upper bound):** two taps at `deltaMs: 0` on beats 0 and 1 with `passedBeats = 1` give `consistency <= 100`. This fails with the unguarded formula (it gives 200) and passes with the safeguard. If you chose "evidence it is impossible" instead, replace this test with the test or reference that proves it, and keep a test that `summarize` never returns more than 100 for any input your evidence allows.
   - **New:** `passedBeats = 0` gives `consistency === 0`.
3. Run `npx vitest run src/lib/rhythm`. Only the "1 of 10" test (and, if you add it before the fix, the upper-bound test) should fail.
4. Change lines 53–54 (D13 formula + upper-bound safeguard or evidence) and run the command again. Everything should pass.
5. In `runner.test.ts`, add the three heart-restore cases:
   - **Restore:** `createLessonRun('pno-mod2-node1', payloadOf('pno-mod2-node1'), 3, 0)`. Fail exactly one graded theory exercise on its first try and pass everything else. Because it is not a checkpoint lesson, the failed one is re-queued and passed later. Expect `buildLessonResult(s).heartRestored === true` and `heartsEnd === 4`.
   - **No restore:** fail two of the five on first try (60 %). Expect `heartRestored === false`.
   - **Already full:** start with 5 hearts and pass everything. Expect `heartRestored === false` and `heartsEnd === 5`.

   Inside `runAll`, use `currentItem(s)` to see the exercise type and attempt. Only fail when `attempt === 1` and the type is not `'concept-card'`.
6. Run `npm test`. Everything must pass.

**5. What "done" looks like**

A new test file, a corrected formula that never exceeds 100, and three new runner tests.

**6. Testing**

Run `npx vitest run src/lib/rhythm src/lesson`, then `npm test`.

**7. Acceptance criteria**
1. Every new test passes.
2. All existing tests still pass.
3. The only change in `timing.ts` is the consistency lines.
4. **New:** `consistency` is provably within 0–100: either a safeguard with a test, or evidence A accepted.

**8. Evidence**

The PR link, a pasted copy of the test output, a KAN-244 comment listing the test names, and one sentence in the PR on which upper-bound option you chose.

**If `plan.test.ts` fails, stop and ask A. Do not edit `plan.test.ts`.**

### T-15 Dashboard and lesson UI fixes (eight items; provisional)

**Status:** items 2–8 **READY**; item 1 **BLOCKED** on B (profile-status value from `AuthContext.tsx`) and U-37 (missing-profile fallback and reporting).

**1. Purpose**

Fix eight small, confirmed UI defects. Some show fake numbers to real users. Others are wrong labels, an inconsistent "no hearts" lock, a vague banner, a hidden screen-size warning, and wrong text.

**2. What exists now** (checked 2026-11-16; item 1 re-checked on `main` 2026-11-21)

| # | File and line | What happens today |
|---|---|---|
| 1 | `src/components/dashboard/DashboardScreen.tsx:82-86` | `hearts = profile?.hearts ?? 4`, streak `: 7`, `exp = profile?.exp ?? 1240`. These are fake numbers shown while the profile is loading **or missing**. `DashboardHud` takes `hearts`, `streak`, `exp`, `nextHeartLabel` (`DashboardHud.tsx:4-9`) and is used at `DashboardScreen.tsx:336`. **The dashboard cannot tell "still loading" from "not found" from "failed":** `AuthContext` exposes `loading` (`AuthContext.tsx:51`, the auth session) and `profile` (`UserProfile \| null`), but no profile-specific status. `fetchProfile` logs read errors with `console.warn` and continues (`AuthContext.tsx:70-72`), and when no row is found it **upserts a default profile from the browser** (`AuthContext.tsx:101-117`, EXP 100 / hearts 5 / streak 1; DEF-002 is the related P0, owner B, T-03). |
| 2 | `src/components/dashboard/SkillTreeView.tsx:199` | A mastered node shows `+{lesson.required_exp \|\| 50} XP`, which is the unlock threshold, not the reward. The reward is already on the node as `lesson.expReward` (`src/lib/dashboard/curriculum.ts:65`). |
| 3 | `DashboardScreen.tsx:178` and `SkillTreeView.tsx:117` | They disagree at 0 hearts. The first blocks lessons whose `kind === 'practice'`. The second blocks every lesson whose `kind !== 'theory'`, so rhythm lessons are blocked too. The real lesson engine only stops on **practice** exercises (`src/lesson/runner.ts:45`, `needsHearts`; `guardHearts` at lines 123–130). U-20 (decided): block only lessons containing practice exercises. |
| 4 | `DashboardScreen.tsx:158-176` (`handleSelect`; the lock check is now `canOpenLesson(status, isDev)` at line 159, which lets developer accounts open locked lessons) | The locked-node banner says "You must complete the prerequisite lesson nodes…" without naming which lesson. Unlock rules are in `nodeStatus` (`curriculum.ts:122-145`): the previous module must be complete, the previous node in this module must be complete, and EXP must be ≥ `required_exp`. |
| 5 | `src/App.tsx` (38 lines) and `src/components/common/ViewportGuard.tsx` | `<ViewportGuard />` only renders after login (App.tsx lines 33–36). Its overlay is `fixed inset-0 z-50`. The lesson player is also `fixed z-50` and comes later in the page, so it covers the guard. |
| 6 | `src/components/lesson/rhythm/TapExerciseView.tsx:180` | `{!done.score.passed && ' You will try this rhythm again.'}` also shows in checkpoint lessons, where there is no retry. The view receives `payload` (line 35), which has `isCheckpoint`. |
| 7 | `src/components/lesson/practice/MediaDiagnostics.tsx` | Line 75 always says "Practice exercises need both." `PostureHoldView.tsx:30` calls `mediaProblems(state, false)` (camera only) and renders `<MediaDiagnostics problems={problems} onRetry=… />` at line 90. |
| 8 | `TapExerciseView.tsx:55-58,140-141` | Live `counts.Perfect` and `counts.Good` are shown, but there is no score number. SDD 6.3 asks for a "Score counter". `POINTS` is exported from `src/lib/rhythm/timing.ts`. |

**3. What to change, item by item**

1. **Placeholder numbers and profile states (revised).**
   - Remove the fake fallbacks in `DashboardScreen.tsx:82-86` (`?? 4`, `: 7`, `?? 1240`). No made-up number may be shown for any state.
   - **Do not infer loading from `!profile`.** The original instruction `loading={!profile}` is withdrawn: when a profile does not exist (or failed to load), `!profile` stays true forever, so the HUD would show a loading placeholder permanently and hide the problem.
   - **Prerequisite from B (BLOCKED until available):** `AuthContext.tsx` is B's file. Ask B to expose a profile status that distinguishes four cases (names agreed with B): **loading**, **loaded**, **not found**, **failed**. D does not edit `AuthContext.tsx`. If B's T-03 (DEF-002) changes `fetchProfile`, agree the status in that PR.
   - In `DashboardHud.tsx`, add a prop for that status and render:

     | Profile status | HUD shows |
     |---|---|
     | Loading | `—` in place of each number (hearts, streak, EXP) |
     | Loaded | The actual values from the profile |
     | Not found | `—` in place of each number, plus the agreed fallback message (U-37). The condition is reported through the agreed channel (U-37; default: one `console.error` with the user id, no other personal data). It must **not** show default or demo values. |
     | Failed | `—` in place of each number, plus the agreed error message and a retry if B provides one (U-37). Never silently treated as "not found". |

   - Wording for "not found" and "failed" comes from A (rule 7). Until A gives it, use a placeholder string in one constant and list it in the PR as "wording pending".
   - **Not a security control.** Hiding numbers does not protect anything. Under the intended architecture a missing profile should be created by the server (the signup trigger, checked in C's T-05), not by the browser (U-31).
2. **XP label.** In `SkillTreeView.tsx:199`, show `+{lesson.expReward} XP`.
3. **0-heart rule.**
   - In `src/lesson/runner.ts`, add **one exported function** under `needsHearts`. This is A's file; A approves this addition in review.

     ```ts
     export function lessonNeedsHearts(payload: LessonPayload): boolean {
       return payload.stages.some((s) => s.exercises.some(needsHearts));
     }
     ```

   - In `DashboardScreen.tsx:178`, replace `lesson.kind === 'practice'` with `isLessonPayload(lesson.payload) && lessonNeedsHearts(lesson.payload)`. `isLessonPayload` is already imported at line 40, from `src/types/lesson.types`.
   - In `SkillTreeView.tsx:117`, replace `lesson.kind !== 'theory'` with the same expression. Add the two imports.
   - This is a UI rule. It does not stop a client from starting a lesson at 0 hearts; whether the backend enforces hearts is part of U-23.
4. **Banner names the lesson.**
   - In `src/lib/dashboard/curriculum.ts`, add a pure helper:

     ```ts
     export function blockingLesson(lesson: CurriculumNode, catalog: CurriculumNode[], progress: ProgressMap): CurriculumNode | null
     ```

     It returns the first lesson that is not completed, checking in this order: the previous node in the same module, then the earliest incomplete lesson of the previous module. It returns `null` if the only reason is EXP.
   - In `DashboardScreen.tsx:165-174`, when the helper returns a lesson, the message becomes `Finish "${blocking.title}" first to unlock "${lesson.title}".`. Keep the existing EXP message for the EXP case.
5. **Screen-size warning everywhere.**
   - In `App.tsx`, render `<ViewportGuard />` once, above everything, in every branch (loading, login and dashboard). For example, wrap the returned content in a fragment that always starts with `<ViewportGuard />`.
   - In `ViewportGuard.tsx`, change `z-50` to `z-[60]`.
   - Also remove the unused `Maximize2` import there.
6. **Checkpoint copy.** In `TapExerciseView.tsx:180`, change the condition to `!done.score.passed && !payload.isCheckpoint`.
7. **Camera-only wording.**
   - Add the prop `needsMic?: boolean` (default `true`) to `MediaDiagnosticsProps`.
   - At line 75, write "This exercise needs the camera." when `needsMic` is false, and keep "Practice exercises need both." otherwise.
   - In `PostureHoldView.tsx:90`, pass `needsMic={false}`.
8. **Score counter.**
   - In `TapExerciseView.tsx`, import `POINTS` from `../../../lib/rhythm/timing`.
   - Next to the `Perfect`/`Good` counts (lines 140–141), add `<span>Score {counts.Perfect * POINTS.Perfect + counts.Good * POINTS.Good}</span>`, using the same classes as its neighbours.

**New tests**

Create `src/lib/dashboard/__tests__/nodeStatus.test.ts`, building small `CurriculumNode` objects by hand. Check that:
- a completed lesson is `'mastered'`;
- the first lesson of module 1 with enough EXP is `'current'`;
- a lesson whose previous node is not completed is `'locked'`;
- a lesson with too little EXP is `'locked'`;
- `blockingLesson` returns the previous node;
- `blockingLesson` returns `null` when only EXP is missing.

For item 1, if the HUD's choice of what to display is put in a small pure function (for example status + profile → displayed values), add a test for each of the four states. The test environment is Node (no jsdom), so do not write component-rendering tests.

**4. Steps**
1. Create branch `task/T-15-ui-fixes` from `main`.
2. Do items 2 to 8 in order, one commit each, named `T-15(2): …` through `T-15(8): …`.
3. Do item 1 when B's profile status is available, as `T-15(1): …`. If it is not available by the T-15 merge deadline, ask A whether to merge items 2–8 first and finish item 1 in a follow-up PR.
4. After each item, run `npx tsc -p tsconfig.json`.
5. Write `nodeStatus.test.ts`, then run `npm test`.
6. Run `npm run dev` and check each item on screen:
   - Window **1300 px** wide: dashboard, skill tree, one rhythm lesson, one posture lesson.
   - Window **1000 px** wide: the warning shows on the login page, on the dashboard, and inside a lesson.
   - Item 1: see each of the four states (DevTools → Network throttling for loading; a test account whose profile read fails or is missing, prepared by B on staging, for the other two). **Do not delete or edit real users' profiles to produce these states.**
7. Open the PR with a before/after screenshot for each item. **It must merge by D3**: B and C start work on these files after you.

**5. What "done" looks like**

All eight items are fixed, and the new tests pass. The HUD never shows invented numbers, and never shows a permanent loading placeholder for a profile that does not exist.

**6. Testing**

`npm test`, plus the manual checks in step 6. For item 3:
- set hearts to 0 on a **test account** on staging, or ask B to;
- a practice lesson shows the "no hearts" message;
- theory and rhythm lessons still open.

**7. Acceptance criteria**
1. A screenshot proves each of the eight items.
2. The new `nodeStatus` tests pass.
3. All existing tests pass.
4. Your diff to `runner.ts` is only the new `lessonNeedsHearts` export.
5. **New (item 1):** each of the four profile states shows the behaviour in the table above, with a screenshot for each; no state shows `4`, `7`, `1240` or any other invented number; the "not found" state is reported through the agreed channel.

**8. Evidence**

The PR link, eight before/after screenshot pairs (plus four state screenshots for item 1), the test output, and comments on KAN-236, KAN-237 and KAN-238.

**Do NOT change:** the rest of `runner.ts`, `applyResult.ts`, `AuthContext.tsx` (B's file; ask B for the status), any colours or layout, or `ProfileAnalyticsView.tsx` (that file belongs to B).

### T-18 Remove dead code

**Status:** **READY** (cut #2 if D falls behind).

**1. Purpose**

These files are not used anywhere in the app. They duplicate features that now live elsewhere, so removing them prevents anyone from fixing the wrong copy.

**2. What exists now**

The import search was run on 2026-11-16. Each file below is imported only by other files on this same list:
- `src/components/theory/Quiz.tsx`, `LessonModule.tsx`, `NotationTest.tsx`, `QuizTest.tsx`, and `LessonTest` (a file with **no extension**)
- `src/components/rhythm/MetronomeTest.tsx`, `RhythmJudgeTest.tsx`, `SpacebarTapTest.tsx`
- `src/hooks/useMetronome.ts`, `useQuiz.ts`, `useChordDrill.ts`, `usePostureWorker.ts`
- `src/lib/theory/quiz.ts`, `src/lib/theory/lesson.ts`
- `src/components/common/SkillTree.tsx`

**3. What to change**
- Delete exactly those 15 files.
- Remove the unused imports `ShieldAlert`, `ChevronRight`, `Flame` and `Music2` from `DashboardScreen.tsx`.
  - Before removing each one, check it really is unused: search the file for `<ShieldAlert`, and so on.
  - If T-15 already removed `Maximize2` from `ViewportGuard.tsx`, skip that one.

**4. Steps**
1. Create branch `task/T-18-dead-code` from `main`, after T-15 is merged.
2. For each file, run `grep -rn "<file name without extension>" src`. If anything **outside the list** shows up, **stop and ask A**.
3. Delete the files with `git rm <path>`.
4. Run `npx tsc -p tsconfig.json`, `npm test` and `npm run build`. All three must pass.

**5. What "done" looks like**

The 15 files are gone and the app is unchanged.

**6. Testing**

The three commands in step 4, plus one quick click-through on `npm run dev`: log in, open a theory lesson, open a rhythm lesson.

**7. Acceptance criteria**
1. All three commands pass.
2. `grep -rn "useMetronome\|useQuiz\|useChordDrill\|usePostureWorker" src` prints nothing.

**8. Evidence**

The PR link and the command output.

**Do NOT delete:** `GrandStaff.tsx`, `PianoKeyboard.tsx`, `src/lib/theory/notes.ts`, `src/lib/theory/playNote.ts`, `useSpacebarTap.ts`, `useRhythmJudge.ts`, `src/lib/rhythm/timing.ts` (these are all used), `src/vision/posture/session.ts` (it is exported and tested). (`src/hooks/useAudioAnalysis.ts` and `src/lib/audio/noteFrequencies.ts` were already deleted by C in T-07.)

### T-14 Onboarding welcome step (Piano only)

**Status:** **DECISION REQUIRED** (U-25: what "once" means). Only if A keeps T-14 (handoff §F). The component itself is **READY**.

**1. Purpose**

The SRS says Piano is the only instrument (SRS 3.1.1.2–3.1.1.3), and KAN-235 asks for an instrument-selection screen. Today Piano is chosen silently. This task adds a short welcome screen that shows Piano selected and the other instruments disabled, shown to a new learner **once**.

**2. What exists now** (re-checked on `main` 2026-11-21)
- `DashboardScreen.tsx:101-108` computes `needsPlacement`. It is true for a signed-in, non-demo learner whose course loaded from the database, who has no progress rows, and whose auth `user_metadata` has no `placement` value.
- `savePlacement` (`src/lib/progress/supabaseStore.ts:98-124`) stores the placement choice in the account's auth `user_metadata` (`PLACEMENT_METADATA_KEY`). That is **account-level** and follows the user across devices and browsers.
- Line 675 renders `{needsPlacement && <PlacementModal onChoose={choosePlacement} />}`.
- `src/components/dashboard/PlacementModal.tsx` is the visual style to copy.

**Why the original brief cannot meet its own acceptance criteria.** The original brief stored "welcome seen" as `useState(false)` in `DashboardScreen`. That state is lost on every reload, sign-out/sign-in, new tab, or other device. Because Welcome is shown only while `needsPlacement` is true, the effect is:
- a learner who **finishes placement** never sees Welcome again (on any device), because placement is stored on the account; but
- a learner who sees Welcome and then reloads, signs out, or closes the tab **before choosing a placement** sees Welcome again.

So "returning accounts never see Welcome" holds only if "returning" means "has finished placement". Whether that is enough is a decision (U-25).

**3. What to change**

**3a. Component (READY).** Create one new file, `src/components/dashboard/OnboardingWelcome.tsx`, with `export default function OnboardingWelcome({ onContinue }: { onContinue: () => void })`. It contains:
- a heading, "Welcome to MUZ";
- one selected "Piano" card;
- two disabled cards, "Guitar: coming soon" and "Voice: coming soon", each with `aria-disabled="true"`, `tabIndex={-1}`, greyed out and not clickable;
- a "Continue" button that calls `onContinue`.

**3b. Persistence (DECISION REQUIRED: A records U-25, then implement exactly one option).**

| Option | Where "welcome seen" lives | What "once" means | Survives reload / sign-out | Other browser or device | New request or stored value | Conflicts to resolve |
|---|---|---|---|---|---|---|
| **P1 Session-only** | Component state (`useState`) in `DashboardScreen` | Once per page session, until placement is finished | No | No | None | Fails AC2 for a learner who leaves between Welcome and Placement. Acceptable only if A redefines AC2 as "after placement is finished". |
| **P2 Browser-local** | `localStorage`, key scoped to the user id (for example `muz-welcome-seen-<userId>`), read and written inside `try/catch` | Once per **browser** per account | Yes (until site data is cleared, or in a private window) | **No.** A new browser or device shows Welcome again | A browser storage value; no Supabase request | None with AC4. Must not be described as cross-device. Storage can be unavailable; then behave as P1. |
| **P3 Account-level** | On the account in the backend: either auth `user_metadata` (the same mechanism `savePlacement` already uses) or a `profiles` column (needs a migration) | Once per **account**, on every device | Yes | Yes | **Yes:** a Supabase write when Continue is pressed | Conflicts with the original "No database writes" rule and AC4 "no new Supabase requests"; A must lift both. A `profiles` column also touches C's F2 / SEC-01 permissions and the D14-R decision, and needs a migration (C designs, A approves). `user_metadata` is writable by the user, which is acceptable for a welcome flag (it is not security-relevant) but must not be reused for anything that is. `AuthContext.tsx` / `supabaseStore.ts` are not D's files: B or A writes the persistence call. |

- If **"once per account across devices"** is required, only **P3** satisfies it.
- **Do not** introduce any Supabase write (P3) until A has recorded U-25 **and** explicitly lifted the original "No database writes" rule for T-14.
- In `DashboardScreen.tsx`, the render line changes to: render `OnboardingWelcome` when `needsPlacement && !welcomeSeen`, and `PlacementModal` when `needsPlacement && welcomeSeen`, where `welcomeSeen` comes from the chosen option.

**4. Steps**
1. Create branch `task/T-14-onboarding-welcome` from `main`, after T-15 is merged.
2. Build the component, copying the classes from `PlacementModal.tsx`.
3. Ask A to record U-25 (P1, P2 or P3). Do not pick one yourself.
4. Wire it into `DashboardScreen.tsx` using the chosen option: only the state/storage line(s) and the render line. For P3, B or A provides the persistence function; you call it from `onContinue`.
5. Check it on staging with a **brand-new test account**:
   - Welcome → Placement → Dashboard;
   - log out and back in: Welcome does not appear again;
   - **new:** open Welcome, then reload **before** choosing a placement: record what happens and check it matches the chosen option;
   - **new (P2 and P3 only):** open the app in a second browser with the same account: record what happens and check it matches the chosen option (P2: Welcome shows again; P3: it does not).

**5. What "done" looks like**

New learners see the welcome step according to the recorded definition of "once".

**6. Testing**
- `npm test` and `npx tsc -p tsconfig.json`.
- The manual checks in step 5.
- Press Tab through the screen. The disabled cards must never get focus.

**7. Acceptance criteria**
1. New accounts see Welcome before Placement.
2. Returning accounts never see Welcome, **where "returning" is defined by U-25** (P1: has finished placement; P2: has seen Welcome in this browser or finished placement; P3: has seen Welcome on any device or finished placement). The PR states which definition applies.
3. Disabled cards cannot be chosen with the mouse or the keyboard.
4. P1 and P2: there are no new Supabase requests (check the Network tab). P3: exactly the one approved request, sent when Continue is pressed, and nothing else.
5. **New:** the PR and the KAN-235 comment state the persistence scope in plain words (for example "once per browser", never "once per account" for P2).

**8. Evidence**

The PR link, screenshots (including the reload-before-placement and second-browser checks), and a KAN-235 comment.

**Do NOT change:** `placement.ts`, `supabaseStore.ts`, `AuthContext.tsx`, `PlacementModal.tsx`. (For P3, the persistence call is added by B or A, not by D.)

### T-17 Draw flats on the staff and in labels (provisional)

**Status:** **CUT** (handoff §E.3, D's cut #1) unless A reinstates it. If reinstated, these requirements apply in full.

**1. Purpose**

The F-major lesson says "B flat", but the staff and the key label show A♯. The lesson is correct; the drawing is wrong (SRS 3.1.3.1).

**2. What exists now** (re-checked on `main` 2026-11-21)

`src/lib/theory/notes.ts` is 36 lines:
- `NOTE_NAMES` (line 1) is sharps only.
- `midiToName(midi)` (lines 7–9) returns names like `"A#4"`.
- `PITCH_CLASS_TO_STEP` (line 15) is `[0,0,1,1,2,3,3,4,4,5,5,6]`, so a black key sits on the step **below** it.
- `staffPosition(midi)` (lines 17–23) returns `{ diatonic, sharp }`.

`src/components/theory/GrandStaff.tsx` is 48 lines:
- Props are `{ notes, chord?, color? }` (lines 9–13).
- Line 31 calls `staffPosition(midi)` and destructures `{ diatonic, sharp }`.
- Lines 38–40 draw `♯` when `sharp` is true.

**Consumers found on `main` (re-run this search yourself before changing anything):**

| Function | Consumer | How it is used |
|---|---|---|
| `staffPosition` | `GrandStaff.tsx:31` | Destructures `{ diatonic, sharp }` (an extra `flat` field is ignored here) |
| `staffPosition` | tests | None found in `src/**/__tests__` |
| `midiToName` | `FindTheKeyView.tsx:34`, `PianoKeyboard.tsx:58,67,76`, `src/lib/theory/quiz.ts:150` | Called with one argument |
| `midiToName` | `NotationTest.tsx:34` | **`notes.map(midiToName)`**: `Array.map` passes the index as the second argument. With a new second parameter `spelling`, the index would be passed as the spelling. (`NotationTest.tsx` is on T-18's delete list; if T-18 has not merged yet, this call must be fixed or the file deleted first.) |

The lesson content is in `src/content/units/proficient.ts:150-165`: "F Major (One Flat)", a concept card with `notes: ns('F4 G4 A4 Bb4 C5 D5 E5 F5')`, and `findKey(…'Bb4'…)`. The builder parses "Bb4" into MIDI 70, which loses the flat spelling.

Places the note name or staff is shown:
- `NoteFigure.tsx:40` passes notes to `GrandStaff`.
- `FindTheKeyView.tsx:34` says "The highlighted key is {midiToName(...)}".
- `PianoKeyboard.tsx:58,67,76` labels keys.

The types are in `src/types/lesson.types.ts`: `ConceptCardExercise` (lines 75–84) and `FindTheKeyExercise` (lines 107–117). The builders are in `src/content/builders.ts`: `card(title, body, opts)` (lines 89–95) and `findKey(prompt, noteName, explanation, opts)` (lines 122+).

**3. What to change**

0. **Compatibility check first (new).** Changing `staffPosition`'s return from `{ diatonic, sharp }` to `{ diatonic, sharp, flat }` keeps the numeric and accidental values the same, but **the object shape is different.** Before claiming nothing breaks:
   - re-run `grep -rn "staffPosition\|midiToName" src` and list every consumer in the PR;
   - check each for shape assumptions: deep-equality assertions (`toEqual`, `toStrictEqual`), snapshots, `Object.keys` / spread / serialisation of the result, and callers that pass the function by reference (`.map(midiToName)`, `.map(staffPosition)`);
   - write the regression tests in step 9 **before** changing `notes.ts`, run them against the old code, and keep them passing after.
   Describe the change as backward-compatible in the PR only if this check found nothing; otherwise list what you changed to keep each consumer working.
1. **`notes.ts`:**
   - Add `export type Spelling = 'sharp' | 'flat';`.
   - Add `FLAT_NAMES = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']`.
   - Add `FLAT_STEP = [0,1,1,2,2,3,4,4,5,5,6,6]`. A flat sits on the step **above** it.
   - Change the signatures to `midiToName(midi, spelling: Spelling = 'sharp')` and `staffPosition(midi, spelling: Spelling = 'sharp')`.
   - `staffPosition` returns `{ diatonic, sharp, flat }`. `sharp` is true only for sharp spelling on a black key; `flat` is true only for flat spelling on a black key.
   - The defaults keep every current `diatonic` and `sharp` value **exactly the same**.
2. **`GrandStaff.tsx`:**
   - Add the prop `spelling?: Spelling` and pass it to `staffPosition`.
   - When `flat` is true, draw `♭` at the same place the sharp is drawn.
3. **`NoteFigure.tsx`:** add the prop `spelling?: Spelling` and pass it to `GrandStaff`. `ConceptCardView` passes `exercise.spelling`.
4. **`lesson.types.ts`** (A approves): add `spelling?: 'sharp' | 'flat'` to `ConceptCardExercise` and `FindTheKeyExercise`.
5. **`builders.ts`:** add `spelling?` to the `opts` of `card` and `findKey`, and pass it through.
6. **`FindTheKeyView.tsx:34`:** use `midiToName(x, exercise.spelling)` for both names.
7. **Content:**
   - In `proficient.ts`, add `spelling: 'flat'` to the F-major card (line ~154) and to the `findKey` on line ~161.
   - Search for other flat content with `grep -rn "Bb\|Eb\|Ab\|Db\|Gb" src/content`, and add `spelling: 'flat'` where the text is written with flats.
8. **Seed:** run `npm run seed:lessons`, then commit the changed `supabase/seed.sql`. (Applying the seed to a hosted database is A's step, not D's.)
9. **Tests:** add a file `src/lib/theory/__tests__/notes.test.ts` (that folder does not exist yet), checking:
   - **Regression (write first, run against the old code):** for every MIDI number from 21 to 108, `staffPosition(m).diatonic` and `staffPosition(m).sharp` equal the values the current code returns (compute the expected values from the current `PITCH_CLASS_TO_STEP` / `isBlackKey` rule in the test, or record them before the change); and `midiToName(m)` equals the current sharp name. Assert these **field by field**, not with a whole-object deep equality, so the test is valid before and after the new field is added.
   - `midiToName(70) === 'A#4'` (unchanged);
   - `midiToName(70, 'flat') === 'Bb4'`;
   - `staffPosition(70, 'flat')` equals `{ diatonic: staffPosition(71).diatonic, sharp: false, flat: true }` (B♭4 sits on the B4 line);
   - `staffPosition(70)` equals `{ diatonic: staffPosition(69).diatonic, sharp: true, flat: false }`;
   - `staffPosition(60, 'flat')` gives `flat: false` (white keys have no accidental);
   - `[60, 61].map((m) => midiToName(m))` is unchanged, and any remaining `.map(midiToName)` call site has been changed to pass only the MIDI number.

**Known limit, outside this task.** Practice drills label their targets with sharps (`src/practice/PracticeDrill.ts`, which belongs to A; U-19: out of scope). Note this in your PR. Do not change that file.

**4. Steps**
1. Create branch `task/T-17-flats`.
2. Do the compatibility check (item 0) and write the regression tests; run them against the unchanged code (they must pass).
3. Write the new `notes.test.ts` cases, then change `notes.ts`.
4. Then change `GrandStaff`, `NoteFigure`, `ConceptCardView`, the types and builders, `FindTheKeyView`, and the content, in that order.
5. Run `npm run seed:lessons`, then `npm run seed:lessons:check`, then `npm test`, then `npx tsc -p tsconfig.json` (it catches a `.map(midiToName)` call that now passes an index as `spelling`).
6. Check visually on `npm run dev`:
   - the F-major card shows B♭;
   - three sharp lessons look **exactly** as before (for example the G-major or D-major lessons in `proficient.ts`; any lesson containing F#).

**5. What "done" looks like**

Flat-spelled content shows flats, and nothing else changes, with evidence for every existing consumer.

**6. Testing**

The new unit tests (regression and new behaviour), the seed check, `npm test`, `npx tsc`, and before/after screenshots.

**7. Acceptance criteria**
1. Every `notes.test.ts` case passes, and the regression tests passed **before** the change too.
2. The F-major card shows B♭ on the staff, and the find-the-key feedback says "Bb4".
3. Three sharp lessons are visually unchanged.
4. `seed:lessons:check` passes.
5. **New:** the PR lists every consumer of `staffPosition` and `midiToName`, what was checked for each, and any change made to keep it working.

**8. Evidence**

The PR link, screenshots, the consumer list, and the test output. A reviews.

**If you make no progress for 1 day, tell A. A decides whether to reassign or keep it cut.**

### T-21 Media-privacy and offline-execution audit

**Status:** **READY** once a staging URL exists (C's T-05 Part 1 open item). A's T-08 is merged (PR #31).

**1. Purpose**

The SRS forbids sending any camera video or microphone audio off the computer (SRS 3.5.1), and says video and pitch analysis must keep working without a network (SRS 3.7.4). This task produces the evidence.

**2. What exists now**

Code inspection found no upload code. This has not yet been checked with a real network capture.

**3. What to create**

`docs/test/MEDIA_PRIVACY_REPORT.md`.

**Handling the capture (new, mandatory):**
- A HAR file can contain **authentication tokens, session cookies, user ids, email addresses and full request payloads.** Treat it as a secret.
- Keep the HAR file on your own computer only. **Never commit it** (to any branch), attach it to a PR or Jira issue, or post it in chat. Delete it when A has accepted the report.
- Screenshots and pasted excerpts in the report must be **redacted**: remove or blur `Authorization` / `apikey` headers, cookies, access and refresh tokens, emails, usernames, and user ids. Show host, path, method, status, size and content type only.
- Use a dedicated **test account**, not a real user's account.

**4. Steps** (on the staging URL, in Chrome)
1. Sign in with the test account. Open DevTools → Network. Tick "Preserve log" and "Disable cache".
2. Open a **posture-hold** lesson (search `posture-hold` in `src/content/units/novice.ts` to find one). Click "Turn on camera" and stay in view for 60 seconds.
3. Open a **play-chord** lesson. Click "Turn on microphone" and play or hum for 60 seconds.
4. Right-click the request list → "Save all as HAR". Save it as `privacy-<day>.har` on your own computer (outside the repo folder).
5. In the report, list every different host and file type. You should see only:
   - the staging site: `.js`, `.css`, `.wasm`, `.task` files;
   - `…supabase.co/rest/v1/…` (JSON) and `…supabase.co/auth/v1/…`.
   - If the trusted progression operation (U-23) is deployed, its endpoint (for example `…supabase.co/rest/v1/rpc/…` or `…supabase.co/functions/v1/…`) also appears; list it.
6. Sort by Size. Apart from the `.wasm`, `.task` and `.js` downloads, nothing should be over 10 kB. Open the **Payload** tab of each Supabase POST/PATCH. It must contain only numbers, ids and short text; no long base64 text or binary data.
7. Filter by "WS" (WebSockets). There should be none.
8. While a drill is running, set the Network throttle to **Offline**. The skeleton drawing must keep moving, and playing the correct chord must still be detected.
9. Write pass/fail for steps 5–8, with redacted screenshots.

**Unexpected requests (new).** A request to an unexpected host (for example a browser extension, a font or CDN host, Vercel analytics or the Vercel toolbar on Preview deployments) is **not** automatically a media-privacy leak, and is **not** automatically harmless. For each one, record: host, initiator (DevTools "Initiator" column), size, content type, and whether it also appears with the camera and microphone **off**. Then:
- if it carries no media and is explained (for example an extension: re-test in a clean profile or incognito with extensions off), mark it "explained" with the reason;
- if it could carry media, or you cannot explain it, report it to A **before** marking the step pass.

**5. What "done" looks like**

A report with pass/fail for every step, with no secrets in it.

**6. Testing**

This task is the test.

**7. Acceptance criteria**

1. Every step has a pass/fail and a redacted screenshot.
2. Any request you cannot explain is reported to A before you mark that step pass.
3. **New:** no HAR file is in the repository (`git ls-files "*.har"` prints nothing), and no screenshot or excerpt shows a token, cookie, email or user id.

**8. Evidence**

The report link and a KAN-276 comment.

### T-22 Browser and hardware compatibility matrix, plus the defect log

**Status:** waits for IC-3.

**1. Purpose**

Check that the app works across browsers and devices (SRS 3.7.2, 3.3.1, 3.2.2), and keep the SPMP issue log (SPMP §10; KAN-280).

**2. What exists now**

No compatibility testing has been done.

**3. What to create**
- `docs/test/COMPATIBILITY_MATRIX.md`.
- Entries in the SPMP issue-log sheet, which is linked in SPMP §10.1.

**4. Steps** (D10–D12, on staging, after the IC-3 freeze)

The matrix columns are Chrome, Edge and Firefox (add Safari if a Mac is available), each tested twice: with the built-in camera and mic, and with a USB camera and mic.

Record at the top of the matrix: the staging URL (no keys), the commit tested, the date, and for each column the browser version, operating system and device model.

Run these rows in each column:

| Row | What to check |
|---|---|
| 1 | Sign up and log in |
| 2 | Theory lesson, including the Listen button |
| 3 | Rhythm lesson: spacebar works and the score counter shows |
| 4 | Posture hold: the skeleton shows, green when correct, red with text when wrong |
| 5 | Play-note drill |
| 6 | Play-chord drill |
| 7 | Block the camera in the site settings, then open a posture lesson: a help message appears, the app does not crash, and "Try again" works after allowing the camera |
| 8 | Block the microphone: same checks as row 7 |
| 9 | Unplug the USB camera or mic during a drill: a message appears, the timer pauses, and **no heart is lost** |
| 10 | Window narrower than 1024 px: the warning appears on login, on the dashboard and in a lesson |
| 11 | Reload during a lesson: no crash |

Mark each cell **pass**, **fail** (with a defect ID) or **n/a**.

**Rules for `n/a` (new):**
- Use `n/a` when the browser, device or accessory was **not available** or the row does not apply (for example no Mac for Safari, no USB microphone). Every `n/a` must give a reason in the cell or a footnote (for example "n/a: no Mac available (U-10)").
- An untested cell is **never** marked pass. A cell is pass only if you ran that row on that browser and device and saw the expected result.
- **Do not fill in results from memory, from another column, or from what "should" happen.** If a run was interrupted, the cell stays empty until it is re-run, or becomes `n/a` with the reason.

For every fail, add an issue-log row with all 9 SPMP fields:
1. id
2. description
3. date
4. affected component
5. priority (A fills this)
6. assigned to (A fills this)
7. status
8. proposed solution
9. date resolved

For P0 and P1 defects, also create a Jira Bug. Tell A the same day.

**5. What "done" looks like**

A complete matrix and the defect entries.

**6. Testing**

This task is the test. **Do not fix bugs during this task.**

**7. Acceptance criteria**

Every cell is filled in (pass, fail or `n/a`); every fail has a defect ID; **every `n/a` has a reason**; no cell is marked pass without a run.

**8. Evidence**

The matrix link, the issue-log link, and comments on KAN-279 and KAN-280.

### T-26 Update the SRS/SDD to v01.02 and write the test appendix

**Status:** SRS/SDD drafting is **A's** (handoff §F). D writes the **test appendix only**. Final content **BLOCKED** on U-23 / D14-R and on the test reports.

**1. Purpose**

SPMP 3.3 and 12 require the documents to match the **delivered** system. The audit found 14 places where they disagree. The security audit adds one more area that is still moving: how progression is saved and secured.

**2. What exists now**
- `docs/decisions/RULINGS.md` (from A's T-02) says which rulings need a document edit. D14 currently reads "accept client-side modification of a user's own progression data as a documented capstone risk; server-side save RPC deferred to T-28". **That ruling is being revisited (D14-R).**
- `docs/decisions/T-02_SPEC_EDIT_GUIDE.md` is A's edit guide for the SRS/SDD.
- `docs/audit/REQUIREMENTS_TRACEABILITY_MATRIX.md` is the updated requirements matrix.
- The original SRS and SDD Word files are held by the team. Their location is not in the repo (see U-11).

**3. What to change**

*D's part: the test appendix*
- An appendix that links the reports from T-19, T-20, T-21, T-22 and T-23, each with its date, commit and environment.
- For T-20 and T-23, the appendix states which progression architecture and which D14-R outcome the tests were run against.

*A's part (for reference): the SRS/SDD edits*
- For each ruling marked "doc edit = Y", edit that section of the SRS or SDD. Add a revision-history row "v01.02"; update SDD §7 to match the audit matrix.

*Rules for both parts (new):*
- **Describe the delivered implementation, not the plan.** If the trusted progression operation (U-23, T-28) is delivered, SDD 3.3 and the progression sections must describe it; if it is not delivered, they must describe the client-side model **and** D14's stated limitation ("not protection against self-manipulation"). Never describe a planned control as if it exists.
- **Do not finalise any section that depends on an open decision** (U-23, U-24, D14-R, U-25). Mark it "pending decision <ID>" in the change list, and finish it after the decision and the code have merged.
- **Before sign-off, re-check every changed section against `main` on the day**, not against this guide, so the documents are not already out of date when they are published.

**4. Steps**
1. D9: make the appendix outline (one row per report, with its status).
2. As each report is completed, add its link, date, commit and environment.
3. After U-23 / D14-R are recorded and the related code is merged, add the architecture line for T-20 and T-23.
4. D14: A reviews and approves, then exports the PDFs.

**5. What "done" looks like**

SRS and SDD v01.02, consistent with the delivered code, with a test appendix that links real reports.

**6. Testing**

Read the appendix back against the reports; read the documents back against `RULINGS.md` and against `main` on the sign-off day.

**7. Acceptance criteria**

A signs off. Requirements that have no ruling are not reworded. **New:** no section describes a security or progression mechanism that is not in the delivered code; every section that depended on an open decision is either finished after that decision or explicitly marked as pending.

**8. Evidence**

The PDFs and a NEW-08 comment.

---

## D. Git and pull-request instructions

| Item | Rule |
|---|---|
| Branch names | `task/T-16-rhythm-tests`, `task/T-15-ui-fixes`, `task/T-18-dead-code`, `task/T-14-onboarding-welcome`, `task/T-17-flats` (if reinstated), all from an up-to-date `main` |
| Order | T-15 must merge **by D3**, because B and C build on `DashboardScreen.tsx` and `App.tsx` after you (items 2–8 may merge first if item 1 waits for B, with A's agreement). Start T-18 and T-14 after T-15 is merged. |
| Do not touch | `src/audio/**`, `src/vision/**`, `src/practice/**`, `AuthContext.tsx`, `LoginPage.tsx`, `ProfileAnalyticsView.tsx`, `src/lib/progress/**`, `src/lib/sync/**`, `supabase/migrations/**`, any `// SPEC` value, **any hosted Supabase project** (no SQL, no table edits on real users' rows). Make only the one-line additions to `runner.ts` and `lesson.types.ts` described above. |
| Never commit | HAR files, screenshots with tokens/cookies/emails/user ids, `.env*` files |
| Commits | One per item: `T-15(3): unify the 0-heart rule with the lesson runner` |
| Your PR must include | The acceptance checklist with ticks, screenshots, test output, "what I did not check", and **any open decision the PR depends on** |
| Reviewer | A (U-17) |
| Must pass before merge | `npm test`, `npx tsc -p tsconfig.json`, `npm run build`, `npm run seed:lessons:check`. These run in CI automatically (PR #30). |

---

## E. Coordination and handoffs

| Task | You wait for | Who waits for you | What to agree | Tell someone when | What to say |
|---|---|---|---|---|---|
| T-16 | — (D13 decided) | — | Upper-bound option (evidence or cap); U-35 if A wants the per-target denominator | PR open (D2) | Test names; which upper-bound option |
| T-15 | B (profile status, item 1); A (U-37 wording) | **B (T-10, T-12), C (T-13), you (T-14, T-18)** | A approves the `lessonNeedsHearts` export; B and you agree the profile-status names | Merged (D3) | "T-15 merged; DashboardScreen and App are free" |
| T-18 | T-15 merged | — | — | PR open (D4) | The deleted list |
| T-14 | T-15 merged; A (U-25; keep T-14 or not); B or A (persistence call, P3 only) | — | Persistence option | PR open (D5) | Screenshots; the persistence scope in plain words |
| T-17 | A reinstates it | — | A approves the type addition | Stuck 1 day → tell A | Where you got stuck |
| T-21 | A's T-08 (merged); a staging URL (C's T-05) | A (release check) | — | D8 | Report link |
| T-22 | IC-3 freeze (D9) | A (triage) | — | Each fail, same day | Defect ID and steps to reproduce |
| T-26 | A (T-02 rulings; U-23, D14-R); the test reports | Final delivery | Appendix content | D14 | Appendix link |

---

## F. Daily checklist

**Start of the day**
1. `git switch main && git pull`.
2. Check the review comments on your open PRs, and answer them first.
3. Find today's task in §B. If its status says BLOCKED or DECISION REQUIRED, check whether the decision has been recorded; if not, do the "while waiting" item.

**During the day**
- Work on one numbered item at a time.
- Commit after each item.
- Run `npm test` before pushing.

**When to ask for help**
- After half a day stuck.
- If the brief does not say what to do.
- If a test that already existed fails.

**End of the day**
- Push your work.
- Post your status.
- Update Jira.

**Daily status** (post by 09:30):
```
Yesterday's progress:
Today's target:
Current blocker:
Jira ticket:
Expected deliverable:
```
