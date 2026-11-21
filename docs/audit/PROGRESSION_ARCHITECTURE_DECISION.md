# Progression Architecture Decision (Workstream A, Phase 3)

| | |
|---|---|
| **Status** | **APPROVED 2026-11-21: all recommended defaults (PA-D1…PA-D15 and the §11 schedule rule), by the project owner in the audit session.** Not yet ratified by the team under SPMP 3.3 change control (PA-D10 reverses a team ruling, D14). No SQL, migration, RPC or client code has been written or run; implementation waits for approval of the remaining-work plan (`docs/audit/CONSOLIDATED_HANDOFF.md`). |
| **Date** | 2026-11-21 |
| **Code baseline** | `origin/main` @ `e96c34c` |
| **Requirements read** | `MUZ_SRS-Latest.pdf` (v01.01 header; contains post-ruling wording), `MUZ_SDD-Latest.pdf` (v01.00 header; contains post-ruling wording), `MUZ_SPMP.docx`, `docs/decisions/RULINGS.md` (decided) |
| **Labels** | **[V]** verified in code or documents during this audit · **[H]** historical claim not re-verified · **[R]** recommendation · **[U]** unresolved |
| **Naming** | Decisions here are **PA-D1…PA-D15** so they cannot be confused with rulings D1–D14 in `RULINGS.md`, or with the developer-test "Decision D1" in `devTestResults.ts`. |

---

## 1. Current verified persistence flow

### 1.1 Learner and developer-test runs

| Step | Where (on `e96c34c`) | What happens |
|---|---|---|
| 1 | `DashboardScreen.tsx:158-176` (`handleSelect`) → `devAccess.ts:24-26` (`canOpenLesson`) | Lock check in the browser. A locked node opens only if `profiles.is_dev` is true. |
| 2 | `devAccess.ts:39-41` (`resultDestination`) | Destination is fixed **when the lesson opens**: locked → `'dev-test'`, otherwise `'learner'`. **A developer replaying an unlocked lesson is an ordinary learner run.** [V] |
| 3 | `LessonPlayer.tsx` + `runner.ts:47-128` | Pure runner: queue, re-queue of failed graded exercises, hearts per outcome (`submitOutcome:93-95`), out-of-hearts guard, `quitLesson` with unreported in-drill losses (T-06). |
| 4 | `runner.ts:159-193` (`buildLessonResult`) | Computes accuracy (first-try graded share), `theoryScore`, `heartsEnd` (incl. ≥ 80 % theory restore), `durationSec`, averaged metrics, and `expAwarded = lessonExp(payload)` **whenever the run passed** (line 184). |
| 5 | `DashboardScreen.tsx:120-139` → `devTestResults.ts:83-93` (`saveRunResult`) | Routes by destination. |
| 5a | Learner: `saveLessonResult.ts:28-49` → `applyResult.ts` | Fresh read of profile + progress → pure `applyResult` → **three sequential requests**: `user_progress` upsert, `performance_records` insert (if a rhythm/practice exercise ran), `profiles` update (`exp`, `hearts`, `current_streak`, `last_activity_date`). EXP only on the first mastering run (`applyResult.ts:88-90`). |
| 5b | Dev test: `devTestResults.ts:61-70` | Hearts change written to `profiles.hearts` **first**, then one `dev_test_results` row. No EXP, streak, progress or performance record. |
| 6 | `DashboardScreen.tsx:136-138` | `refreshProfile()` and `data.reload()`. The results screen replaces the runner's `expAwarded` with the saved `expGained` (`LessonPlayer.tsx:111,234`). |

### 1.2 Other progression writers

| Writer | Location | Writes |
|---|---|---|
| Passive heart regeneration | `useHeartRegen.ts` (anchor in `localStorage` key `muz-heart-regen-v2-<userId>`) → `persistRegeneratedHearts` (`supabaseStore.ts:79-88`) | `profiles.hearts` (compare-and-set on the old value). The 15-minute anchor lives **only in the browser**. |
| Placement | `DashboardScreen.tsx:110-115` → `savePlacement` (`supabaseStore.ts:98-124`) → `placementPlan` (`placement.ts:34-49`) | `user_progress` rows `completed = true` for every lesson before the start unit; `profiles.exp = max(exp, start lesson's required_exp)`; auth `user_metadata.placement`. |
| Profile bootstrap | `AuthContext.tsx:101-117` | Client `upsert` of a full profile (EXP 100, hearts 5, streak 1) when none is found (DEF-002). |
| Achievements | — | **Nothing on `main` evaluates or writes achievements** [V]. `ProfileAnalyticsView.tsx:289-300` shows a hard-coded list (e.g. "7-Day Streak, unlocked: true"). T-11 is not merged. |

### 1.3 Previous findings re-checked

| Previous finding | Result on `e96c34c` |
|---|---|
| `saveLessonResult` is the active learner persistence path | **Confirmed** (through `saveRunResult`) |
| Sequential, non-atomic writes | **Confirmed** (`saveLessonResult.ts:45-47`; dev path `devTestResults.ts:64-69`) |
| `applyResult` awards first-completion EXP only | **Confirmed** |
| `engine.ts` has different replay/bonus EXP; impact unclear | **Outdated.** `src/lib/gamification/engine.ts` was removed by the PR #22 revert (PR #26). The remaining inconsistency is `runner.ts:184` (`expAwarded` on every passed run), which reaches the UI only when the save fails. |
| Browser calculates protected progression values | **Confirmed** |
| Heart deductions and regeneration partly client-side | **Confirmed**, and regeneration is **entirely** client-side (timer and write) |
| Achievements evaluated in the browser | **Outdated.** They are not evaluated anywhere; the UI shows mock data. |
| No active progression RPC | **Confirmed** (no `.rpc(` call in `src/`) |
| No offline queue | **Confirmed** (no `src/lib/sync/`) |
| `database.types.ts` lacks `last_heart_update` despite app and migration use | **Outdated.** No code and no migration on `main` uses `last_heart_update`. It exists only on the hosted DB (hand-added, handoff §3.4) [H]. |
| Profile RLS hardening migration exists; hosted application unverified | **Confirmed**; it is now merged (PR #33). Hosted application is still unverified. |

---

## 2. Problems with the current architecture

| # | Problem | Evidence | Consequence |
|---|---|---|---|
| P1 | Learner save is 3 independent writes | `saveLessonResult.ts:45-47` | A failure after the first write leaves completion without EXP (or the reverse); a retry re-reads the half-written rows and gives a different outcome. |
| P2 | No idempotency | No submission id anywhere | Any retry inserts another `performance_records` row; an offline queue cannot be made safe. |
| P3 | All protected values come from the browser; RLS + grants allow own-row writes (ruling D14) | `applyResult.ts`, initial migration grants | A user can set any EXP, hearts, streak or completion through the REST API. Documented as an accepted risk in SDD 3.3 [V]. |
| P4 | Lesson gating (SRS 3.1.2.5) is client-only | `curriculum.ts:126-147`, `devAccess.ts` | Locked lessons can be completed by a modified client; `resultDestination` is chosen by the client. |
| P5 | Heart regeneration is client-timed, anchor in `localStorage` | `useHeartRegen.ts` | Not cross-device; clearing storage or a clock change alters regeneration; the server has no record of when regeneration started. |
| P6 | Hearts lost mid-drill are refunded if the tab closes or crashes | T-06 only covers an explicit quit (`LessonPlayer.tsx:155-162`) | SRS 3.1.2.4 "stays lost" is not guaranteed. |
| P7 | Placement writes synthetic mastery and EXP from the browser, guarded only by user-editable `user_metadata` | `supabaseStore.ts:98-124`, `DashboardScreen.tsx:101-108` | Placement could be re-applied to a later unit; placement completions are indistinguishable from real mastery (would feed badges and analytics). |
| P8 | Achievements not implemented; UI shows fake data | §1.2 | SRS 3.1.7.4 unmet; the screen is misleading. |
| P9 | Two EXP rules in code | `runner.ts:184` vs `applyResult.ts:89` | The results screen can show EXP that was never awarded. |
| P10 | Streak "today" is the device's local date | `streak.ts:10-15`, `saveLessonResult.ts:39` | Device-clock or timezone changes alter streaks; two devices can disagree. |
| P11 | Client creates profiles with progression defaults | `AuthContext.tsx:101-117` (DEF-002) | Overwrites progress on some read errors; masks a missing signup trigger. |
| P12 | Offline caching/sync required but absent | SRS 3.3 bullet, SDD C-08 [V] | Requirement unmet (§3, PA-D7). |
| P13 | Hosted database state unknown and insecure | Hosted audit summary [H] | No server-side design is safe until the hosted DB is identified and reconciled. |

---

## 3. Decision table PA-D1…PA-D8

| ID | Question | What the sources say | Recommendation [R] | Consequences | Affected files / tasks |
|---|---|---|---|---|---|
| **PA-D1** | Can an `is_dev` account run ordinary learner sessions? | Code: yes. Destination is decided by lock status at open (`devAccess.ts:39-41`), not by `is_dev`. AUX design: `is_dev` is "access only, never progress". No SRS text. | **Yes.** Keep two separate operations: `submit_lesson_result` (learner) and `submit_dev_test_result` (dev). The server checks **both** the operation and the authorization: the learner op requires the lesson to be **unlocked for this user by server-side rules**; the dev op requires `is_dev = true` at submission. A learner submission for a server-locked lesson is rejected, even from a developer. | Gating (SRS 3.1.2.5) becomes enforced server-side. A developer whose run started on a node that became unlocked mid-run still gets the destination chosen at open (client keeps `resultDestination`); the server only validates. | `devAccess.ts` (unchanged logic), `DashboardScreen.tsx`, new RPCs |
| **PA-D2** | Do dev-test runs spend the shared heart balance? | Code: yes, "so the zero-heart rule still bites" (`devTestResults.ts:1-7,61-70`). | **Preserve: yes.** Same derivation and reconciliation as learner runs; no other progression. | Developers can run out of hearts while testing; they wait for regeneration like learners. A separate developer heart pool would be a product change. | `submit_dev_test_result` |
| **PA-D3** | Replay EXP | SRS 3.1.2.3 "award EXP upon node completion" (ambiguous on replay). SDD C-02: "EXP increment transaction". `applyResult`: first mastery only, with a "Replay saved. EXP is only awarded the first time…" note. `engine.ts` replay bonus: removed. U-04: badge bonuses, `exp-500` evaluated before bonuses, no cascade. | **One rule: EXP = the lesson's `settings.exp` (or `checkpointExp` for checkpoints) exactly once, on the run that first meets the mastery gate. Replays award 0.** Badge `exp_reward` bonuses are added once per badge, per U-04, with no cascade. | Matches the shipped learner behaviour. `runner.ts:184` must stop claiming EXP: rename it or make it a "potential" value; the UI shows only the server's `exp_gained`. | `runner.ts`, `types.ts` (A approves), `LessonResults.tsx`, new RPC |
| **PA-D4** | What placement creates | SRS 3.1.1.4: "set their baseline starting node … across three placement tiers (Novice M1, Proficient M5, Virtuoso M9)". SDD C-01: evaluates the tiers. Nothing requires mastery or EXP. Code: synthetic `completed` rows + EXP raised to `required_exp`, needed because gating also checks EXP (`curriculum.ts:143`). | **Placement unlocks; it never claims demonstrated mastery.** (1) Allowed start units are exactly {1, 5, 9}; once per account (server-recorded `placement_unit`), and only before any lesson-sourced progress. (2) Earlier lessons get progress rows marked `source = 'placement'`, `completed = true`, accuracy/posture 0, `completed_at` null. (3) EXP is raised to the start lesson's `required_exp`; the raise is recorded separately (`placement_exp`) so "earned EXP" excludes it. (4) **No** performance records, **no** streak/activity, **no** achievements. `first-lesson` and mastery badges count only `source = 'lesson'`; `exp-500` uses earned EXP (`exp − placement_exp`). | Gating keeps working unchanged. Analytics and badges stay honest. Needs `user_progress.source` and two profile columns. Replaces `user_metadata.placement` as the "already placed" check. | `placement.ts`, `supabaseStore.ts`, `DashboardScreen.tsx`, `PlacementModal.tsx` (unchanged UI), new RPC + migration |
| **PA-D5** | Trust in client-measured metrics | Constraints force client-side measurement (SPMP §2.1.2, SRS 3.5.1: media never leaves the device). The server therefore **cannot** verify that a drill was passed, nor any pitch, rhythm or posture value. | **Accept outcomes as client-asserted; derive everything else server-side.** Progression inputs (unverified but required): per-exercise `passed` and attempt order → accuracy, mastery, completion, EXP; per-drill `heartsLost` (bounded). Achievement inputs: `posture-stable` uses this run's posture score (unverified, accepted). Stored as **observations only**: `pitch_accuracy`, `rhythm_consistency`, `posture_score`, `drill_duration_sec`, `score`. **No stronger verification required for this project.** Document plainly: the RPC stops direct value tampering, replays and malformed submissions; it does **not** stop a modified client from claiming a pass. | Honest security claim for the defence. Metrics stay range-checked (0–100) and bounded (duration ≤ 4 h). | SDD 3.3 wording (T-26), T-20 report |
| **PA-D6** | Streak timezone | SRS 3.1.2.2: "daily lesson activity", no timezone. SDD: `last_activity_date` is a `date`. Code: device local date. Team and expected users are in the Philippines (UTC+8, no DST). | **Fixed `Asia/Manila` for the server's "today"**, as one server constant; the dashboard's `displayedStreak` must use the same zone (server returns `today`). Upgrade path: a per-profile IANA timezone later. | Identical to today's behaviour for Philippine users; consistent across devices; not manipulable by the device clock. Users elsewhere see the day roll over at Manila midnight (documented limitation). | `streak.ts` (client display), new RPCs |
| **PA-D7** | Is offline submission required? | **Yes, required.** SRS §3.3 reliability: "shall cache active user progress locally in IndexedDB or localStorage during unexpected connection loss and synchronize with the database once connectivity is restored" [V]. SDD C-08 specifies a `SyncQueueItem {endpoint, payload, retryCount, timestamp}` queue flushed with exponential backoff [V]. SPMP scope lists "local caching and progress synchronization" [V]. | **Keep it as a requirement.** Build it **after** the idempotent RPC (the queue stores the exact RPC arguments, including the submission id). Deferring it is a scope change: it needs a change-control ruling (SPMP 3.3) and an SRS/SDD note, not a silent cut. | T-13 13.3 is unblocked once `submit_lesson_result` exists. If cut, record "SRS §3.3 not met" in the T-26 documents. | C's T-13, T-23 E2E-23/26/27 |
| **PA-D8** | Heart regeneration rules | SRS 3.1.2.4: one point every 15 minutes, or immediately on ≥ 80 % theory. SDD C-02: same, max 5; theory replay can restore again (ruling D10); no restore on quit. "Passively" plus the current implementation (persisted anchor) imply regeneration continues while the app is closed. | **Confirm: +1 heart per full 15 minutes since a server-stored anchor, cap 5, continues while closed; anchor cleared at 5 and started when hearts drop below 5.** Reconciled by the server inside every heart-touching operation under a row lock (§6). | The client stops writing hearts; the countdown is display-only from the server's `next_heart_at`. Existing users' anchors start at migration time (PA-D14). | `useHeartRegen.ts`, `heartRegen.ts` (kept for display), `supabaseStore.ts`, new RPC + column |

### Additional decisions found during the investigation

| ID | Question | Recommendation [R] | Why it needs approval |
|---|---|---|---|
| **PA-D9** | Add a `start_lesson` server attempt? | **Defer.** Evidence for it exists: tab-close refunds hearts (P6), the 0-heart rule cannot be enforced server-side without knowing hearts at start, and `durationSec` is unbounded. But it adds an attempts table, abandonment cleanup, and an online requirement to start a lesson, at least 1–2 more days. Record P6 and "0-heart gate is client-side" as residual risks. | Changes what the system can claim about SRS 3.1.2.4 |
| **PA-D10** | Ruling D14: retain or reverse | **Staged reversal.** Stage A ships the RPCs with today's grants (D14 still in force); Stage B revokes direct client writes once Stage A is verified (§9). The team can stop after Stage A and keep D14 documented. | It was a team ruling |
| **PA-D11** | PostgreSQL RPC or Edge Function | **PostgreSQL `SECURITY DEFINER` functions.** One transaction per call, no new deploy pipeline, testable with the existing PGlite harness (`supabase/__tests__/harness.ts`). Cost: the runner rules are reimplemented in SQL, so drift is controlled by parity tests over all 59 lessons (§10). An Edge Function could reuse `runner.ts` directly, but needs Deno bundling and a CLI deploy flow the team does not use (`docs/ENVIRONMENTS.md`: migrations by hand). | Architecture choice |
| **PA-D12** | Theory heart restore: run-local or profile hearts | **Profile hearts.** The runner restores when the *run's* hearts < 5 (`runner.ts:170-171`); the server applies the restore when the *reconciled profile* hearts after the run's losses are < 5. They differ only when regeneration happened during the lesson. | Small behaviour change |
| **PA-D13** | Where achievements are evaluated | **Inside `submit_lesson_result`**, using the U-04 rules, so the award is atomic with the progress that earns it. B's T-11 changes from "client evaluates + inserts" to "UI reads `user_achievements`". | Reassigns B's T-11 |
| **PA-D14** | Regeneration anchor for existing profiles at migration | **Anchor = migration time for every profile with hearts < 5.** Partial periods earned before are lost once (at most 15 min of regeneration). | Visible to existing users |
| **PA-D15** | The hosted DB's hand-added `profiles.last_heart_update` | **Do not reuse it blindly.** Its semantics and values are unknown (not in any migration). Add an explicit `hearts_regen_anchor` column through a migration; decide during hosted reconciliation (U-29) whether `last_heart_update` is migrated, dropped or kept. | Hosted-DB data decision |

---

## 4. Recommended progression architecture

```
Browser (unchanged)                          Supabase (new)
-------------------                          --------------
LessonPlayer + runner.ts  ── run state ──►   (nothing until the run ends)
buildLessonResult (display only)
        │
        │ submission = { submission_id, lesson_id, status, records[], quit_hearts_lost, duration_sec }
        ▼
saveRunResult ── learner ──► rpc submit_lesson_result ──┐   one transaction:
             └─ dev-test ──► rpc submit_dev_test_result ─┤   lock profile row → idempotency check →
Placement modal ───────────► rpc submit_placement ───────┤   reconcile hearts → validate against lessons.payload →
Dashboard load / countdown ► rpc sync_passive_hearts ────┘   derive → write all rows → record submission → return
        │
        ▼
Offline outbox (T-13): stores the exact RPC arguments; replays them; same submission_id ⇒ same result
```

Principles:
1. **The client submits what happened, not what to award.** Per-exercise outcomes in run order; never EXP, streak, new hearts, completion, or badges.
2. **The server derives every protected value** from `lessons.payload` (which already carries resolved `settings.passMark`, `exp`, `checkpointExp`, `rhythmFailHeartCost`, `isCheckpoint` and the exercise list [V: `seed.sql`]), the user's current rows, and the clock.
3. **One transaction per operation**, serialised per user by locking that user's `profiles` row.
4. **Every mutating operation is idempotent** by a client-generated submission id.
5. **Learner and developer-test operations are separate functions** with separate authorization.
6. **Measurements are observations** (PA-D5).

---

## 5. Learner and developer-test flows

| | Learner run | Developer test run |
|---|---|---|
| Opened when | Node is unlocked (`canOpenLesson`, not locked) | Node is locked and `is_dev` (client decides at open, `resultDestination`) |
| Operation | `submit_lesson_result` | `submit_dev_test_result` |
| Server authorization | Authenticated; lesson **unlocked for this user by server rules** (or already mastered) | Authenticated; `profiles.is_dev = true` at submission; any lesson |
| Hearts | Derived and applied (PA-D8, PA-D12) | Derived and applied (PA-D2) |
| Progress, EXP, streak, achievements, performance record | Yes, as derived | **Never** |
| Writes | `user_progress`, `performance_records`, `profiles`, `user_achievements`, `progression_submissions` | `dev_test_results`, `profiles.hearts` / anchor, `progression_submissions` |
| Wrong-operation protection | A learner submission for a server-locked lesson → `MUZ_LESSON_LOCKED` | A non-developer → `MUZ_NOT_DEVELOPER` (fails closed; the run is not converted into learner progress) |

---

## 6. Hearts model

**Stored state (per profile):** `hearts` (0–5), `hearts_regen_anchor timestamptz null` (null exactly when `hearts = 5`).

**Internal reconcile step** (run first inside every operation that reads or changes hearts, after `SELECT … FOR UPDATE` on the profile):
1. If `hearts = 5`: anchor ← null.
2. Else if anchor is null: anchor ← `now()` (defensive; should not happen after migration).
3. Else: `n = floor((now() − anchor) / 15 min)`; `hearts ← min(5, hearts + n)`; anchor ← `hearts = 5 ? null : anchor + n × 15 min`.

**Derived change for a submitted run** (never a client-supplied delta):
- `practice_loss = Σ heartsLost` over practice records. Each value is an integer 0…5, and the sum is capped at the reconciled hearts.
- `rhythm_loss = (number of failed rhythm records) × settings.rhythmFailHeartCost` (0 in every tier today [V]).
- `quit_loss = quit_hearts_lost` (0…5; only when status = `quit`; T-06's unreported in-drill losses).
- `hearts ← max(0, hearts − practice_loss − rhythm_loss − quit_loss)`.
- Theory restore: if status ≠ `quit`, server `theory_score ≥ 80`, and `hearts < 5` → `hearts + 1` (PA-D12; replays may restore again, ruling D10).
- Anchor update: if hearts went from 5 to below 5 → anchor ← `now()`; if hearts reached 5 → null; otherwise unchanged.

**Concurrency.** Every heart-touching operation (`submit_lesson_result`, `submit_dev_test_result`, `sync_passive_hearts`, `submit_placement`) starts with the same row lock. Two tabs, a lesson save and a countdown sync therefore apply in sequence, each on the other's committed result. No compare-and-set is needed in the client.

**Known limits (documented, not solved):** per-drill `heartsLost` is reported by the client's drill state machine (PA-D5). Closing the tab mid-drill still refunds (PA-D9). The 0-heart rule for starting practice stays client-side (PA-D9).

---

## 7. RPC contracts

Common to all four functions:
- **Language / security:** PL/pgSQL, `SECURITY DEFINER`, owner `postgres`, `SET search_path = ''` with every object schema-qualified.
- **Identity:** the user is always `auth.uid()`. No function takes a user id parameter. If `auth.uid()` is null → error `MUZ_NOT_AUTHENTICATED`.
- **Grants:** `REVOKE ALL ON FUNCTION … FROM PUBLIC, anon`; `GRANT EXECUTE … TO authenticated`.
- **Errors:** `RAISE EXCEPTION` with a stable code in `HINT` (listed per function) so the client and the offline queue can classify **retryable** (network, 5xx, `40001`/`40P01` serialization or deadlock) vs **permanent** (every `MUZ_*` code) vs **already applied** (a normal response with `replayed = true`).
- **Transaction:** the whole function body is one transaction. Any error rolls back every write, including the submission record.
- **`is_dev` guard compatibility:** none of these functions writes `profiles.is_dev`. The guard trigger (`20261120000000_profiles_is_dev.sql`) keeps it unchanged even when called with an end-user JWT [V design §2.2 note].

### 7.0 Idempotency ledger (new table, used by 7.1–7.3)

`public.progression_submissions`

| Column | Type | Rule |
|---|---|---|
| `id` | `uuid` | **Primary key** = the client's submission id (the uniqueness constraint) |
| `user_id` | `uuid not null` | FK `profiles(id)` on delete cascade; always `auth.uid()` |
| `kind` | `text not null` | `'lesson' \| 'dev_test' \| 'placement'` (check) |
| `lesson_id` | `text null` | FK `lessons(id)`; null for placement |
| `request_hash` | `text not null` | SHA-256 (hex) of the canonical `jsonb` of all request parameters except the id |
| `result` | `jsonb not null` | The exact response returned the first time |
| `created_at` | `timestamptz not null default now()` | |

RLS enabled, **no policies, no table grants**: reachable only through the functions.

**Idempotency rules**
1. **Unique identifier:** `p_submission_id uuid`, generated once per run in `createLessonRun` (C's T-13 13.1 `runId`). For placement, generated once when the modal opens. The same id is used on every retry and by the offline queue.
2. **Constraint:** primary key on `progression_submissions.id`.
3. **Concurrent duplicates:** the function locks the caller's `profiles` row **before** looking up the id, so a second concurrent call with the same id waits, then finds the committed submission and replays it. If a duplicate still reaches the insert (e.g. a different user with a colliding id), `INSERT … ON CONFLICT (id) DO NOTHING` returns no row; the function re-reads and applies rules 4–6.
4. **Identical retry** (same id, same user, same `request_hash`) → return the stored `result` with `"replayed": true`. No write of any kind.
5. **Reused id, different payload** (same user, different hash) → `MUZ_IDEMPOTENCY_CONFLICT`, permanent.
6. **Id owned by another user** → `MUZ_IDEMPOTENCY_CONFLICT` (the same error, so another user's result is never revealed).
7. **Atomicity:** the ledger row is inserted in the same transaction as the progression writes. Either both commit or neither does.
8. **Rejections are not recorded.** A rejected call (e.g. `MUZ_LESSON_LOCKED`) can succeed later once state changes, so it must not poison the id.

### 7.1 `submit_lesson_result` (learner)

| Field | Contract |
|---|---|
| **Purpose** | Apply one finished or quit learner run atomically: hearts, activity/streak, progress, EXP, performance record, achievements. |
| **Authentication** | Authenticated JWT (`auth.uid()` not null). |
| **Authorization** | The lesson must be unlocked for the caller by the server's port of `nodeStatus` (`curriculum.ts:126-147`): previous module complete, previous node complete, `exp ≥ required_exp`. Or the caller has already mastered it (a replay). Otherwise `MUZ_LESSON_LOCKED`. `is_dev` gives **no** bypass here (PA-D1). |
| **Input** | `p_submission_id uuid` · `p_lesson_id text` · `p_status text` ∈ {`finished`, `quit`} (the server decides passed/failed/out-of-hearts itself) · `p_records jsonb`: array, in run order, of `{ "exercise_id": text, "attempt": int ≥ 1, "passed": bool, "score": number 0–1, "hearts_lost": int 0–5 (practice only, else 0), "metrics": { "pitch_accuracy"?: 0–100, "rhythm_consistency"?: 0–100, "rhythm_accuracy"?: 0–100, "posture_score"?: 0–100 } }` (max 500 records) · `p_quit_hearts_lost int` 0–5 (must be 0 unless `quit`) · `p_duration_sec int` 0–14 400 |
| **Output** (`jsonb`) | `{ "submission_id": uuid, "replayed": bool, "lesson_id": text, "status": "passed"\|"failed"\|"out-of-hearts"\|"quit", "passed": bool, "accuracy": number, "theory_score": number\|null, "mastered": bool, "completed_now": bool, "exp_gained": int, "exp": int, "hearts": int, "heart_restored": bool, "hearts_regen_anchor": timestamptz\|null, "next_heart_at": timestamptz\|null, "current_streak": int, "last_activity_date": date, "today": date, "new_achievements": [{ "id": text, "title": text, "exp_reward": int }], "note": text\|null }` |
| **Server-side validation** | (1) Lesson exists. (2) Every `exercise_id` exists in `lessons.payload.stages[].exercises[]`. (3) Attempts per exercise are contiguous from 1; attempt > 1 only for a graded exercise that failed its previous attempt, outside the review stage (re-queue rule, `runner.ts:98-103`); review-stage exercises appear at most once. (4) Order respects stage order: no record of stage *k+1* before every graded exercise of stage *k* has a passed record (non-checkpoint lessons). (5) `hearts_lost > 0` only on practice exercises. (6) Ranges as in the input row. (7) `finished` requires every exercise to be accounted for **or** the run to have stopped at a practice exercise with derived hearts = 0 (that is the `out-of-hearts` case). Any failure → `MUZ_RECORDS_INVALID` (permanent). |
| **Derivation** | Accuracy = first-try graded pass share (`runner.ts:163-164`, 100 if passed with no graded exercises). `theory_score` per `runner.ts:166-167`. Passed: normal = finished with every graded exercise passed; checkpoint = graded pass share ≥ `settings.passMark` (`runner.ts:139-147`). Mastered = passed ∧ accuracy ≥ passMark (`gate.ts`). Hearts per §6. Quit → hearts only. Otherwise: `last_activity_date` ← today (Asia/Manila), streak per `streak.ts:28-34`, progress row upsert (`completed = was ∨ mastered`, best accuracy, best posture if practice ran, `completed_at` on first mastery, `source = 'lesson'`). EXP + reward if `completed_now` (PA-D3). Performance record if a rhythm or practice record exists. Achievements per U-04 (PA-D4 exclusions), bonuses added, no cascade. |
| **Tables read** | `profiles` (row-locked), `lessons`, `user_progress`, `achievements`, `user_achievements`, `progression_submissions` |
| **Tables written** | `profiles` (`hearts`, `hearts_regen_anchor`, `exp`, `current_streak`, `last_activity_date`), `user_progress`, `performance_records` (with `submission_id`), `user_achievements`, `progression_submissions` |
| **Transaction** | Single function transaction: lock → ledger check → reconcile → validate → derive → writes → ledger insert → return. |
| **Idempotency** | §7.0, `kind = 'lesson'`. |
| **Failure cases** | `MUZ_NOT_AUTHENTICATED`; `MUZ_PROFILE_MISSING` (no profile row: the signup trigger is the owner, U-31); `MUZ_LESSON_NOT_FOUND`; `MUZ_LESSON_LOCKED`; `MUZ_RECORDS_INVALID` (including content changed since the run started); `MUZ_IDEMPOTENCY_CONFLICT`; retryable DB errors (`40001`, `40P01`, connection). |
| **Grants** | `EXECUTE` to `authenticated` only. |
| **Tests** | §10: parity with `runner.ts` + `applyResult.ts` for all 59 lessons; first-mastery EXP once; replay EXP 0; replay theory restore; quit = hearts only; locked lesson rejected (dev too); records validation cases; identical retry → same JSON, no extra rows; changed payload under the same id rejected; another user's id rejected; forced failure → nothing written; two parallel calls → one application (staging); streak at Manila 23:59 / 00:01. |

### 7.2 `submit_dev_test_result` (developer)

| Field | Contract |
|---|---|
| **Purpose** | Record a developer's test run as test data and apply only its hearts change (PA-D2). |
| **Authentication** | Authenticated JWT. |
| **Authorization** | `profiles.is_dev = true` for `auth.uid()`, read under the row lock. Else `MUZ_NOT_DEVELOPER`. No lock-status requirement. |
| **Input** | Same as 7.1 (`p_submission_id`, `p_lesson_id`, `p_status`, `p_records`, `p_quit_hearts_lost`, `p_duration_sec`). |
| **Output** | `{ "submission_id", "replayed", "lesson_id", "status", "passed", "accuracy", "theory_score", "hearts", "heart_restored", "hearts_regen_anchor", "next_heart_at", "note": "Developer test run: saved as test data…" }` |
| **Validation** | Same record validation as 7.1. |
| **Derivation** | Same status / accuracy / theory / hearts derivation as 7.1. Nothing else. |
| **Tables read** | `profiles` (locked), `lessons`, `progression_submissions` |
| **Tables written** | `profiles` (`hearts`, `hearts_regen_anchor` only), `dev_test_results` (with `submission_id`), `progression_submissions` |
| **Transaction / idempotency** | As 7.1, `kind = 'dev_test'`. Hearts and test row commit together (fixes P1 for this path). |
| **Failure cases** | 7.1's list, with `MUZ_NOT_DEVELOPER` instead of `MUZ_LESSON_LOCKED`. |
| **Grants** | `EXECUTE` to `authenticated`. The existing `dev_test_results` insert policy becomes redundant once direct inserts are revoked (Stage B). |
| **Tests** | Non-developer rejected; developer writes no `user_progress` / `performance_records` / EXP / streak / badges; hearts derived the same as 7.1; idempotency; `is_dev` revoked between runs → rejected. |

### 7.3 `submit_placement`

| Field | Contract |
|---|---|
| **Purpose** | Apply the onboarding self-assessment once (PA-D4). |
| **Authentication** | Authenticated JWT. |
| **Authorization** | `profiles.placement_unit` is null **and** no `user_progress` row with `source = 'lesson'` exists. Else `MUZ_PLACEMENT_ALREADY_SET` (or `MUZ_PLACEMENT_AFTER_PROGRESS`). |
| **Input** | `p_submission_id uuid`, `p_start_unit int` ∈ {1, 5, 9} (else `MUZ_PLACEMENT_INVALID`) |
| **Output** | `{ "submission_id", "replayed", "placement_unit": int, "exp": int, "placement_exp": int, "lessons_unlocked": int }` |
| **Derivation** | Port of `placementPlan` (`placement.ts:34-49`) using the `lessons` table: placement rows for every lesson with `module_index < start_unit` (`source = 'placement'`, `completed = true`, accuracy/posture 0, `completed_at` null); `placement_exp = max(0, first lesson of start_unit.required_exp − exp)`; `exp += placement_exp`; `placement_unit = start_unit`. Unit 1: only `placement_unit = 1`. |
| **Tables read / written** | Read `profiles` (locked), `lessons`, `user_progress`, `progression_submissions`; write `profiles` (`placement_unit`, `placement_exp`, `exp`), `user_progress`, `progression_submissions`. |
| **Transaction / idempotency** | As 7.0, `kind = 'placement'`. |
| **Failure cases** | `MUZ_NOT_AUTHENTICATED`, `MUZ_PROFILE_MISSING`, `MUZ_PLACEMENT_INVALID`, `MUZ_PLACEMENT_ALREADY_SET`, `MUZ_PLACEMENT_AFTER_PROGRESS`, `MUZ_IDEMPOTENCY_CONFLICT`. |
| **Grants** | `EXECUTE` to `authenticated`. |
| **Tests** | Each tier matches `placementPlan`; second placement rejected; placement after a real lesson rejected; no performance records, streak or badges; `first-lesson` not awarded by placement; `exp-500` ignores `placement_exp`. |

### 7.4 `sync_passive_hearts`

| Field | Contract |
|---|---|
| **Purpose** | Apply regeneration that is due and return the authoritative heart state for the countdown (PA-D8). |
| **Authentication** | Authenticated JWT. |
| **Authorization** | Own profile only (implicit through `auth.uid()`). |
| **Input** | None. |
| **Output** | `{ "hearts": int, "hearts_regen_anchor": timestamptz\|null, "next_heart_at": timestamptz\|null, "server_now": timestamptz }` |
| **Validation** | None beyond authentication. |
| **Tables read / written** | `profiles` (locked; `hearts`, `hearts_regen_anchor`). |
| **Transaction** | Lock → reconcile (§6) → update only if changed → return. |
| **Idempotency** | Naturally idempotent: a deterministic function of stored state and time. No submission id. Concurrent calls serialise on the row lock; the second sees no due period. |
| **Failure cases** | `MUZ_NOT_AUTHENTICATED`, `MUZ_PROFILE_MISSING`. |
| **Grants** | `EXECUTE` to `authenticated`. |
| **Tests** | Parity with `regenStep` (`heartRegen.ts`) across boundaries (14:59, 15:00, 45:00, cap at 5); anchor cleared at 5; no gain before 15 min; client clock irrelevant (`server_now` used). |

### 7.5 Profile creation (no RPC)

Profiles are created only by the signup trigger `handle_new_user` (initial migration). The client `upsert` (W5, DEF-002) is removed. A missing profile is a server defect (`MUZ_PROFILE_MISSING`), reported by the UI (Member D's T-15 states) [U-31].

---

## 8. Security requirements and environment separation

**What the hosted audit reported [H, from the summary provided]:** RLS enabled but not forced on all six tables; `profiles` with permissive public INSERT/SELECT/UPDATE; no policies on the other five; broad `anon`/`authenticated` grants; schema not matching the migrations; `profiles.is_dev` absent. `20261119120000_profiles_rls_hardening.sql` exists and is merged, but **its application to the hosted DB is not verified**. Nothing in this document assumes the hosted DB is secure or synchronised.

**Target permissions after Stage B (D14 reversed)**

| Object | `anon` | `authenticated` |
|---|---|---|
| `profiles` | none | `SELECT` own row; `UPDATE (username)` own row only; no `INSERT`/`DELETE` |
| `lessons`, `achievements` | none | `SELECT` |
| `user_progress`, `performance_records`, `user_achievements`, `dev_test_results` | none | `SELECT` own rows only |
| `progression_submissions` | none | none |
| The four functions | no `EXECUTE` | `EXECUTE` |

In Stage A, the current grants (repository intent, ruling D14) stay unchanged.

**Environments (never mixed)**

| Environment | Use in this plan | Rule |
|---|---|---|
| **E1 fresh isolated staging** (new project, Path A in C's T-05) | Where Stages A and B are first applied and tested | All repository migrations in timestamp order, then the new ones; T-05 verification checklist V1–V10 must pass first |
| **E2 the audited hosted project (`Muz-Database`)** | Nothing is applied until its role is recorded (U-22) and a reconciliation plan is approved (U-29) | Backup first; read-only diff; **no `db push`, no `migration repair`, no `db reset`, no corrective SQL against an unidentified environment**; F2 timing per U-26 |
| **E3 production** (if different) | Receives the same migration list only after E1 sign-off | Recommended: a fresh project built from migrations (U-06), not a promoted E2 |

---

## 9. Migration and rollout plan (not executed)

| Step | Content | Environment | Gate before the next step |
|---|---|---|---|
| 0 | Decide U-22, U-28, U-06; approve this document (PA-D1…PA-D15) | — | Recorded decisions |
| 1 | **M1 (additive schema):** `progression_submissions`; `profiles.hearts_regen_anchor`, `placement_unit`, `placement_exp`; `user_progress.source` (default `'lesson'`, existing rows `'lesson'` unless placement-derived, PA-D4); `performance_records.submission_id` and `dev_test_results.submission_id` (unique, nullable); anchor backfill (PA-D14) | E1 | PGlite tests + T-05 checklist |
| 2 | **M2 (functions):** the four RPCs + grants | E1 | §10 tests green, including parity |
| 3 | **Client Stage A:** `saveRunResult`, placement and regeneration call the RPCs; client keeps `runner.ts` for the UI only; `expAwarded` fixed (PA-D3); profile upsert removed (W5) | E1 (Vercel preview) | T-23 E2E-25…31 on E1 |
| 4 | **Offline outbox (T-13 13.3)** over `submit_lesson_result` | E1 | T-13 manual steps 3–7 |
| 5 | **M3 (Stage B, permissions):** revoke direct client writes (§8 table) | E1 | T-20 against the approved matrix; old client confirmed retired |
| 6 | E2 reconciliation per the approved plan, then M1–M3 | E2 (only if U-28 keeps it) | Backup; V1–V10; T-20 |
| 7 | Production: migrations in order, deploy client | E3 | Release go/no-go (guide §4.7) |

**Rollback:** M1 is additive (drop the new objects). M2: drop functions; the client falls back to the Stage A-disabled build. M3: re-grant the previous privileges (restores D14 behaviour). Never roll back by editing data in place.

**Stopping points:** after step 3 the system is atomic and idempotent but still D14-trusting. After step 5 it is server-authoritative. Both are consistent end states.

---

## 10. Test plan (for the implementation, when approved)

| Layer | Tests |
|---|---|
| PGlite (existing harness) | Every function contract test in §7; ledger rules 1–8; grants (anon cannot execute; after M3 authenticated cannot write tables); `SECURITY DEFINER` search-path safety |
| Parity (TS vs SQL) | For all 59 seeded lessons, generated outcome sequences (all pass, first-try fails, checkpoint fail, quit mid-drill, out-of-hearts): `buildLessonResult` + `applyResult` + `nextStreak` vs `submit_lesson_result` output |
| Concurrency (E1, two parallel HTTP calls) | Same submission id twice → one application; lesson save + `sync_passive_hearts` at a period boundary → hearts correct |
| Client unit | Submission building (records only), result classification (retryable / permanent / replayed), outbox replay |
| E2E (T-23) | E2E-25…31 from the revised Member C guide |
| Security (T-20) | The §8 matrix, anon + cross-user + own-row + grants |

---

## 11. Decisions (approved 2026-11-21)

All 16 rows below were approved as the recommended default on 2026-11-21. Row 16 is approved as a **conditional rule**: option (a) if fresh staging (E1) exists by Mon 2026-11-23, otherwise option (c) with a recorded ruling. Trade-offs are in §3.

| # | Decision | Approved outcome |
|---|---|---|
| 1 | Approve the architecture direction (PostgreSQL RPCs, PA-D11) | Approve |
| 2 | PA-D1 developer vs learner | Separate operations; server enforces lock + `is_dev` |
| 3 | PA-D2 developer hearts | Keep spending the shared balance |
| 4 | PA-D3 replay EXP | First mastery only; badge bonuses per U-04 |
| 5 | PA-D4 placement | Unlock-only rows (`source = 'placement'`), EXP raise tracked separately, no badges/analytics/streak |
| 6 | PA-D5 metric trust | Accept client-asserted outcomes; metrics are observations; state the limit in SDD 3.3 |
| 7 | PA-D6 streak timezone | Fixed `Asia/Manila` |
| 8 | PA-D7 offline | Required; build after the RPC; any deferral needs a ruling |
| 9 | PA-D8 hearts | Confirm 15 min / max 5 / continues while closed; server anchor |
| 10 | PA-D9 `start_lesson` | Defer; record residual risks |
| 11 | PA-D10 D14 | Staged: Stage A then Stage B |
| 12 | PA-D12 theory restore basis | Profile hearts |
| 13 | PA-D13 achievements | Evaluated inside the lesson RPC; T-11 becomes read-only UI |
| 14 | PA-D14 anchor backfill | Anchor = migration time |
| 15 | PA-D15 hosted `last_heart_update` | Decide during hosted reconciliation; do not reuse blindly |
| 16 | Schedule (U-30) | Estimate: M1 + M2 + parity tests ≈ 2–3 days; client Stage A ≈ 1 day; outbox ≈ 1 day; Stage B + T-20 ≈ 1 day. **This does not fit before the Fri 2026-11-27 release alongside T-19…T-24.** Choose: (a) ship Stage A only, D14 documented; (b) slip the release; (c) ship the current client path with D14 and P1/P2 documented as known defects. Recommended: **(a)** if staging (E1) can exist by Mon 11-23; otherwise **(c)**, with a ruling. |
