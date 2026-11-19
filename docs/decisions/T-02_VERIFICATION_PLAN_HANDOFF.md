# T-02 follow-through: code verification, revised plan, member handoff

| | |
|---|---|
| Date | 2026-11-17 |
| Code baseline | `origin/main` @ `67dc05e` (includes PR #22 `features-integration`) |
| Live checks | Supabase project from `.env.local`, **read-only** requests with the publishable key (`/auth/v1/settings`, REST `select` with counts). Nothing was written. |
| Commands run on `67dc05e` | `npx vitest run` ×2 → **414 / 414 pass** (30 files); `npx tsc -p tsconfig.json` → clean; `npm run seed:lessons:check` → up to date (59 lessons) |
| Not run | Production build on `67dc05e`; any browser, camera, microphone or signed-in Supabase check |

---

## 0. Read first: three findings that change the plan

### F1 — `features-integration` was merged into `main` (PR #22) — P0 process / P1 data integrity

- Merged **2026-11-17 00:45** by GitHub account **"Raga"** (commit `67dc05e`), on top of B's `5a62f6f` (merge of `main` into the branch) and `10793c4` "fixed the heart update thinngy". This happened **before** the ruling "do not merge yet" was recorded. Who "Raga" is must be confirmed.
- It brought +3,714 / −311 lines across 25 files, including the files the audit said to discard: `LessonSessionModal.tsx` (835 lines, **not imported anywhere** — dead), `useGamification.ts`, `lib/gamification/engine.ts`, and changes to `DashboardScreen.tsx`, `useHeartRegen.ts`, `AuthContext.tsx`, `LessonPlayer.tsx`, `PracticeDrillView.tsx`, `usePracticeDrill.ts`, `registry.ts`.
- It **edited the initial migration** `supabase/migrations/20260509120000_initial_schema.sql` (adds `profiles.last_heart_update`) — against the schema rule "new migration files only". The column **does exist in the live database** (REST select returns 200), so someone altered the live schema by hand.
- **Verified defects introduced (code reading on `67dc05e`):**
  1. **Two writers per passed lesson.** `DashboardScreen.handleLessonComplete` calls `gamification.completeLessonSession(...)` (fire-and-forget: writes **absolute** `exp`, `hearts`, `current_streak`, `last_activity_date` to `profiles`; upserts `user_progress`; **inserts a `performance_records` row**; upserts `user_achievements` — `src/hooks/useGamification.ts:521-570`) **and then** `saveLessonResult(...)`, which applies the same result again (progress, another `performance_records` row, profile). Result: **two `performance_records` rows per passed lesson**; EXP / streak depend on which write lands first.
  2. The gamification insert stores lesson **accuracy as `pitch_accuracy`**, and `DashboardScreen` passes `rhythmConsistency || 95` and `postureScore || 95`, so lessons with no rhythm or posture record **95** — fake data that T-12 analytics would chart.
  3. Heart losses are now persisted only by `gamification.depleteHeartForDrill` (each loss, immediately), and `saveLessonResult` receives `heartsStart` rewritten to `heartsEnd − restored`. If the immediate write fails (errors are swallowed), the loss is silently refunded — T-06's guarantee now depends on that write.
  4. Badges: the engine **does not match U-04** (cascading `exp-500`; `posture-stable` from the best-ever score, which point 2 sets to 95 for theory lessons; 3 extra badges not in the DB) and writes with `upsert(..., { onConflict })`; the migration grants no UPDATE on `user_achievements`, and Postgres requires UPDATE privilege for `ON CONFLICT DO UPDATE` → these writes **probably fail** (silently). Verify on staging.
  5. **Three heart-regeneration mechanisms** now coexist: `useHeartRegen` (changed), `useGamification.restoreHearts`, and a new reconciliation in `AuthContext.fetchProfile`, using two localStorage keys. Not tested together.
- Tests still pass (414) because none of this is covered by unit tests.
- **Decision for A (see §3.1):** revert PR #22 vs fix forward.

### F2 — Live `profiles` table is readable without signing in — P0 security (SRS 3.5.2)

- Anonymous REST request with the publishable key: `profiles?select=id` → HTTP 200 with rows; count = **5 of 5** rows; readable columns: `created_at, current_streak, exp, hearts, id, instrument_focus, last_activity_date, last_heart_update, username`. Values were not printed.
- The migration grants `profiles` to `authenticated` only with `profiles_select_own`, so the live database does not match the migration (RLS disabled on `profiles`, or an extra permissive policy). The other five tables return 0 rows to anonymous requests (consistent with RLS).
- Anonymous **writes were not tested** (destructive). Must be checked in the SQL editor: `select relrowsecurity, relforcerowsecurity from pg_class where relname = 'profiles';` and `select * from pg_policies where tablename = 'profiles';`.
- Owner: **C** (supabase/), A approves. Must be fixed **before** the shared project is used as staging (U-08) or for any demo.

### F3 — Nov 28, 2026 is a Saturday

- Working days from today: **Tue Nov 17 → Fri Nov 27 = 9 days** (10 if Sat Nov 28 is worked). The original plan had 14 working days left (D2–D15). That is a **36 % cut**.
- This plan assumes **release on Fri Nov 27** and **Sat Nov 28 = demo rehearsal / backup video / buffer**. If Nov 28 is the submission or defence itself, rehearsal moves to Fri Nov 27 evening.

---

## D. Code verification report (D1–D14)

Classification: ✅ Already compliant · 🛠 Requires implementation · ⚙ Requires configuration · 📝 Documentation-only · 🔎 Further investigation

| ID | Status | Evidence on `67dc05e` | Work, files, tests |
|---|---|---|---|
| D1 | ✅ + 📝 | `src/audio/config.ts:45-46` `fftSize: 4096 // SPEC`, `hopSize: 512`; `dsp.test.ts` | SRS/SDD edits only. 50 ms latency unmeasured → T-19. |
| D2 | ✅ + 📝 | `src/audio/worklet/chroma.worklet.ts`, `src/audio/input/AudioInputService.ts` (no AnalyserNode in the live path) | SRS/SDD edits only. |
| D3 | ✅ + 📝 | `public/models/pose_landmarker_lite.task` 5,777,746 B; WASM 12,997,248 / 12,997,272 / 12,168,316 B; loaded in `src/workers/posture.worker.ts` `init()` after `INIT` from `PracticeRig.startCamera()` | SRS edit only. |
| D4 | 🛠 | `src/practice/PracticeDrill.ts` `arm()` uses `NoteVerifier` for `kind: 'note'`; no `PitchVerifier`; no `useChromaNoteVerifier` flag. f0 + clarity: branch `task/T-08-pitch-wiring` (`5e5092c`, 393/393 tests, verified in a browser worklet). | C: T-07 `src/audio/notes/PitchVerifier.ts`, `src/audio/dsp/pitch.ts` helpers, `src/audio/config.ts` `pitch` section, `pitch.test.ts`. A: T-08 part 2 — `PracticeDrill.arm()`, flag in `src/audio/config.ts`, `PracticeDrill.test.ts` octave case, rebase on `67dc05e` (part 1 touches only `src/audio/**`; PR #22 did not). |
| D5 | 🛠 | `src/content/tiers.ts:62` `timeoutSec: 12` (Virtuoso); `src/content/units/proficient.ts:318` `{ timeoutSec: 10 }` and prompt "Play it again, faster: 10 seconds per chord."; seed: 19 × 12 s, 1 × 10 s | A: set Virtuoso to 15; remove the override and reword the prompt (e.g. "Play it again, a little faster."); `npm run seed:lessons`; commit `seed.sql`. No test asserts 12/10 s. **Config:** re-apply `seed.sql` to the shared project (lessons come from Supabase when it holds v2 payloads — `useDashboardData.ts:31,66`). |
| D6 | ✅ (Jira) | `src/lib/rhythm/timing.ts` Perfect / Good / Miss | Retitle KAN-244 (A, Jira). |
| D7 | ✅ + 📝 | `src/lib/theory/playNote.ts`, `src/components/theory/GrandStaff.tsx`, `PianoKeyboard.tsx`; payload `notes?: number[]` (`lesson.types.ts:75-83`) | SDD edit only. |
| D8 | ✅ + 📝 | `src/lib/progress/placement.ts` (TIERS → units 1 / 5 / 9); `placement.test.ts` | SDD edit (SRS optional). |
| D9 | ✅ / 🔎 | `src/lib/progress/applyResult.ts:77` (quit → no activity), `:117` (`nextStreak`). **But** PR #22 adds a second streak writer (`useGamification` `current_streak`, and a reset-to-0 on load at `useGamification.ts:222-224`). | Resolve with F1. |
| D10 | ✅ (tests 🛠) | `src/lesson/runner.ts:22,170-181` (first-try theory score ≥ 80; not on quit; `hearts < 5`; `heartsEnd` capped) | D: T-16 boundary tests (80 → restored, 79.99 → not, 5 hearts → not). |
| D11 | ⚙ / 🛠 / decision | Live `/auth/v1/settings`: `external = { email: true }` only; `disable_signup: false`; `mailer_autoconfirm: false` (email confirmation on). `supabase/config.toml`: no auth section. `signInWithOAuth(provider)` at `AuthContext.tsx:390`, called nowhere; no OAuth button in `src/components`. | If A authorizes: Google Cloud OAuth client (U-07, B), enable Google + redirect URLs in the Supabase project (C), "Continue with Google" button (B, T-10). Otherwise escalate (SRS 3.1.1.1 not met). |
| D12 | ✅ + 📝 | `src/vision/posture/config.ts:24` `hysteresisDeg: 2`; posture score from `inBandStrict` (`src/practice/PostureHold.ts:53-58`, `PracticeDrill.ts:174`, `usePracticeDrill.ts:85`) | SDD edit only. |
| D13 | 🛠 | `src/lib/rhythm/timing.ts:53-54`: `100 − avgDeviation/50·100` over matched taps only | D: T-16 — `summarize()` new formula; new `src/lib/rhythm/__tests__/timing.test.ts` (1 perfect of 10 → 10; boundaries 25/25.01/50/50.01). Check `plan.test.ts` and `applyResult.test.ts` still pass (`rhythm_consistency` values change for runs with omissions). Consumer: `TapExerciseView.tsx:65`. |
| D14 | 📝 + 🔎 | Migration: `profiles_update_own`, grants `select, insert, update` on `profiles` to `authenticated` (client can PATCH own `exp`/`hearts`) — accepted. **F2: live anonymous read of `profiles`** — not accepted, P0. | SDD edit; C fixes live RLS (T-20 / now); T-20 script must include the anonymous-read case. |

### Related decisions

| ID | Status | Evidence | Work |
|---|---|---|---|
| U-04 | 🛠 | `src/lib/gamification/engine.ts:676-735` differs from the approved rules (F1 point 4) | B, T-11: implement the five approved rules through `ProgressStore` (C3 contract), insert-and-ignore-23505, no cascade; drop or hide the 3 non-DB badges. |
| U-20 | 🛠 | `SkillTreeView.tsx:117` `hearts === 0 && lesson.kind !== 'theory'` blocks rhythm too; `DashboardScreen.tsx:191` checks `lesson.kind === 'practice'` (node kind, not exercise content) | D, T-15 item 3: shared helper based on exercise engines (`runner.ts`) for both views. |
| U-08 | ⚙ / 🔎 | Existing project = staging (see §3.4 precautions) | C, T-05. |
| T-03 (P0, B) | 🛠 still open | `AuthContext.tsx:78-79` only warns on read errors other than `PGRST116`, then `:188-203` **upserts `exp: 100, current_streak: 1, hearts: 5`** — the profile-wipe bug is still on `main`, and PR #22 added more writes in `fetchProfile`. | B, today. |

---

## E. Revised execution plan (target: Sat 2026-11-28)

### E.1 Calendar and milestones

| Date | Milestone | Exit criteria (A checks) |
|---|---|---|
| **Tue Nov 17** | IC-0 close-out | RULINGS.md recorded and merged; PR #22 decision taken; contracts C1–C8 posted; F2 owner assigned. |
| **Wed Nov 18 (EOD)** | **IC-1** | Merged: T-03, T-05 (CI + Vercel + shared-project precautions + F2 fixed), T-15, T-16, D5 content fix, PR #22 remedy. CI green. Staging walkthrough: signup → placement → lesson → one `performance_records` row. |
| **Fri Nov 20 (EOD)** | **IC-2** | Merged: T-07 (Thu), T-08 part 2, T-11, T-18 (if kept), T-14 (if kept). Play-note passes A4, fails A3 on staging. |
| **Tue Nov 24 (EOD)** | **IC-3 — feature freeze** | Merged: T-12, T-13 (reduced), T-10. T-19 report in. |
| Wed Nov 25 – Thu Nov 26 (noon) | Testing | T-20, T-21, T-22, T-23 (reduced) executed on the frozen staging build. |
| **Thu Nov 26 (noon)** | **IC-4** | Every defect has a priority and owner. |
| Thu Nov 26 PM – Fri Nov 27 (noon) | T-24 fixes + regression | Regression log written. |
| **Fri Nov 27 (noon)** | **RC** | No open P0/P1; CI green; T-20 and T-21 pass. |
| **Fri Nov 27 (PM)** | **Release** (T-25) | Production smoke test (5 flows); tag `v1.0.0`. |
| **Sat Nov 28** | Target / demo | Rehearsal, backup video, buffer — **confirm what is due this day**. |

Compared with the old plan: IC-1 unchanged (D3 = Nov 18); IC-2 two days → same week; freeze moves from D9 to Nov 24; testing shrinks from 3 days to 1.5; fixes from 2 days to 1; release one day before the target.

### E.2 Task due dates (for Jira)

"Status" is from repository evidence only. Nothing is marked Done without its evidence.

| Task | Jira | Owner | Due | Hard waits | Status (evidence) |
|---|---|---|---|---|---|
| T-01 baseline | NEW-01 | A | Nov 17 | — | **Partly done:** PR #18 merged. Open: delete `Lag-in`, `dashboard`, `login-bins` (still on origin; needs A's yes); branch protection unknown — PR #22 was merged by "Raga", so check the rule. |
| T-02 rulings | NEW-02 | A | Nov 17 | — | Register written (this branch, uncommitted); needs merge + B's accuracy review. |
| PR #22 remedy | new bug | A | Nov 17 | — | **Revert decided**; branch `task/revert-pr-22` pushed (`13946d4`), PR not yet opened. |
| F2 live RLS fix | new bug (P0) | C | Nov 18 | — | Open. |
| T-03 profile wipe | KAN-233 | B | Nov 18 | PR #22 remedy (same file) | Not started (no branch). |
| T-05 staging + CI | NEW-03, KAN-278 | C | Nov 18 | F2 | Not started (no branch). Scope reduced: **no new project** (U-08). |
| D5 timeouts | new (content) | A | Nov 18 | — | Not started. |
| T-06 heart refund | NEW-04 | A | done in code | — | PR #19 merged. Open: manual staging check (needs T-05). |
| T-09 vision | NEW-05 | A | done in code | — | PR #20 merged. Open: webcam check (T-19). |
| T-15 UI fixes | KAN-236/237/238 | D | Nov 18 | — | Not started. Adds U-20 rule. |
| T-16 rhythm | KAN-244, KAN-239 | D | Nov 18 | D13 (decided) | Not started. |
| T-04 salvage | KAN-259 | B → A approves | Nov 18 | PR #22 remedy | Superseded in part by the merge; salvage list still needed for whatever is kept. |
| T-07 PitchVerifier | KAN-262/263 | C | **Thu Nov 19** | — | Not started (no branch). **Critical:** T-08, T-19, T-21 wait on it. |
| T-08 pitch wiring | KAN-261/264 | A | Fri Nov 20 | T-07 merged | Part 1 on branch (`5e5092c`); part 2 waits for T-07. |
| T-11 achievements | KAN-270 | B | Fri Nov 20 | PR #22 remedy; U-04 (decided) | Engine exists from PR #22 but violates U-04. |
| T-18 dead code | NEW-07 | D | Fri Nov 20 | — | Not started. **Add `LessonSessionModal.tsx`** to the list if PR #22 is kept. Cut #2 in D's order. |
| T-14 welcome | KAN-235/231 | D | Fri Nov 20 | T-15 | Not started. See E.3. |
| T-17 flats | NEW-06 | D | — | — | **Cut (D's cut #1)** — see E.3. |
| T-12 analytics | KAN-269 | B | **Tue Nov 24** | T-11 (soft) | Chart layout merged with hard-coded data. |
| T-13 offline (reduced) | KAN-268 | C | Tue Nov 24 | T-11 merged; `run_id` migration approved by A | Not started. |
| T-10 auth | KAN-228/229 | B | Tue Nov 24 | T-03; T-05; D11 authorization for Google | Not started. |
| T-19 benchmark | KAN-277 | A | Tue Nov 24 | T-08 merged; hardware (U-10) | Not started. Overlay (`?debug`) on `main`. |
| T-21 privacy | KAN-276 | D | Mon Nov 23 – Wed Nov 25 | T-08 merged | Not started. |
| T-20 RLS | KAN-275 | C | Wed Nov 25 | T-05; F2 fixed | Not started. Must include anonymous-read checks. |
| T-22 compatibility | KAN-279/280 | D | Thu Nov 26 noon | IC-3 | Not started. |
| T-23 E2E (reduced) | KAN-274/271 | C (B pairs) | Thu Nov 26 noon | IC-3, T-05 | Not started. |
| T-24 fixes | KAN-273/281/282 | A + all | Fri Nov 27 noon | T-19…T-23 | — |
| T-25 deploy | KAN-283 | B | Fri Nov 27 | RC; U-06 | — |
| T-26 docs | NEW-08 | **A (SRS/SDD)**, D (test appendix) | Fri Nov 27 | T-02; test reports | Spec edit guide ready. |

### E.3 Cut-order effect (D's order: T-17, then T-18; T-19 recording help optional)

- **T-17 flats: cut now.** Saves ~2 days of D's time. Consequence: in "F Major (One Flat)" (`src/content/units/proficient.ts:149-163`) the card text correctly says "Bb", but the staff drawn from MIDI notes (`display: 'both'`) shows A♯; drill target labels also use sharps (known limitation U-19). Mitigation (A's area, with the D5 change + seed regen): show that card without the staff (keyboard only), so nothing on screen contradicts the text. Check the keyboard key labels in the browser before relying on it.
- **T-18 dead code: keep only if T-15 and T-16 merge by Wed Nov 18.** Otherwise cut; no user impact. (If PR #22 is kept, `LessonSessionModal.tsx` is new dead code.)
- **T-19 recording help: optional.** A runs T-19 alone if D is busy with T-21/T-22.
- **⚠ Conflict to note:** the roadmap's cut list (§9) puts T-14 (welcome step) **before** T-18. U-18 (decided) puts T-18 next after T-17 and does not mention T-14. This plan follows U-18. **A decides whether T-14 survives**; recommendation: keep it only if D has T-15 merged by Nov 18, otherwise cut (piano lock is still enforced by the DB).
- **Also recommended now (roadmap §9 items 5–6):** T-13 to the reduced version (enqueue on network error + flush on reconnect, no backoff) and T-23 to core flows. Neither can be dropped entirely.

### E.4 Capacity check (9 working days each)

| Member | Remaining load (ideal days) | Verdict |
|---|---|---|
| **A** | PR #22 decision + D5 (0.5), T-08 part 2 (0.5–1), T-19 (1.5), triage + T-24 (1.5), release (0.5), **SRS/SDD edits (now A's, ~1)**, **reviewing everything (~18–20 PRs ≈ 3–4)** | **≈ 9–10: over capacity.** "A reviews everything" plus doing the SRS/SDD personally is the largest schedule risk on A's side. |
| **B** | T-03 (1), PR #22 remedy (0.5–1), T-11 (1.5), T-12 (3–4), T-10 (1.5–2), T-25 (1) | **≈ 9–10.5: over capacity.** T-12 is the critical path. |
| **C** | F2 (0.5), T-05 reduced (1–1.5), T-07 (2.5), T-13 reduced (2), T-20 (1), T-23 reduced (1.5) | **≈ 9–9.5: at capacity.** T-07 by Thu is tight. |
| **D** | T-16 (1–1.5), T-15 (2), T-18 (1), T-14 (1), T-21 (1), T-22 (1.5), test appendix (0.5) | **≈ 8–8.5 with T-17 cut: at capacity.** |

**Conflicts with the Nov 28 target that need A's decision** (not changed here):
1. A and B are both over capacity. Existing contingency (A takes the T-12 rhythm histogram) no longer works, because A is also over.
2. Options, in order of least scope impact: (a) A delegates some D reviews to B for small D PRs — conflicts with U-17, needs A to reopen it; (b) T-10's Google part slips past the freeze if not authorized today (recovery + resend still ship); (c) drop T-14 and T-18.
3. T-07 is not started and gates T-08, T-19 and T-21. If T-07 is not merged by **Thu Nov 19 EOD**, apply the existing contingency: T-08 merges with the flag defaulting to chroma, and D4 stays unmet until T-07 lands.

### E.5 Review responsibilities (U-17 decided)

| Author | Reviewer |
|---|---|
| B, C, D (all PRs, including T-16, T-17/T-18 theory files, T-14) | **A** |
| A (T-08 part 2, D5 content, T-19 tuning) | **B** (A cannot approve own PRs — proposed reading of U-17; confirm) |
| Migrations (`run_id`, any `last_heart_update` follow-up) | A approves design first |

---

## 3. Decisions A must take (blocking)

### 3.1 PR #22 — revert or fix forward

| Option | What it means | Cost | Risk |
|---|---|---|---|
| **A. Revert PR #22** (recommended) | `git revert -m 1 67dc05e` in a PR. Restores `main` to the reviewed state (`662a87b` + T-06/T-09/T-02). B re-implements only what U-04 / T-11 / T-12 need, through `ProgressStore`. Keep `profiles.last_heart_update` in the live DB (harmless) and, if wanted, add it later in a **new** migration. | ~0.5 day for B; T-11 / T-12 as planned | Loses B's heart-regen work; B must re-port anything worth keeping. Matches "Do not merge yet" and the integration rule "revert the offending merge". |
| B. Fix forward | Keep the merge; B removes every Supabase write from `useGamification` (one writer: `saveLessonResult`), removes the `|| 95` defaults, aligns the engine to U-04, moves `last_heart_update` to a new migration and restores the initial migration file, deletes `LessonSessionModal.tsx`. | ~1.5–2 days for B (more than A) | Larger diff to review under time pressure; three heart-regen paths still need untangling. |

**Decided 2026-11-17: Option A (revert).** Branch `task/revert-pr-22`, commit `13946d4`, pushed; tree identical to `662a87b`; `npm test` 400/400 ×2, `tsc` clean, build OK, seed check up to date. **Pending:** PR into `main`, reviewed by B, merged by A.

### 3.2 D11 — authorize Google, or escalate
Authorize (B creates the Google Cloud OAuth client, C enables Google in the Supabase project and adds redirect URLs) — or contact the adviser about SRS 3.1.1.1.

### 3.3 Nov 28 — what is due on a Saturday?

### 3.4 U-08 precautions for using the existing Supabase project as staging (C executes, A approves)

1. **Back up first** (Dashboard → Database → Backups, or `pg_dump` with the connection string; free tier has no point-in-time restore). Record the date in `docs/ENVIRONMENTS.md`.
2. **Fix F2** (anonymous read of `profiles`) before sharing the staging URL with anyone.
3. **Record schema drift:** live has `profiles.last_heart_update` (added by hand). Decide with A whether it gets a proper new migration file; restore the initial migration file to its reviewed text.
4. **Apply seed by SQL editor, never `supabase db reset`** against the hosted project (that wipes it). `seed.sql`'s only delete removes piano lessons no longer in the course *and* with no learner history — safe to re-run.
5. **Check `lessons` in the dashboard:** anonymous reads return 0 rows (RLS), so whether v2 payloads are present could not be verified from here; the app silently falls back to bundled content if not.
6. **Use dedicated test accounts** (T-20 needs two); leave the 5 existing profiles alone. Email confirmation is on (`mailer_autoconfirm: false`), so test signups need real inboxes.
7. **Auth URLs:** add the Vercel staging URL to Site URL / redirect allow-list without removing `localhost` entries.
8. **Production (U-06) still open:** if the existing project is staging, decide by Nov 24 whether production is a new project or this one promoted (cleaned).

---

## F. Member handoff

### A — Amatong
- **Now (no waits):** take decisions 3.1–3.3; merge this T-02 branch; post contracts C1–C8 and the rulings that unblock people (below); D5 timeout fix + one-card F-major text fix + seed regen (PR, B reviews); rebase `task/T-08-pitch-wiring` on `main`.
- **Blocked:** T-08 part 2 (T-07); T-19 (T-08 + hardware U-10); T-24 (test results).
- **Verify before implementing:** none of A's own items.
- **Changed by the rulings:** A now reviews every PR (U-17) and edits the SRS/SDD personally (T-26 split) — see E.4.

### B — Barnaija
- **Now:** T-03 profile-wipe fix (P0; still on `main`, `AuthContext.tsx:78-203`); execute the PR #22 remedy once A decides.
- **Next:** T-11 with the **approved U-04 rules** through `ProgressStore`; T-12 (7d / 30d / all, M2; no `|| 95` defaults; one `performance_records` row per run); T-10 (recovery + resend; Google only if A authorizes D11); T-25 on Vercel with B's account (U-15).
- **Blocked:** T-11 / T-12 until the PR #22 decision; T-10 acceptance until staging (T-05).
- **Verify first:** whether `user_achievements` upsert actually fails on the live DB; how the three heart-regen paths interact.
- **Changed:** reviewer for A's PRs (proposed); U-15 confirms B's Vercel account.

### C — Rosales
- **Now:** F2 — inspect and fix `profiles` RLS on the live project (P0); T-05 **without creating a project** (U-08: backup, CI workflow, `vercel.json`, env guard, `docs/ENVIRONMENTS.md`); start T-07 immediately after — **due Thu Nov 19**.
- **Next:** T-13 reduced (in-memory store tests, no `fake-indexeddb` — U-09); T-20 (include anonymous-read checks); T-23 reduced.
- **Blocked:** T-13 until T-11 merges and A approves the `run_id` migration.
- **Changed:** **no review duties** (U-17). Google provider enablement only if A authorizes D11.
- **Contract:** C1 is on `task/T-08-pitch-wiring` — `AcousticFrame.pitchHz?: number | null`, `clarity?: number`; PitchVerifier applies 0.85 / ±35 cents.

### D — Bernante
- **Now:** T-16 with the **decided D13 formula** (+ D10 boundary tests); T-15 including the **U-20 rule** (block only lessons containing practice exercises — shared helper, both views).
- **Next:** T-18 (only if T-15/T-16 merge by Nov 18; add `LessonSessionModal.tsx` if PR #22 stays); T-14 if A keeps it; T-21 once T-08 merges; T-22 after the freeze; T-26 test appendix only.
- **Cut:** T-17 (U-18). T-19 recording help optional.
- **Changed:** all of D's PRs are reviewed by A only (no C-first review for T-16/T-18); SRS/SDD drafting moves to A.

### Messages to send today (from A)

| To | Message |
|---|---|
| Team | "Rulings recorded: `docs/decisions/RULINGS.md`. Target is Sat Nov 28; release Fri Nov 27; freeze Tue Nov 24. PR #22 was merged against the plan — hold work on `DashboardScreen`, `useGamification`, `useHeartRegen`, `AuthContext` until I decide revert vs fix-forward today." |
| B | U-04 rules; D11 status; T-03 is still P0 on `main`; PR #22 remedy coming. |
| C | F2 details (above) — P0 today; U-08 precautions; T-07 due Thu Nov 19; C1 contract. |
| D | "D13 = `100 × Σ max(0, 1 − |Δ|/50) / targetCount`, omitted beats = 0." U-20 rule. T-17 cut. |
| Whoever "Raga" is | Who merged PR #22 and why; branch protection must require A's approval. |
