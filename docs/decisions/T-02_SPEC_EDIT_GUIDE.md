# T-02 → SRS / SDD manual editing guide

For A (Amatong), who edits the documents personally. **Nothing here has been applied to the SRS or SDD.**

| | |
|---|---|
| SRS | `Y:\School Files\Semestral Material\L4S1\CPE 463\MUZ_SRS.pdf` — v01.01, dated 09/05/2026 |
| SDD | `Y:\School Files\Semestral Material\L4S1\CPE 463\MUZ_SDD.pdf` — v01.00, dated 09/05/2026 |
| Editable sources | `MUZ_SRS.docx` / `MUZ_SDD.docx` (SPMP Appendix B). **Not located on this machine** (U-11). Edit the Word files; the PDFs are the reference. |
| How "Current wording" was taken | Text extracted from the PDFs. The extraction drops some symbols; they are restored here in **[brackets]** (for example [≤], [≥], [°], [→]). Check each against the Word file before replacing. |
| Version numbers | SRS v01.01 → **v01.02**. SDD v01.00 → **v01.01** (earlier plans said "v01.02" for both; the SDD's next number is v01.01 — your call). |

**Order of work:** SRS first (it is the authority), then SDD, then the revision-history rows (last section).

Change types: **Replace** = swap the quoted text; **Add** = insert new text where stated; **No change** = checked, nothing to do.

---

## Part 1 — SRS

### [D1, D2] SRS — 3.1.6.1 (Flow 3D)

- Type: **Replace**
- Current wording:
  `3.1.6.1 The system shall process audio buffers with an AnalyserNode fftSize of 4096 (sample analysis window between 2048 and 4096 samples), achieving real-time pitch detection within 50 ms of instrument excitation.`
- Replace with:
  `3.1.6.1 The system shall process microphone audio in a Web Audio AudioWorklet using a 4096-point FFT over a 4096-sample analysis window advanced in 512-sample hops, achieving real-time pitch detection within 50 ms of instrument excitation.`
- Reason: D1 keeps 4096 / 512; D2 replaces AnalyserNode with an AudioWorklet (`src/audio/config.ts:45-46`, `src/audio/worklet/chroma.worklet.ts`).
- Related references: SRS 3.4 bullet 2 (next item); SRS 3.7.3 bullet 2; SDD 4.2 AudioFrequencyBuffer; SDD §7 matrix row 3.1.6.1.
- ⚠ Note: "within 50 ms" is **kept unchanged** (not part of the ruling). It has never been measured; T-19 measures it. If T-19 fails it, a new ruling is needed — do not change it now.

### [D1] SRS — 3.4 Performance, bullet 2

- Type: **Replace**
- Current wording:
  `The system shall process audio buffers with a maximum window length of 2048 samples, achieving real-time pitch detection within 50 ms of instrument excitation.`
- Replace with:
  `The system shall process audio buffers with a 4096-sample analysis window advanced in 512-sample hops, achieving real-time pitch detection within 50 ms of instrument excitation.`
- Reason: removes the contradiction with 3.1.6.1 (D1).
- Related references: SRS 3.1.6.1; SDD 4.2.

### [D3, M1] SRS — 3.4 Performance, bullet 4

- Type: **Replace** (one edit covers both rulings)
- Current wording:
  `The initial client application bundle download size shall not exceed 5 MB, with MediaPipe WebAssembly binaries and the pose_landmarker_lite model weight asset (maximum 10 MB) loaded asynchronously via route-level code splitting upon entering interactive practice modules.`
- Replace with:
  `The initial client application bundle download size shall not exceed 5 MB. The MediaPipe WebAssembly binaries and the pose_landmarker_lite model weight asset (the model asset not exceeding 10 MB) shall be loaded asynchronously inside the posture Web Worker, only when the user enables the camera in an interactive practice module.`
- Reason: D3 (cap = model asset only; model is 5.78 MB); M1 (no router — loading is deferred at the worker, triggered by "Turn on camera": `src/practice/PracticeRig.ts` `startCamera()` → worker `INIT` → `FilesetResolver` in `src/workers/posture.worker.ts`).
- Related references: SDD 1.4 (pose_landmarker_lite reference — no change); SDD §7 row "3.6.1-3.6.2 … Static build bundle asset audit" (no change). The SDD contains **no** 10 MB statement, so there is no SDD edit for D3.

### [D9] SRS — 3.1.2.2 (Flow 2)

- Type: **Replace**
- Current wording:
  `3.1.2.2 The system shall calculate and display the user's consecutive day streak counter based on lesson completion timestamps.`
- Replace with:
  `3.1.2.2 The system shall calculate and display the user's consecutive day streak counter based on daily lesson activity, where any finished lesson run (passed or failed, but not a run the user quits) counts as activity for that day.`
- Reason: D9 (`src/lib/progress/applyResult.ts:77,117`).
- Related references: SDD C-02 ("Computes daily streak by checking difference between current_date and last_activity_date") — still accurate, no change.

### [D13] SRS — 3.1.4.4 (Flow 3B) — *recommended*

- Type: **Replace** (adds one clause; the formula itself stays in the SDD)
- Current wording:
  `3.1.4.4 The system shall compute an aggregated rhythm consistency score upon sequence completion.`
- Replace with:
  `3.1.4.4 The system shall compute an aggregated rhythm consistency score upon sequence completion, in which omitted beats count as zero accuracy (formula defined in SDD C-04).`
- Reason: D13 makes omitted beats a behavioural rule; the SRS states the behaviour, the SDD the formula.
- Related references: SDD C-04 (formula, below); SDD §7 row 3.1.4.4 (no change).
- If you prefer the SRS untouched, skip this edit; the SDD C-04 edit is the required one.

### [M3] SRS — 3.7.1 User Interfaces, bullet 2

- Type: **Replace**
- Current wording:
  `The interface shall present an interactive 2D HTML5 canvas HUD overlaid atop the camera stream, rendering skeletal joints, alignment vectors, and musical note stave indicators.`
- Replace with:
  `The interface shall present an interactive 2D HTML5 canvas HUD overlaid atop the camera stream, rendering skeletal joints and alignment vectors. The practice target shall be shown in a side panel beside the HUD: single notes on a musical staff, and chords on a keyboard diagram with the chord name.`
- Reason: M3. Verified: `PracticeDrillView.tsx:163-166` draws note targets on `GrandStaff`; chords use `TargetKeyboard` plus a label.
- Related references: SDD 6.3 Wait-State Practice View ("Target Stave/Chord display") — already consistent, no change.

### [D2] SRS — 3.7.3 Software Interfaces, bullet 2

- Type: **Replace**
- Current wording:
  `Web Audio API & Pitchy: Interfaced via standard browser AudioContext and AnalyserNode instances to perform autocorrelation pitch tracking for monophonic drills and FFT-based chromagram vector extraction for polyphonic chord evaluation.`
- Replace with:
  `Web Audio API & Pitchy: Interfaced via the standard browser AudioContext and an AudioWorklet processor to perform pitchy autocorrelation pitch tracking for monophonic drills and FFT-based chromagram vector extraction for polyphonic chord evaluation.`
- Reason: D2.
- Related references: SRS 3.6.2 bullet 3 ("via the native Web Audio API and pitchy") — still accurate, no change.
- ⚠ Implementation dependency: "pitchy … for monophonic drills" is true only after T-07 + T-08 merge (D4). Apply the edit now (it is the approved requirement) but do not mark SRS 3.1.6.2 as verified until then.

### [D8] SRS — 3.1.1.4 (Flow 1) — *recommended for consistency*

- Type: **Replace** (not in the approved doc-edit list; the ruling named the SDD only — apply only if you agree)
- Current wording:
  `3.1.1.4 The system shall provide an onboarding self-assessment selector allowing the user to set their baseline starting node on the curriculum tree (e.g., Absolute Beginner starting at Module 1, or Early Intermediate unlocking subsequent fundamentals).`
- Replace with:
  `3.1.1.4 The system shall provide an onboarding self-assessment selector allowing the user to set their baseline starting node on the curriculum tree across three placement tiers (Novice starting at Module 1, Proficient starting at Module 5, Virtuoso starting at Module 9).`
- Reason: the example contradicts D8 (`src/lib/progress/placement.ts`; tiers from `src/content/tiers.ts`).
- Related references: SDD C-01 (required edit below); SDD 6.3 "Self-Assessment choice cards" (no change).

### [D11] SRS — 3.1.1.1 (Flow 1) — *conditional, do not edit yet*

- Current wording:
  `3.1.1.1 The system shall allow users to register and authenticate via secure email credentials and third-party OAuth providers.`
- **Option A (recommended): no change.** Valid once T-10 ships Google sign-in. Today it is **not met**: the live project enables only the email provider.
- **Option B (only with adviser approval, SPMP 3.3):** if Google cannot be enabled by the freeze, replace with
  `3.1.1.1 The system shall allow users to register and authenticate via secure email credentials.`
  This **drops a requirement**; do not apply it without the adviser.
- Optional precision under Option A (approved scope = Google only):
  `3.1.1.1 The system shall allow users to register and authenticate via secure email credentials and a third-party OAuth provider (Google).`
- Related references: SDD C-01 inputs ("OAuth provider callback tokens"); SDD 6.3 ("OAuth Google button"); SDD §7 row 3.1.1.1 ("Email & OAuth Authentication").

### [D7] SRS — 3.1.3.1 (Flow 3A) — *optional consistency check*

- Current wording: `3.1.3.1 The system shall display interactive cards containing musical notation, piano keyboard chord voicings, and audio sample previews.`
- Optional replacement: `… and audio previews.` (synthesised audio is a preview, but not a recorded "sample").
- Reason: D7 named the SDD only; this is purely wording.

### Checked — no SRS change needed

| Ruling | SRS location checked | Why no change |
|---|---|---|
| D4 | 3.1.6.2; 3.6.2 bullet 3 | Ruling keeps the SRS as written. |
| D5 | 3.1.2.4 ("exceeding a 15-second response window") | Ruling keeps 15 s; the code changes instead. |
| D6 | 3.1.4.3 | Already Perfect / Good / Miss. |
| D10 | 3.1.2.4 ("immediately upon scoring [≥] 80% on an Interactive Theory Module") | Behaviour matches. The SRS does not state a heart maximum; the 5-heart cap comes from the SDD (C-01 "default profile with 5 hearts"; 6.3 "Heart Counter (0-5)"). |
| D12 | 3.1.5.4, 3.1.5.5 | Strict bands stay the requirement; hysteresis is display-only (SDD note). |
| D14 | 3.5.2 bullet 1 | Requirement unchanged; the accepted risk is documented in the SDD. **The live database currently violates it** (anonymous read of `profiles`) — a defect, not a document change. |
| M2 | 3.1.7 | Date range is in the SDD (6.3); unchanged. |
| M5 | 3.4 bullet 1 (20 to 30 Hz) | Unchanged; T-19 measures. |

Not covered by any ruling (do not edit without a new ruling): SRS 3.1.7.2 "aggregating angular deviation logs" (only per-session posture scores are stored; affects T-12).

---

## Part 2 — SDD

### [D1, D2] SDD — 4.2 Data Dictionary → "Ephemeral Client-Side Memory Structures" → AudioFrequencyBuffer

- Type: **Replace**
- Current wording:
  `AudioFrequencyBuffer: Float32Array of 2048 frequency bin magnitudes populated by Web Audio AnalyserNode.getFloatFrequencyData() using an fftSize of 4096 (sample window of 2048-4096 samples).`
- Replace with:
  `AudioFrequencyBuffer: 2048 frequency-bin magnitudes computed inside the chroma AudioWorklet by a 4096-point FFT over a Hann-windowed 4096-sample analysis window, advanced every 512 samples. The buffer never leaves the AudioWorklet; only the 12-bin chroma vector, onset flags, signal levels and the pitchy pitch estimate (frequency and clarity) are posted to the main thread.`
- Reason: D1, D2 (`src/audio/dsp/ChromaFrameProcessor.ts`).
- Related references: SDD C-06 (next); ChromaVector entry right below (no change).
- ⚠ "the pitchy pitch estimate … posted" becomes true when T-08 merges (branch `task/T-08-pitch-wiring`). Apply after T-08 merges, or apply now and accept it as the design.

### [D2] SDD — 5 Component Design → C-06 Audio Verification & Wait-State FSM → Processing Logic

- Type: **Add** — insert as the first line under "Processing Logic:", before "1. Single Note Mode".
- Insert:
  `All audio analysis runs in an AudioWorklet processor on the audio rendering thread (4096-sample analysis window, 512-sample hop). Raw PCM samples never leave the AudioWorklet.`
- Reason: D2; the component never names where processing runs.
- Related references: steps 1–4 of C-06 (no change: pitchy, ±35 cents, clarity [≥] 0.85, 4096-point FFT, 0.72, 200 ms, 400 ms, 15 s all match the rulings).

### [D2] SDD — 7 Requirements Matrix → row 3.1.6.1

- Type: **Replace** (two cells)
- Current wording:
  - Requirement cell: `Local Microphone Processing via AnalyserNode`
  - Test cell: `AnalyserNode audio stream capture & FFT buffer length assertion test`
- Replace with:
  - Requirement cell: `Local Microphone Processing via AudioWorklet (4096-sample window, 512-sample hop)`
  - Test cell: `AudioWorklet frame-processor window, hop and onset-timing unit test`
- Reason: D2; the matching tests exist in `src/audio/__tests__/dsp.test.ts`.

### [D8] SDD — 5 Component Design → C-01 Authentication & Onboarding → Processing Logic

- Type: **Replace** (last sentence of Processing Logic)
- Current wording:
  `Evaluates self-assessment selection (Beginner: unlocks Module 1; Intermediate: unlocks Module 2).`
- Replace with:
  `Evaluates self-assessment selection across three placement tiers (Novice: starts at Module 1; Proficient: starts at Module 5; Virtuoso: starts at Module 9). Lessons before the chosen starting module are recorded as completed, and EXP is raised to the starting lesson's required EXP so that it unlocks.`
- Reason: D8; behaviour from the header of `src/lib/progress/placement.ts`.
- Related references: SRS 3.1.1.4 (recommended edit above); SDD 6.3 Auth & Onboarding row (no change).

### [D7] SDD — 5 Component Design → C-03 Interactive Theory → Inputs

- Type: **Replace**
- Current wording:
  `Inputs: Theory card payload arrays (notationUrl, diagramUrl, audioSampleUrl, quizOptions).`
- Replace with:
  `Inputs: Theory card payload arrays (MIDI note numbers rendered as SVG staff notation and keyboard diagrams, audio previews synthesized in the browser with the Web Audio API, quizOptions).`
- Reason: D7 (`src/types/lesson.types.ts:75-83` — `notes?: number[]`; `src/lib/theory/playNote.ts`; `GrandStaff.tsx`, `PianoKeyboard.tsx`).
- Not covered by any ruling — leave unchanged: C-03 Processing Logic "Requires 100% correct answer verification…" (checkpoint lessons use a pass mark; needs its own ruling).

### [D10] SDD — 5 Component Design → C-02 Skill Tree & Progression → Processing Logic

- Type: **Replace** (the heart-restore sentence only)
- Current wording:
  `Stamina restores at a rate of 1 heart per 15-minute countdown, or restores 1 heart immediately upon scoring [≥] 80% on an Interactive Theory Module..`
- Replace with:
  `Stamina restores at a rate of 1 heart per 15-minute countdown, or restores 1 heart immediately upon scoring [≥] 80% on the first attempts of an Interactive Theory Module's questions, up to the 5-heart maximum. Replaying a theory lesson can restore a heart again; no heart is restored when the learner quits the lesson.`
- Reason: D10 (`src/lesson/runner.ts:22,170-181`). Also removes the stray double full stop inside the replaced sentence.
- Related references: "If hearts = 0, practice drill buttons are disabled" in the same paragraph — consistent with U-20; no change.

### [D13] SDD — 5 Component Design → C-04 Rhythm Tapping → Processing Logic

- Type: **Add** — insert after the line `If |[Δ]t| > 50ms or omitted: Miss (Score += 0).`
- Insert:
  `Rhythm consistency (%) = 100 × Σ over all target beats of max(0, 1 − |[Δ]t| / 50 ms) ÷ number of target beats. Omitted beats contribute 0.`
- Reason: D13 defines the "aggregated rhythm consistency percentage" listed under Outputs.
- ⚠ The code still uses the old formula (`src/lib/rhythm/timing.ts:53-54`) until D's T-16 merges.
- Related references: SRS 3.1.4.4; SDD 4.2 `rhythm_consistency` (no change); SDD §7 row 3.1.4.4 (no change).

### [D12] SDD — 5 Component Design → C-05 Posture Vision & Web Worker → Processing Logic

- Type: **Add** — insert after the paragraph ending `…with corrective HUD text cues.`
- Insert:
  `HUD colouring applies a 2[°] recovery hysteresis to avoid flicker at a band edge (for example, an elbow flagged red below 80[°] turns green again at 82[°]). Posture scoring and the stored posture_score use the exact target bands, without hysteresis.`
- Reason: D12 (`src/vision/posture/config.ts:24`; scoring via `inBandStrict`).
- Related references: SRS 3.1.5.4 (no change); SDD §7 row 3.1.5.4 (no change).

### [D14] SDD — 3.3 Design Rationale

- Type: **Add** — new paragraph after the sentence `The use of Row-Level Security helps restrict database access to authorized users.`
- Insert:
  `Known limitation (accepted for the capstone scope): lesson results, EXP, hearts, streaks and achievements are computed in the browser and written by the client. Row-Level Security limits each user to their own rows, but it does not stop an authenticated user from changing their own EXP, hearts, streak or lesson-completion values through the public API. This risk is accepted and documented; moving these writes to a server-side database function is deferred as future work.`
- Reason: D14 — states the limitation plainly and does **not** claim protection against self-manipulation.
- Related references: SRS 3.5.2 (unchanged); SDD §7 row 3.5.2 (no change).

### [D11] SDD — C-01 Inputs, 6.3 Auth & Onboarding row, §7 row 3.1.1.1 — *conditional*

- Current wording: C-01 `Inputs: User email/password strings, OAuth provider callback tokens, onboarding self-assessment selection index.`; 6.3 `… Sign-In button, OAuth Google button, Self-Assessment choice cards.`; §7 `3.1.1.1 Email & OAuth Authentication`.
- **Option A (recommended): no change** — already says Google. Correct once T-10 enables Google.
- **Option B (only if the adviser approves dropping OAuth):** C-01 Inputs → `Inputs: User email/password strings, onboarding self-assessment selection index.`; 6.3 → remove `OAuth Google button,`; §7 → `3.1.1.1 Email Authentication`.

### Checked — no SDD change needed

| Ruling | SDD location checked | Why no change |
|---|---|---|
| D3 | Whole SDD | No model-size statement exists. |
| D4 | C-06 step 1; §7 row 3.1.6.2 | Already pitchy, ±35 cents, clarity [≥] 0.85. |
| D5 | C-06 steps 3–4; 6.3 "15s Countdown Ring", "Drill Timeout (15s)" | Already 15 s. |
| D6 | C-04; 6.3 Rhythm Tapping View | Already Perfect / Good / Miss. |
| D9 | C-02 streak sentence | Already "difference between current_date and last_activity_date". |
| M1 | C-05 "Offloads video frame bitmaps to Web Worker" | Consistent. |
| M2 | 6.3 "Historical date-range picker" | Requirement kept; T-12 implements 7d / 30d / all. |
| M3 | 6.3 "Target Stave/Chord display" | Consistent. |
| M5 | 4.2 PoseLandmarkBuffer "at 25 Hz" | Nominal figure; the gate allows ≤ ~33 Hz. Revisit only if T-19 shows it misleads. |

---

## Part 3 — Revision history rows

**SRS** (revision table on page 2):

| Date | Version | Description | Author |
|---|---|---|---|
| `<date you edit>` | 01.02 | Applied T-02 change-control rulings: 3.1.6.1 and 3.4 audio window 4096 / hop 512 and AudioWorklet (D1, D2); 3.4 model size cap and worker-level lazy loading (D3, M1); 3.1.2.2 streak counts finished, non-quit runs (D9); 3.7.1 practice target shown beside the HUD (M3); 3.7.3 AudioWorklet (D2)`[; 3.1.4.4 omitted beats (D13)][; 3.1.1.4 three placement tiers (D8)]` | Rosales, Amatong, Barnaija, Bernante |

**SDD** (revision table on page 2):

| Date | Version | Description | Author |
|---|---|---|---|
| `<date you edit>` | 01.01 | Applied T-02 change-control rulings: 3.3 known limitation on client-side progression writes (D14); 4.2 AudioFrequencyBuffer in an AudioWorklet (D1, D2); C-01 three placement tiers (D8); C-02 heart restoration detail (D10); C-03 synthesized audio and SVG notation (D7); C-04 rhythm consistency formula (D13); C-05 display-only hysteresis (D12); C-06 AudioWorklet processing (D2); §7 row 3.1.6.1 (D2) | Rosales, Amatong, Barnaija, Bernante |

Remove any bracketed items you choose not to apply. Leave D11 out of both rows unless Option B is approved.
