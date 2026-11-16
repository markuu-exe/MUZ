# Requirements Traceability Matrix

**MUZ: SRS v01.01 / SDD v01.00 vs. the Jira export (Nov 15 2026) vs. the code on `course-handoff` @ `59448bd`**

Audit date: 2026-11-16. Read-only audit; no code was changed.

## How to read this matrix

**Jira coverage** (does a ticket describe this requirement?)

| Code | Meaning |
|---|---|
| **J1** | Fully covered by Jira |
| **J2** | Partially covered |
| **J3** | Not represented in Jira |
| **J4** | Implemented but not tracked: code exists, no ticket covers it |
| **J5** | Unclear or insufficiently documented. The export has no descriptions or acceptance criteria, so every J1/J2 judgement rests on the summary line alone. |

**Implementation state** (from the code, not from Jira)

| Code | Meaning |
|---|---|
| **IV** | Implemented and verified **at unit-test level**: code exists and an automated test asserting the requirement passed in this audit's run (27 files, 387 tests, all passing). This is **not** runtime or hardware verification. |
| **IU** | Implemented, not verified: code exists and is reachable from `src/main.tsx`; no test asserts it, or it needs runtime or hardware proof |
| **P** | Partially implemented |
| **N** | Not implemented |
| **B** | Implemented but broken or regressed |
| **CV** | Cannot be verified from static inspection; needs a live Supabase project, a browser or hardware |

**Task**: the remaining-work task in [TASK_DECOMPOSITION.md](TASK_DECOMPOSITION.md) that closes the gap.

---

## 3.1.1 Flow 1: Authentication & Onboarding (SDD C-01)

| SRS | Requirement | Jira | Cov. | State | Evidence | Missing work | Task |
|---|---|---|---|---|---|---|---|
| 3.1.1.1 | Register and sign in with email credentials | KAN-228, KAN-229, KAN-230 | J1 | IU | `AuthContext.tsx:225-300` (signUp / signInWithPassword); forms at `LoginPage.tsx:485-655`; `client.ts:15-21` persistSession | Live check on staging | T-05, T-23 |
| 3.1.1.1 | Third-party OAuth sign-in | KAN-228 | J2 | **N** (UI) | `signInWithOAuth` exists (`AuthContext.tsx:302-317`) but nothing calls it; no Google button (SDD 6.3); no provider in `supabase/config.toml` | Google button, provider setup, redirect URLs | T-10 |
| 3.1.1.1 (SDD C-01) | Password reset; trap unverified email | KAN-229 (Done) | J2 | **B** | The reset email is sent, but `PASSWORD_RECOVERY` only sets a React flag (`AuthContext.tsx:193-195`). `App.tsx:27` then shows LoginPage, which has no new-password form, and `updatePassword` is never called. Unverified email shows raw truncated text (`LoginPage.tsx:470-482`); `resendVerificationEmail` is never called. | Finish recovery; add resend-verification | T-10 |
| 3.1.1.2 | Instrument focus locked to Piano at profile creation | KAN-231, KAN-233 | J1 | IU | DB check `profiles_instrument_piano` (migration :22); trigger `handle_new_user` hard-codes `'piano'` (:143-179) | `InstrumentFocus` type still lists guitar/violin/vocals (`auth.types.ts:6`) | T-03 |
| 3.1.1.3 | Curriculum locked to Piano; alternate instruments disabled | KAN-235 | J2 | P | `lessons_instrument_piano` check (:44); `.eq('instrument','piano')` (`useDashboardData.ts:57`). No screen shows alternates as disabled. | Piano-only onboarding card | T-14 |
| 3.1.1.4 | Onboarding self-assessment selects the starting node | KAN-235, KAN-233 | J1 | IV | `PlacementModal.tsx:45-66`; `placement.ts:16-21`; writes in `supabaseStore.ts:78-105`; `placement.test.ts` passes. **Differs from SDD C-01**: 3 tiers (units 1/5/9), not Beginner = M1 / Intermediate = M2. Writes are not atomic. | Ruling D8; live write check | T-02, T-23 |
| SDD C-01 | Profile row created with 5 hearts and piano | KAN-233 | J1 | **B** | The trigger is correct. The client fallback `upsert` (`AuthContext.tsx:101-118`) runs on **any** profile-read error and writes `exp:100, current_streak:1, hearts:5`, which overwrites real progress. Username is re-copied on every load (`:76-96`). | Fix bootstrap | T-03 |

## 3.1.2 Flow 2: Skill Tree Progression Dashboard (SDD C-02)

| SRS | Requirement | Jira | Cov. | State | Evidence | Missing work | Task |
|---|---|---|---|---|---|---|---|
| 3.1.2.1 | Vertical node pathway: locked / available / completed | KAN-232, KAN-237 | J1 | IU | `SkillTreeView.tsx:104-240`; `nodeStatus` in `curriculum.ts:122-145`. No test covers `nodeStatus`. Mastered nodes show `required_exp` as the reward (`SkillTreeView.tsx:199`). | Label bug; `nodeStatus` tests | T-15 |
| SDD 6.3 | Locked node shakes and shows a prerequisites banner | KAN-237, KAN-236 | J2 | IU | `DashboardScreen.tsx:144-162`, `index.css:138-146`. The banner is generic and does not name the blocking lesson. | Name the blocking lesson | T-15 |
| 3.1.2.2 | Consecutive-day streak from completion timestamps | KAN-270 (To do) | J4 | IV | `streak.ts:27-39`; applied in `applyResult.ts:117`; `streak.test.ts` (11 tests). Built under COURSE-6, untracked. **Deviation**: any finished, non-quit run counts, including failed ones. | Ruling D9 | T-02 |
| 3.1.2.3 | EXP on node completion; progress bar | KAN-270 | J4 | IV | `applyResult.ts:91,115` (EXP only on first completion, tested); `expProgress` in `curriculum.ts:107-120`. When the profile is null the dashboard shows fake values (`exp ?? 1240`, `DashboardScreen.tsx:77-81`). | Remove placeholders | T-15 |
| 3.1.2.4 | Hearts: −1 on 15 s timeout or 3 consecutive wrong onsets | KAN-270, KAN-267 | J2 | **B** | Deduction is in `WaitStateMachine.ts:155-157,178-185` (`waitState.test.ts`). Bug: hearts lost inside a drill are dropped if the learner quits mid-drill. `quit()` (`LessonPlayer.tsx:143-151`) uses `run.hearts`, which never received the in-drill loss. Tier timeouts are 12 s / 10 s (`tiers.ts:62`, `proficient.ts:318`), not 15 s. | Fix refund; ruling D5 | T-06, T-02 |
| 3.1.2.4 | Practice disabled at 0 hearts | KAN-270 | J2 | P | Inconsistent rule: `DashboardScreen.tsx:164` blocks `practice` lessons; `SkillTreeView.tsx:117` blocks every non-theory lesson | Unify the rule | T-15 |
| 3.1.2.4 | +1 heart every 15 min (passive) | KAN-270 | J4 | IV | `heartRegen.ts`, `useHeartRegen.ts`, conditional write `supabaseStore.ts:59-68`; `heartRegen.test.ts` (11 tests). The anchor is per-device localStorage. | Optional: server anchor | T-30 (deferred) |
| 3.1.2.4 | +1 heart on ≥ 80 % theory score | KAN-270 | J4 | IV | `runner.ts:159-174`; `runner.test.ts` covers the 100 % case only. Replays can farm hearts. | 80 / 79.99 tests; ruling D10 | T-16, T-02 |
| 3.1.2.5 | Lock nodes until prerequisites meet the accuracy threshold | KAN-236 | J1 | IV | `gate.ts:12-14` (`gate.test.ts`, `applyResult.test.ts`); `curriculum.ts:122-145`. Client-side only; the DB does not enforce it. | Accepted for capstone (ruling D14) | T-02 |

## 3.1.3 Flow 3A: Interactive Theory Modules (SDD C-03)

| SRS | Requirement | Jira | Cov. | State | Evidence | Missing work | Task |
|---|---|---|---|---|---|---|---|
| 3.1.3.1 | Cards with notation, keyboard chord voicings, audio previews | KAN-240, KAN-243 | J1 | P | `ConceptCardView.tsx`, `NoteFigure.tsx:34-56`, `GrandStaff.tsx`, `PianoKeyboard.tsx`, synth `playNote.ts`. **Flats cannot be drawn** (`notes.ts:7-23`, `GrandStaff.tsx:30-41`), so "F Major (One Flat)" shows A♯. Synth replaces the SDD's `audioSampleUrl`. No piano-roll view. | Flat spelling; ruling D7 | T-17, T-02 |
| 3.1.3.2 | Multiple-choice and interactive identification drills | KAN-242, KAN-241 | J1 | IV | choose-answer, name-the-note, find-the-key, build-the-chord, ear-pick (`lesson.types.ts:51-67`); graders tested in `runner.test.ts`; feedback in `OptionGrid.tsx`, `LessonPlayer.tsx:260-289` | None | — |
| 3.1.3.3 | Block rhythm/practice until theory checkpoints pass | KAN-240 | J2 | IV | `runner.ts:98-103` re-queues failed checks; stage order tested (`curriculum.test.ts:84-108`). Checkpoint lessons use a pass-mark share instead (`runner.ts:134-138`). | None (document checkpoint rule) | T-26 |

## 3.1.4 Flow 3B: Rhythm Tapping Engine (SDD C-04)

| SRS | Requirement | Jira | Cov. | State | Evidence | Missing work | Task |
|---|---|---|---|---|---|---|---|
| 3.1.4.1 | Animated metronome grid with target beats | KAN-246 | J1 | IU | `BeatHighway.tsx` canvas; clicks on the Web Audio clock (`useRhythmSession.ts:107-112`). The learner cannot adjust BPM in the live app (KAN-246 says "adjustable"). | Ruling: adjustable BPM not required by SRS; amend KAN-246 | T-02 |
| 3.1.4.2 | Spacebar input timed against subdivisions | KAN-245 | J1 | IU | `useSpacebarTap.ts:19-31` (`e.timeStamp` → AudioContext time). No calibration UI writes `muz-tap-latency-ms`. No test. | Tests (T-16); calibration out of scope | T-16 |
| 3.1.4.3 | Perfect ≤ 25 ms, Good ≤ 50 ms, Miss > 50 ms or omitted | KAN-244 | J2 | IU | `timing.ts:4-18`, exactly as SRS / SDD C-04 (+100 / +70 / +0). **Conflicts with KAN-244's title** (Perfect, Great, Late, Early, Miss). No boundary test. | Boundary tests; retitle KAN-244 | T-16 |
| 3.1.4.4 | Aggregated rhythm consistency score | KAN-239 | J2 | P | `timing.ts:53-54` ignores omitted beats: 1 perfect hit out of 10 scores 100 %. The lesson pass score in `plan.ts:115,130-136` is sound and tested. | Fix formula (ruling D13) | T-16 |

## 3.1.5 Flow 3C: Real-Time Posture Vision HUD (SDD C-05)

| SRS | Requirement | Jira | Cov. | State | Evidence | Missing work | Task |
|---|---|---|---|---|---|---|---|
| 3.1.5.1 | Webcam captured and processed locally with MediaPipe WASM | KAN-249, KAN-252, KAN-251 | J1 | IU / CV | `CameraService.ts`; `posture.worker.ts:57` dynamic import; WASM in `public/models/wasm/`. The model **could not load before commit `1d65680`/`bcff618` (Nov 15)**, and the production preview is still unchecked (commit message). | Prod-preview runtime check | T-19 |
| 3.1.5.2 | 3D joint angles by dot product on world landmarks | KAN-248, KAN-254, KAN-255 | J1 | IV | `vec3.ts:134-162` (atan2 form equal to arccos; tested); `metrics.ts`; index point = landmarks 19/20 | None | — |
| 3.1.5.3 | 2D skeleton overlay at 60 FPS | KAN-247, KAN-258 | J1 | IU / CV | `HudEngine.ts` rAF, Canvas2D; `budget.test.ts` measures JS cost only. 60 FPS is not measured. | Benchmark | T-09, T-19 |
| 3.1.5.4 | Green when 80° ≤ elbow ≤ 110° and 150° ≤ wrist ≤ 180° | KAN-253, KAN-257 | J1 | IV | `config.ts:16-26`; `rules.test.ts` edges 80/110/150; `skeleton.test.ts` stroke colour. A 2° recovery hysteresis means red persists until 82°. | Ruling D12 | T-02 |
| 3.1.5.5 | Red alerts and corrective text cues on violation | KAN-256, KAN-257 | J1 | IV | `rules.ts:78-88` (9 cue codes); `cues.ts`, `PromptLayer.ts` (aria-live); `cues.test.ts` | None | — |

## 3.1.6 Flow 3D: Pitch Verification & Wait-State (SDD C-06)

| SRS | Requirement | Jira | Cov. | State | Evidence | Missing work | Task |
|---|---|---|---|---|---|---|---|
| 3.1.6.1 | AnalyserNode fftSize 4096; detection within 50 ms | KAN-264 | J2 | P | 4096 FFT runs in an **AudioWorklet** (`chroma.worklet.ts`, `config.ts:45`), not an AnalyserNode. Onset timestamp accuracy is tested (≤ 25 ms, `dsp.test.ts:110-120`); the verdict comes by design at onset + 200 ms. 50 ms has never been measured. | Rulings D1/D2; measure | T-02, T-19 |
| 3.1.6.2 | Single-note: pitchy autocorrelation, ±35 cents, reject clarity < 0.85 | KAN-261, KAN-262, KAN-263 | J1 | **N** (reachable app) | pitchy is imported only in dead `useAudioAnalysis.ts:2`. Live single-note grading is chroma pitch-class matching (`NoteMatcher.ts`, `noteConfig.ts:19-25`): any octave passes, and there is no cents or clarity check. | pitchy verifier + wiring | T-07, T-08 |
| 3.1.6.3 | 12-bin chromagram; cosine vs normalised chord templates | KAN-260, KAN-265, KAN-266 | J1 | IV | `ChromaFrameProcessor.ts:256-312`; `ChordMatcher.ts:10-23`; `dsp.test.ts`, `chords.test.ts`. Only synthetic piano fixtures. | Real-piano validation | T-19 |
| 3.1.6.4 | Chord success: cosine ≥ 0.72 + onset + 200 ms sustain | KAN-266, KAN-267 | J1 | IV | `config.ts:84,117-122`; `ChordVerifier.ts:114-138`; `scenarios.test.ts`. Four extra gates are stricter than the SRS. | Real-piano tuning | T-19 |
| 3.1.6.5 | Hold until posture AND audio within 400 ms, or timer expires | KAN-267 | J2 | IV | `WaitStateMachine.ts:125-176`; posture comes from the real worker via `PracticeRig.ts:358-361`; `waitState.test.ts`, `PracticeDrill.test.ts`. The latch may expire before a late posture result arrives. | Latch-margin fix (optional) | T-09 |

## 3.1.7 Flow 4: Profile & Analytics Dashboard (SDD C-07)

| SRS | Requirement | Jira | Cov. | State | Evidence | Missing work | Task |
|---|---|---|---|---|---|---|---|
| 3.1.7.1 | Historical pitch accuracy chart | KAN-269 | J1 | **N** | `ProfileAnalyticsView.tsx:125-200` is hard-coded data. `performance_records` is written (`supabaseStore.ts:44-47`) but never read. | Real data | T-12 |
| 3.1.7.2 | Posture stability from angular deviation logs | KAN-269 | J2 | **N** | Mock. Only a per-session `posture_score` is stored; there are no deviation logs. | Real data (per-session score; ruling) | T-12, T-02 |
| 3.1.7.3 | Rhythm accuracy distribution | KAN-269 | J1 | **N** | Mock; no distribution chart | Histogram | T-12 |
| 3.1.7.4 | Achievement badges (EXP, streak, mastery) | KAN-270 | J1 | **N** | Hard-coded `ach-1…` (`ProfileAnalyticsView.tsx:289+`) do not match the seeded ids (`seed.sql:441-447`). Nothing writes `user_achievements`. See the unmerged branch note in [JIRA_CODEBASE_RECONCILIATION.md](JIRA_CODEBASE_RECONCILIATION.md) §4. | Evaluator + badges grid | T-04, T-11, T-12 |

## 3.2 Usability

| SRS | Requirement | Jira | Cov. | State | Evidence | Missing work | Task |
|---|---|---|---|---|---|---|---|
| 3.2.1a | Uniform dark mode, high contrast | KAN-238 (implied) | J5 | P | Always dark (`index.css:5-27`). Two palettes (login green, dashboard violet). Many 9–10 px labels; `text-slate-500` on `#070b14` is about 4.2:1. | Contrast pass | T-27 (P2) |
| 3.2.1b | Posture HUD on an unmanaged canvas, no React re-render | KAN-247 | J1 | IV | `PostureHud.tsx` pushes results into `HudEngine` outside React | None | — |
| 3.2.2a | Desktop only, ≥ 1280×720 | — | J3 | IU | Fixed 260 px sidebar; no mobile layout (consistent with SRS) | None | — |
| 3.2.2b | Alert when width < 1024 px | — | J3 | P | `ViewportGuard.tsx:22` is mounted only after login (`App.tsx:33`). Inference: it is painted under the `fixed z-50` lesson overlay. | Mount globally | T-15 |

## 3.3 Reliability & Availability

| SRS | Requirement | Jira | Cov. | State | Evidence | Missing work | Task |
|---|---|---|---|---|---|---|---|
| 3.3.1a | CV and audio run entirely client-side | KAN-249, KAN-260 | J1 | IU | No server calls in `src/audio`, `src/vision`, `src/practice` | Network audit | T-21 |
| 3.3.1b | Camera/mic denial: diagnostic modal, practice disabled, no crash | KAN-250, KAN-234 | J1 | IU | `VisionError.ts` (9 codes), `AudioError.ts`, `MediaDiagnostics.tsx`; the timer pauses on hardware loss (`usePracticeDrill.ts:105-114`). No tests. | Mocked `getUserMedia` tests (optional); manual check | T-22 |
| 3.3.2a | Supabase for storage and auth | KAN-228 | J1 | IU / CV | `client.ts`, migration. Unknown whether the live project matches the migration. | Staging project | T-05 |
| 3.3.2b | Local cache on connection loss; sync on reconnect (SDD C-08) | KAN-268 | J1 | **N** | `idb` is never imported; no queue; no online/offline listeners. A failed save loses the run. | Offline queue | T-13 |

## 3.4 Performance

| SRS | Requirement | Jira | Cov. | State | Evidence | Missing work | Task |
|---|---|---|---|---|---|---|---|
| 3.4a | MediaPipe in a Web Worker at 20–30 Hz, ≤ 35 ms per inference | KAN-249, KAN-277 | J1 | IU / CV | Worker yes (`PracticeRig.ts:68`). No rate cap: a 60 fps camera could exceed 30 Hz. `inferenceMs` is measured but never read. | Cap + stats + benchmark | T-09, T-19 |
| 3.4b | Audio window ≤ 2048 samples; < 50 ms | KAN-263, KAN-277 | J2 | **Conflict** | The code uses 4096. The SRS contradicts itself (3.1.6.1 says 2048–4096). | Ruling D1 | T-02 |
| 3.4c | HUD at 60 FPS on the main thread via rAF with interpolation | KAN-258, KAN-277 | J1 | IU / CV | `HudEngine.ts`, `interpolator.ts` (tested) | Benchmark | T-19 |
| 3.4d | Initial bundle ≤ 5 MB; WASM + model (≤ 10 MB) loaded async | KAN-278, KAN-251 | J1 | IV (bundle) / **Conflict** (10 MB) | This audit's build: `index-*.js` 814.5 kB (244.9 kB gzip) + 59 kB CSS. MediaPipe is loaded only inside the worker. WASM 12.99 MB + model 5.78 MB = **18.8 MB** if the cap covers both. No route-level splitting (there is no router). | Ruling D3; CI size gate | T-02, T-05 |

## 3.5 Security

| SRS | Requirement | Jira | Cov. | State | Evidence | Missing work | Task |
|---|---|---|---|---|---|---|---|
| 3.5.1 | Media only in ephemeral memory; never transmitted or stored | KAN-276 | J1 | IU | No `toDataURL` / `MediaRecorder` / upload anywhere; frames closed in the worker (`posture.worker.ts:110`); the worklet emits only 12 floats | HAR audit | T-21 |
| 3.5.2a | RLS on all tables, `auth.uid() = user_id` | KAN-275 | J1 | IU / CV | RLS enabled on all 6 tables (migration :185-190), owner-only policies. Users can still PATCH their own `exp` / `hearts` / completion (client-trusted gamification). | Live RLS test; ruling D14 | T-20, T-02 |
| 3.5.2b | TLS 1.3 for all cloud traffic | — | J3 | CV | The Supabase URL is https; the TLS version depends on the provider | Record in test report | T-20 |
| 3.5.2c | No secrets in the client bundle | — | J3 | IU | The bundle contains only the publishable key (by design). Full-history scan found no `service_role` / `sb_secret_`. `.env.local` (publishable key only) is still reachable on branch `Lag-in`. | Delete stale branch | T-01 |

## 3.6 Design Constraints

| SRS | Requirement | Jira | Cov. | State | Evidence | Missing work | Task |
|---|---|---|---|---|---|---|---|
| 3.6.1a | Zero server compute: client-side inference | — | J3 | IU | No backend functions; no RPCs | None | — |
| 3.6.1b | Deployable on static free-tier hosting | KAN-283 | J2 | **N** | No `vercel.json` / `netlify.toml` / CI workflow. `dist/` is 44 MB (three WASM variants). | Staging + prod deploy | T-05, T-25 |
| 3.6.2a | React 18+ bundled with Vite | — | J3 | IV | `package.json` (react 18.3, vite 6); build passes | None | — |
| 3.6.2b | Only `pose_landmarker_lite`; no hand model | KAN-251 | J1 | IU | `public/models/pose_landmarker_lite.task`; no hand landmarker | None | — |
| 3.6.2c | Pitch via Web Audio API + pitchy | KAN-261 | J1 | **P** | Web Audio yes; pitchy unused at runtime | Same as 3.1.6.2 | T-07, T-08 |

## 3.7 Interfaces

| SRS | Requirement | Jira | Cov. | State | Evidence | Missing work | Task |
|---|---|---|---|---|---|---|---|
| 3.7.1 | React + Tailwind SPA; HUD over the camera with joints, vectors and stave indicators | KAN-247 | J2 | IU | HUD draws skeleton and cues. "Musical note stave indicators" on the HUD: not found (the target is shown in the side panel). | Ruling (minor) | T-02 |
| 3.7.2 | Webcam 720p30 via getUserMedia; mic 44.1/48 kHz | KAN-252, KAN-264 | J1 | IU / CV | `CameraService.ts:12-14` (1280×720, ideal 30); `dsp.test.ts` covers 44.1 and 48 kHz | Hardware matrix | T-22 |
| 3.7.3 | MediaPipe Tasks JS; Web Audio + pitchy; supabase-js | KAN-249, KAN-261 | J2 | P | pitchy gap as above | Same as 3.1.6.2 | T-07, T-08 |
| 3.7.4 | HTTPS:443, TLS 1.3, no network needed for CV or pitch | — | J3 | IU / CV | CV and pitch make no network calls after assets load | Offline smoke test | T-21 |

## SDD-only and SPMP-only items

| Source | Item | Jira | Cov. | State | Task |
|---|---|---|---|---|---|
| SDD C-07 / 6.3 | Date-range picker that re-queries `performance_records` | KAN-269 | J2 | N (mock buttons only) | T-12 |
| SDD C-08 | IndexedDB `sync_queue`, exponential backoff | KAN-268 | J1 | N | T-13 |
| SDD 4.2 | `achievements` / `user_achievements` populated and credited | KAN-270 | J2 | N (tables and 5 seed rows exist) | T-11 |
| SPMP 3.1.8 | Functional, integration, usability, performance, hardware, security testing | KAN-271…282 | J1 | N (only unit tests exist) | T-19 to T-24 |
| SPMP 3.1.9 | Production build, hosting config, Supabase config, demo | KAN-283 | J2 | N | T-05, T-25 |
| SPMP 6 | Defect log with priority | KAN-280 | J1 | N | T-22 |
| SPMP 3.3 / 12 | SRS / SDD kept consistent; traceability maintained | — | J3 | N (the conflicts in [PROJECT_REQUIREMENTS_AUDIT.md](PROJECT_REQUIREMENTS_AUDIT.md) §5 are undocumented) | T-02, T-26 |

---

## Totals (rows above, SRS 3.x only)

| Implementation state | Count |
|---|---|
| IV (unit-verified) | 17 |
| IU / CV (implemented, needs runtime or hardware proof) | 22 |
| P (partial) | 10 |
| N (not implemented) | 9 |
| B (broken) | 3 |
| Conflict (needs a ruling before work) | 2 |

| Jira coverage | Count |
|---|---|
| J1 fully | 36 |
| J2 partially | 14 |
| J3 not in Jira | 9 |
| J4 implemented, untracked | 4 |
| J5 unclear | 1 |

Counts are by matrix row. Some SRS clauses are split into two or more rows, and a row with two states (for example IU / CV) is counted once under its first state.
