# AUX-AI-01 — AI Improvement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn MUZ's AI and DSP features from "built and unit-tested on synthetic data" into "measured on real input". Fix the one feedback gap that affects learners. Add no new AI infrastructure.

**Architecture:** Offline evaluation scripts replay real recordings through the **existing, unchanged** pipeline classes and report confusion matrices. A small UI cue is added for "body not visible". No model, dependency or service is added.

**Tech Stack:** TypeScript, `tsx` (already a dev dependency), Vitest; the existing `ChromaFrameProcessor`, `ChordVerifier`, `NoteVerifier`, `PostureAnalyzer`.

**Spec:** `docs/auxiliary/AUX_AI_FEATURE_ASSESSMENT.md` (§5–6) and `AUX_AI_CLAIMS_AND_EVIDENCE.md` (§2)

**Status:** **PAUSED (A, 2026-11-19).** The earlier approval was withdrawn. R1, R2 and R3 are not started. Nothing here will be built or recorded until A re-approves, and any measurement is coordinated with T-19.

**Branch:** `task/AUX-AI-01-evaluation`, cut from `main` **after T-08 part 2 merges** (IC-2, Fri Nov 20), so the pitchy path can be evaluated too.

## 1. Bottom line

The SRS does not need more AI. The current design (ML pose estimation + rules + DSP) matches what the SRS specifies. **The real weakness is evidence:** no accuracy or speed figure exists.

So the best-value work is **measurement, not more models**. It also directly supports T-19, which you already own.

## 2. Recommendations by category

### 2.1 Required to satisfy existing requirements

Already owned elsewhere. **Not part of AUX-AI-01; listed so nothing is duplicated.**

| # | Item | Owner / task |
|---|---|---|
| Q1 | pitchy single-note verification (SRS 3.1.6.2) | C T-07, A T-08 |
| Q2 | Measure inference Hz / ms, HUD FPS, audio latency (SRS 3.4) | A T-19 |
| Q3 | Stop storing the placeholder 95 posture score (`DashboardScreen.tsx:129`, `useGamification.ts:542,554`) | Revert of PR #22 (decided, `task/revert-pr-22`) |
| Q4 | Media never leaves the device: network audit | D T-21 |

### 2.2 Necessary to make the existing AI/ML reliable (**recommended for AUX-AI-01**)

| # | Item | Justification | Files | Complexity | Benefit | Risks | Testing | Needs |
|---|---|---|---|---|---|---|---|---|
| **R1** | **Audio evaluation harness.** Replay labelled real piano WAV clips through `ChromaFrameProcessor` → `ChordVerifier` / `NoteVerifier` (and `PitchVerifier` after T-08) in Node. Print the match / miss / unvoiced confusion matrix, plus the false-accept and false-reject rates per target. | No accuracy evidence exists (N2). The thresholds are synthetic-tuned (`audio/config.ts:1-6`). | New `scripts/eval/audio-eval.ts`, `scripts/eval/wav.ts` (tiny PCM16/float WAV reader, no dependency), `scripts/eval/README.md`; recordings in a git-ignored `eval-data/` | M (~0.5–1 day) | First real accuracy figures; shows which thresholds to tune in T-19 | Recordings from one piano/mic do not generalise; say so in the report | Unit test the WAV reader; a sanity run on synthetic fixtures must reproduce `scenarios.test.ts` verdicts | ~30–60 short clips from the T-19 session (correct, wrong-chord, wrong-octave, silence/knock). No downloads, APIs or new hardware. |
| **R2** | **Posture evaluation by landmark replay.** A debug-only (`?perf=1`-style flag) button exports the session's **landmark arrays** (numbers only; never frames) to a local JSON file. A Node script replays them through `PostureAnalyzer` against hand labels (good / bad elbow / bad wrist per clip) and reports per-rule precision and recall. | Posture accuracy is unmeasured (N1). The wrist angle is the suspected weak point (assessment §4.1). | New `scripts/eval/posture-eval.ts`; small debug export in `src/components/lesson/practice/PerfOverlay.tsx` (debug flag only) | M (~1 day) | First posture accuracy evidence; tells you whether the wrist rule is trustworthy | **Privacy:** landmarks are biometric-ish data. Export only behind the debug flag, user-initiated, saved locally, never uploaded; D's T-21 must check it. | The replay of a synthetic skeleton fixture must equal `rules.test.ts` outcomes | ~10–20 labelled 10-second clips from team members at T-19 |
| **R3** | **"Can't see you" cue.** When posture is `null` (not evaluable) for more than 1.5 s while a drill or hold is active, show "Move so the camera can see your shoulders, elbows and wrists". | Today an unseen learner just sees a grey skeleton and cannot pass; the reason is not stated (assessment §4.1). | `PracticeDrillView.tsx`, `PostureHoldView.tsx` status text (or a shared helper in `PracticeWidgets.tsx`) | S (~2 h) | Clearer feedback, fewer "it's broken" reports in T-22/T-23 | Touches lesson views; must land before the IC-3 freeze (Tue Nov 24) | Pure timer helper unit-tested (1.5 s boundary); manual camera check | None |

### 2.3 Improvements that would meaningfully strengthen the AI (**not recommended before release**)

| # | Item | Benefit | Cost / risk | Needs |
|---|---|---|---|---|
| S1 | **Expose neutral-posture calibration** (already built: `calibration.ts`, worker `CALIBRATE`). This is T-29. | Personalised slouch / head baselines; a truthful "calibrated to you" claim | ~0.5 day UI + persistence; advisory rules only | None |
| S2 | **MediaPipe Hand Landmarker for the wrist angle** | A far better wrist-flexion measurement (21 hand points) | Second model (several MB), roughly 2× inference cost; risks the 20–30 Hz / 35 ms budget; 2–3 days | Model download (free, Google) |
| S3 | **Learned threshold tuning:** fit the 5 engineering chord thresholds to R1 data (grid search / logistic regression on matcher features) | Data-driven thresholds instead of hand-picked ones; a legitimate "tuned on real data" claim | Needs enough labelled clips to avoid overfitting; risk of tuning to one piano | R1 data |
| S4 | **Rule-based practice recommendations** from `performance_records` ("you miss F major most") | Useful feedback | Depends on T-12 real data; **must not be called AI** | T-12 |

### 2.4 Outside current scope (recorded and rejected)

| Item | Why not |
|---|---|
| Train a chord/note classifier (CNN on spectrograms) | No dataset, no training infrastructure; less explainable than templates; no SRS requirement |
| Cloud ML APIs | Violates local-processing privacy (SRS 3.5.1); costs money |
| Chatbot / LLM tutor | Adds generative AI purely for appearance (explicitly excluded in the brief) |
| Switch to the `full` / `heavy` pose models | Bigger (beyond the 10 MB model cap reading, D3) and slower; benefit unproven until R2 measures `lite` |

## 3. Schedule fit (honest)

Today is Thu Nov 19. Your critical path:
- T-08 part 2 by **IC-2, Fri Nov 20**;
- T-19 hardware session before the **IC-3 freeze, Tue Nov 24**;
- triage and T-24 regression through **Fri Nov 27**.

| Item | When | Interference |
|---|---|---|
| R1 + R2 recordings | **During** the T-19 session (record once, use twice) | Adds about 30–45 min to T-19 |
| R1 script | Sat Nov 21 – Mon Nov 23, after T-08 | Scripts only, not shipped; allowed after the freeze too |
| R2 script + debug export | After R1, if time allows | The debug export is product code → before the freeze, or drop it and replay only synthetic data |
| R3 cue | Before Tue Nov 24, or not at all | Small; lesson views are not on another member's active list |
| S1–S4 | After release | — |

**If anything on T-08 / T-19 / T-24 slips, AUX-AI-01 stops first.** Cut order: R2 → R3 → R1.

## Global Constraints

- No new runtime dependencies. No model downloads. No network calls in scripts.
- Evaluation recordings and landmark exports live in a git-ignored `eval-data/` and are never committed. They are deleted after the report unless the people recorded agree in writing.
- No change to any threshold in `src/audio/config.ts`, `noteConfig.ts` or `vision/posture/config.ts` within AUX-AI-01. Tuning goes through T-19 with A's review.
- Results are reported with the sample size and recording conditions; no figure without its n.

## Review Focus

1. **A WAV with a different sample rate (44.1 vs 48 kHz)** must be processed at its own rate, not silently assumed to be 48 k. Test: the WAV reader returns `sampleRate`, and the harness passes it to `ChromaFrameProcessor`.
2. **A stereo WAV** is down-mixed exactly as the worklet does (mean of the channels). Test: stereo input with identical channels equals the mono result.
3. **Clips with no onset** (silence) are reported as "no attempt", not as a miss. Test: a synthetic silence clip → 0 attempts.
4. **Landmark export when `hasPose` is false** writes NaN and visibility 0, which replay as unknown. Test: a round-trip of a NaN frame.
5. **The debug export button must not exist without the debug flag.** Test: `isPerfDebug()` gate, plus a manual check.

---

### Task 1 (R1): Audio evaluation harness

**Files:**
- Create: `scripts/eval/wav.ts`, `scripts/eval/audio-eval.ts`, `scripts/eval/README.md`
- Create: `scripts/eval/__tests__/wav.test.ts`
- Modify: `.gitignore` (add `eval-data/`); `package.json` (add script `"eval:audio": "tsx scripts/eval/audio-eval.ts"`)

**Interfaces:**
- Consumes: `ChromaFrameProcessor(sampleRate, onFrame, config?)` and `.process(block, timeSec)`; `ChordVerifier`, `NoteVerifier`, `ChordMatcher`, `NoteMatcher` (unchanged).
- Produces:
  - `readWav(buf: Uint8Array): { sampleRate: number; channels: Float32Array[] }`
  - CLI: `npm run eval:audio -- eval-data/audio/labels.csv`. `labels.csv` columns are `file,targetKind,target,expected` (`expected` ∈ `match|miss|none`). The CLI prints a confusion table and per-target false-accept / false-reject rates.

- [ ] **Step 1:** Write failing tests in `wav.test.ts`:
  - a 16-bit mono 48 kHz buffer built in the test → `sampleRate === 48000`, samples within 1/32768;
  - a float32 stereo buffer → 2 channels;
  - a non-RIFF buffer → throws `/not a WAV/`.
- [ ] **Step 2:** `npx vitest run scripts/eval/__tests__/wav.test.ts` → FAIL.
- [ ] **Step 3:** Implement `readWav`: PCM16 and float32 only; walk the chunks to find `fmt ` / `data`.
- [ ] **Step 4:** Re-run → PASS.
- [ ] **Step 5:** Implement `audio-eval.ts`:
  - feed 128-sample blocks, down-mixed the same way as `chroma.worklet.ts:46-56`;
  - convert frame times to ms;
  - feed the verifier;
  - record the first attempt's `kind`.
- [ ] **Step 6:** Sanity check: render 3 clips from `audio/__tests__/fixtures.ts` to WAV and run the harness → verdicts equal those `scenarios.test.ts` asserts.
- [ ] **Step 7:** Commit: `AUX-AI-01: offline audio evaluation harness`.
- [ ] **Step 8 (at T-19):** Record the clips; run the harness; write `docs/auxiliary/AUX_AI_EVALUATION_RESULTS.md` (conditions, n, tables). Update `AUX_AI_CLAIMS_AND_EVIDENCE.md` N2.

### Task 2 (R2): Posture landmark replay

**Files:**
- Create: `scripts/eval/posture-eval.ts`
- Modify: `src/components/lesson/practice/PerfOverlay.tsx` (debug-only "Export landmarks" button)
- Modify: the posture worker protocol: add an optional `landmarks?: Float32Array` to `RESULT`, sent only when the INIT message carries `debugLandmarks: true` (`workerProtocol.ts`, `posture.worker.ts`, `PracticeRig.ts`)

**Interfaces:**
- Produces: export file `{ version: 1, frames: Array<{ t: number; world: number[]; image: number[]; visibility: number[] }> }`; CLI `npm run eval:posture -- eval-data/posture/labels.csv` (`file,label` with `label` ∈ `good|elbow|wrist`).

- [ ] **Step 1:** Failing test: a frame exported then re-imported → `PostureAnalyzer.process` gives the same snapshot as the original `PoseFrame`, including the NaN/visibility-0 case.
- [ ] **Step 2:** Implement the protocol flag (off by default), the export and the replay; the test passes.
- [ ] **Step 3:** Manual: without the debug flag, no button and no `landmarks` field in `RESULT` (check in DevTools).
- [ ] **Step 4:** Commit; ask D to include the export path in T-21.

### Task 3 (R3): "Can't see you" cue

**Files:**
- Create: `src/practice/visibilityCue.ts`; test `src/practice/__tests__/visibilityCue.test.ts`
- Modify: `PracticeDrillView.tsx`, `PostureHoldView.tsx` (status text)

**Interfaces:**
- Produces: `class NotVisibleTimer { push(tMs: number, compliant: boolean | null): boolean }`. It returns `true` once `null` has persisted for ≥ 1500 ms, and resets on any non-null value.

- [ ] **Step 1:** Failing tests:
  - null at 0 and 1499 → false;
  - null at 1500 → true;
  - `false` at 1600 → false (reset);
  - null again at 1700 and 3200 → true.
- [ ] **Step 2:** Implement; pass.
- [ ] **Step 3:** Wire it into both views at lower priority than the existing "latching" / "postureBlocked" messages. Text: `Move so the camera can see your shoulders, elbows and wrists.`
- [ ] **Step 4:** `npx vitest run`, `npm run build` → pass. Manual camera check (step out of frame). Commit.
