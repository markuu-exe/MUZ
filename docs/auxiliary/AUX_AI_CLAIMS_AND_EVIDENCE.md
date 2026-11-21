# AUX-AI-01 — AI Claims and Evidence

How to describe MUZ's AI functionality truthfully in the documentation and the defence. It is based on `AUX_AI_FEATURE_ASSESSMENT.md` (2026-11-19, `origin/main` @ `67dc05e`).

**Rule of thumb.** Say *uses* AI, not *is* an AI. Call the audio part *signal processing*. Do not quote a number until it has been measured.

## 1. Claims you can make now

Each is supported by code inspection or a unit test.

| # | Claim (suggested wording) | Evidence |
|---|---|---|
| C1 | "MUZ uses **on-device machine-learning pose estimation**, Google's pretrained MediaPipe Pose Landmarker (lite model), to locate the learner's joints from the webcam." | `posture.worker.ts:58-72`; `public/models/pose_landmarker_lite.task`; `public/models/README.md` |
| C2 | "Inference runs **in the browser, in a Web Worker** (WebAssembly, GPU with CPU fallback). No video is uploaded." | `posture.worker.ts:60-77`, `:110` (`image.close()`); no upload code (RTM 3.5.1). State "by design and code inspection" until T-21 confirms it with a network capture. |
| C3 | "Posture is judged by **rule-based biomechanical checks** on the ML output: 3D elbow and wrist angles against fixed bands (80–110°, 150–180°)." | `metrics.ts`, `rules.ts`, `config.ts:16-17`; `rules.test.ts` |
| C4 | "The system **handles uncertain detections**: low-confidence or off-screen joints are ignored, brief occlusions are bridged, and an unseen learner cannot pass a drill." | `landmarks.ts` gate (visibility ≥ 0.5), `rules.ts` 300 ms grace, `WaitStateMachine` (null = not compliant) |
| C5 | "Chords are recognised in real time by **digital signal processing**: a 12-bin chromagram compared with harmonic chord templates by cosine similarity, gated on note onsets." | `ChromaFrameProcessor.ts`, `ChordMatcher.ts`, `ChordVerifier.ts`; `chords.test.ts`, `scenarios.test.ts` |
| C6 | "Raw microphone audio never leaves the audio thread; only 12 numbers per frame do." | `chroma.worklet.ts:8,66-79` |
| C7 | "A practice step succeeds only when the **correct sound and correct posture coincide within 400 ms**." | `WaitStateMachine.ts`; `waitState.test.ts` |
| C8 | "MUZ is **not a generative-AI application**. Its intelligence is perception (pose estimation and audio analysis) plus explicit teaching rules." | Whole assessment |

## 2. Claims that need testing or implementation first

| # | Claim | Missing evidence | Closed by |
|---|---|---|---|
| N1 | "Posture is detected with X % accuracy" | No labelled real-world evaluation | AUX-AI-01 R1 (evaluation harness) using T-19 recordings |
| N2 | "Chords are recognised with X % accuracy on a real piano" | Synthetic-only tests | AUX-AI-01 R1 + T-19 |
| N3 | "Inference at 20–30 Hz, ≤ 35 ms; HUD at 60 FPS; audio detection < 50 ms" | Unmeasured | T-19 (existing task, A) |
| N4 | "Single notes are verified to within ±35 cents, octave included" | pitchy not merged; `NoteMatcher` is pitch-class only | T-07 (C) + T-08 (A) |
| N5 | "Works on mid-range laptops and in Chrome / Edge / Firefox" | Unmeasured | T-19, T-22 |
| N6 | "Personal posture calibration" | Built, but no UI triggers it | T-29 (optional) or AUX-AI-01 R4 |
| N7 | "Posture stability analytics over time" | Analytics is a mock; PR #22 stores a placeholder 95 posture score (`DashboardScreen.tsx:129`) | Revert of PR #22 (decided), then T-12 |
| N8 | "Video and audio never leave the device" (as a verified statement) | Code inspection only | T-21 network/HAR audit |

## 3. Claims to avoid

| # | Avoid | Why | Say instead |
|---|---|---|---|
| X1 | "Our AI model" / "we trained a model" | MUZ trains nothing. The model is Google's. | "We integrated a pretrained pose-estimation model" |
| X2 | "AI chord recognition" / "AI listens to your playing" | The audio chain is DSP with hand-designed templates | "Signal-processing chord recognition" |
| X3 | "Adaptive / personalised AI" / "learns from you" | Nothing learns from user data | "Rule-based feedback; placement by self-assessment" |
| X4 | "AI tutor" / "AI music teacher" | The feedback is a fixed table of 9 posture cues plus a "sounds like" label | "Automated corrective cues" |
| X5 | "The AI understands good posture" | The network outputs joint positions. Our rules define "good". | "Rules derived from the SRS posture bands" |
| X6 | Any percentage, FPS or latency figure | Nothing has been measured | Quote T-19 / R1 results once they exist |
| X7 | "Accurate wrist tracking" | Wrist angle comes from coarse pose-model hand points | "Approximate wrist alignment" |
| X8 | "Real-time pitch detection with pitchy" (on `main` today) | Not merged | Only after T-08 merges |

## 4. If an examiner asks "Where is the AI?"

Suggested answer, about 30 seconds:

> The webcam image goes through a pretrained neural network, MediaPipe Pose, inside a Web Worker on the learner's own machine. It estimates 33 body joints in 3D every frame. That is the machine-learning part. We then compute elbow and wrist angles from those joints and compare them with the posture bands in our SRS, which drives the coloured skeleton and the corrective cues. The audio side deliberately does not use ML: chord recognition is a chromagram matched against harmonic templates. That is fast, explainable and needs no training data, and it is the standard technique in music analysis. Neither video nor raw audio leaves the device.

**Likely follow-up: "Why not ML for audio?"**

> A trained chord classifier would need a labelled dataset of real piano recordings, which we don't have. Template matching meets the SRS threshold (cosine ≥ 0.72) and can be explained line by line.
