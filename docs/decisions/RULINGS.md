# Requirements Rulings (T-02, change-control record)

| | |
|---|---|
| **Status** | **DECIDED** by the chair on 2026-11-16 (T-02 meeting). Recorded 2026-11-17. |
| **Decision-maker** | A — Amatong (chair, SPMP 3.3). B, C and D attended. No ruling drops an SRS requirement, so no adviser escalation was needed — except possibly D11 (see its row). |
| **Evidence baseline** | `main` @ `67dc05e` (2026-11-17). Live Supabase project inspected read-only the same day. |
| **Feeds** | T-26: A edits the SRS and SDD personally, using `docs/decisions/T-02_SPEC_EDIT_GUIDE.md`. Code follow-ups are in `docs/decisions/T-02_VERIFICATION_PLAN_HANDOFF.md`. |

## 1. Rulings D1–D14

"Code status" is what `main` does today, not what the ruling wants. See the verification report for files and tests.

| ID | Question | Decided | Reason | Code status (2026-11-17) | Affects | Doc edit | By |
|---|---|---|---|---|---|---|---|
| **D1** | Audio window: SRS 3.1.6.1 (2048–4096) vs SRS 3.4 (max 2048). | **Keep the 4096-sample window and 512-sample hop.** | 4096 halves the FFT bin width (≈ 11.7 Hz at 48 kHz vs ≈ 23.4 Hz at 2048), which chord chroma needs in the lower register; all chord tests are tuned on it. | Compliant (`src/audio/config.ts:45-46`). The SRS "within 50 ms" figure is unchanged and still unmeasured (T-19). | T-07, T-08, T-19 | **Y**: SRS 3.1.6.1, SRS 3.4 bullet 2, SDD 4.2 | A |
| **D2** | SDD: `AnalyserNode.getFloatFrequencyData`; code: AudioWorklet with its own FFT. | **Accept the AudioWorklet instead of AnalyserNode.** | Off the main thread, sample-accurate timing; raw audio never leaves the worklet (SRS 3.5.1). | Compliant (`src/audio/worklet/chroma.worklet.ts`, `src/audio/input/AudioInputService.ts`). | T-08, KAN-264 | **Y**: SRS 3.1.6.1, SRS 3.7.3; SDD 4.2, C-06, §7 matrix row 3.1.6.1 | A |
| **D3** | Does the 10 MB cap cover WASM + model, or the model only? | **The 10 MB cap applies to the model asset only.** | The SRS attaches "(maximum 10 MB)" to the model weight asset. | Compliant: model 5,777,746 B; WASM variants 12.2–13.0 MB, fetched by the worker only after "Turn on camera". | KAN-251, T-19 | **Y**: SRS 3.4 bullet 4 (no size statement exists in the SDD) | A |
| **D4** | Single-note grading: pitchy (SRS 3.1.6.2) vs chroma pitch class (code). | **Keep pitchy mandatory. Chroma `NoteVerifier` remains behind a flag for comparison.** | The SRS is explicit. | **Not compliant on `main`.** f0 + clarity are computed in the worklet on branch `task/T-08-pitch-wiring` (not merged). `PitchVerifier` (C, T-07) not started; no flag exists yet. | T-07 (C), T-08 (A), T-19 | N | A |
| **D5** | Drill timeout: 15 s (SRS/SDD) vs tier overrides 12 s / 10 s. | **Standardise the drill timeout to 15 s everywhere.** | Lowest-risk change; SRS untouched. | **Not compliant.** `src/content/tiers.ts:62` (Virtuoso `timeoutSec: 12`); `src/content/units/proficient.ts:318` (`timeoutSec: 10` plus the prompt text "10 seconds per chord"). Seed has 19 × 12 s and 1 × 10 s. | Content + seed (A), live `lessons` table | N | A |
| **D6** | KAN-244 title (Perfect/Great/Late/Early/Miss) vs SRS (Perfect/Good/Miss). | **Keep Perfect / Good / Miss. Correct the KAN-244 title.** | Code already matches the SRS. | Compliant (`src/lib/rhythm/timing.ts`). Jira only. | Jira | N | A |
| **D7** | SDD C-03 sample/notation/diagram URLs vs synthesised audio + SVG. | **Accept synthesised audio and SVG notation.** | Zero hosting cost (SRS 3.6.1). | Compliant (`src/lib/theory/playNote.ts`, `GrandStaff.tsx`, `PianoKeyboard.tsx`). | — | **Y**: SDD C-03 | A |
| **D8** | Placement: 2 tiers (SDD C-01) vs 3 tiers (code). | **Accept three placement tiers: Novice, Proficient, Virtuoso.** | Matches the 12-unit curriculum; tested. | Compliant (`src/lib/progress/placement.ts`; units 1 / 5 / 9). | T-14 | **Y**: SDD C-01 (SRS 3.1.1.4 example recommended for consistency) | A |
| **D9** | Streak: "completion timestamps" vs any finished, non-quit run. | **Streaks count any finished, non-quit lesson run.** | Rewards daily practice; quitting never counts. | Compliant in `src/lib/progress/applyResult.ts:77,117`. **Caveat:** since PR #22, `useGamification` also writes `current_streak` on passed lessons (second writer; see verification report). | T-23 | **Y**: SRS 3.1.2.2 | A |
| **D10** | +1 heart on ≥ 80 % theory; replays can repeat it. | **Allow theory-based heart restoration at 80 %, subject to the 5-heart cap.** | SRS permits it; low impact. | Compliant in `src/lesson/runner.ts:22,170-181` (first-try theory score ≥ 80, not on quit, capped at 5). Boundary tests (80 / 79.99) still missing (T-16). | T-16 | **Y**: SDD C-02 note | A |
| **D11** | Which OAuth provider(s)? | **Refer to the actual configuration** (chair's instruction). **Finding:** the live Supabase project has **only the email provider enabled** (`/auth/v1/settings` → `external: {email: true}`); `supabase/config.toml` configures no provider; no screen calls `signInWithOAuth` (generic function at `src/context/AuthContext.tsx:390`). **No OAuth provider is configured today, so SRS 3.1.1.1 ("third-party OAuth providers") is not met.** **Recommended documented scope: Google as the single provider** (it is the only one the SDD names, SDD 6.3), delivered by T-10 — needs a Google Cloud OAuth client (U-07) and enabling the provider in the Supabase project, **which requires A's explicit authorization**. If Google cannot be enabled by the IC-3 freeze, removing OAuth from the SRS would drop a requirement → **escalate to the adviser** (SPMP 3.3). | Documents what actually exists; avoids promising a provider nobody configured. | **Not compliant** (no provider, no UI). | T-10 (B), U-07, T-25 | **Conditional** (none if Google ships; see guide) | A — **outstanding: authorize Google setup, or escalate** |
| **D12** | 2° HUD hysteresis vs strict SRS bands. | **Keep 2° hysteresis for HUD display only; scoring remains strict.** | Prevents flicker at the band edge. | Compliant: `src/vision/posture/config.ts:24`; scoring uses `inBandStrict` (`PostureHold.ts:53-58`, `PracticeDrill.ts:174`). | — | **Y**: SDD C-05 | A |
| **D13** | Undefined "aggregated rhythm consistency". | **Adopt `consistency = 100 × Σ_targets max(0, 1 − |Δ|/50) / targetCount`; omitted beats contribute 0.** | Same as today when every beat is hit; omissions now count. | **Not compliant.** `src/lib/rhythm/timing.ts:53-54` averages only matched taps. | T-16 (D) | **Y**: SDD C-04 (SRS 3.1.4.4 clause recommended) | A |
| **D14** | Client can PATCH its own `exp` / `hearts` / completion. | **Accept client-side modification of a user's own progression data as a documented capstone risk. Server-side save RPC deferred to T-28.** Must not be described as protection against self-manipulation. | SRS 3.5.2 owner-only access does not cover self-manipulation; the RPC is too large for the remaining time. | As designed in the migration (`profiles_update_own`). **⚠ Separate live defect:** the live `profiles` table is readable **anonymously** (all 5 rows, all columns) — this violates SRS 3.5.2 and is **not** covered by D14. Logged as P0 for C (T-20). | T-11, T-20 (C), T-28 | **Y**: SDD 3.3 | A |

## 2. Minor wording items (all approved as proposed)

| ID | Decided | Doc edit | By |
|---|---|---|---|
| M1 | Worker-level lazy loading fulfils the intended code-splitting requirement. | **Y**: SRS 3.4 bullet 4 (combined with D3) | A |
| M2 | Keep the analytics date-range requirement; T-12 implements 7-day, 30-day and all-time. | N | A |
| M3 | Musical stave indicators are shown in the side panel beside the HUD (single notes on a staff; chords on a keyboard diagram with the chord name). | **Y**: SRS 3.7.1 bullet 2 | A |
| M4 | Rebaseline Jira due dates after confirming the revised deadline. **Deadline now set (U-01): dates in the handoff plan.** | N (Jira) | A |
| M5 | 30 ms worker gate for posture inference; T-19 measures the actual rate. | N | A |

## 3. Team decisions

| ID | Decided | Conditions / follow-ups | By |
|---|---|---|---|
| **U-01** | **Revised schedule target: Saturday 2026-11-28.** December 4 is no longer the target. | Nov 28 is a **Saturday**: confirm whether it is a working day and what is due on it (release, submission or defence). Plan assumes **release Fri Nov 27** and Nov 28 as demo/buffer. Subject to any separate adviser requirement. | A |
| **U-04** | All five badge trigger definitions approved exactly: `first-lesson` = first mastered lesson; `streak-7-days` / `streak-30-days` = streak ≥ 7 / ≥ 30; `exp-500` = EXP after the lesson, before badge bonuses (no cascade); `posture-stable` = this run's `posture_score` ≥ 90. | The engine merged in PR #22 (`src/lib/gamification/engine.ts`) **does not match**: cascading `exp-500`, `posture-stable` from best-ever score (fed `postureScore || 95` for non-posture lessons), 3 extra badges not in the DB. B (T-11) aligns it. | A |
| **U-20** | At 0 hearts, block only lessons containing practice exercises; theory and rhythm stay open. | `SkillTreeView.tsx:117` still blocks every non-theory lesson (D, T-15). | A |
| **U-17 / U-18** | **A reviews everything independently.** C is not assigned review duties. D's cut order kept: T-17, then T-18; T-19 recording help optional. | Proposed reading, for A to confirm: B still reviews **A's own** PRs (no self-approval); T-14 and T-17 reviewers become A. | A |
| **U-08** | **Use the existing Supabase project for staging.** No new project. | Precautions listed in the handoff (backup first; live RLS drift on `profiles`; seed and migration are applied by hand). Production project choice (U-06) still open. | A |
| **U-15** | Vercel, through B's account. | — | A |
| **U-09** | No `fake-indexeddb`. In-memory store for queue tests; IndexedDB checked manually. | — | A |
| **features-integration** | **Do not merge yet;** T-04 salvage list first; achievements and chart layout re-implemented on `main` (T-11, T-12). | **⚠ Contradicted by events:** the branch was merged into `main` as **PR #22 at 2026-11-17 00:45** (merged by GitHub account "Raga"), before this ruling was recorded. **Remedy decided by A on 2026-11-17: revert PR #22** (branch `task/revert-pr-22`, commit `13946d4`; tree identical to pre-merge `662a87b`). Do not merge `features-integration` again — git now treats it as merged; re-implement on task branches. | A |

## 4. Outstanding conditions

1. **D11:** authorize enabling Google in the Supabase project (and the Google Cloud client, U-07), or escalate to the adviser.
2. **features-integration / PR #22:** **decided — revert** (2026-11-17). Pending: A merges `task/revert-pr-22` (B reviews), then T-03, T-11, T-12 and T-13 continue on the reverted `main`.
3. **Live `profiles` RLS drift:** P0, owner C, before anything else is deployed from the shared project.
4. **Nov 28 is a Saturday:** confirm what is due that day.
5. **U-06:** production project (new vs promote the existing one) — still open.

## 5. Sign-off

| | Name | Date |
|---|---|---|
| Chair | Amatong (A) | 2026-11-16 |
| Accuracy review | Barnaija (B) | |
| Attended | Rosales (C), Bernante (D) | 2026-11-16 |
