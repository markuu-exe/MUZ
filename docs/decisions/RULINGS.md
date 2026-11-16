# Requirements Rulings (T-02, change-control record)

| | |
|---|---|
| **Status** | **DRAFT agenda.** Nothing below is decided until the "Decided" columns are filled in at the meeting. |
| **Process** | SPMP 3.3 change control. A chairs; B, C and D attend. Escalate to the adviser only if a ruling would drop an SRS requirement (none of the proposals do). |
| **Source** | Conflicts found in `docs/audit/PROJECT_REQUIREMENTS_AUDIT.md` §5. Evidence re-checked against `main` @ `35c95d8` on 2026-11-16. |
| **Feeds** | T-26 (SRS/SDD v01.02): every row with "Doc edit = Y" names the section to change. |

## How to run the meeting (45 min)

1. **Unblockers first (15 min):** D13 → D, D4 / D1 / D2 → C, D8 → D, D14 → B, D11 → B.
2. **Quick confirmations (15 min):** D3, D5, D6, D7, D9, D10, D12, then items M1–M5.
3. **Team decisions that are not SRS conflicts (15 min):** section 3 (deadline, badge rules, cut order, and others).
4. For each row: read the proposal, take objections, then write the outcome, the reason (if changed) and who decided.

After the meeting, A fills in the "Decided" columns, commits, B reviews for accuracy, and A posts the unblocking rulings to each member.

## 1. Rulings D1–D14

| ID | Question | Evidence (code / spec) | Proposed outcome | Reason | Affects | Doc edit | Decided | By |
|---|---|---|---|---|---|---|---|---|
| **D1** | Audio window: SRS 3.1.6.1 says "between 2048 and 4096"; SRS 3.4 says "maximum 2048". | `src/audio/config.ts:45` `fftSize: 4096 // SPEC`, hop 512 | **Keep 4096-sample window, 512-sample hop.** | 4096 halves the FFT bin width (≈ 11.7 Hz at 48 kHz vs ≈ 23.4 Hz at 2048), which chord chroma needs in the lower register; all chord tests are tuned on it. 3.1.6.1 already allows 4096; 3.4 contradicts it. | T-07, T-08, T-19 | **Y**: SRS 3.4 bullet 2 → "4096-sample window, 512-sample hop, detection within 50 ms" | | |
| **D2** | SDD requires `AnalyserNode.getFloatFrequencyData`; code uses an AudioWorklet with its own FFT. | `src/audio/worklet/chroma.worklet.ts`, `src/audio/dsp/ChromaFrameProcessor.ts` | **Accept the AudioWorklet.** | Runs off the main thread with sample-accurate timing; raw audio never leaves the worklet (SRS 3.5.1). T-08 runs pitchy in the same worklet (branch `task/T-08-pitch-wiring`: verified in a browser, worklet 17.8 kB). | T-08, KAN-264 | **Y**: SDD 4.2 `AudioFrequencyBuffer`; SDD C-06; SRS 3.1.6.1 and 3.7.3 wording ("AnalyserNode" → "AudioWorklet") | | |
| **D3** | 10 MB cap: model only, or WASM + model? | `public/models/pose_landmarker_lite.task` 5.8 MB; WASM 13.0 MB each | **Cap applies to the model asset (5.8 MB: pass).** | The SRS sentence attaches "(maximum 10 MB)" to the model weight asset. WASM is fetched lazily after "Turn on camera". | KAN-251, T-19 | **Y**: SRS 3.4 bullet 4: say what the 10 MB covers | | |
| **D4** | Single-note: SRS 3.1.6.2 requires pitchy, ±35 cents, clarity ≥ 0.85; live code grades pitch class only (any octave passes). | `src/practice/PracticeDrill.ts` `arm()` → `NoteVerifier`; `NoteMatcher.ts` | **Keep the SRS: pitchy is required.** Chroma `NoteVerifier` stays behind a flag for T-19 comparison only. | The SRS is explicit. T-08 part 1 (branch, not merged) already computes f0 + clarity in the worklet. | T-07 (C), T-08 (A) | N | | |
| **D5** | Drill timeout: SRS 3.1.2.4 / SDD C-06 say 15 s; Virtuoso tier uses 12 s and one Proficient exercise 10 s. | `src/content/tiers.ts:62` `timeoutSec: 12`; `src/content/units/proficient.ts:318` `timeoutSec: 10` | **15 s everywhere.** Remove both overrides; regenerate the seed. | Lowest-risk change; keeps the SRS untouched. (Alternative: amend SRS to "15 s default, tier-adjustable".) | Content (A), T-23 | N (if 15 s) | | |
| **D6** | KAN-244 title says Perfect / Great / Late / Early / Miss; SRS and code say Perfect / Good / Miss. | `src/lib/rhythm/timing.ts` | **SRS wins. Retitle KAN-244.** | Code already matches the SRS. | T-16, Jira | N | | |
| **D7** | SDD C-03 lists `audioSampleUrl` / `notationUrl` / `diagramUrl`; code synthesises audio and draws SVG notation. | `src/lib/theory/playNote.ts`, `GrandStaff.tsx` | **Accept synth + SVG.** | Zero hosting cost (SRS 3.6.1); no asset pipeline. | KAN-240/243 | **Y**: SDD C-03 inputs | | |
| **D8** | Placement: SDD C-01 has 2 tiers (Beginner → M1, Intermediate → M2); code has 3 (units 1 / 5 / 9). | `PlacementModal.tsx`, `src/lib/progress/placement.ts` | **Accept 3 tiers** (Novice / Proficient / Virtuoso). | Matches the 12-unit curriculum; tested (`placement.test.ts`). | T-14 (D) | **Y**: SDD C-01 | | |
| **D9** | Streak "based on lesson completion timestamps"; code counts any finished, non-quit run (failed runs too). | `src/lib/progress/applyResult.ts:10,77,117` | **Accept: any finished, non-quit run counts.** | Rewards daily practice; quitting never counts. | T-23 | **Y**: SRS 3.1.2.2 "completion" → "lesson activity (finished runs)" | | |
| **D10** | +1 heart on ≥ 80 % theory: replays can farm hearts. | `src/lesson/runner.ts:22` `THEORY_RESTORE_THRESHOLD = 80` | **Allow, and document it.** | SRS permits it; low impact; capped at 5 hearts. | T-16 tests, T-26 | N (document in SDD C-02 notes) | | |
| **D11** | "Third-party OAuth providers" names no provider. | `AuthContext.tsx:302` `signInWithOAuth` (no UI calls it); SDD 6.3 shows Google | **Google only.** | Matches SDD 6.3 mock-ups; one provider to configure. | T-10 (B), T-25 | N | | |
| **D12** | HUD uses 2° recovery hysteresis, so red persists to 82°; SRS 3.1.5.4 has strict bands. | `src/vision/posture/config.ts:24` `hysteresisDeg: 2`; scoring uses `inBandStrict` (`rules.ts:9`) | **Accept hysteresis for display only; scoring stays strict.** | Prevents red/green flicker at the boundary; the stored posture score uses the exact SRS bands. | — | **Y**: SDD C-05 note | | |
| **D13** | "Aggregated rhythm consistency score" is undefined; code ignores omitted beats (1 hit of 10 scores 100 %). | `src/lib/rhythm/timing.ts:53-54` | **`consistency = 100 × Σ_targets max(0, 1 − |Δ|/50) / targetCount`**, omitted beats contribute 0. | Same as today when every beat is hit; omissions now count. Example: 1 perfect hit of 10 targets → 10. | T-16 (D) | **Y**: SDD C-04 (and SRS 3.1.4.4 may cite it) | | |
| **D14** | Owner-only RLS is met (SRS 3.5.2), but the client can PATCH its own `exp` / `hearts` / completion. | `supabase/migrations/20260509120000_initial_schema.sql` policies | **Accept as a documented known risk for the capstone.** Server-side save RPC deferred (T-28). | SRS 3.5.2 is satisfied; the RPC is a large change late in the schedule. | T-11 (B), T-20 (C) | **Y**: SDD 3.3 Design Rationale | | |

## 2. Minor wording items

| ID | Item | Proposed outcome | Doc edit | Decided |
|---|---|---|---|---|
| M1 | SRS 3.4 "route-level code splitting": the app has no router. | Accept: MediaPipe is split at the worker and loaded on "Turn on camera" (the intent is met). | **Y**: SRS 3.4 bullet 4 | |
| M2 | SDD 6.3 analytics date-range picker (mock today). | Keep the requirement; implemented in T-12 (7d / 30d / all). | N | |
| M3 | SRS 3.7.1 "musical note stave indicators" on the HUD. | Accept: the target is shown on the staff in the side panel next to the HUD. | **Y**: SRS 3.7.1 | |
| M4 | SPMP milestones (weeks 4–9) and Jira due dates have passed; 15 issues are due before they were created. | Rebaseline Jira due dates from the roadmap once the deadline (section 3) is known. | N (Jira) | |
| M5 | Posture inference cap (T-09): SRS 3.4 says 20–30 Hz. | Cap frames to the worker at one per 30 ms (≈ 33 Hz ceiling on a 60 fps camera, every frame on a 30 fps camera); T-19 measures the actual rate. A 33 ms gate would drop jittery 30 fps frames and risk falling below 20 Hz. | N | |

## 3. Team decisions to take at the same meeting

These are not SRS conflicts, but work depends on them. Defaults are from `docs/execution/UNRESOLVED_DECISIONS_AND_INFORMATION_NEEDED.md`.

| ID | Question | Default if nobody objects | Needed by | Decided |
|---|---|---|---|---|
| U-01 | Final delivery / defence date; which calendar day is D1? The SPMP sets 11 weeks with deployment in week 9 (SPMP dated 09/12/2026), so the deadline may be close. | D1 = Mon 2026-11-16 → Release D14 = Fri 2026-12-04 (Nov 30 holiday skipped). **If fewer days remain, apply the cut order (roadmap §9).** Confirm with the adviser. | today | |
| U-04 | Badge rules for the 5 seeded achievements. | `first-lesson` = first mastered lesson; `streak-7-days` / `streak-30-days` = streak ≥ 7 / ≥ 30; `exp-500` = EXP after the lesson, before badge bonuses (no cascade); `posture-stable` = this run's `posture_score` ≥ 90. | D2 (B, T-11) | |
| U-20 | At 0 hearts, block only lessons that contain a practice exercise? | Yes: theory and rhythm stay open (`runner.ts` engine test; every tier has `rhythmFailHeartCost: 0`). | D2 (D, T-15) | |
| U-17 / U-18 | Review load and D's cut order. | A reviews everything; C reviews T-16 and the T-18 theory files. D's cut order: T-17, then T-18; T-19 recording help optional. | today | |
| U-08 | Which Supabase project does `.env.local` point to; staging plan. | C creates a new staging project; the existing one is left untouched. | today (C, T-05) | |
| U-15 | Hosting: Vercel or Netlify, whose account? | Vercel, B's account. | today (C, T-05) | |
| U-09 | May C add `fake-indexeddb` (dev dependency) for T-13 tests? | No: test the queue with an in-memory store; check IndexedDB manually. | D4 | |
| — | `features-integration` (B updated it on 2026-11-16 by merging an old `main`). | Not a merge candidate. T-04 salvage list first; achievements and the chart layout are re-implemented on `main` (T-11, T-12). | today (B, T-04) | |

## 4. Sign-off

| | Name | Date |
|---|---|---|
| Chair | Amatong (A) | |
| Accuracy review | Barnaija (B) | |
| Attended | Rosales (C), Bernante (D) | |
