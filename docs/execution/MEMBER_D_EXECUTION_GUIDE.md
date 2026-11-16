# Member D Execution Guide: Bernante (Frontend / UI / QA / Documentation)

> **Self-contained.** This guide covers everything D needs. Task IDs match `docs/audit/TASK_DECOMPOSITION.md`. Days are relative working days: D1 is the first day after the plan is accepted. No calendar dates are set yet.
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
> Baseline on 2026-11-16: 387 tests, all passing. There is no `gh` CLI, so open PRs on `https://github.com/markuu-exe/MUZ`.

## Rules for every D task

These rules are part of every brief below.

1. **Scope.** Change only the files and lines named in the brief. If you think something else needs changing, ask A first.
2. **PR size.** Keep each PR under about 300 changed lines. One commit per numbered item, with the message `T-xx(n): what changed`.
3. **Checks before every push.** Run `npm test` and `npx tsc -p tsconfig.json`. Both must pass.
4. **Screenshots.** Every UI change needs before/after screenshots in the PR.
5. **Review.** Every PR is reviewed before merge. A merges.
6. **Blocked?** If you are stuck for more than half a day, message A. This is expected; it is not a failure.
7. **No restyling.** Do not change colours, fonts, spacing or wording beyond what the brief says.

---

## A. Role overview

| Item | Detail |
|---|---|
| Role | Frontend developer for small, well-defined UI fixes. Also runs scripted QA (privacy audit, compatibility matrix) and drafts the documentation update. |
| Ownership areas | Dashboard layout and copy: `DashboardScreen.tsx` (only the lines named), `SkillTreeView.tsx`, a new `OnboardingWelcome.tsx`. Rhythm-view copy in `TapExerciseView.tsx`. `MediaDiagnostics.tsx` copy. `ViewportGuard.tsx`. `src/lib/dashboard/curriculum.ts` (helpers and tests). `src/lib/theory/notes.ts` and `GrandStaff.tsx` (T-17). Test documents `docs/test/MEDIA_PRIVACY_REPORT.md` and `docs/test/COMPATIBILITY_MATRIX.md`. The SPMP issue log. SRS/SDD v01.02 drafts. |
| Delivers | T-16, T-15, T-18, T-14, T-17, T-21, T-22, T-26. Help recording T-19 numbers if time allows. |
| Can change on your own | Only what each brief lists |
| Needs approval from A | Any change in `src/lesson/runner.ts` or `src/types/lesson.types.ts` (both small and listed below); deleting any file not on the T-18 list; changing a test that already exists |
| Reports to | A, by daily status post |
| Works directly with | A (reviewer), C (helps with T-16 and T-17, reviews T-17), B (reviews T-14) |

---

## B. Personal task schedule

| Task | Jira | Priority | Effort | Earliest start (reason) | Target done | Reviewer | Status (Jira Nov 15 → plan) |
|---|---|---|---|---|---|---|---|
| T-16 Rhythm tests + consistency formula | KAN-244, KAN-239 | P1 | 1.5 d | D1 (tests); formula after ruling D13 (D1 meeting) | D2 | A (C helps) | Done → follow-up pending |
| T-15 Eight UI fixes *(provisional)* | KAN-236, KAN-237, KAN-238 | P1 | 2 d | D2 | D3, merged **before** B's T-10 and T-12 | A | In progress (Neve) |
| T-18 Remove dead code | NEW-07 (proposed) | P2 | 1 d | D4 | D4 | A (C for theory files) | pending |
| T-14 Onboarding welcome step | KAN-235, KAN-231 | P2 | 1 d | D5 (after T-15 is merged; same file) | D5 | B | In progress (Neve) |
| T-17 Draw flats *(provisional)* | NEW-06 (proposed bug) | P2 | 2 d | D6 | D7 | C, then A | pending |
| T-21 Media-privacy audit | KAN-276 | P1 | 1 d | D8 (**hard:** A's T-08 merged D6) | D8 | A | To do |
| T-26 SRS/SDD v01.02 drafts | NEW-08 (proposed) | P1 | 3 d spread | D9 (**hard:** T-02 rulings) | D14 | A | pending |
| T-22 Compatibility matrix + defect log | KAN-279, KAN-280 | P1 | 3 d | D10 (**hard:** feature freeze IC-3, D9) | D12 | A | To do |
| T-24 fixes in your area | KAN-281 | P1 | as assigned | D12 | D13 | A | — |

**Workload warning.** This is about 14.5 days of small tasks in 14 days. It is too full.
- If you fall behind, **T-17 goes to C** (after 1 day stuck) and **T-18 can wait**. A decides.
- Helping with T-19 recording (D7–D8) is **optional**. Do it only if T-17 is already done.

**While waiting**
- **D1, before ruling D13:** write the timing boundary tests (part 1 of T-16).
- **D8, after T-21:** start the T-26 change list from `docs/decisions/RULINGS.md`.
- **D9 (freeze day):** prepare the T-22 matrix table and the issue-log columns.

---

## C. Detailed instructions for each task

### T-16 Rhythm timing tests, consistency formula, heart-restore tests

**1. Purpose**

The SRS defines Perfect as ≤ 25 ms, Good as ≤ 50 ms and Miss as anything slower (SRS 3.1.4.3). No test checks those exact edges. The "consistency" score also ignores missed beats: one perfect hit out of ten beats scores 100 %. This task adds the tests and fixes the formula.

**2. What exists now** (`src/lib/rhythm/timing.ts`, 66 lines)
- `PERFECT_MS = 25`, `GOOD_MS = 50`, and `POINTS` = Perfect 100 / Good 70 / Miss 0 (lines 4–11).
- `classifyDelta(deltaMs)` (lines 13–18) uses `Math.abs`. This is correct; do not change it.
- `summarize(taps, passedBeats)` (lines 37–66) counts perfect, good and miss.
- `consistency` is computed at lines 53–54 as `100 − average(|Δ|)/50 × 100`, **over matched taps only**. This is the bug.
- Where `consistency` goes: it is shown in `LessonResults.tsx:73` and saved as `performance_records.rhythm_consistency`. `plan.ts`'s pass/fail score does **not** use it, so changing it cannot change who passes.
- Existing tests in `src/lib/rhythm/__tests__/`: `plan.test.ts` and `notation.test.ts`. There is no `timing.test.ts` yet.
- Hearts: `runner.ts:22` sets `THEORY_RESTORE_THRESHOLD = 80`, and `runner.ts:163-164` restores a heart when the first-try theory score is ≥ 80, the run was not a quit, and hearts are below 5.
- `src/lesson/__tests__/runner.test.ts` has helpers `payloadOf(id)` and `runAll(state, decide)` (lines 10–21). Lesson `pno-mod2-node1` has **5 graded theory exercises and no practice exercises** (checked 2026-11-16).

**3. What to change**
- New file `src/lib/rhythm/__tests__/timing.test.ts`.
- In `src/lib/rhythm/timing.ts`, change **only** the `consistency` lines (53–54) to the formula decided in ruling D13. The recommended formula is:

  ```ts
  const consistency = passedBeats > 0
    ? Math.round((100 * matched.reduce((sum, t) => sum + Math.max(0, 1 - Math.abs(t.deltaMs) / GOOD_MS), 0)) / passedBeats)
    : 0;
  ```

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
3. Run `npx vitest run src/lib/rhythm`. Only the "1 of 10" test should fail.
4. **Wait for ruling D13.** Then change lines 53–54 and run the command again. Everything should pass.
5. In `runner.test.ts`, add the three heart-restore cases:
   - **Restore:** `createLessonRun('pno-mod2-node1', payloadOf('pno-mod2-node1'), 3, 0)`. Fail exactly one graded theory exercise on its first try and pass everything else. Because it is not a checkpoint lesson, the failed one is re-queued and passed later. Expect `buildLessonResult(s).heartRestored === true` and `heartsEnd === 4`.
   - **No restore:** fail two of the five on first try (60 %). Expect `heartRestored === false`.
   - **Already full:** start with 5 hearts and pass everything. Expect `heartRestored === false` and `heartsEnd === 5`.

   Inside `runAll`, use `currentItem(s)` to see the exercise type and attempt. Only fail when `attempt === 1` and the type is not `'concept-card'`.
6. Run `npm test`. Everything must pass.

**5. What "done" looks like**

A new test file, a corrected formula, and three new runner tests.

**6. Testing**

Run `npx vitest run src/lib/rhythm src/lesson`, then `npm test`.

**7. Acceptance criteria**
1. Every new test passes.
2. All 387 existing tests still pass.
3. The only change in `timing.ts` is the consistency lines.

**8. Evidence**

The PR link, a pasted copy of the test output, and a KAN-244 comment listing the test names.

**If `plan.test.ts` fails, stop and ask A. Do not edit `plan.test.ts`.**

### T-15 Dashboard and lesson UI fixes (eight items; provisional)

**1. Purpose**

Fix eight small, confirmed UI defects. Some show fake numbers to real users. Others are wrong labels, an inconsistent "no hearts" lock, a vague banner, a hidden screen-size warning, and wrong text.

**2. What exists now** (all checked 2026-11-16)

| # | File and line | What happens today |
|---|---|---|
| 1 | `src/components/dashboard/DashboardScreen.tsx:77-81` | `hearts = profile?.hearts ?? 4`, streak `: 7`, `exp = profile?.exp ?? 1240`. These are fake numbers shown while the profile is loading or missing. `DashboardHud` takes `hearts`, `streak`, `exp`, `nextHeartLabel` (`DashboardHud.tsx:4-9`) and is used at `DashboardScreen.tsx:314-319`. |
| 2 | `src/components/dashboard/SkillTreeView.tsx:199` | A mastered node shows `+{lesson.required_exp \|\| 50} XP`, which is the unlock threshold, not the reward. The reward is already on the node as `lesson.expReward` (`src/lib/dashboard/curriculum.ts:65`). |
| 3 | `DashboardScreen.tsx:164` and `SkillTreeView.tsx:117` | They disagree at 0 hearts. The first blocks lessons whose `kind === 'practice'`. The second blocks every lesson whose `kind !== 'theory'`, so rhythm lessons are blocked too. The real lesson engine only stops on **practice** exercises (`src/lesson/runner.ts:45`, `needsHearts`; `guardHearts` at lines 123–130). |
| 4 | `DashboardScreen.tsx:144-162` | The locked-node banner says "You must complete the prerequisite lesson nodes…" without naming which lesson. Unlock rules are in `nodeStatus` (`curriculum.ts:122-145`): the previous module must be complete, the previous node in this module must be complete, and EXP must be ≥ `required_exp`. |
| 5 | `src/App.tsx` (38 lines) and `src/components/common/ViewportGuard.tsx` | `<ViewportGuard />` only renders after login (App.tsx lines 33–36). Its overlay is `fixed inset-0 z-50`. The lesson player is also `fixed z-50` and comes later in the page, so it covers the guard. |
| 6 | `src/components/lesson/rhythm/TapExerciseView.tsx:180` | `{!done.score.passed && ' You will try this rhythm again.'}` also shows in checkpoint lessons, where there is no retry. The view receives `payload` (line 35), which has `isCheckpoint`. |
| 7 | `src/components/lesson/practice/MediaDiagnostics.tsx` | Line 75 always says "Practice exercises need both." `PostureHoldView.tsx:30` calls `mediaProblems(state, false)` (camera only) and renders `<MediaDiagnostics problems={problems} onRetry=… />` at line 90. |
| 8 | `TapExerciseView.tsx:55-58,140-141` | Live `counts.Perfect` and `counts.Good` are shown, but there is no score number. SDD 6.3 asks for a "Score counter". `POINTS` is exported from `src/lib/rhythm/timing.ts`. |

**3. What to change, item by item**

1. **Placeholder numbers.**
   - In `DashboardScreen.tsx`, change the fallbacks to `?? 0` and `: 0`.
   - Add `loading?: boolean` to `DashboardHudProps` and pass `loading={!profile}`.
   - In `DashboardHud.tsx`, when `loading` is true, show `—` instead of each number.
2. **XP label.** In `SkillTreeView.tsx:199`, show `+{lesson.expReward} XP`.
3. **0-heart rule.**
   - In `src/lesson/runner.ts`, add **one exported function** under `needsHearts`. This is A's file; A approves this addition in review.

     ```ts
     export function lessonNeedsHearts(payload: LessonPayload): boolean {
       return payload.stages.some((s) => s.exercises.some(needsHearts));
     }
     ```

   - In `DashboardScreen.tsx:164`, replace `lesson.kind === 'practice'` with `isLessonPayload(lesson.payload) && lessonNeedsHearts(lesson.payload)`. `isLessonPayload` is already imported at line 40, from `src/types/lesson.types`.
   - In `SkillTreeView.tsx:117`, replace `lesson.kind !== 'theory'` with the same expression. Add the two imports.
4. **Banner names the lesson.**
   - In `src/lib/dashboard/curriculum.ts`, add a pure helper:

     ```ts
     export function blockingLesson(lesson: CurriculumNode, catalog: CurriculumNode[], progress: ProgressMap): CurriculumNode | null
     ```

     It returns the first lesson that is not completed, checking in this order: the previous node in the same module, then the earliest incomplete lesson of the previous module. It returns `null` if the only reason is EXP.
   - In `DashboardScreen.tsx:150-156`, when the helper returns a lesson, the message becomes `Finish "${blocking.title}" first to unlock "${lesson.title}".`. Keep the existing EXP message for the EXP case.
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

**4. Steps**
1. Create branch `task/T-15-ui-fixes` from `main`.
2. Do items 1 to 8 in order, one commit each, named `T-15(1): …` through `T-15(8): …`.
3. After each item, run `npx tsc -p tsconfig.json`.
4. Write `nodeStatus.test.ts`, then run `npm test`.
5. Run `npm run dev` and check each item on screen:
   - Window **1300 px** wide: dashboard, skill tree, one rhythm lesson, one posture lesson.
   - Window **1000 px** wide: the warning shows on the login page, on the dashboard, and inside a lesson.
6. Open the PR with a before/after screenshot for each item. **It must merge by D3**: B and C start work on these files after you.

**5. What "done" looks like**

All eight items are fixed, and the new tests pass.

**6. Testing**

`npm test`, plus the manual checks in step 5. For item 3:
- set hearts to 0 in the staging table editor, or ask B to;
- a practice lesson shows the "no hearts" message;
- theory and rhythm lessons still open.

**7. Acceptance criteria**
1. A screenshot proves each of the eight items.
2. The new `nodeStatus` tests pass.
3. All existing tests pass.
4. Your diff to `runner.ts` is only the new `lessonNeedsHearts` export.

**8. Evidence**

The PR link, eight before/after screenshot pairs, the test output, and comments on KAN-236, KAN-237 and KAN-238.

**Do NOT change:** the rest of `runner.ts`, `applyResult.ts`, `AuthContext.tsx`, any colours or layout, or `ProfileAnalyticsView.tsx` (that file belongs to B).

### T-18 Remove dead code

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

**Do NOT delete:** `GrandStaff.tsx`, `PianoKeyboard.tsx`, `src/lib/theory/notes.ts`, `src/lib/theory/playNote.ts`, `useSpacebarTap.ts`, `useRhythmJudge.ts`, `src/lib/rhythm/timing.ts` (these are all used), `src/vision/posture/session.ts` (it is exported and tested), or `src/hooks/useAudioAnalysis.ts` and `src/lib/audio/noteFrequencies.ts` (C deletes those in T-07).

### T-14 Onboarding welcome step (Piano only)

**1. Purpose**

The SRS says Piano is the only instrument (SRS 3.1.1.2–3.1.1.3), and KAN-235 asks for an instrument-selection screen. Today Piano is chosen silently. This task adds a short welcome screen that shows Piano selected and the other instruments disabled.

**2. What exists now**
- `DashboardScreen.tsx:96-103` computes `needsPlacement`. It is true for a new learner who has no progress and no saved placement, when not in demo mode.
- Line 651 renders `{needsPlacement && <PlacementModal onChoose={choosePlacement} />}`.
- `src/components/dashboard/PlacementModal.tsx` is the visual style to copy.

**3. What to change**
- Create one new file, `src/components/dashboard/OnboardingWelcome.tsx`, with `export default function OnboardingWelcome({ onContinue }: { onContinue: () => void })`. It contains:
  - a heading, "Welcome to MUZ";
  - one selected "Piano" card;
  - two disabled cards, "Guitar: coming soon" and "Voice: coming soon", each with `aria-disabled="true"`, `tabIndex={-1}`, greyed out and not clickable;
  - a "Continue" button that calls `onContinue`.
- In `DashboardScreen.tsx`:
  - add `const [welcomeDone, setWelcomeDone] = useState(false);`;
  - change line 651 to render `OnboardingWelcome` when `needsPlacement && !welcomeDone`, and `PlacementModal` when `needsPlacement && welcomeDone`.
- No database writes.

**4. Steps**
1. Create branch `task/T-14-onboarding-welcome` from `main`, after T-15 is merged.
2. Build the component, copying the classes from `PlacementModal.tsx`.
3. Wire it into `DashboardScreen.tsx`: only the state line and the render line.
4. Check it on staging with a **brand-new account**: Welcome → Placement → Dashboard. Then log out and back in: the welcome screen does not appear again.

**5. What "done" looks like**

New learners see the welcome step once.

**6. Testing**
- `npm test` and `npx tsc -p tsconfig.json`.
- The manual check in step 4.
- Press Tab through the screen. The disabled cards must never get focus.

**7. Acceptance criteria**
1. New accounts see Welcome before Placement.
2. Returning accounts never see Welcome.
3. Disabled cards cannot be chosen with the mouse or the keyboard.
4. There are no new Supabase requests (check the Network tab).

**8. Evidence**

The PR link, screenshots, and a KAN-235 comment.

**Do NOT change:** `placement.ts`, `supabaseStore.ts`, `AuthContext.tsx`, `PlacementModal.tsx`.

### T-17 Draw flats on the staff and in labels (provisional)

**1. Purpose**

The F-major lesson says "B flat", but the staff and the key label show A♯. The lesson is correct; the drawing is wrong (SRS 3.1.3.1).

**2. What exists now**

`src/lib/theory/notes.ts` is 36 lines:
- `NOTE_NAMES` (line 1) is sharps only.
- `midiToName(midi)` (lines 7–9) returns names like `"A#4"`.
- `PITCH_CLASS_TO_STEP` (line 15) is `[0,0,1,1,2,3,3,4,4,5,5,6]`, so a black key sits on the step **below** it.
- `staffPosition(midi)` (lines 17–23) returns `{ diatonic, sharp }`.

`src/components/theory/GrandStaff.tsx` is 48 lines:
- Props are `{ notes, chord?, color? }` (lines 9–13).
- Line 31 calls `staffPosition(midi)`.
- Lines 38–40 draw `♯` (`♯`) when `sharp` is true.

The lesson content is in `src/content/units/proficient.ts:150-165`: "F Major (One Flat)", a concept card with `notes: ns('F4 G4 A4 Bb4 C5 D5 E5 F5')`, and `findKey(…'Bb4'…)`. The builder parses "Bb4" into MIDI 70, which loses the flat spelling.

Places the note name or staff is shown:
- `NoteFigure.tsx:40` passes notes to `GrandStaff`.
- `FindTheKeyView.tsx:34` says "The highlighted key is {midiToName(...)}".
- `PianoKeyboard.tsx:58,67,76` labels keys.

The types are in `src/types/lesson.types.ts`: `ConceptCardExercise` (lines 75–84) and `FindTheKeyExercise` (lines 107–117). The builders are in `src/content/builders.ts`: `card(title, body, opts)` (lines 89–95) and `findKey(prompt, noteName, explanation, opts)` (lines 122+).

**3. What to change**

1. **`notes.ts`:**
   - Add `export type Spelling = 'sharp' | 'flat';`.
   - Add `FLAT_NAMES = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']`.
   - Add `FLAT_STEP = [0,1,1,2,2,3,4,4,5,5,6,6]`. A flat sits on the step **above** it.
   - Change the signatures to `midiToName(midi, spelling: Spelling = 'sharp')` and `staffPosition(midi, spelling: Spelling = 'sharp')`.
   - `staffPosition` returns `{ diatonic, sharp, flat }`. `sharp` is true only for sharp spelling on a black key; `flat` is true only for flat spelling on a black key.
   - The defaults keep every current result **exactly the same**.
2. **`GrandStaff.tsx`:**
   - Add the prop `spelling?: Spelling` and pass it to `staffPosition`.
   - When `flat` is true, draw `♭` (`♭`) at the same place the sharp is drawn.
3. **`NoteFigure.tsx`:** add the prop `spelling?: Spelling` and pass it to `GrandStaff`. `ConceptCardView` passes `exercise.spelling`.
4. **`lesson.types.ts`** (A approves): add `spelling?: 'sharp' | 'flat'` to `ConceptCardExercise` and `FindTheKeyExercise`.
5. **`builders.ts`:** add `spelling?` to the `opts` of `card` and `findKey`, and pass it through.
6. **`FindTheKeyView.tsx:34`:** use `midiToName(x, exercise.spelling)` for both names.
7. **Content:**
   - In `proficient.ts`, add `spelling: 'flat'` to the F-major card (line ~154) and to the `findKey` on line ~161.
   - Search for other flat content with `grep -rn "Bb\|Eb\|Ab\|Db\|Gb" src/content`, and add `spelling: 'flat'` where the text is written with flats.
8. **Seed:** run `npm run seed:lessons`, then commit the changed `supabase/seed.sql`.
9. **Tests:** add a file `src/lib/theory/__tests__/notes.test.ts` (that folder does not exist yet), checking:
   - `midiToName(70) === 'A#4'` (unchanged);
   - `midiToName(70, 'flat') === 'Bb4'`;
   - `staffPosition(70, 'flat')` equals `{ diatonic: staffPosition(71).diatonic, sharp: false, flat: true }` (B♭4 sits on the B4 line);
   - `staffPosition(70)` equals `{ diatonic: staffPosition(69).diatonic, sharp: true, flat: false }`;
   - `staffPosition(60, 'flat')` gives `flat: false` (white keys have no accidental).

**Known limit, outside this task.** Practice drills label their targets with sharps (`src/practice/PracticeDrill.ts:36-38`, which belongs to A). Note this in your PR. Do not change that file.

**4. Steps**
1. Create branch `task/T-17-flats`.
2. Write the `notes.test.ts` cases first, then change `notes.ts`.
3. Then change `GrandStaff`, `NoteFigure`, `ConceptCardView`, the types and builders, `FindTheKeyView`, and the content, in that order.
4. Run `npm run seed:lessons`, then `npm run seed:lessons:check`, then `npm test`.
5. Check visually on `npm run dev`:
   - the F-major card shows B♭;
   - three sharp lessons look **exactly** as before (for example the G-major or D-major lessons in `proficient.ts`; any lesson containing F#).

**5. What "done" looks like**

Flat-spelled content shows flats, and nothing else changes.

**6. Testing**

The new unit tests, the seed check, `npm test`, and before/after screenshots.

**7. Acceptance criteria**
1. Every `notes.test.ts` case passes.
2. The F-major card shows B♭ on the staff, and the find-the-key feedback says "Bb4".
3. Three sharp lessons are visually unchanged.
4. `seed:lessons:check` passes.

**8. Evidence**

The PR link, screenshots, and the test output. C reviews first, then A.

**If you make no progress for 1 day, hand the task to C. That is the plan, not a failure.**

### T-21 Media-privacy and offline-execution audit

**1. Purpose**

The SRS forbids sending any camera video or microphone audio off the computer (SRS 3.5.1), and says video and pitch analysis must keep working without a network (SRS 3.7.4). This task produces the evidence.

**2. What exists now**

Code inspection found no upload code. This has not yet been checked with a real network capture.

**3. What to create**

`docs/test/MEDIA_PRIVACY_REPORT.md`. Keep the HAR file on your computer and **do not commit it**: it contains login tokens.

**4. Steps** (on the staging URL, in Chrome, after A's T-08 is merged)
1. Sign in. Open DevTools → Network. Tick "Preserve log" and "Disable cache".
2. Open a **posture-hold** lesson (search `posture-hold` in `src/content/units/novice.ts` to find one). Click "Turn on camera" and stay in view for 60 seconds.
3. Open a **play-chord** lesson. Click "Turn on microphone" and play or hum for 60 seconds.
4. Right-click the request list → "Save all as HAR". Save it as `privacy-<day>.har` on your own computer.
5. In the report, list every different host and file type. You should see only:
   - the staging site: `.js`, `.css`, `.wasm`, `.task` files;
   - `…supabase.co/rest/v1/…` (JSON) and `…supabase.co/auth/v1/…`.
6. Sort by Size. Apart from the `.wasm`, `.task` and `.js` downloads, nothing should be over 10 kB. Open the **Payload** tab of each Supabase POST/PATCH. It must contain only numbers, ids and short text; no long base64 text or binary data.
7. Filter by "WS" (WebSockets). There should be none.
8. While a drill is running, set the Network throttle to **Offline**. The skeleton drawing must keep moving, and playing the correct chord must still be detected.
9. Write pass/fail for steps 5–8, with screenshots.

**5. What "done" looks like**

A report with pass/fail for every step.

**6. Testing**

This task is the test.

**7. Acceptance criteria**

Every step has a pass/fail and a screenshot. Any request you cannot explain is reported to A before you mark that step pass.

**8. Evidence**

The report link and a KAN-276 comment.

### T-22 Browser and hardware compatibility matrix, plus the defect log

**1. Purpose**

Check that the app works across browsers and devices (SRS 3.7.2, 3.3.1, 3.2.2), and keep the SPMP issue log (SPMP §10; KAN-280).

**2. What exists now**

No compatibility testing has been done.

**3. What to create**
- `docs/test/COMPATIBILITY_MATRIX.md`.
- Entries in the SPMP issue-log sheet, which is linked in SPMP §10.1.

**4. Steps** (D10–D12, on staging, after the IC-3 freeze)

The matrix columns are Chrome, Edge and Firefox (add Safari if a Mac is available), each tested twice: with the built-in camera and mic, and with a USB camera and mic.

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

Every cell is filled in, and every fail has a defect ID.

**8. Evidence**

The matrix link, the issue-log link, and comments on KAN-279 and KAN-280.

### T-26 Update the SRS/SDD to v01.02 and write the test appendix

**1. Purpose**

SPMP 3.3 and 12 require the documents to match the delivered system. The audit found 14 places where they disagree.

**2. What exists now**
- `docs/decisions/RULINGS.md` (from A's T-02) says which rulings need a document edit.
- `docs/audit/REQUIREMENTS_TRACEABILITY_MATRIX.md` is the updated requirements matrix.
- The original SRS and SDD Word files are held by the team. Their location is not in the repo (see U-11).

**3. What to change**

For each ruling marked "doc edit = Y", edit that section of the SRS or SDD, using the wording A gives you. Then:
- add a revision-history row "v01.02" to each document;
- update SDD §7 (the requirements matrix) to match the audit matrix;
- add an appendix that links the reports from T-19, T-20, T-21, T-22 and T-23.

**4. Steps**
1. D9: make a change list, one row per ruling, with the section number and the current text.
2. Ask A for the new wording of each technical change.
3. D11–D13: edit the Word files.
4. D14: A reviews and approves, then you export the PDFs.

**5. What "done" looks like**

SRS and SDD v01.02, consistent with the code.

**6. Testing**

Read the documents back against `RULINGS.md`; every "Y" row must be reflected.

**7. Acceptance criteria**

A signs off. Requirements that have no ruling are not reworded.

**8. Evidence**

The PDFs and a NEW-08 comment.

---

## D. Git and pull-request instructions

| Item | Rule |
|---|---|
| Branch names | `task/T-16-rhythm-tests`, `task/T-15-ui-fixes`, `task/T-18-dead-code`, `task/T-14-onboarding-welcome`, `task/T-17-flats`, all from an up-to-date `main` |
| Order | T-15 must merge **by D3**, because B and C build on `DashboardScreen.tsx` and `App.tsx` after you. Start T-18 and T-14 after T-15 is merged. |
| Do not touch | `src/audio/**`, `src/vision/**`, `src/practice/**`, `AuthContext.tsx`, `LoginPage.tsx`, `ProfileAnalyticsView.tsx`, `src/lib/progress/**`, `src/lib/sync/**`, `supabase/migrations/**`, any `// SPEC` value. Make only the one-line additions to `runner.ts` and `lesson.types.ts` described above. |
| Commits | One per item: `T-15(3): unify the 0-heart rule with the lesson runner` |
| Your PR must include | The acceptance checklist with ticks, screenshots, test output, and "what I did not check" |
| Reviewer | A (C first for T-17; B for T-14) |
| Must pass before merge | `npm test`, `npx tsc -p tsconfig.json`, `npm run build`, `npm run seed:lessons:check`. From D2 these run in CI automatically. |

---

## E. Coordination and handoffs

| Task | You wait for | Who waits for you | What to agree | Tell someone when | What to say |
|---|---|---|---|---|---|
| T-16 | A (ruling D13, D1) | — | The formula | PR open (D2) | Test names |
| T-15 | — | **B (T-10, T-12), C (T-13), you (T-14, T-18)** | A approves the `lessonNeedsHearts` export | Merged (D3) | "T-15 merged; DashboardScreen and App are free" |
| T-18 | T-15 merged | — | C checks the theory-file deletions | PR open (D4) | The deleted list |
| T-14 | T-15 merged | — | B reviews | PR open (D5) | Screenshots |
| T-17 | — | — | A approves the type addition; C reviews | Stuck 1 day → tell A | Where you got stuck |
| T-21 | A's T-08 merged (D6) | A (release check) | — | D8 | Report link |
| T-22 | IC-3 freeze (D9) | A (triage) | — | Each fail, same day | Defect ID and steps to reproduce |
| T-26 | A (T-02 rulings, wording) | Final delivery | Wording per ruling | D14 | PDFs |

---

## F. Daily checklist

**Start of the day**
1. `git switch main && git pull`.
2. Check the review comments on your open PRs, and answer them first.
3. Find today's task in §B.

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
