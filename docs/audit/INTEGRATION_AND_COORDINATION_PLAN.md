# Integration and Coordination Plan

**Integrator: Member A.** A merges every PR into `main` after its reviewer approves.

**Rule:** a task is never complete just because its owner says it is finished.

## 1. Components that must work together

```
LoginPage ─ AuthContext ─(trigger handle_new_user)─ profiles
   │
DashboardScreen ─ useDashboardData ─ lessons / user_progress / profiles
   │    ├ OnboardingWelcome (T-14) → PlacementModal → supabaseStore.savePlacement
   │    ├ SkillTreeView (nodeStatus, 0-heart rule)
   │    ├ ProfileAnalyticsView ─ useAnalyticsData (T-12) ─ performance_records / user_achievements
   │    └ LessonPlayer ─ runner.ts ─ exerciseRegistry
   │          ├ theory views ─ GrandStaff / PianoKeyboard / playNote
   │          ├ TapExerciseView ─ useRhythmSession ─ useSpacebarTap / useRhythmJudge / timing.ts
   │          └ PracticeRigProvider ─ PracticeRig
   │                 ├ CameraService → FrameLoop → posture.worker (MediaPipe) → HudEngine
   │                 └ AudioInputService → chroma.worklet (+pitchy T-08) → Chord/Note/PitchVerifier
   │                        └ PracticeDrill → WaitStateMachine (posture ∧ audio within 400 ms)
   └ on finish: buildLessonResult → saveLessonResult(ProgressStore) → applyResult
                     ├ achievements (T-11)
                     └ QueuedProgressStore / sync_queue (T-13) → Supabase
```

## 2. Contracts and data agreements

| Contract | Owner | Consumers | Where | Change rule |
|---|---|---|---|---|
| `AcousticFrame` (+ `pitchHz?`, `clarity?`) | A | C (PitchVerifier), PracticeDrill | `src/audio/practice/ChordVerifier.ts:6-14` | Fields may be added, never removed. A approves. |
| `AcousticVerifier` | A | Chord / Note / PitchVerifier | `ChordVerifier.ts:35-39` | Frozen |
| Worklet message protocol | A | AudioInputService | `src/audio/worklet/protocol.ts` | A only |
| Posture worker protocol | A | PracticeRig, FrameLoop | `src/vision/posture/workerProtocol.ts` | A only |
| `LessonResult` (+ `runId` in T-13) | A | `applyResult`, the sync queue | `src/lesson/types.ts:36-53` | A approves |
| `ProgressStore` (+ 2 achievement methods) | B (T-11) | C (T-13 decorator) | `src/lib/progress/saveLessonResult.ts:11-17` | B, then C, in that order; A approves |
| `useAnalyticsData` return shape | B | ProfileAnalyticsView | new in T-12 | B |
| DB schema | A approves | all | `supabase/migrations/` | **New migration files only.** Never edit `20260509120000_initial_schema.sql`. One migration PR open at a time. Update `src/types/database.types.ts` in the same PR. |
| Lesson content → seed | A | DB | `src/content/**` → `npm run seed:lessons` | Any content change must regenerate `seed.sql`. CI runs `seed:lessons:check`. |

### Shared database changes planned

There is only one:

- **T-13:** `performance_records.run_id uuid unique`
- **Owner:** C. **Approver:** A.
- **Apply to:** staging on D7, production in T-25.

Tasks T-11 and T-12 use the existing tables. The seeded `achievements` rows are used unchanged.

## 3. Merge-conflict hotspots and the rules for each

| File | Tasks touching it | Rule |
|---|---|---|
| `src/components/dashboard/DashboardScreen.tsx` | T-15, T-14 (D); T-12 (B, props only) | D merges T-15 first (IC-1). B touches only the props passed to `ProfileAnalyticsView`. |
| `src/App.tsx` | T-15 (D: ViewportGuard); T-10 (B: recovery routing) | T-15 first. B rebases. |
| `src/context/AuthContext.tsx` | T-03, T-10 (B) | Same owner, sequential |
| `saveLessonResult.ts`, `supabaseStore.ts`, `applyResult.ts` | T-11 (B); T-13 (C) | T-11 merges by D3. C starts T-13 on top of it on D5. |
| `src/audio/config.ts` | T-07 (C: new `pitch` section); T-08 / T-19 (A: tuning) | C adds the section only. A owns the tuning values. |
| `src/practice/PracticeDrill.ts` | T-06 (A), T-08 (A) | Same owner |
| `src/lesson/runner.ts` + tests | T-06 (A), T-16 (D: tests only) | D adds test cases only. A merges T-06 first if both are open. |
| `src/lib/theory/notes.ts`, `GrandStaff.tsx` | T-17 (D) | D only. C reviews. |
| `supabase/seed.sql` | T-08 (content check), T-17 | Regenerate. Never hand-edit. |

## 4. Integration checkpoints

| Checkpoint | Day | Must be merged | Check performed by A |
|---|---|---|---|
| **IC-0** | D1 | T-01 | Fresh clone of `main` passes the 4 commands; contracts §2 agreed in writing; T-02 rulings recorded |
| **IC-1** | D3 | T-03, T-05, T-06, T-11, T-15, T-16 | CI green. On staging: new signup → placement → theory lesson → EXP, streak and achievement row written; quitting mid-drill keeps the heart loss. |
| **IC-2** | D6 | T-07, T-08, T-09, T-14, T-18 | On staging, with a keyboard: play-note passes A4 and fails A3; posture HUD overlay shows stats; chord drill unchanged |
| **IC-3** (feature freeze) | D9 | T-10, T-12, T-13, T-17; T-19 report | Full flow on staging, including offline save → reconnect; Google sign-in; password reset; analytics shows real points. **No feature merges after this.** |
| **IC-4** | D12 | T-20…T-23 results | Defect list triaged, with priority and owner |
| **RC** | D13 | T-24 fixes | No open P0/P1; regression log written |
| **Release** | D14 | T-25 | Production smoke test of 5 flows |

## 5. Review responsibilities

| Author | Default reviewer | Extra rules |
|---|---|---|
| A | B (C for audio config) | A cannot self-merge without one approval, except T-01 |
| B | A | Descriptive commit messages; squash noisy history before review |
| C | A | Ask before adding any dependency (e.g. `fake-indexeddb`) |
| D | A (C for T-17 and theory-file deletions; B for T-14) | **Mandatory.** PRs under ~300 changed lines; screenshots for UI changes; the reviewer runs the change locally |

**Additional review is required for:**
- any migration;
- any change to a §2 contract;
- `AuthContext.tsx`;
- the worker or worklet protocols;
- `src/audio/config.ts` thresholds;
- the T-04 salvage list;
- the production Supabase and Auth configuration.

Use the Superpowers `requesting-code-review` and `receiving-code-review` workflows for these.

## 6. Evidence required before a Jira issue is marked Done

Following Superpowers `verification-before-completion`, the evidence is attached to the Jira issue as a comment:

1. **PR link**, merged into `main`, with the reviewer's approval.
2. **CI run link**, green: test, typecheck, build, seed check, size gate.
3. **Acceptance-criteria checklist** copied from [TASK_DECOMPOSITION.md](TASK_DECOMPOSITION.md), each item ticked with its evidence:
   - test name, for logic;
   - screenshot or short clip, for UI;
   - staging check note (date and account used), for Supabase behaviour;
   - measured numbers, for performance (T-19 report);
   - HAR or network summary, for privacy (T-21).
4. **What was not verified**, stated explicitly. For example: "not tested on Firefox".
5. For tickets that existed before this plan and are currently Done but are listed in the reconciliation §5: **reopen them**. Re-close them only with this evidence.

| Evidence type | Applies to |
|---|---|
| Unit tests | Logic |
| Staging | Auth and DB |
| Hardware | Vision and audio performance |
| Manual checklist | Flows |

Static code review alone is never sufficient for Done.

## 7. Regression risks and required tests

| Change | What could regress | Required test |
|---|---|---|
| T-03 auth bootstrap | Signup, guest mode, profile display | Staging: new signup, existing login, guest mode; profile values unchanged |
| T-06 hearts | Heart totals, out-of-hearts flow | `runner.test.ts`, `applyResult.test.ts` |
| T-08 pitch | Chord drills, mixed sequences, wait-state timing | `chords`, `scenarios`, `waitState`, `notes`, `PracticeDrill` tests; IC-2 manual check |
| T-09 vision | HUD cues, posture score | `cues`, `rules`, `interpolator`, `budget` tests |
| T-11 / T-13 save path | EXP double-credit, lost saves | `applyResult`, `saveLessonResult`, `achievements`, `queue` tests; staging offline test |
| T-15 / T-14 dashboard | Navigation, placement modal | Manual IC-1 / IC-2 walkthrough |
| T-16 consistency formula | Persisted `rhythm_consistency` values | `timing.test.ts`, `plan.test.ts` |
| T-17 flats | Staff layout for sharps | `notes.test.ts`; visual check of 3 sharp lessons |
| T-18 deletions | Build | `tsc` + build |

## 8. Coordination routine (SPMP §8)

| When | What | Who |
|---|---|---|
| Daily, 10 minutes | Stand-up in the team chat: yesterday, today, blockers. A updates the roadmap day columns. | Everyone |
| On any contract change | Post in the team chat before coding. A approves. | Proposer, then A |
| At each IC | A posts the checkpoint result (pass/fail per item) and moves the Jira statuses. | A |
| Escalation | Blocked for more than half a day → tell A. A disagreement on scope → T-02 change-control note. | Anyone |
