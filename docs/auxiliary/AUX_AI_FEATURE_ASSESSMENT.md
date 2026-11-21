# AUX-AI-01 — AI Feature Assessment

| | |
|---|---|
| **Task** | AUX-AI-01 (additional workstream, Member A). Not part of T-01…T-26. |
| **Phase** | Investigation and assessment only. No code changed. |
| **Date** | 2026-11-19 |
| **Code baseline** | `origin/main` @ `67dc05e` (PR #22 merged; the revert on `task/revert-pr-22` is not merged yet). Unmerged branch `task/T-08-pitch-wiring` @ `5e5092c` noted where relevant. |
| **Sources read** | `src/vision/**`, `src/workers/posture.worker.ts`, `src/audio/**`, `src/practice/**`, lesson practice views, `src/hooks/useGamification.ts`, `src/components/dashboard/DashboardScreen.tsx`, `public/models/README.md`, `docs/audit/PROJECT_REQUIREMENTS_AUDIT.md`, `docs/audit/REQUIREMENTS_TRACEABILITY_MATRIX.md`, `docs/decisions/RULINGS.md`, the execution guides |
| **Not available** | The SRS, SDD and SPMP PDFs are **not in the repository**. The requirement wording below comes from the RTM's paraphrases (audit of 2026-11-16), not from the PDFs. See §7. |

**Evidence labels.** I use these consistently:

| Label | Meaning |
|---|---|
| **Code** | Read in the source (file:line given) |
| **Test** | A unit test asserts it (synthetic data only) |
| **Runtime** | Seen working in a browser. Reported by earlier work, not re-run here. |
| **Unmeasured** | No measurement exists |
| **Proposed** | Not built |

---

## 1. The short answer

**Yes, MUZ contains one genuine AI/ML feature: on-device pose estimation.** Every frame, a pretrained neural network (Google's MediaPipe Pose Landmarker *Lite*) estimates 33 body keypoints in 3D from the webcam image, in the browser. That is real machine-learning inference.

**Everything built on top of that network's output is deterministic.** The angle maths, the posture bands, the hysteresis, the cue text, the posture score and the wait-state are rules and arithmetic. Nothing is learned.

**The audio side contains no ML at all.** Chord and note recognition are classical digital signal processing: an FFT, a chromagram, onset detection, and cosine similarity against hand-built harmonic templates. This is a legitimate and well-established technique (music information retrieval). It is not a trained model.

**No part of MUZ learns or adapts from the user's data.** Placement is the learner's own choice. Difficulty is a fixed curriculum. A neutral-posture calibration exists in the worker, but nothing in the live UI triggers it.

**Accuracy has never been measured on real people or a real piano.** All posture tests use synthetic skeletons. All audio tests use a synthetic piano. Today, any statement of accuracy would be an assumption.

The fair one-sentence description is:

> MUZ combines **on-device ML pose estimation** with **rule-based biomechanical posture checks** and **real-time DSP chord and note recognition**, all running locally in the browser.

"AI-assisted posture feedback" is defensible. "An AI that listens to you play" is not: the listening part is signal processing.

---

## 2. Key distinctions, using MUZ's own code

| Concept | What it means | Where MUZ does it |
|---|---|---|
| **Trained ML model / inference** | Parameters were learned from data by someone. At runtime you only run the network forward ("inference"). | `pose_landmarker_lite.task` (5,777,746 B, float16) is a pretrained TFLite model from Google (`public/models/README.md`). `posture.worker.ts:58-72` loads it. `detectForVideo` runs inference on every sent frame (`posture.worker.ts:93`). **MUZ does not train or fine-tune it.** |
| **Deterministic algorithm** | The same input always gives the same output, by a formula a person wrote. | The joint angles (`vec3.ts`, `metrics.ts`) and the whole audio chain (`ChromaFrameProcessor.ts`, `ChordMatcher.ts`, `NoteMatcher.ts`) |
| **Signal processing** | Maths on waveforms: FFT, filtering, autocorrelation | `src/audio/dsp/*`; pitchy (McLeod Pitch Method, on the T-08 branch); the One-Euro filter on landmarks |
| **Rules / thresholds** | Fixed numbers decide the outcome | Elbow 80–110°, wrist 150–180° (`posture/config.ts:16-17`); cosine ≥ 0.72 (`audio/config.ts:84`); 3 misses = −1 heart; 400 ms latch |
| **"Adaptive"** | In this code, this word means a statistic that follows recent input. It does **not** mean learning. | The onset threshold is "median + 4×MAD" of recent spectral flux (`audio/config.ts:25`). The noise gate tracks room noise. The One-Euro filter's cutoff follows speed. None of these remember anything across sessions. |
| **Learning from the user** | The system changes its behaviour from your past data | **Not present.** |

Generative AI is a different category again; MUZ has none. That is not a weakness: the SRS asks for pose estimation and pitch/chord verification, not generation.

---

## 3. Subsystem inventory (the ten questions)

| # | Subsystem | 1. Technology | 2. Trained model? | 3. Inference? | 4. Deterministic / DSP? | 5. Thresholds / rules? | 6. Learns from user? | 7. Input | 8. Output | 9. Effect on app | 10. Where it runs |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | **Pose estimation** | MediaPipe Tasks Vision 1.1.0, `PoseLandmarker`, lite model, VIDEO mode, `numPoses: 1` (`posture.worker.ts:61-71`) | **Yes** (Google, pretrained) | **Yes**, every sent frame | No | Confidence floors of 0.5 for detection, presence and tracking (`posture.worker.ts:65-67`) | No | Webcam video frames | 33 landmarks: image coordinates (0–1), world coordinates (metres, hip origin), visibility | Feeds B | In the browser: Web Worker, WASM, GPU (WebGL) with CPU fallback (`posture.worker.ts:60-77`) |
| B | **Posture assessment** | Vector maths on world landmarks, One-Euro smoothing, band rules with 2° hysteresis, 300 ms occlusion grace, 600 ms cue delay (`rules.ts`, `config.ts`) | No | No | **Yes** | **Yes** | No. Calibration code exists (`calibration.ts`) but nothing live sends `CALIBRATE`; only the dead hook `usePostureWorker.ts:81` does. | Landmarks from A | `PostureSnapshot`: `compliant`, `inBandStrict`, per-arm states, cue codes | HUD colours, cue text, the drill latch, posture score | Same worker |
| C | **Posture HUD and cues** | Canvas2D, rAF, interpolation (`HudEngine.ts`); 9 fixed cue messages (`rules.ts:78-88`) | No | No | Yes | Yes (fixed text table) | No | Snapshots | Skeleton colours, text such as "Wrist Drooping" | Learner feedback | Main thread |
| D | **Posture score** | % of evaluable frames where `inBandStrict` is true (`PracticeDrill.ts:164-166`, `PostureHold.ts:51-53`) | No | No | Yes | Yes | No | Snapshots | 0–100 | Saved as `posture_score` / `posture_stability_score` | Main thread, then Supabase |
| E | **Chroma extraction and onsets** | AudioWorklet; 4096-point FFT, 512-sample hop; log compression; peak floor; 55–5000 Hz folded into 12 bins; RMS and noise gates; spectral-flux onset with median+MAD threshold; residue subtraction (`audio/config.ts:44-63`, `ChromaFrameProcessor.ts`) | No | No | **Yes** (DSP) | Yes | No | Microphone samples | 12 chroma floats + `voiced`, `onset`, `ringing` flags, about every 10.7 ms | Feeds F and G | AudioWorklet (audio thread); raw audio never leaves it (`chroma.worklet.ts:8`) |
| F | **Chord recognition** | Cosine similarity to harmonic templates (6 harmonics, decay 0.6), plus coverage, extra-tone, rival-chord and partial-voicing gates (`ChordMatcher.ts:60-72`); 200 ms sustain window, pass ratio ≥ 0.8 (`ChordVerifier.ts`) | No | No | **Yes** (template-matching classifier) | Yes: 0.72 (SPEC) plus 5 engineering thresholds | No | Chroma frames | `match` / `miss` / `unvoiced`, the closest rival chord's label | Wait-state, hearts, "sounds like C minor" feedback | Main thread |
| G | **Single-note recognition (live)** | The same chroma template idea for one pitch class (`NoteMatcher.ts`) | No | No | Yes | Yes | No | Chroma | Pitch class only. **Any octave passes** (`NoteMatcher.ts:19-22`). | Wait-state | Main thread |
| G′ | **Single-note recognition (planned)** | pitchy, McLeod Pitch Method: f0 + clarity computed in the worklet. Branch `task/T-08-pitch-wiring`; `PitchVerifier` (T-07) not started. | No | No | Yes (autocorrelation DSP) | ±35 cents, clarity ≥ 0.85 (SRS 3.1.6.2) | No | Samples in the worklet | f0 in Hz, clarity | Will replace G (ruling D4) | AudioWorklet |
| H | **Wait-state / practice gate** | Deterministic finite-state machine; posture and audio must coincide within 400 ms; 15 s timeout; 3 misses cost a heart (`WaitStateMachine.ts`) | No | No | Yes | Yes | No | Attempts from F/G and posture from B | `success` / heart lost / `locked` | Lesson progression, hearts | Main thread |
| I | **Rhythm judging** | Tap timing against the beat grid; Perfect / Good / Miss windows (`lib/rhythm/timing.ts`) | No | No | Yes | Yes | No | Spacebar timestamps | Grades, consistency | EXP, results | Main thread |
| J | **Placement** | The learner picks a tier (`placement.ts`) | No | No | Yes | — | No (self-reported) | A choice | Start unit 1 / 5 / 9 | Unlocks | Client + Supabase |
| K | **Gamification and badges** | Rules (`applyResult.ts`, `lib/gamification/engine.ts`) | No | No | Yes | Yes | No | Results | EXP, streaks, badges | Motivation | Client + Supabase |
| L | **Analytics** | Hard-coded mock (`ProfileAnalyticsView.tsx`; T-12 pending) | No | No | — | — | No | — | Mock charts | Display only | Client |

Nothing in the repository calls a server-side or cloud ML service. A search for `AI`, `machine learning`, `neural`, `ML` and `intelligent` across non-vendor files found no such feature. It found only an email domain, `@muz-practice.ai`, used for demo profiles.

---

## 4. Data flows for the features that involve ML

### 4.1 Pose → posture feedback (the ML feature)

```
Webcam (getUserMedia, CameraService.ts)
  → <video> element (mirrored only by CSS; the model sees the unmirrored frame)
  → FrameLoop.ts: requestVideoFrameCallback; at most one frame in flight;
      ≥ 30 ms between frames (≈ 33 Hz cap; T-09, PR #20)
  → posture.worker.ts: PoseLandmarker.detectForVideo(frame, ts)          ← ML INFERENCE
      Inside MediaPipe: a person detector finds the body, then a
      landmark CNN regresses 33 keypoints + visibility + 3D "world" positions
  → extractPoseFrame (landmarks.ts): missing points = NaN, visibility 0
  → gate: visibility ≥ 0.5 and inside the frame (±2 % margin)            ← confidence handling
  → One-Euro smoothing (filters/OneEuroFilter.ts)
  → metrics.ts: elbow angle (shoulder–elbow–wrist), wrist angle
      (elbow–wrist–index-finger point, landmarks 19/20), forearm pitch,
      trunk lean, head forward
  → rules.ts: classify each angle against its band; 2° hysteresis;
      300 ms grace for brief occlusion; cues only after 600 ms
  → PostureSnapshot {compliant, inBandStrict, cues}
  → main thread:
      • HudEngine: skeleton green / amber / red / grey, cue text (aria-live)
      • WaitStateMachine: a correct note/chord counts only if a compliant
        posture sample lies within ±400 ms
      • posture score = % of frames with inBandStrict = true → Supabase
```

**What the ML output represents.** Estimated joint *positions*. The network does not know what "good piano posture" is. MUZ's rules decide that, using the SRS bands.

**How uncertainty is handled.**
- Landmarks with low visibility, or outside the frame, become *unknown*.
- Unknown holds the last state for 300 ms, then becomes `null`.
- `null` counts as not compliant for the latch (`WaitStateMachine.ts` header), so an unseen learner cannot pass a drill.
- `minKnownArms: 1`: one visible arm is enough to evaluate.
- The skeleton turns grey when there is no pose (`skeleton.ts:93`). I found no dedicated text cue such as "I can't see your arms" (searched `src/components` and `src/vision/hud`).

**When detection fails.**
- **Model load failure** → `MODEL_LOAD_FAILED`, fatal, shown as a rig error. The GPU delegate failing falls back to CPU first (`posture.worker.ts:73-76`).
- **Per-frame error** → non-fatal `ERROR`; the frame is dropped and always closed.
- **No person** → `hasPose = false` → grey HUD, posture `null`.

**Known technical limits (inferred from the design, not measured).**
1. **The wrist angle is the weakest measurement.** It uses the *pose* model's hand points (wrist, and "index" landmark 19/20). Those are coarse. The pose model is not a hand model. MediaPipe's separate Hand Landmarker (21 points per hand) is built for this.
2. **3D world coordinates come from a single camera.** Depth (z) is the network's *estimate*. Elbow angles seen from the front can be distorted. The UI tells learners to sit side-on (`PracticeDrillView.tsx:187`), which helps.
3. **The model was not trained on pianists.** Hands on a keyboard, a music stand or a piano lid can occlude the wrists. Accuracy for this pose is unknown until it is measured.

### 4.2 Microphone → note/chord verdict (DSP, no ML)

```
Microphone (AudioInputService.ts) → AudioContext → AudioWorklet (chroma.worklet.ts)
  → every 512 samples: 4096-point FFT (ChromaFrameProcessor.ts)
  → log-compressed magnitude, peak floor, partials 55–5000 Hz folded into 12 pitch-class bins
  → RMS gate (≥ −65 dBFS) and adaptive noise gate (+10 dB above tracked room noise) → "voiced"
  → spectral flux vs median + 4×MAD of recent frames → "onset"
  → posts 12 floats + flags (raw audio stays in the worklet)
  → main thread:
      ChordVerifier: after an onset, frames in [onset+45 ms, onset+200 ms]
        each judged by ChordMatcher (cosine ≥ 0.72 and 4 more gates);
        pass ratio ≥ 0.8 → match; tonal but wrong → miss; not tonal → ignored
      NoteVerifier: the same, for one pitch class
  → WaitStateMachine → success / −1 heart / locked
  → "Sounds like C minor" text from the closest rival template
```

**Confidence handling.** Attempts that are not tonal enough (`minVoicedRatio` 0.5) are classed as `unvoiced` and ignored, so knocks and coughs cost nothing. There is no calibrated probability: the cosine similarity is a score, not a confidence.

**Known limits.**
- The chromagram folds octaves together. Single-note drills therefore accept any octave until pitchy lands (D4).
- All thresholds except 0.72 are engineering defaults tuned on a **synthetic** piano (`audio/__tests__/fixtures.ts`). The config itself says they must be re-tuned on real recordings (`audio/config.ts:1-6`).

---

## 5. Sufficiency evaluation

| Area | Pose estimation (A) | Posture rules / HUD / score (B–D) | Chord recognition (F) | Single note (G/G′) |
|---|---|---|---|---|
| **Technical legitimacy** | Real ML inference (pretrained CNN) | Rules on ML output | Classical DSP classifier | DSP; pitchy pending |
| **Functional completeness** | Complete in code. Model loads in the dev runtime only since Nov 15 (audit R6). Production-build runtime check pending (T-19). | Complete. Calibration built but not wired. | Complete | **Incomplete vs SRS 3.1.6.2** (no octave, cents or clarity check on `main`) |
| **Reliability** | Visibility gate, grace window, GPU→CPU fallback, frame close (Code) | Hysteresis, grace, delayed cues (Code, Test) | Onset gating, unvoiced rejection, rolled-chord merge (Code, Test) | Same gating |
| **Accuracy** | **Unmeasured** | **Unmeasured** on real people. Correct only on synthetic skeletons (Test). | **Unmeasured** on a real piano. Synthetic tests only. | **Unmeasured** |
| **Performance** | 20–30 Hz and ≤ 35 ms per inference: **unmeasured**. `inferenceMs` is collected (PerfOverlay, debug only). | HUD at 60 FPS: **unmeasured** (JS cost tested only) | 50 ms: **unmeasured**. The verdict comes by design at onset + 200 ms. | — |
| **Feedback quality** | — | 9 specific corrective cues; colour HUD; "Right sound, but your posture was off" (`PracticeDrillView.tsx:106-107`). No cue for "not visible". | Names what was heard ("Sounds like …") | Names the heard pitch class |
| **Privacy** | Local; frames closed in the worker (Code). HAR audit (T-21) pending. | Local | Raw audio never leaves the worklet (Code). T-21 pending. | Local |
| **Testing beyond unit tests** | None | None | None | None |
| **Requirement coverage (RTM)** | 3.1.5.1 IU; 3.4a IU | 3.1.5.2/4/5 IV; 3.1.5.3 IU | 3.1.6.3/4 IV | 3.1.6.2 **N** |

### Data-integrity issue on current `main` that affects any claim

`DashboardScreen.tsx:128-129` passes `result.metrics.postureScore || 95` and `rhythmConsistency || 95` to `useGamification`.
- A real posture score of **0** (bad posture all drill), and every lesson without posture, becomes **95**.
- `useGamification.ts:542,554` then writes that 95 to `user_progress` and `performance_records`.
- `useGamification` also writes the lesson accuracy into `pitch_accuracy`.

This came in with PR #22. **A has already decided to revert it** (`task/revert-pr-22`, not merged yet). Until the revert is merged, posture analytics or badges built from the database must not be presented as measured.

### Verdicts

| Feature | Verdict |
|---|---|
| A. Pose estimation (MediaPipe) | **Legitimate AI/ML feature.** Pretrained on-device inference, fully wired. Validation on real users missing. |
| B–D. Posture assessment, HUD, score | **Rule-based automation** applied to ML output. Together with A it forms a legitimate *AI-assisted posture feedback* feature. |
| E. Chroma and onset extraction | **Conventional algorithmic feature** (DSP) |
| F. Chord recognition | **Conventional algorithmic feature** (DSP template matching) |
| G/G′. Single-note verification | **Conventional algorithmic feature, incomplete vs SRS** until T-07/T-08 merge |
| H. Wait-state, hearts | **Rule-based automation** |
| I. Rhythm judging | **Rule-based automation** |
| Calibration (in `calibration.ts`) | **Insufficient evidence to classify as a feature:** built and tested, unreachable from the UI. It is statistical (a median), not ML, either way. |
| J–L. Placement, gamification, analytics | **Not AI**: self-selection and rules; analytics is a mock |

---

## 6. Is it sufficient?

- **Against the requirements:** the SRS (as paraphrased in the RTM) asks for local MediaPipe pose estimation, dot-product joint angles, colour and cue feedback, chroma cosine chord matching, and pitchy note verification. It does **not** ask MediaPipe to be trained, or the system to learn. Apart from pitchy (already scheduled as T-07/T-08), the implementation does what is specified. **No new AI is needed to satisfy the requirements.**
- **Against the claims you can make:** the gap is **evidence**, not sophistication. Nothing has been measured on real hardware: not accuracy, not speed. That is what the improvement plan addresses.
- **Against "is it really AI?":** it is honest to say MUZ *uses* AI (pose estimation). It is not honest to say MUZ *built* an AI, *trained* a model, or that the audio recognition is AI.

## 7. Uncertainties

1. **The SRS/SDD/SPMP PDFs are not in the repo.** I could not check whether the documents themselves use the words "AI", "intelligent" or "machine learning". Please point me to the files (or `MUZ_SRS.docx`, U-11) so `AUX_AI_CLAIMS_AND_EVIDENCE.md` can be checked against their exact wording.
2. **No presentation slides were found.** The claims doc lists safe wording, but I have not reviewed your actual slides.
3. **Runtime behaviour was not re-checked in this phase.** No browser, camera, microphone or piano was used.
4. MediaPipe internals (detector + landmark network) are described from the library's public design, not from inspecting the model file.
