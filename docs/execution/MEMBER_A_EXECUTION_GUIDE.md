# Member A Execution Guide: Amatong (Team Lead / Technical Lead / Integrator)

> **Self-contained.** This guide covers everything A needs. Task IDs (T-xx) match `docs/audit/TASK_DECOMPOSITION.md`. Day numbers are relative working days (D1 = the first working day after the team accepts the plan). No calendar dates are set yet; see U-01 in `UNRESOLVED_DECISIONS_AND_INFORMATION_NEEDED.md`.
>
> **Baseline facts, verified 2026-11-16 on `course-handoff` @ `59448bd`:**
> - `npm test`: 27 files, 387 tests, all pass.
> - `npx tsc -p tsconfig.json`: clean.
> - Vite build passes; initial JS is 814.5 kB.
> - `npm run seed:lessons:check`: up to date (59 lessons).
> - The GitHub CLI (`gh`) is **not installed** on this machine. Open PRs in the web UI at `https://github.com/markuu-exe/MUZ`.
> - Jira could only be read from the CSV export. The Atlassian connector failed to connect, so issue descriptions and comments were not available.

---

## A. Role overview

| Item | Detail |
|---|---|
| Role | Technical lead, project manager (SPMP), integrator, and implementer for the real-time audio and vision runtime |
| Ownership areas | `src/audio/**`, `src/vision/**`, `src/practice/**`, `src/workers/**`, `src/lesson/**`, `src/content/**`. You also own these contracts: `AcousticFrame`, `AcousticVerifier`, the worklet protocol, the posture-worker protocol, and `LessonResult`. Schema change control is yours too. |
| Delivers | T-01, T-02, T-06, T-09, T-08, T-19, T-24 lead; all merges into `main`; checkpoints IC-0 to IC-4, RC and Release go/no-go |
| Can change independently | Your own areas listed above; `.gitignore`; branch settings; `docs/decisions/` |
| Needs team agreement | Rulings D1–D14 (T-02); any requirement or scope change (SPMP 3.3); changes to deadline or cut order; production configuration |
| Reports progress to | The adviser (SPMP §8) and the team: a daily status post plus a pass/fail post at each checkpoint |
| Coordinates directly with | B on contracts (`ProgressStore`, analytics), review of B's PRs, and deploy; C on the `AcousticFrame` extension, migrations and CI; D on review and the T-19 recording |

**Do not take over other members' tasks.** If a task slips, apply the contingency in §4.6 instead of quietly doing it yourself.

---

## B. Personal task schedule

| Task | Jira | Priority | Effort | Earliest start (reason) | Target done | Reviewer | Status (Jira Nov 15 → plan) |
|---|---|---|---|---|---|---|---|
| T-01 Integration baseline | NEW-01 (proposed) | P0 | 0.5 d | D1 (no dependency) | D1 midday | B | not created → pending |
| T-02 Rulings meeting | NEW-02 (proposed) | P0 | 0.5 d | D1 PM (after T-01 push) | D1 | team | not created → pending |
| T-06 Heart refund on quit | NEW-04 (proposed bug), relates KAN-267 | P1 | 1 d | D1 PM (needs T-01) | D2 | B | KAN-267 Done → bug pending |
| T-09 Vision hardening + perf overlay | NEW-05 (proposed) | P1 | 2 d | D2 | D4 | B | not created → pending |
| T-08 Pitch wiring | KAN-261, KAN-264 | P1 | 2 d | D5 (**hard:** T-07 merged D4) | D6 | B | To do → pending |
| T-19 Hardware benchmark + tuning | KAN-277, NEW-16 | P1 | 2 d | D7 (**hard:** T-08 and T-09 merged) | D8 | B | To do → pending |
| T-24 Defect triage + regression lead | KAN-273, KAN-281, KAN-282 | P1 | 1.5 d | D12 (**hard:** T-19 to T-23 results) | D13 | original reviewers | To do → pending |
| Integration, reviews, checkpoints | — | — | ~2 d spread | continuous | D14 | — | — |

**Load warning.** About 11.5 ideal days in a 14-day window, plus about 18 PR reviews. That is at capacity. Protect your review time: see the daily plan in §4.1.

**What to work on while waiting**
- **D4, waiting for T-07:** finish T-09. Prepare the T-08 worklet change behind the optional fields, which compiles without `PitchVerifier`.
- **D9, waiting for the freeze:** run the IC-3 checks and pre-write the T-24 triage sheet.
- **D10–D11, waiting for test results:** triage incoming defects every day, and support D's T-22 hardware runs.

---

## C. Detailed implementation instructions

### T-01 Establish the integration baseline and repo hygiene

1. **Purpose.** Every task must branch from one trusted `main`. Today:
   - `origin/main` is at `11bf8ef` and lacks COURSE-6 (`317844d`) and the heart-regen fix (`59448bd`). Both commits exist only on your local `course-handoff`, unpushed.
   - Stale remote branches exist. `Lag-in`'s tree still tracks `.env.local` (publishable key only; no secret was found in history).
   - Generated files are tracked: `tsconfig.tsbuildinfo`, `tsconfig.node.tsbuildinfo`, `scripts/tsconfig.tsbuildinfo`, and `vite.config.js` / `vite.config.d.ts`. `npm run build` runs `tsc -b`, which regenerates `vite.config.js` from `vite.config.ts` because `tsconfig.node.json` is `composite` with no `noEmit`. Vite loads `.js` before `.ts`.
2. **Current implementation.**
   - `.gitignore` already ignores `node_modules/`, `dist/`, `.env.local` and `TASKS/`.
   - Branch protection is unknown, because no `gh` CLI is available to check it.
3. **Required changes.**
   - Push and merge.
   - Delete 3 remote branches; delete `features-integration` only after B finishes T-04.
   - Untrack 5 generated files.
   - Enable branch protection on `main`.
4. **Steps.**
   1. `git fetch --all --prune`, then `git status` (must be clean).
   2. `git push origin course-handoff`.
   3. On GitHub, open a PR from `course-handoff` into `main` titled "Baseline: COURSE-6 + heart regen fix". B reviews it, then merge (merge commit, not squash, to keep history).
   4. `git switch main && git pull`.
   5. Create branch `task/T-01-repo-hygiene`.
   6. `git rm --cached tsconfig.tsbuildinfo tsconfig.node.tsbuildinfo scripts/tsconfig.tsbuildinfo vite.config.js vite.config.d.ts`.
   7. Append these lines to `.gitignore`: `*.tsbuildinfo`, `vite.config.js`, `vite.config.d.ts`.
   8. Commit, open a PR, B reviews, merge.
   9. On GitHub, delete the remote branches `Lag-in`, `dashboard` and `login-bins`. Before each deletion, confirm `git log --oneline main..origin/<branch>` shows only the commits listed in the reconciliation §4.
   10. GitHub → Settings → Branches → protect `main`: require a PR and 1 approval.
5. **Expected output.**
   - `origin/main` contains `59448bd`.
   - The generated files are untracked.
   - Three stale branches are deleted.
   - `main` is protected.
6. **Testing.** On a fresh clone (`git clone https://github.com/markuu-exe/MUZ muz-check`), run:
   - `npm ci`
   - `npm test`
   - `npx tsc -p tsconfig.json`
   - `npm run build`
   - `npm run seed:lessons:check`
   - `git status`: must be clean after the build. This proves `vite.config.js` is now ignored.
7. **Acceptance criteria.**
   - The 5 commands pass.
   - `git ls-files | grep -E "tsbuildinfo|vite.config.(js|d.ts)"` prints nothing.
   - `git ls-remote --heads origin` does not list `Lag-in`, `dashboard` or `login-bins`.
8. **Evidence.** PR links, the terminal output of the fresh-clone run, and a screenshot of the branch protection rule. Post "main baseline = `<sha>`" in the team chat.

### T-02 Requirements rulings (change-control record)

1. **Purpose.** Resolve the 14 source conflicts before work depends on them (SPMP 3.3).
2. **Current state.** `docs/audit/PROJECT_REQUIREMENTS_AUDIT.md` §5 lists D1–D14, each with a recommendation. No `docs/decisions/` folder exists yet.
3. **Required changes.** New file `docs/decisions/RULINGS.md`.
4. **Steps.**
   1. Before the meeting, send the §5 table to the team.
   2. Run a 45-minute meeting. For each decision, read the recommendation, take objections, and decide.
   3. Write one row per decision: ID, outcome, reason, affected tasks, whether the SRS/SDD needs editing (Y/N), decided by.
   4. Commit on `task/T-02-rulings` and merge. B reviews for accuracy.
   5. Post the decisions that unblock work, in this order:
      - D13 → D (T-16);
      - D4 / D1 / D2 → C (T-07);
      - D8 → D (T-14);
      - D14 → B (T-11);
      - D11 → B (T-10).
5. **Expected output.** 14 recorded decisions.
6. **Testing.** None.
7. **Acceptance.** All 14 rows complete; every "doc edit = Y" row names the SRS/SDD section to edit.
8. **Evidence.** The merged `RULINGS.md` link on NEW-02.

Escalate to the adviser only if a ruling would drop an SRS requirement. The recommendations do not drop any.

### T-06 Hearts lost mid-drill must persist when the learner quits

1. **Purpose.** SRS 3.1.2.4: hearts lost to a timeout or 3 misses must stay lost. Today quitting mid-drill refunds them.
2. **Current implementation (verified).**
   - `PracticeDrill` emits `heartLost` with `{ reason, hearts, atMs }` (`src/practice/PracticeDrill.ts:71,228-230`).
   - `usePracticeDrill` listens only to call `refresh` (`src/hooks/usePracticeDrill.ts:64`). Its view does expose a live `heartsLost`.
   - `PracticeDrillView` reports `heartsLost` **only** in the final `onOutcome` after the drill completes or locks (`PracticeDrillView.tsx:63-74`).
   - `LessonPlayer.quit()` (`LessonPlayer.tsx:143-151`) calls `quitLesson(run, Date.now())`. `quitLesson` (`runner.ts:118-121`) sets the status only.
   - `buildLessonResult` computes `heartsEnd` from `state.hearts` (`runner.ts:162-174`), so in-drill losses are never included on quit.
   - `applyResult.ts:75` correctly applies `heartsEnd − heartsStart`.
3. **Required changes.** Keep `runner.ts` pure and do not double-count.
   - `src/lesson/registry.ts`: add to `ExerciseViewProps` an optional `onHeartsSpent?: (heartsLostSoFar: number) => void`.
   - `src/components/lesson/practice/PracticeDrillView.tsx`: call `onHeartsSpent(drill.heartsLost)` whenever `drill.heartsLost` changes. Use a `useEffect` on `drill.heartsLost`.
   - `src/components/lesson/LessonPlayer.tsx`: keep `inFlightHeartsLost = useRef(0)`. Pass `onHeartsSpent={(n) => (inFlightHeartsLost.current = n)}` to the view. Reset it to 0 in `advance()`. In `quit()`, call `quitLesson(run, Date.now(), inFlightHeartsLost.current)`.
   - `src/lesson/runner.ts`: change the signature to `quitLesson(state, nowMs, unreportedHeartsLost = 0)`, which returns `hearts: Math.max(0, state.hearts - unreportedHeartsLost)` with `status: 'quit'`.
4. **Steps.**
   1. Write the failing test first (Superpowers TDD), in `src/lesson/__tests__/runner.test.ts`, using the existing `payloadOf('pno-mod1-node2')` helper (learn, check, play):
      - Advance to the play exercise with `PASS` outcomes.
      - Call `quitLesson(s, t, 2)`.
      - Expect `buildLessonResult(q).heartsEnd === 3`, starting from 5.
   2. Implement the runner change, then the view and player wiring.
   3. Add a second test: a normal drill completion with `heartsLost: 2` gives `heartsEnd === 3`. This is the no-double-count path, because the ref resets in `advance`.
5. **Expected output.** Quitting after in-drill heart losses saves the reduced hearts.
6. **Testing.**
   - `npx vitest run src/lesson`, then `npm test`.
   - Manual on staging, after T-05:
     1. Start the practice lesson with the camera and mic on.
     2. Wait 15 s for a timeout. The heart row drops by 1.
     3. Press ✕ to quit.
     4. The dashboard hearts show one fewer, and the Supabase `profiles.hearts` value matches.
7. **Acceptance.**
   - Both new tests pass.
   - All 387 existing tests pass.
   - The manual check passes.
8. **Evidence.** PR link, the test output, and two screenshots: hearts before and after quitting.

### T-09 Vision runtime hardening and performance instrumentation

1. **Purpose.** Fix the timing defects that delay posture cues after a camera restart, and make SRS 3.4 (20–30 Hz, ≤ 35 ms, 60 FPS) measurable for T-19.
2. **Current implementation (verified).**
   - `FrameLoop` (`src/vision/pipeline/FrameLoop.ts`) uses `requestVideoFrameCallback`.
   - It sends `timestampMs: metadata.mediaTime * 1000 || this.now()` (line ~97). `this.now` is the injectable `options.timestamp` (line 39), defaulting to `performance.now()`.
   - It sets `awaitingResult = true` only **after** `await createImageBitmap(this.video)`, with no try/catch (lines ~86-92).
   - The worker forces `ts = Math.max(msg.timestampMs, lastDetectTs + 1)` (`posture.worker.ts:89`), so a `mediaTime` that restarts near 0 stays clamped to `last + 1 ms`.
   - The worker posts `inferenceMs` in every `RESULT` (`workerProtocol.ts:27`).
   - `HudEngine.getStats()` (`src/vision/hud/HudEngine.ts:194-206`) returns `rafFps`, `p95CostMs`, `renderDelayMs` and `inferenceIntervalMs`.
   - `PostureHud` exposes the engine through `onEngine` (`src/components/practice/PostureHud.tsx:32-33`).
   - Nothing in the live app reads any of these numbers. The only reader, `usePostureWorker.ts`, is dead.
   - No frame cap exists. `CameraService` requests an ideal 30 fps at 1280×720 (lines 12-14).
   - FrameLoop has **no tests** (`src/vision/pipeline/` contains only `FrameLoop.ts`).
3. **Required changes.**
   - `FrameLoop.ts`:
     - always use `timestampMs: this.now()`;
     - set `awaitingResult = true` before the await, and wrap `createImageBitmap` in try/catch (on failure, reset `awaitingResult` and emit `error` with code `'UNKNOWN'`, `fatal: false`);
     - add `minIntervalMs` (default 33) to `FrameLoopOptions`, and skip a frame if `this.now() - lastSentMs < minIntervalMs`;
     - add `lastInferenceMs` to the emitted result. It already passes through `Object.assign(message, …)`, so this only needs exposing.
   - `src/components/lesson/practice/CameraPanel.tsx`: when `new URLSearchParams(location.search).has('debug')`, render a small overlay that every 500 ms shows:
     - `engine.getStats()`: `rafFps`, `p95CostMs`, `inferenceIntervalMs`;
     - the latest worker `inferenceMs` (p50 and p95 over the last 120 results).
     Get the engine through `PostureHud`'s `onEngine`.
   - New test file `src/vision/pipeline/__tests__/FrameLoop.test.ts`, using a fake video with `requestVideoFrameCallback`, a fake worker with `postMessage`/`addEventListener`, a stubbed `globalThis.createImageBitmap`, and an injected `timestamp`.
   - Optional, only if time allows and B approves: a latch-margin change in `WaitStateMachine.tick`. Skip it if it is not needed for T-19.
4. **Steps.**
   1. Write the tests first, asserting:
      - (a) the timestamps sent are strictly the injected clock, even when `mediaTime` drops to 0;
      - (b) a second frame arriving while the first is awaiting `createImageBitmap` is skipped;
      - (c) frames under 33 ms apart are skipped;
      - (d) a `createImageBitmap` rejection emits an error and does not wedge the loop.
   2. Implement the FrameLoop changes.
   3. Add the overlay.
   4. Manual check:
      1. Run `npm run dev` and open the posture-hold lesson with `?debug=1`.
      2. Confirm the numbers update.
      3. Unplug and replug the camera, or use Retry. Confirm that cues reappear about 600 ms after a violation (`cueDelayMs`).
5. **Expected output.** Monotonic timestamps; at most one frame in flight; ≤ 30 Hz; a live performance overlay.
6. **Testing.**
   - `npx vitest run src/vision`, then `npm test`.
   - The manual steps above.
7. **Acceptance.**
   - The 4 new tests pass.
   - All existing vision tests pass: cues, rules, interpolator, budget, skeleton, palette, viewport, metrics, oneEuro, vec3.
   - The overlay shows non-zero values.
8. **Evidence.** PR link, the test output, and an overlay screenshot showing `inferenceIntervalMs` ≥ 33.

### T-08 Wire pitchy into the live audio pipeline

1. **Purpose.** SRS 3.1.6.2 requires pitchy autocorrelation, ±35 cents and clarity ≥ 0.85. Live single-note drills currently grade pitch class only, so any octave passes (`NoteMatcher`, `NoteVerifier`).
2. **Current implementation (verified).**
   - `AudioInputService` loads `chroma.worklet.ts`.
   - The worklet runs `ChromaFrameProcessor`, which keeps a 4096-sample `ring` buffer (`ChromaFrameProcessor.ts:55,112`) and windows it oldest-first (lines ~201-208). It posts `ChromaFrameMessage` (`worklet/protocol.ts`: `time`, `chroma`, `rmsDb`, `noiseDb`, `voiced`, `ringing`, `flux`, `onset`, `onsetTime`).
   - `AudioInputService.onWorkletMessage` (lines ~166-178) maps each message to an `AudioInputFrame`, which extends `AcousticFrame`.
   - `PracticeDrill.arm` (`PracticeDrill.ts:192-196`) picks `NoteVerifier` for `kind:'note'`.
   - `pitchy` 4.1 is installed. Its API: `PitchDetector.forFloat32Array(n)` and `findPitch(input, sampleRate) → [pitchHz, clarity]` (`node_modules/pitchy/index.d.ts:94-101`).
   - The dead `useAudioAnalysis.ts` is the only pitchy user; C deletes it in T-07.
3. **Required changes.**
   - `src/audio/practice/ChordVerifier.ts:6-14`: add `pitchHz?: number | null; clarity?: number` to `AcousticFrame`. You own this contract; C codes against it.
   - `src/audio/dsp/ChromaFrameProcessor.ts`:
     - add `pitchHz` and `clarity` to `ChromaFrame`;
     - in the frame step, copy the un-windowed ring buffer (oldest first) into a reusable `Float32Array(fftSize)`;
     - when the frame is gated (`gated` is true), call a `PitchDetector` created once in the constructor; otherwise set `pitchHz = null`, `clarity = 0`.
   - `src/audio/worklet/protocol.ts` and `chroma.worklet.ts`: add the two fields to the message and to `post()`.
   - `AudioInputService.onWorkletMessage`: pass them through.
   - `PracticeDrill.arm`: `kind:'note'` → `new PitchVerifier(target.note)` (C's class), with `NoteVerifier` kept behind a config flag `useChromaNoteVerifier` (default false) in `src/audio/config.ts` for T-19 comparison. Map the heard pitch to `lastHeard` text for the cue ("That sounded like A3").
   - Content: confirm every `play-note` / `play-sequence` note target is an exact MIDI value. The builders parse `"C4"` → 60 (`src/content/builders.ts:34-37`), so the octave already exists in the data. Run `npm run seed:lessons:check`.
4. **Steps.**
   1. On D1, agree the field names with C and post them in the team chat.
   2. On D4–D5, implement the processor and protocol changes. Then run `npx vitest run src/audio`: the chroma tests must be unchanged. The fields are optional, so the existing fixtures still compile.
   3. Once T-07 is merged, swap the verifier in `arm`.
   4. Add a `PracticeDrill.test.ts` case: a note target at MIDI 69, with frames carrying `pitchHz` 220 (A3) and clarity 0.95, ends in a miss and never succeeds.
   5. Check the worklet bundle: `npm run build`. The `chroma.worklet-*.js` asset grows; record its size (it was 9 kB).
   6. Manual: with a keyboard or a tone generator, target A4. Playing A4 locks in; playing A3 shows a miss.
5. **Expected output.** Single-note drills reject wrong octaves and out-of-tune notes.
6. **Testing.** `npx vitest run src/audio src/practice`, then `npm test`, then the manual check.
7. **Acceptance.**
   - All audio and practice tests pass, including the new octave test.
   - No new network requests in DevTools during a drill.
   - A latency note for T-19: time from onset to verdict.
8. **Evidence.** PR link, the test output, a short screen recording or screenshots of the pass and fail cases, and the worklet size before and after.

**Fallback if pitchy will not bundle into the worklet.** Vite's `?worker&url` import is used for the worklet; see the comment in `chroma.worklet.ts:1-8`. If the bundle fails, compute pitch on the main thread from an `AnalyserNode` attached to the same source in `AudioInputService`, and stamp it onto the next frame. Raw samples still stay on the device. Record which option you used in the PR.

### T-19 Hardware benchmark and audio tuning session

1. **Purpose.** No SRS 3.4 figure has ever been measured, and all audio thresholds were tuned on synthetic piano fixtures (`src/audio/__tests__/fixtures.ts`). The `vite preview` runtime of the MediaPipe loader fix (`bcff618`) is still unchecked.
2. **Current implementation.** This task uses T-09's overlay. Thresholds live in `src/audio/config.ts`, where values marked `// SPEC` must not change: 4096, 0.72, 200 ms, 400 ms, 15 s, 3.
3. **Required changes.**
   - New file `docs/test/PERFORMANCE_REPORT.md`.
   - Possibly a tuning PR touching only non-SPEC values in `src/audio/config.ts`.
4. **Steps.**
   1. Run `npm run build && npm run preview` and open `http://localhost:4173`. Turn on the camera. In DevTools → Network, confirm the `.wasm` and `.task` files load **only after** the click, and the console shows no "ModuleFactory not set" error.
   2. On machine 1 (mid-range laptop, 720p30 webcam), in Chrome then Edge, record over 60 s with `?debug`: `rafFps`, `p95CostMs`, worker interval p50/p95, `inferenceMs` p50/p95. Note whether the delegate was GPU or CPU (READY message).
   3. Repeat on machine 2.
   4. **Chord accuracy.** Strike 20 times each: C, F, G, Am, Dm. Use the laptop mic, then a USB mic. Record the pass count. Then 20 wrong-chord strikes (for example, play C when the target is G), and record the rejects.
   5. **Note accuracy.** 20 strikes each of C4, A3, G4 at pitch, plus 10 deliberate octave errors.
   6. **Latency.** Record the onset-to-verdict time from the drill timestamps; target ≈ 200 ms for chords.
   7. If the correct-chord pass rate is below 95 %, adjust only the non-SPEC gates (`minToneCoverage`, `maxExtraTone`, `minFullChordMargin`). Record before and after, then re-run `npx vitest run src/audio`: the synthetic scenario tests must still pass.
5. **Expected output.** A report table of measured values, each marked pass or fail against SRS 3.4 and 3.1.6.
6. **Testing.** This task is the test.
7. **Acceptance.**
   - Every target in the table has a measured value.
   - Each fail is logged in the defect log (T-22) with a priority.
8. **Evidence.** The report, raw screenshots of the overlay, and the tuning PR if one was needed.

D records the tables and C runs the note trials; you lead the session.

### T-24 Defect triage and regression (lead)

See §4.6 (triage process) and §4.5 (merge management). You assign defects by area (§4.4 table). You personally fix only defects in your own areas.

---

## Section 4: Team-lead duties

A's work in seven areas:

| # | Area | Where |
|---|---|---|
| 1 | Individual development | §C |
| 2 | Code review and approval | §4.2 |
| 3 | Architecture and technical decisions | §4.3, §4.4 |
| 4 | Team coordination | §4.1, §E |
| 5 | Integration and merge management | §4.5 |
| 6 | QA and performance oversight | §4.6 |
| 7 | Release and deployment coordination | §4.7 |

### 4.1 Daily team-lead schedule

| Day | Morning (09:00–12:00) | Afternoon (13:00–17:00) | Lead checkpoint |
|---|---|---|---|
| D1 | T-01 push, baseline PR (B reviews), merge; post baseline sha; agree the 4 contracts with B and C | T-02 rulings meeting; post the rulings; start T-06 test | **IC-0**: fresh-clone check |
| D2 | T-06 finish → PR; review B's T-03 | Start T-09 tests; review C's T-05 workflow PR | — |
| D3 | T-09; review D's T-16 and T-15 PRs (D's first PRs: review thoroughly, re-check the provisional status) | Review B's T-11; merge in IC-1 order | **IC-1**: staging walkthrough |
| D4 | T-09 finish → PR; review C's T-07 | Merge T-18, T-07; start T-08 processor changes | — |
| D5 | T-08 | Review D's T-14; approve C's T-13 migration design | — |
| D6 | T-08 finish → PR (B reviews); merge T-09, T-08, T-14 | Review D's T-14 if B has not; IC-2 checks | **IC-2**: keyboard check on staging |
| D7 | T-19 session, machine 1 (D records) | T-19 chord and note trials (C assists) | Ask B for analytics status (contingency trigger) |
| D8 | T-19 machine 2, tuning PR if needed | Review C's T-20 and D's T-21 reports; review B's T-12 | — |
| D9 | Review and merge T-17, T-13, T-12, T-10 (IC-3 order) | Full IC-3 walkthrough; **declare feature freeze** | **IC-3** |
| D10 | Triage new defects (within 1 day); support D's T-22 hardware runs | Triage; answer C's T-23 questions | — |
| D11 | Triage; review defect-fix PRs | Same | — |
| D12 | Collect T-22 and T-23 results; prioritise; assign | Start T-24 fixes in your own areas | **IC-4** |
| D13 | Review and merge fixes; run the regression | Write `docs/test/REGRESSION_LOG.md`; go/no-go | **RC** |
| D14 | Support B's T-25; approve the production config | Production smoke test witness; approve T-26 docs | **Release** |
| D15 | Demo rehearsal (whole team); backup video | Buffer | — |

**Every day:**
- 09:00: read the team's status posts.
- 09:15: post your own status.
- Respond to PRs within 4 working hours.
- 16:30: update the Jira statuses.

### 4.2 PRs A must review (default reviewer)

| PR | Author | Due by |
|---|---|---|
| T-03 profile fix | B | D2 |
| T-05 staging + CI | C | D2 |
| T-16 rhythm tests | D | D3 |
| T-15 UI fixes | D | D3 |
| T-11 achievements | B | D3 |
| T-07 PitchVerifier | C | D4 |
| T-18 dead code | D | D4 |
| T-13 offline sync and its **migration** | C | D7–D9 |
| T-12 analytics | B | D8–D9 |
| T-10 auth completion | B | D9 |
| T-17 flats (after C) | D | D8 |
| T-20 RLS report | C | D8 |
| T-21 privacy report | D | D8 |
| T-22 / T-23 reports | D / C | D12 |
| T-24 fixes | all | D13 |
| T-25 production config | B | D14 |
| T-26 documents | D | D14 |

B reviews your own PRs: T-01, T-06, T-09, T-08, T-19 tuning.

**Review checklist.** Use the Superpowers `requesting-code-review` and `receiving-code-review` workflows.
1. Pull the branch and run `npm test`, `npx tsc -p tsconfig.json`, `npm run build` and `npm run seed:lessons:check`.
2. Check that the PR touches only the files its brief lists.
3. Verify each acceptance criterion against the evidence attached.
4. For UI PRs, run the change yourself.
5. For D's PRs: confirm one commit per item, under about 300 changed lines, and no styling drift.

### 4.3 Interfaces A owns

| Interface | File | Rule |
|---|---|---|
| `AcousticFrame` | `src/audio/practice/ChordVerifier.ts:6-14` | Add fields only; T-08 adds `pitchHz?`, `clarity?` |
| `AcousticVerifier` | `ChordVerifier.ts:35-39` | Frozen |
| Worklet messages | `src/audio/worklet/protocol.ts` | Only A edits |
| Posture-worker protocol | `src/vision/posture/workerProtocol.ts` | Only A edits |
| `LessonResult`, `ExerciseViewProps` | `src/lesson/types.ts:36-53`, `src/lesson/registry.ts:10-22` | A approves changes. Expected: T-06 adds `onHeartsSpent?`; T-13 (C) adds `runId` |
| Lesson content types | `src/types/lesson.types.ts` | A approves. Expected: T-17 (D) adds `spelling?` |
| Schema | `supabase/migrations/` | New files only; one open migration PR at a time; you approve the design before C writes it |

### 4.4 Decisions, delegation and area ownership

- **Needs team agreement:** rulings D1–D14; badge thresholds (U-04); the deadline (U-01); invoking the cut order; anything that changes an SRS requirement.
- **A decides alone (as lead):** merge order; defect priority; whether a PR meets the acceptance criteria; threshold tuning within non-SPEC values.
- **Delegate rather than implement:** everything in B's, C's and D's guides. Specifically, do **not** write analytics (B), the PitchVerifier (C), the offline queue (C), the RLS script (C), or the UI fixes or flats (D), even when faster. The exception is the contingency in §4.6.

**Area ownership for defects:**

| Area | Owner |
|---|---|
| `src/audio`, `src/vision`, `src/practice`, `src/workers`, `src/lesson`, `src/content` | A |
| `src/context`, `src/components/auth`, `src/lib/progress`, `src/hooks/useDashboardData.ts`, analytics | B |
| `src/lib/sync`, `supabase/`, CI and hosting, `src/lib/rhythm` | C |
| Dashboard layout and copy, rhythm-view copy, `src/lib/theory/notes.ts` | D (A reviews) |

### 4.5 Integration and merge management

Merge order inside each checkpoint (rebase on `main` before each merge, then run CI):
- **IC-1 (D3):** T-15 → T-16 → T-06 → T-03 → T-11 → T-05
- **IC-2 (D6):** T-18 → T-07 → T-09 → T-08 → T-14
- **IC-3 (D9):** T-17 → T-13 → T-12 → T-10

**Hotspots to watch:**

| Files | Rule |
|---|---|
| `DashboardScreen.tsx`, `App.tsx` | D first, then B |
| `saveLessonResult.ts`, `supabaseStore.ts` | B (T-11) first, then C (T-13) |
| `src/audio/config.ts` | C adds a section; A tunes values |
| `src/lesson/__tests__/runner.test.ts` | D adds tests (T-16); A changes `quitLesson` (T-06). Merge T-06 first if both are open. |

**Preventing problems:**
- Make sure the 4 contracts are written in the team chat on D1.
- After each merge, run the full suite on `main`.
- If `main` goes red, revert the offending merge immediately instead of fixing forward.
- No feature merges after IC-3.

### 4.6 QA and performance oversight, delays and blockers

- **QA owners:**

  | Test | Owner |
  |---|---|
  | T-19 | you |
  | T-20 | C |
  | T-21 | D |
  | T-22 | D |
  | T-23 | C |

- **Defect triage.** Give each defect a priority within 1 working day:
  - P0: blocks a core flow or loses data;
  - P1: an SRS requirement fails;
  - P2: cosmetic, or has a workaround.
  Assign by the area table in §4.4.
- **Delay rule:**
  1. If a member reports a blocker longer than half a day, pair with them for 30 minutes.
  2. If a task is more than 1 day late against this schedule, apply the matching contingency below and record it in the team chat:

  | Late task | Contingency |
  |---|---|
  | **T-12** late at D7 | You take the rhythm histogram (`aggregate.ts` bucket function); B keeps the rest |
  | **T-13** late at D8 | Reduce to "enqueue on network error + flush on reconnect, no backoff" (roadmap cut order item 5) |
  | **T-17** stuck 1 day | Hand to C |
  | **T-10** late at D9 | Ship the recovery fix first; Google OAuth may slip to D10 as a P1 fix (needs team agreement) |
  | **T-07** late at D4 | You start T-08 with a stub verifier that always returns null; merge T-08 only when T-07 lands |

- **Jira tracking.**
  - Move issues to In Progress when their branch is created.
  - Move them to Done only after the evidence in `TEAM_COORDINATION_AND_HANDOFF_GUIDE.md` §5 is posted on the issue.
  - Reopen every Done issue the audit lists as incorrect (KAN-228, 229, 10, 11, 258) before D3.

### 4.7 Release and deployment coordination

- On D13, give the RC go/no-go. **Go** requires all of:
  - no open P0/P1 defects;
  - CI green;
  - T-20 pass;
  - T-21 pass;
  - the regression log written.
- On D14, B deploys. You approve:
  - the production Supabase project choice;
  - the Auth URLs and Google provider;
  - the env vars set in the host (not in git).
  Witness the smoke test.
- On D15, run the demo rehearsal and record the backup video.
- **You** approve the T-26 documents.

---

## D. Git and pull-request instructions

| Item | Rule |
|---|---|
| Branch | `task/T-xx-short-name`, from `main` after T-01; for example `task/T-06-heart-refund`, `task/T-09-vision-hardening`, `task/T-08-pitch-wiring`, `task/T-19-tuning` |
| Commits | Imperative, descriptive messages that cite the task (for example "T-06: persist in-drill heart loss on quit"). End each with the team's co-author lines if used. |
| PR contents | The task's acceptance-criteria checklist with evidence; what was not verified; screenshots or measurements where relevant |
| Reviewer | B for all your PRs |
| Must pass before merge | `npm test`, `npx tsc -p tsconfig.json`, `npm run build`, `npm run seed:lessons:check`. From D2, CI runs these, plus the size gate. |
| Avoid touching | B's auth and progress files; C's `src/lib/sync`; D's dashboard files, except for review comments |
| Depends on | T-08 needs C's T-07 merged; T-19 needs T-08 and T-09 merged |

---

## E. Coordination and handoffs

| Task | Depends on | Who needs your output | What to agree | Notify when | Handoff content |
|---|---|---|---|---|---|
| T-01 | — | Everyone | — | As soon as merged | Baseline sha; "branch from main now" |
| T-02 | — | B, C, D | — | Same day | Rulings link; per-member unblocked decisions |
| T-06 | — | B (applyResult sanity check) | `onHeartsSpent` prop | PR open | Changed signatures (`quitLesson`, `ExerciseViewProps`) |
| T-09 | — | T-19 (you); D records | Overlay URL flag `?debug` | PR merged | How to open the overlay |
| T-08 | C (T-07) | T-19, T-21 (D) | `AcousticFrame.pitchHz` / `clarity` (D1) | Merged by D6 | "Pitch path live on staging", for D's privacy audit |
| T-19 | T-08, T-09 | Everyone (defects) | Machine and mic availability (ask on D5) | D8 | Report link; defects logged |
| T-24 | T-19 to T-23 | Everyone | Defect owners | D12 | Assignment list |

---

## F. Daily working checklist (A)

**Start of day**
1. `git switch main && git pull`; check that CI on `main` is green.
2. Read the team status posts; note any blockers.
3. Check open PRs waiting on you.
4. Re-read today's row in §4.1.

**During the day**
- Work your own task in the morning block.
- Reviews and merges in the afternoon block.
- Answer blockers within 2 hours.

**When to escalate**
- To the adviser: a requirement must change, or the deadline is at risk.
- Any time: data loss or a security problem.

**End of day**
- Update Jira.
- Post the checkpoint result if today was a checkpoint.
- Push your branch.

**Daily status (post at 09:15):**
```
Yesterday's progress:
Today's target:
Current blocker:
Jira ticket:
Expected deliverable:
```
