# Member C Execution Guide: Rosales (Backend / Infrastructure / Audio Support)

> **Self-contained.** This guide covers everything C needs. Task IDs match `docs/audit/TASK_DECOMPOSITION.md`. Days are relative working days: D1 is the first day after the plan is accepted. Calendar due dates are in `docs/decisions/T-02_VERIFICATION_PLAN_HANDOFF.md` §E.2 and take precedence over the D-days below.
>
> **Repo facts verified 2026-11-16:**
> - Node v22 locally.
> - Scripts: `npm test` (= `vitest run`), `npm run build` (= `tsc -b && vite build`), `npm run dev` (port 5173), `npm run preview` (port 4173), `npm run seed:lessons`, `npm run seed:lessons:check`, `npm run typecheck:seed`.
> - Typecheck: `npx tsc -p tsconfig.json`. One test file: `npx vitest run <path>`.
> - The test environment is Node (no jsdom).
> - `idb` 8.0.4 is installed. `fake-indexeddb` is **not** installed (and U-09 says it will not be).
> - No `gh` CLI: open PRs at `https://github.com/markuu-exe/MUZ`.
> - Jira was read from the CSV export only; the Atlassian connector was unavailable.
>
> **Re-verified 2026-11-21 against `origin/main` @ `e96c34c`** (these supersede the 2026-11-16 facts where they differ):
> - `.github/workflows/ci.yml`, `vercel.json`, `scripts/check-bundle-size.mjs`, `src/lib/supabase/config.ts` (env guard) and `docs/ENVIRONMENTS.md` exist on `main` (T-05 code part, PR #30).
> - `src/audio/notes/PitchVerifier.ts` exists on `main` (T-07, commit `372f1d7`; wired by T-08, PR #31).
> - `main` has four migrations: `20260509120000_initial_schema.sql`, `20261119120000_profiles_rls_hardening.sql` (F2, merged in PR #33 with PGlite database tests and the dev dependency `@electric-sql/pglite`), `20261120000000_profiles_is_dev.sql`, and `20261121000000_dev_test_results.sql` (developer test results: a **seventh table**, `dev_test_results`). None of them is recorded as applied to the hosted project.
> - Client write paths to progression data on `main` are listed in §C.0 below.

---

## Revision notice: hosted security audit (2026-11-21)

This revision reconciles the guide with two audits and with the decisions recorded on `main`:

1. **Hosted Supabase security audit** of the hosted project named **`Muz-Database`**. Findings relevant to C:
   - Neither repository migration appears in the remote migration history.
   - All six expected tables exist (the repository has since added a seventh, `dev_test_results`, after the audit), but the schema is **not** equivalent to the repository migrations: `profiles.is_dev` is missing; expected indexes and constraints are incomplete; the expected auth/profile triggers are missing (or not present under the trigger filters used); existing functions differ from the migration definitions.
   - `profiles` has three policies granted to `{public}`: SELECT `USING true`, INSERT `WITH CHECK true`, UPDATE with unrestricted row conditions. **Anonymous callers can therefore read, insert and update any profile row**, not only read it (the 2026-11-17 finding covered reads only; anonymous writes had not been tested).
   - Broad table privileges are granted to both `anon` and `authenticated` on all six tables.
   - The other five tables have **no policies**.
2. **Application dependency audit:** progression (lesson completion, performance records, EXP, hearts, streaks, achievements) is calculated in the browser and written through several separate client paths (§C.0). The intended direction is a **trusted backend progression operation** (an RPC or Edge Function) that validates and applies all of these atomically. **That architecture is not approved yet.**

**What this revision does not do.** It does not approve any architecture, invent any RPC/Edge Function contract or SQL, or decide whether `Muz-Database` is staging or production. Where a task depends on one of those, the dependent part is marked **BLOCKED** and names the decision. Decision IDs `U-22`…`U-37` are **proposed** in `docs/execution/SECURITY_AUDIT_GUIDE_REVISION.md` §3 for A to add to the decision register.

> **Decision update 2026-11-21: read this first.** The project owner approved `docs/audit/PROGRESSION_ARCHITECTURE_DECISION.md` and the defaults in `docs/audit/CONSOLIDATED_HANDOFF.md` §2. Team ratification under SPMP 3.3 (X8) is still pending. Wherever this guide says "BLOCKED on" one of the IDs below, read the outcome instead. The §B status column has been updated; task bodies keep their original wording, so use this table to interpret them.
>
> | ID | Outcome | Effect on your tasks |
> |---|---|---|
> | U-22 | `Muz-Database` = **shared dev with real user data**: not staging, not production | Never test destructively on it |
> | U-28 | **Fresh isolated staging (E1)**, Path A only. Path B and U-29 are not used for now. | T-05 Part 2 is READY |
> | U-26 | F2 is applied to `Muz-Database` after a backup **and** a test on E1 | F2 step 6 is READY once E1 exists |
> | U-33 | **A applies** migrations on hosted projects; you prepare | Unchanged rule 2 |
> | U-34 | Apply `is_dev` and `dev_test_results` on E1 with the other migrations | T-05 Path A step 2 |
> | U-06 | Production = a **fresh project** built from the migrations | T-25 support |
> | U-27 | **SEC-01: you write, A reviews.** T-28 (the RPCs): A writes, **you review** | New review duty for T-28 only |
> | U-23 / U-24 | PostgreSQL `SECURITY DEFINER` RPCs; contracts in the architecture document §7; idempotency ledger §7.0 | T-13 13.3 binds to `submit_lesson_result`; the submission id is 13.1's `runId`, so 13.1 is approved by the architecture |
> | D14-R | **Staged:** Stage A keeps today's grants (ruling D14 still in force); Stage B revokes direct writes, after release unless time allows | T-20 tests the **Stage A matrix** first (own-row progression writes listed as the D14 limitation, dated 2026-11-21) |
> | U-30 | Schedule rule: (a) Stage A ships if E1 exists by **Mon 11-23**; otherwise (c) the current path ships with D14 and the non-atomic/no-idempotency defects documented by a ruling | Under (c), T-13 13.3 and the † rows of T-23 become `n/a` with the ruling ID |
> | PA-D7 | Offline sync is **required** (SRS §3.3, SDD C-08); deferring it needs a ruling | T-13 is not optional |

**Status labels used below**

| Label | Meaning |
|---|---|
| **READY** | Can start now with existing approvals |
| **PARTLY DONE** | Some acceptance criteria are already met on `main` (evidence named) |
| **AWAITING APPROVAL** | Fully specified; waits only for a named person's yes |
| **BLOCKED** | Cannot be finalised until a named decision or task is complete. Do not guess the missing part. |

**Environment safety rules (apply to every task in this guide)**

1. Do not run any SQL, migration, `supabase db push`, `supabase db reset`, policy change or grant change against `Muz-Database` (or any hosted project) unless A has approved that specific action in writing **and** the project's role (staging / production) has been recorded (U-22).
2. `docs/ENVIRONMENTS.md` on `main` says migrations and seed on the hosted project are applied **by A only**. Where this guide says "apply", it means "prepare, and hand to A to apply", unless A delegates the step to you in writing for that environment (U-33).
3. Read-only inspection (catalog queries, REST reads with the publishable key) is allowed on an identified environment. Never print row values from real users' profiles into the repo, a PR or chat.
4. Never put project refs, keys, passwords or connection strings in the repo.

---

## A. Role overview

| Item | Detail |
|---|---|
| Role | Backend and infrastructure developer, with audio support |
| Ownership areas | CI and hosting config (`.github/workflows/`, `vercel.json`, `scripts/check-bundle-size.mjs`, `scripts/rls-check.ts`), Supabase staging and production setup (preparation; A applies on hosted projects), `supabase/migrations/**` proposals (A approves), the `src/lib/sync/**` offline queue, the `src/audio/notes/PitchVerifier.ts` module, the test documents `docs/test/SECURITY_TEST_REPORT.md` and `docs/test/E2E_CHECKLIST.md`, and `src/lib/rhythm` (defect fixes only) |
| Delivers | T-05, T-07, T-13, T-20, T-23, F2. Support for T-10 (Google provider), T-25 (production Supabase). Proposed: preparation of SEC-01 (staging security remediation) if A assigns it (U-27). |
| Can change independently | The files listed above, plus a new `pitch` section in `src/audio/config.ts` |
| Needs approval from A | Any migration (design first, then the file); any new dependency (e.g. `fake-indexeddb`); any change to `AcousticFrame`, `ProgressStore` or `LessonResult`; **any action on a hosted Supabase project** |
| Reports to | A, through the daily status post |
| Coordinates directly with | A (reviewer of all your PRs, owner of the audio contracts, owner of hosted-project changes and AUX-TEST-ACCESS-01); B (staging access, `ProgressStore`, `AuthContext.tsx`, Google provider); D (T-15 shares `DashboardScreen.tsx`). **Review duties:** none (U-17, decided 2026-11-16: A reviews everything). |

---

## B. Personal task schedule

| Task | Jira | Priority | Effort | Earliest start (reason) | Target done | Reviewer | Status (2026-11-21) |
|---|---|---|---|---|---|---|---|
| F2 `profiles` access fix: anonymous access **and** ownership (existing P0; RULINGS §4.3; `T-02_VERIFICATION_PLAN_HANDOFF.md` F2; DEF-001) | — (bug) | P0 | 0.5 d + audit delta | now | per T-02 handoff (was Nov 18) | A | **Migration merged** (PR #33). Scope widened by the audit (§C F2): follow-up drift-test PR **READY**. Applying it to `Muz-Database`: **approved (U-26)**: after a backup and a test on E1; A applies. **Also a prerequisite for A's AUX-TEST-ACCESS-01 migration:** notify A when merged. Nothing else in that workflow is yours. |
| T-05 Staging + CI | NEW-03 (proposed); closes KAN-278 | P0 | 1.5 d (+ drift work, size unknown) | D1 | D2 (CI part) | A | **Part 1 (CI / hosting / env guard / docs): PARTLY DONE** (PR #30). **Part 2 (staging database): READY (Path A, fresh E1; due Mon 11-23).** Final security baseline after F2 + SEC-01 on E1. |
| T-07 PitchVerifier | KAN-262, KAN-263 (yours) | P1 | 2.5 d | D2 PM | D4 (merge) | A | **Merged** (`372f1d7`; wired by T-08, PR #31). Evidence still to be posted on Jira if not done. |
| T-13 Offline sync | KAN-268 (yours) | P1 | 3 d (re-estimate after U-24) | Queue mechanics: now. Replay binding: after U-23 + U-24 | — (cannot be dated until U-24) | A | **13.1 READY** (approved with the architecture). **13.2 READY**. **13.3 BLOCKED on T-28 M2 being merged** (option a); `n/a` by ruling under option (c). |
| T-20 RLS and permissions verification | KAN-275 (yours) | P1 | 1 d (+0.5 d for the widened matrix) | After T-05 Part 2 + SEC-01 + D14-R | — | A | **BLOCKED on E1 + V1–V10 + F2 on E1** (decisions settled). Write the script now against the **Stage A matrix**; re-run against the Stage B matrix when Stage B ships. |
| T-23 E2E checklist | KAN-271, KAN-274 (reassign to you) | P1 | 3 d | Draft: D9. Execute: after IC-3 **and** U-23/U-24 | D12 | A | Draft **READY**; † rows can now be written from the architecture document §7. Execution on E1 after Stage A (option a), or † rows `n/a` by ruling (option c). |
| Support: Google provider (T-10) | — | — | 0.25 d | D7 | D8 | — | Waits for A's D11 authorization |
| Support: production Supabase (T-25) | — | — | 0.5 d | D13 | D14 | — | Decided: fresh production project (U-06). Follows E1 sign-off. |
| T-24 defect fixes in your areas | KAN-281 | P1 | as assigned | D12 | D13 | A | — |

**Load.** Before this revision C was at capacity (about 12 ideal days in 14; handoff §E.4: ≈ 9–9.5 days in 9). The audit adds F2 scope, drift reconciliation (T-05 Part 2) and a wider T-20 matrix, and SEC-01 if A assigns it to C. **C is now over capacity unless A cuts or reassigns something** (see `SECURITY_AUDIT_GUIDE_REVISION.md` §3 U-30 and §4).

**While waiting**
- **While F2's application to a hosted project is pending:** extend the F2 PGlite tests to the audited drift (§C F2, step 3).
- **While U-22 / U-28 are open:** write the T-05 Part 2 verification checklist (§C T-05, Part 2, step 6) as a reusable document section in `docs/ENVIRONMENTS.md` (no values, no refs).
- **While U-23 / U-24 are open:** build T-13.2 (queue mechanics) against an in-memory store; write `scripts/rls-check.ts` against the draft matrix; draft T-23 rows.

---

## C. Detailed implementation instructions

### C.0 Shared context: client write paths to progression data (verified on `origin/main` @ `e96c34c`)

Every task below that touches progression or permissions depends on this list. **Do not change these paths in any C task unless that task's brief says so.**

| # | Path | Writes | Notes |
|---|---|---|---|
| W1 | `DashboardScreen.handleLessonComplete` (`DashboardScreen.tsx:120-139`) → `saveRunResult` (`src/lib/progress/devTestResults.ts`) → for a learner run, `saveLessonResult` (`src/lib/progress/saveLessonResult.ts`) → `supabaseStore` | `user_progress` upsert, then `performance_records` insert, then `profiles` update (`exp`, `hearts`, `current_streak`, `last_activity_date`) | **Three separate requests, not atomic.** All outcomes are computed in the browser by `applyResult`. A failure after the first write leaves a partial save; a second call inserts a second `performance_records` row (no key). |
| W2 | `persistRegeneratedHearts` (`supabaseStore.ts:79-88`), called from `DashboardScreen.tsx:89-98` | `profiles.hearts` (compare-and-set on the old value) | Regeneration timing is client-side (`useHeartRegen`, localStorage anchor) |
| W3 | `savePlacement` (`supabaseStore.ts:98-124`) | `user_progress` upserts, `profiles.exp`, and auth `user_metadata.placement` | Placement unlocks earlier units by writing completion rows from the browser |
| W4 | `AuthContext.fetchProfile` (`AuthContext.tsx:85-90`) | `profiles.username`, `profiles.instrument_focus` | Metadata only |
| W5 | `AuthContext.fetchProfile` default-profile `upsert` (`AuthContext.tsx:101-117`) | A whole `profiles` row with client-chosen `exp: 100`, `hearts: 5`, `current_streak: 1` | Runs when no row is found, and also on some read errors (DEF-002, B's T-03). It can also **mask a missing signup trigger**. |
| W6 | T-11 achievements (B, not merged) | Planned: `user_achievements` inserts and badge EXP through `ProgressStore` | Client-side by design today |
| W7 | Developer test run: `saveRunResult` with destination `dev-test` → `supabaseDevTestStore` (`supabaseStore.ts:57-72`) | `dev_test_results` insert and `profiles.hearts` update | Only for `is_dev` accounts on a lesson opened through the lock override; the insert policy requires `is_dev`. Never writes learner progress, EXP or streak. |

With the repository's intended policies (owner-only) plus ruling D14, **every one of W1–W7 lets a signed-in user write arbitrary progression values to their own rows.** With the audited hosted policies, an anonymous caller can also write anyone's `profiles` row.

---

### F2 `profiles` access fix (anonymous access and row ownership)

**Status:** migration and tests **merged** (PR #33, in `e96c34c`). **Scope widened by the audit:** a follow-up PR adds tests for the audited INSERT/UPDATE drift (**READY**). Applying to any hosted project: **AWAITING APPROVAL** (U-22, U-26).

**1. Purpose**

SRS 3.5.2 requires owner-only access. The hosted `profiles` table currently lets anyone with the public key read, insert and update any profile row (`{public}` policies with `USING true` / `WITH CHECK true` / unrestricted UPDATE). F2 closes that for `profiles`. F2 is also the prerequisite for A's AUX-TEST-ACCESS-01 `is_dev` migration: until F2 is in place, a developer flag would be publicly readable.

**2. Current implementation (verified)**
- PR #33 added `supabase/migrations/20261119120000_profiles_rls_hardening.sql`. As written, it:
  - enables RLS on `profiles`;
  - drops every `profiles` policy except `profiles_select_own`, `profiles_insert_own`, `profiles_update_own`, then re-creates those three exactly as the initial migration defines them (`to authenticated`, `id = auth.uid()`);
  - revokes all privileges on `profiles` from `PUBLIC`, `anon` and `authenticated`, then grants `select, insert, update` to `authenticated`;
  - sorts before `20261120000000_profiles_is_dev.sql`.
- PGlite tests in `supabase/__tests__/profilesRls.test.ts` cover: reproducing a drift and closing it; own-row `select(*)`, update and upsert still work; exactly the three policies remain; idempotency; ordering before `is_dev`; the `is_dev` guard check after all migrations. **The drift fixtures are SELECT-only** (a public SELECT policy, RLS off, a PUBLIC select/delete grant). None sets up an INSERT `WITH CHECK true` policy or an unrestricted UPDATE policy, which are what the audit found.
- The dev dependency `@electric-sql/pglite` 0.2.17 came in with PR #33.
- Every `profiles` read and write in `src/` is the signed-in user's own row (W2, W4, W5, `fetchProfile`, `getProfile`). Nothing reads `profiles` before sign-in. So owner-only `profiles` policies **remove no legitimate client path**.

**3. Required changes (revised scope)**

F2 must deliver all four of these for `profiles`:

| # | Requirement | Covered on `main` today? |
|---|---|---|
| F2-1 | Anonymous callers cannot select, insert, update or delete any `profiles` row | Yes, by design (no `anon`/`PUBLIC` grant; policies `to authenticated`). **Must be proven against the audited drift** (step 3). |
| F2-2 | Authenticated SELECT is limited to `id = auth.uid()` | Yes (`profiles_select_own`) |
| F2-3 | Authenticated INSERT is limited to `id = auth.uid()` | By design (`profiles_insert_own`); **not yet tested against the audited `{public}` INSERT drift** (step 3) |
| F2-4 | Authenticated UPDATE is limited to `id = auth.uid()` (both `USING` and `WITH CHECK`) | By design (`profiles_update_own`); **not yet tested against the audited `{public}` UPDATE drift** (step 3) |

**Out of F2's scope, on purpose** (do not add these to F2 without A's written approval):
- **Grants on the other five tables.** The audit found broad `anon` and `authenticated` privileges on all six tables and **no policies** on five of them. That is **SEC-01** (proposed staging security remediation, U-27). RLS policies and grants are separate controls: fixing one does not fix the other, and F2 fixes both only for `profiles`.
- **Which `profiles` columns a client may write** (for example `exp`, `hearts`, `current_streak`). That depends on **D14-R** and the trusted progression architecture (U-23, T-28). F2 keeps the repository's table-level `update` grant, which is the D14-as-ruled behaviour. If D14 is reversed, the column restriction is delivered by T-28 / SEC-01, not F2.
- **The `is_dev` migration**, its check script and tester grants (all A's, AUX-TEST-ACCESS-01).

**4. Step-by-step**
1. Branch `task/F2-audited-drift-tests` from `main`. Run `npm test` and `npx tsc -p tsconfig.json`.
2. If a case cannot be expressed in PGlite, list it in the PR as a manual SQL-editor check for an **isolated** database (never `Muz-Database`).
3. Add PGlite test cases for the **audited** drift, each set up before the migration runs and asserted after it:
   - a `{public}` SELECT policy with `USING true`;
   - a `{public}` INSERT policy with `WITH CHECK true`;
   - a `{public}` UPDATE policy with unrestricted row conditions;
   - broad `anon` and `authenticated` table privileges on `profiles`.
   After the migration, assert: anonymous select/insert/update/delete denied; user B cannot select, insert-as, or update user A's row; user A can select, insert (own id) and update their own row.
   Use whatever policy names you need in the fixture; the migration must not depend on the hosted names.
4. Record in the PR that the migration leaves the other five tables' grants and policies unchanged, and link SEC-01.
5. Open the PR. A reviews.
6. **Applying to a hosted project is a separate, approved step** (U-26). Hand A: the migration file, the verification queries already in its footer, and the expected results. A (or you, if A delegates in writing) applies it, after a backup, to the environment A names. If that environment is `Muz-Database`, the U-22 classification must be recorded first.
7. After it is applied, run the anonymous REST check from the migration footer (publishable key, no user token) and record the result in the PR. Notify A: "F2 merged/applied: anonymous `profiles` access denied; ownership enforced" + PR/commit and environment.

**5. Expected output**

A merged migration with tests proving F2-1…F2-4 against the audited drift, and, once approved, a recorded application to the named environment.

**6. Testing**

`npx vitest run supabase/__tests__`, `npm test`, `npx tsc -p tsconfig.json`; after application, the footer queries and the anonymous REST check.

**7. Acceptance criteria**
1. F2-1…F2-4 are each covered by at least one passing test that starts from the audited drift.
2. The migration does not change any table other than `profiles` (check the diff).
3. Own-row app flows still work (existing test "keeps the app working").
4. The PR states explicitly that table grants on the other five tables are **not** fixed by F2 and links SEC-01.
5. Application to a hosted project happens only after U-22 and U-26 are recorded, with a backup date noted in `docs/ENVIRONMENTS.md`.

**8. Evidence**

PR link, test output, the footer query results and the anonymous REST result (status code only; no row values), and the notification to A.

---

### T-05 Staging environment and CI pipeline

**Status:** Part 1 **PARTLY DONE** (PR #30). Part 2 **BLOCKED** (U-22, U-28; final baseline also on U-23, D14-R, SEC-01).

**1. Purpose**

A shared staging environment is needed to verify everything Supabase-dependent: the T-03 profile fix, T-10 auth, T-11 achievements, T-13 sync, T-20 RLS and T-23. Every PR also needs automatic checks. SRS 3.3.2, 3.4d and 3.6.1b; SPMP 3.2.

**Two different databases must never be confused in this task:**

| | Fresh isolated staging project | The audited hosted project `Muz-Database` |
|---|---|---|
| What it is | A new Supabase project created only for staging, with no real users | An existing project with existing profiles, used today by local dev and named as staging by U-08 (if it is the same project; U-22) |
| Schema state | Empty until migrations run | Six tables exist; schema **differs** from the migrations; migration history empty |
| How migrations get there | All repository migrations, in timestamp order | **Not** by running the migrations as-is. Only by an approved reconciliation plan |
| Who decides it is used | A, by revisiting U-08 (U-28) | A, by recording U-22 |

**2. Current implementation (verified on `origin/main` @ `e96c34c`)**
- **Delivered by PR #30:** `.github/workflows/ci.yml`, `vercel.json`, `scripts/check-bundle-size.mjs` (+ test), the env guard (`src/lib/supabase/config.ts`, DEF-004), `docs/ENVIRONMENTS.md`. First CI run green on PR #30.
- **Still open per `docs/ENVIRONMENTS.md`:** Vercel Preview env vars unconfirmed; no staging URL recorded; signup check, deep-link refresh check and Auth URL configuration not done; "a failing PR blocks merge" needs branch protection, which A has not approved.
- **Supabase:** `supabase/migrations/` on `main` holds four migrations: `20260509120000_initial_schema.sql`, `20261119120000_profiles_rls_hardening.sql` (F2), `20261120000000_profiles_is_dev.sql`, `20261121000000_dev_test_results.sql`. `supabase/seed.sql` is generated by `npm run seed:lessons`.
- **Decisions in force:** U-08 (2026-11-16): "Use the existing Supabase project for staging. No new project." `docs/ENVIRONMENTS.md`: migrations and seed on the hosted project are applied by hand, **by A only**; never `supabase db reset`. Handoff §3.4 lists the U-08 precautions (backup first, fix F2, record drift such as the hand-added `profiles.last_heart_update`, dedicated test accounts, leave the existing profiles alone).
- **Audit:** see the revision notice. Whether `Muz-Database` is the "existing project" in U-08, and whether it is staging, production or both, is **not recorded anywhere** (U-22).

**3. Required changes**

*Part 1: CI, hosting, env guard, documentation (unchanged requirements; mostly delivered)*

- `vercel.json` SPA rewrite: delivered.
- Vercel project settings (framework Vite, build `npm run build`, output `dist`, env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` for Preview + Production): B confirms (U-15). If the team chooses Netlify instead, ask A; the SPA rule then goes in `netlify.toml`.
- CI workflow running `npm ci`, `npm test`, `npx tsc -p tsconfig.json`, `npx vite build`, `npm run seed:lessons:check`, `node scripts/check-bundle-size.mjs`: delivered.
- Bundle-size check (sum of `dist/assets/index-*.js` and `index-*.css`, fail above 5 × 1024 × 1024 bytes, no dependencies): delivered.
- Env guard: delivered (message points to `docs/ENVIRONMENTS.md`).
- `docs/ENVIRONMENTS.md`: delivered; keep it current. **Never put keys or project refs in it.** Add one row per environment stating its **role** (staging / production / dev) once U-22 is recorded.

*Part 2: staging database (revised)*

Do **not** apply the initial migration, or any migration, to `Muz-Database` as part of this task. Running the initial migration there would collide with the existing tables and leave a partly applied, unrecorded state.

**Step 0 (blocking, A decides): identify the environment.**
- Record in `docs/ENVIRONMENTS.md` whether `Muz-Database` is staging, production, or a shared dev/staging project with real user data (U-22), and whether it is the project U-08 refers to.
- Record whether staging will be a **fresh isolated project** or **`Muz-Database` after reconciliation** (U-28, a revisit of U-08 in light of the audit).

**Path A: a genuinely new, isolated staging project (only if A chooses it under U-28)**
1. Create the project. Record who has dashboard access (no refs in the repo).
2. Apply **every** file in `supabase/migrations/` in **timestamp order**, including any migration merged after this guide was written (F2 and `dev_test_results` are already there; T-13, SEC-01 and T-28 when they exist). Not just the initial migration. Whether `20261120000000_profiles_is_dev.sql` and `20261121000000_dev_test_results.sql` (which depends on it) are applied to the fresh project, and by whom, is A's call (AUX-TEST-ACCESS-01 ownership, U-34).
3. Record the method (SQL editor or Supabase CLI) and confirm the remote migration history lists every applied file.
4. Run `supabase/seed.sql`.
5. Run the **verification checklist** (step 6). Staging is not ready until it passes.

**Path B: `Muz-Database` (only if A chooses it under U-28)**
1. **Backup first** (handoff §3.4 step 1). Record the date in `docs/ENVIRONMENTS.md`.
2. Read-only: capture the current schema, policies, grants, triggers, functions and migration history, and diff them against the repository migrations. Store the **structure** diff (no row data) in a document A names.
3. Propose a **reconciliation plan** to A: which differences are brought to the repository's definition, which hand-made changes (for example `profiles.last_heart_update`) get a proper migration file, and how the migration history is reconciled. **Do not write the reconciliation SQL until A approves the plan**, and do not choose between "fix the hosted DB to match the repo" and "change the repo to match the hosted DB" yourself (U-29).
4. A applies the approved migrations (or delegates in writing).
5. Run the **verification checklist** (step 6).

**Step 6: verification checklist (both paths; nothing is "ready" until every row passes)**

Compare each item to the repository's migrations **plus** the approved security architecture. Use read-only catalog inspection (`information_schema.columns`, `pg_constraint`, `pg_indexes`, `pg_trigger`, `pg_proc`, `pg_policies`, `pg_class.relrowsecurity`, `information_schema.role_table_grants`, the Supabase migration-history table).

| # | Check | Expected |
|---|---|---|
| V1 | Tables | Exactly the tables the applied migrations define: the original six, plus `dev_test_results` if `20261121000000` was applied |
| V2 | Columns | Every column in the migrations, including `profiles.is_dev` if A applied that migration; any extra column (e.g. `last_heart_update`) is either in an approved migration or listed as drift |
| V3 | Constraints | Every named constraint in the migrations (e.g. `profiles_hearts_range`, `user_progress_user_lesson_unique`, `lessons_node_unique`) |
| V4 | Indexes | `user_progress_user_id_idx`, `performance_records_user_time_idx`, `user_achievements_user_id_idx`, `dev_test_results_user_time_idx` (if applied), and any index from later approved migrations |
| V5 | Triggers | `on_auth_user_created` on `auth.users`; the `is_dev` guard trigger if that migration was applied |
| V6 | Functions | `public.handle_new_user` and `public.protect_profiles_is_dev` (if applied) match the migration definitions, including `security definer` / `invoker` and `search_path` |
| V7 | RLS enabled | `relrowsecurity = true` on every table (the six, plus `dev_test_results` if applied) |
| V8 | Policies | Exactly the approved set per table (no `{public}` / `anon` policies unless approved) |
| V9 | Grants | Exactly the approved matrix for `PUBLIC`, `anon`, `authenticated` (SEC-01). **Grants are checked separately from policies.** |
| V10 | Migration history | Lists every applied migration file |

**Final staging baseline.** A staging environment can host F2, T-13, T-20 and T-23 evidence only after: (a) U-22 and U-28 are recorded; (b) the checklist passes; (c) the approved security architecture (U-23, D14-R) and SEC-01 are applied. Before (c), staging may be used for feature checks but **not** for security sign-off.

**4. Step-by-step**
1. Branch `task/T-05-staging-db` (Part 1 already merged from `task/T-05-staging-ci`).
2. Ask A to record U-22 and U-28. Until then, do steps 3 and 6 only.
3. Close the remaining Part 1 items with B: Vercel env vars, staging URL (no keys), Auth URL configuration, and the branch-protection decision (A).
4. Path A or Path B, as decided.
5. Sign up a **dedicated test account** on the staging URL (handoff §3.4 step 6). Confirm the `profiles` row was created **by the signup trigger**, not by the client: check V5 first, and check that the browser did not send a `profiles` upsert during signup (Network tab). W5 can create a row even when the trigger is missing, which would hide the defect.
6. Run the verification checklist and record the result (structure only) in `docs/ENVIRONMENTS.md` or the document A names.
7. On staging, open `https://<staging-host>/some/deep/path` and refresh. The app loads; no 404.
8. Post the staging URL and the checklist result in the team chat.

**5. Expected output**

A live staging URL, CI on every PR, documented environments **with their roles**, and a staging database whose schema, policies and grants have been verified against the repository and the approved architecture.

**6. Testing**

Part 1: CI runs; the size script prints about 0.84 MB. Part 2: the verification checklist; the signup-trigger check.

**7. Acceptance criteria**
1. CI runs on PRs. *(met, PR #30)*
2. A failing test blocks merge. *(needs branch protection; A decides)*
3. Staging signup creates exactly one `profiles` row, **created by the signup trigger** (V5 passes and no client upsert was sent).
4. A deep-link refresh works.
5. The size check prints the measured total. *(met)*
6. `docs/ENVIRONMENTS.md` exists, contains no secrets, and records each environment's role (staging / production / dev).
7. **New:** the staging database's role and identity are recorded (U-22, U-28) before any migration or remediation is applied to it.
8. **New:** no migration was applied to `Muz-Database` except under an A-approved reconciliation plan.
9. **New:** if a fresh project was created, every repository migration was applied in timestamp order and the migration history lists them all.
10. **New:** verification checklist V1–V10 passes and the result is recorded.

**8. Evidence**
- PR links (PR #30 for Part 1).
- A CI run link (green).
- The failing-PR screenshot (once branch protection exists).
- A screenshot of the staging signup row and of the trigger check.
- The size printout.
- The verification checklist result.
- Comments on NEW-03 and KAN-278.

---

### T-07 PitchVerifier: a pure pitchy single-note verifier

**Status:** **Merged** (`372f1d7`; T-08 wired it in PR #31). The brief is kept unchanged as the record of what was required.

**1. Purpose**

SRS 3.1.6.2 requires single-note drills to accept a note only within **±35 cents of the exact target**, octave included, and to reject frames with **clarity < 0.85**. Before T-07, live drills used `NoteVerifier`, which checks pitch class only, so any octave passed and there was no cents or clarity test.

**2. Current implementation (verified 2026-11-16)**
- **The contract** (`src/audio/practice/ChordVerifier.ts:35-39`): `interface AcousticVerifier { push(frame: AcousticFrame): AttemptResult | null; reset(): void; readonly isOpen: boolean; }`.
- **`AcousticFrame`** (lines 6–14): `tMs`, `chroma`, `voiced`, `ringing?`, `onset`, `onsetMs`. **A adds `pitchHz?: number | null` and `clarity?: number` in T-08.** Agree the names with A on D1.
- **`NoteVerifier`** (`src/audio/practice/NoteVerifier.ts`, 117 lines) is the template to copy:
  - A new onset opens or restarts the attempt; onsets within `onsetMergeMs` of the first count as one cluster.
  - Frames earlier than `attackSkipMs` after the onset are skipped.
  - Once `sustainWindowMs` has elapsed, it looks back over the last `sustainWindowMs − attackSkipMs` ms and decides `match` when `voicedRatio ≥ minVoicedRatio` and `passRatio ≥ minPassRatio`.
  - Otherwise it keeps sliding until `sustainWindowMs + rollGraceMs`, then decides `miss`, or `unvoiced` if too little of the attempt was voiced.
  - It exposes `lastHeardPc`.
- **Config** (`src/audio/config.ts`): `DEFAULT_VERIFIER_CONFIG` has `sustainWindowMs: 200` (SPEC), `minPassRatio: 0.8`, `minVoicedRatio: 0.5`, `onsetMergeMs: 150`, `attackSkipMs: 45`, `rollGraceMs: 150`.
- **Pitch helpers** (`src/audio/dsp/pitch.ts`): `freqToMidi(hz)` gives a fractional MIDI number (`69 + 12·log2(hz/440)`). Also `midiToFreq`, `PITCH_CLASS_NAMES` and `pc`.
- **Dead code to delete:** `src/hooks/useAudioAnalysis.ts` (the only `pitchy` import; nothing imports it) and `src/lib/audio/noteFrequencies.ts` (no importers).
- **Test style to follow:** `src/audio/__tests__/notes.test.ts` (vitest; drives the verifier with frames).

**3. Required changes**
- **`src/audio/config.ts`:** add

  ```ts
  export interface PitchConfig { centsTolerance: number; minClarity: number }
  export const DEFAULT_PITCH_CONFIG = Object.freeze({ centsTolerance: 35, minClarity: 0.85 }); // both SPEC
  ```

  Reuse `DEFAULT_VERIFIER_CONFIG` for the timing values. Do not duplicate them.
- **`src/audio/dsp/pitch.ts`:** add
  - `centsOff(hz: number, midi: number): number`, defined as `1200 * Math.log2(hz / midiToFreq(midi))`;
  - `midiToNoteName(midi: number): string`, defined as `PITCH_CLASS_NAMES[pc(midi)] + (Math.floor(midi / 12) - 1)`, so 61 → `"C#4"` and 60 → `"C4"`.

  Use the existing `freqToMidi` as the Hz → MIDI conversion. Do not add a duplicate `hzToMidi`.
- **New `src/audio/notes/PitchVerifier.ts`:** `export class PitchVerifier implements AcousticVerifier`.
  - Constructor: `(targetMidi: number, config: Partial<VerifierConfig & PitchConfig> = {})`.
  - Attempt lifecycle: identical to `NoteVerifier`.
  - Pass test per frame: `frame.voiced && (frame.clarity ?? 0) >= minClarity && frame.pitchHz != null && Math.abs(centsOff(frame.pitchHz, targetMidi)) <= centsTolerance`.
  - Track the clarity-weighted pitch of the best voiced frame as `lastHeardMidi` (a rounded number, or −1 if none). A uses it for the "That sounded like A3" cue.
- **Delete** `src/hooks/useAudioAnalysis.ts` and `src/lib/audio/noteFrequencies.ts`.

**4. Step-by-step**
1. On D1, confirm the field names `pitchHz` and `clarity` with A in the team chat.
2. Branch `task/T-07-pitch-verifier`, after T-01.
3. Write `src/audio/__tests__/pitch.test.ts` first.
   - Helper `frames(pitchHz, clarity, { onsetAt = 0, count = 30, hopMs = 10.7 })` produces `AcousticFrame`s with `voiced: true`, `chroma: new Float32Array(12)`, `onset` on the first frame, `onsetMs = onsetAt`, plus the new fields. Until A's T-08 lands, extend the type locally in the test: `type F = AcousticFrame & { pitchHz?: number | null; clarity?: number }`.
   - Cases (target A4 = MIDI 69 = 440 Hz):

     | Input | Expected |
     |---|---|
     | 440 × 2^(30/1200) (+30 cents), clarity 0.95 | `match` |
     | 440 × 2^(40/1200) (+40 cents) | `miss` |
     | 880 Hz (A5) | `miss` (octave error) |
     | Clarity 0.84 on all frames | not `match` |
     | Clarity exactly 0.85 | `match` |
     | `voiced: false` on all frames | `unvoiced` |
     | No onset | `push` always returns `null` |
     | A second onset 100 ms after the first | same attempt (merge) |

   - Helpers: `midiToNoteName(61) === 'C#4'`; `Math.round(freqToMidi(261.63)) === 60`; `centsOff(440, 69) === 0`.
4. Implement `PitchVerifier`, copying the `NoteVerifier` structure.
5. Delete the two dead files. Run `npx tsc -p tsconfig.json`; it must stay clean.
6. Run `npx vitest run src/audio`, then `npm test`.
7. Open the PR and tell A when it is merged (A then starts T-08).

**5. Expected output**

A tested `PitchVerifier` that A plugs into `PracticeDrill.arm`.

**6. Testing**

The unit tests above. The full suite stays green.

**7. Acceptance criteria**
1. All the listed cases pass.
2. `NoteMatcher`, `NoteVerifier`, `ChordVerifier` and `WaitStateMachine` are unchanged (check the diff).
3. `grep -rn "useAudioAnalysis\|noteFrequencies" src` returns nothing.

**8. Evidence**

PR link, test output, and comments on KAN-262 and KAN-263.

**Do NOT change:** `NoteMatcher`, `ChordVerifier`, `WaitStateMachine`, the worklet, the `// SPEC` values, `PracticeDrill.ts` (A wires it in T-08).

---

### T-13 Offline progress cache and sync

**Status:** 13.1 **AWAITING APPROVAL** (A). 13.2 **READY**. 13.3 **BLOCKED** on U-23 (trusted progression architecture), U-24 (trusted save operation and idempotency contract) and T-28 (its implementation).

**1. Purpose**

SRS 3.3.2b and SDD C-08: progress must be cached when the connection drops and synced when it returns. Today a failed save loses the run. `LessonPlayer` shows "Your result could not be saved." (`src/components/lesson/LessonPlayer.tsx:111-113`).

**Why the design changed.** The original T-13 design queued `SaveLessonInput` and replayed `saveLessonResult`, with a unique `performance_records.run_id` to make the replay safe. The dependency audit shows that this is not enough:
- `saveLessonResult` is three separate client writes (W1 in §C.0). A unique `run_id` on `performance_records` stops a duplicate performance row, but it does **not** stop a retry from re-applying (or half-applying) the progress upsert, EXP, hearts, streak, or achievements.
- The intended architecture replaces client-side progression with a trusted backend operation (U-23). A queue that replays `saveLessonResult` would have to be rebuilt.

So T-13 now has three parts. **Do not build the replay around `saveLessonResult`.**

**2. Current implementation (verified on `origin/main` @ `e96c34c`)**
- **Save call:** `DashboardScreen.handleLessonComplete` (`DashboardScreen.tsx:120-139`) calls `saveRunResult` (`src/lib/progress/devTestResults.ts`). A learner run goes to `saveLessonResult(supabaseProgressStore(supabase), { userId, lesson: { passMark, expReward }, result })`; a developer test run goes to the dev-test store (W7). It then runs `refreshProfile()` and `data.reload()`, and returns `{ note, expAwarded }`. If it throws, `LessonPlayer` shows the error note.
- **Store contract:** `ProgressStore` (`src/lib/progress/saveLessonResult.ts:11-17`). B extends it in T-11 (`getUnlockedAchievements`, `getAchievementRewards`, `insertAchievements`).
- **Ordering:** `saveLessonResult` writes progress → performance → profile, sequentially, with no transaction.
- **`LessonResult`:** defined in `src/lesson/types.ts`, built by `buildLessonResult` (`src/lesson/runner.ts`). It has no `runId` yet.
- **Schema:** `performance_records` has no `run_id`. `idb` 8.0.4 is installed but never imported.
- **Test style:** `src/lib/progress/__tests__/saveLessonResult.test.ts` uses an in-memory `MemoryStore`.

**3. Required changes**

**13.1 Stable logical submission identifier (AWAITING APPROVAL: A owns `src/lesson/*`)**

Every lesson run needs one stable identifier that travels with its submission through the queue and every retry, whatever backend contract is chosen. The original design for this is architecture-neutral and is kept:
- Add `runId: string` to `LessonRunState` and to `LessonResult`.
- In `createLessonRun(lessonId, payload, hearts, nowMs, runId = crypto.randomUUID())`, store it on the state. Node 22 and modern browsers provide `crypto.randomUUID`.
- `buildLessonResult` copies `state.runId`.
- Do **not** generate the id inside `buildLessonResult`: it is called twice for a quit (once in `LessonPlayer.quit()`, once in the `useMemo`), so each call would produce a different id. The default parameter keeps every existing `createLessonRun(...)` call and test unchanged, and "Retry" creates a new run with a new id.

Whether the backend calls this value `run_id`, an operation id or an idempotency key is part of U-24. Do not name the backend field yet.

**13.2 Queue mechanics (READY: no backend binding)**

New `src/lib/sync/queue.ts`, built and tested against an **abstract submit function and an opaque, versioned payload**:

- Each queue item holds: a local item id; the logical submission's stable identifier (13.1); a payload **version** number; the serialised payload; `retryCount`; `timestamp`.
- The payload is the **logical lesson submission** (the run's `LessonResult`, lesson id and identifier). Its exact fields are **BLOCKED on U-24**. Until then, treat it as opaque in `queue.ts`.
- **Do not queue client-computed outcomes** (EXP to award, new hearts, new streak, badge list) or client-supplied lesson facts (`passMark`, `expReward`). Under the intended architecture the backend derives them; under the current one they are re-derived on replay anyway.
- Functions to provide (names may follow the existing style): open the IndexedDB store (`muz-sync`); enqueue; list in timestamp order; remove; bump the retry count; `isNetworkError(e)` (true for `TypeError` "Failed to fetch" or `navigator.onLine === false`); `backoffMs(retryCount) = min(30_000, 1000 * 2 ** retryCount)`; and `flushQueue(queue, submit, opts)` where `submit` is injected.
- Serialise any `Date` as an ISO string and revive it on flush.
- **Result classification is injected, not hard-coded:** `flushQueue` asks a supplied classifier whether a failure is *retryable* (network/transient), *already applied* (treat as success and remove), or *permanent* (keep the item, stop retrying, surface it). Which server responses map to which class is part of U-24.

**13.3 Replay binding, backend idempotency and wiring (BLOCKED: U-23, U-24, T-28)**

Do not start until A records U-23 and U-24. When they are recorded, this part must satisfy all of the following, whatever the contract is:

| # | Requirement |
|---|---|
| I-1 | The queue submits to the **trusted progression operation** chosen in U-23, not to `saveLessonResult` or to direct table writes. |
| I-2 | The submission carries the stable identifier from 13.1 unchanged on every retry. |
| I-3 | The backend applies the **whole** progression operation (lesson completion, performance record, EXP, hearts, streak, achievement progress and awards) **at most once** per identifier, and either all of it or none of it. |
| I-4 | A retry of an identifier that was already applied returns a result the client classifies as "already applied" and does not award anything again. |
| I-5 | A partial failure inside the backend operation leaves no partial state (atomicity is the backend's responsibility; the client must not compensate). |
| I-6 | The client shows the server-confirmed result after a successful replay (refresh profile and progress), not a locally computed one. |
| I-7 | A developer test run (W7) keeps its destination through the queue: it is either queued separately or not queued (A decides), and is never replayed into learner progress. |

**The original `run_id` migration proposal is kept on hold, not approved.** It was:

```sql
alter table public.performance_records add column run_id uuid;
create unique index performance_records_run_id_key on public.performance_records (run_id) where run_id is not null;
```

with `src/types/database.types.ts` updated and error `23505` treated as "already saved". On its own it satisfies only part of I-3 (performance rows). If U-24 places the idempotency key elsewhere (for example on the operation itself), this proposal is withdrawn; if U-24 keeps it, it becomes one piece of T-28's migration set. Never edit the initial migration file.

**Wiring (after 13.3 is unblocked).** Minimal-touch, after D's T-15 is merged, because `DashboardScreen.tsx` is shared:
- On a network error from the trusted operation, enqueue the submission and return `{ note: 'Saved offline. It will sync when you are back online.' }` instead of throwing.
- One effect calls `flushQueue` on mount and on `window` `online`, then `refreshProfile()` and `data.reload()`. Schedule retries with `backoffMs`.
- Change **only** these lines in `DashboardScreen.tsx`.

**Interim option (A decides, U-30).** If the trusted operation cannot be delivered before release, A must choose explicitly between: (a) shipping without offline sync and documenting SRS 3.3.2b as not met; or (b) an interim queue over the current client pipeline, with its duplicate/partial-save risk written down as an accepted limitation. Do not build (b) unless A records that choice.

**Tests:** `src/lib/sync/__tests__/queue.test.ts`, against an in-memory `SyncQueue` (U-09: no `fake-indexeddb`). Verify the IndexedDB layer manually.

**4. Step-by-step**
1. Post 13.1 to A and wait for approval.
2. Branch `task/T-13-offline-sync` from `main`.
3. 13.2 tests (READY):
   - `isNetworkError` true for `new TypeError('Failed to fetch')` and false for `new Error('Could not read your profile: ...')`;
   - `backoffMs(0..6)` gives 1000, 2000, 4000, 8000, 16000, 30000, 30000;
   - `flushQueue` submits in timestamp order, removes items on success, bumps on retryable failure, and stops retrying after `maxRetries` (default 6) while keeping the item;
   - an "already applied" classification removes the item and counts as saved;
   - a "permanent" classification keeps the item and stops retrying it;
   - the same identifier is passed to `submit` on every retry of the same item;
   - a payload with an unknown version is not submitted and is reported.
4. Implement 13.2. Run `npx vitest run src/lib/sync`.
5. **Stop.** Wait for U-23 / U-24. Then do 13.3 together with whoever owns T-28.
6. Run `npm test`, `npx tsc -p tsconfig.json` and `npm run build`.
7. Run the manual offline test on the **prepared** staging (T-05 Part 2 baseline).

**5. Expected output**

A lesson finished offline is applied **exactly once in full** after reconnecting: one completion, one performance record, EXP, hearts, streak and achievements applied once.

**6. Testing**
- **Unit:** `npx vitest run src/lib/sync`; contract tests for the trusted operation belong to T-28.
- **Manual, on prepared staging (after 13.3):**
  1. Open a rhythm lesson.
  2. In DevTools → Network, set "Offline" just before the lesson ends.
  3. Finish the lesson. The results screen shows "Saved offline…".
  4. Set "Online". Within about 2 s: exactly one new `performance_records` row, the completion recorded once, `profiles.exp` changes once by the server-confirmed amount, and the queue empties (DevTools → Application → IndexedDB → `muz-sync`).
  5. Reload while offline with an item queued, then go online. The item still syncs, once.
  6. **New:** force a replay of an item that was already applied (e.g. restore it into the queue from a saved copy). Nothing changes on the server.
  7. **New:** go offline in the middle of a flush. After reconnecting, the final state equals a single application.

**7. Acceptance criteria**
1. 13.2 unit tests pass.
2. Manual steps 3–7 pass. *(BLOCKED until 13.3)*
3. Any migration needed by U-24 is merged through T-28's approval path and applied to staging by A (or as A delegates).
4. `database.types.ts` matches the applied schema.
5. Your `DashboardScreen.tsx` diff touches only the save handler and one effect.
6. **New:** the queue never calls `saveLessonResult` or writes progression tables directly (unless A chose interim option (b) under U-30, in which case the limitation is written in the PR and in `docs/test/E2E_CHECKLIST.md`).
7. **New:** requirements I-1…I-7 each have evidence (test or manual step).

**8. Evidence**

PR link, test output, screenshots of manual steps 3–7 (the IndexedDB panel and table rows), and a KAN-268 comment.

**Contingency (A decides).** If 13.2 is not merged by D8, reduce scope to "enqueue on network error + flush on reconnect" with no backoff (roadmap cut order, item 5). The contingency does **not** remove I-1…I-7 from 13.3.

---

### T-20 Verify RLS and permissions with unauthorised-access attempts

**Status:** **BLOCKED** for execution (U-22, D14-R, SEC-01, T-05 Part 2). Writing the script against the draft matrix is **READY**.

**1. Purpose**

SRS 3.5.2: owner-only access on all tables. Produce repeatable evidence that each table allows exactly the approved access, and nothing else.

**2. Current state (verified)**

The original brief assumed the hosted database matches the repository's migrations. **It does not.**

| Source | What it says |
|---|---|
| Repository migration (`20260509120000_initial_schema.sql`) | RLS on all 6 tables; all policies `to authenticated` with `auth.uid()`; grants only to `authenticated` (see the draft matrix below) |
| Hosted audit (`Muz-Database`) | `profiles` has `{public}` policies with `USING true` / `WITH CHECK true` / unrestricted UPDATE; broad `anon` and `authenticated` privileges on all six tables; **no policies** on the other five tables |

So T-20 cannot run until a staging database has been **identified** (U-22), **prepared** (T-05 Part 2 checklist), and **remediated** (F2 + SEC-01 applied), and until **D14-R** has decided what users may write to their own progression rows.

- `scripts/tsconfig.json` includes only `generate-lesson-seed.ts`. Add your script to its `include` so that `npm run typecheck:seed` checks it.

**Draft intended permissions matrix** (from the repository migration; **becomes final only when SEC-01 and D14-R are approved**; T-20 tests the approved version, not this draft)

| Table | `anon` | `authenticated`, own rows | `authenticated`, other users' rows | Depends on D14-R |
|---|---|---|---|---|
| `profiles` | none | select / insert / update | none | **Yes:** whether own `exp`, `hearts`, `current_streak`, `last_activity_date` (and placement-related EXP) are client-writable |
| `lessons` | none | select (all rows) | — | No |
| `user_progress` | none | select / insert / update / delete | none | **Yes:** whether completion is client-writable |
| `performance_records` | none | select / insert | none | **Yes:** whether clients insert directly or only the trusted operation does |
| `achievements` | none | select (all rows) | — | No |
| `user_achievements` | none | select / insert | none | **Yes:** whether clients insert awards directly |
| `dev_test_results` (only if `20261121000000` is applied) | none | select own; insert own **only if** the user's `is_dev` is true | none | No (follows AUX-TEST-ACCESS-01) |

**3. Required changes**
- **New `scripts/rls-check.ts`**, run with `npx tsx scripts/rls-check.ts`:
  - Read `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `RLS_USER_A_EMAIL`, `RLS_USER_A_PASSWORD`, `RLS_USER_B_EMAIL` and `RLS_USER_B_PASSWORD` from `process.env`.
  - Use the **publishable/anon key only**. Never a service-role key.
  - The two users are dedicated test accounts on the **identified staging** project. Never commit their passwords; set them in your shell. Never use the existing real profiles.
  - Refuse to run unless an explicit environment label is set (for example `RLS_TARGET=staging`) and it matches the role recorded for that project in `docs/ENVIRONMENTS.md` (U-22). This prevents a run against the wrong project.
  - Keep the expected-results table in one place in the script, so it can be updated to the approved matrix without touching the checks.
- **Checks.** Print a table of check, expected and actual, and exit 1 on any mismatch.
  1. **Anonymous client, every table (the six, plus `dev_test_results` if applied):** select returns 0 rows or an error; insert, update and delete are denied. (`lessons` and `achievements` are also denied to `anon`, per the draft matrix, unless the approved matrix says otherwise.)
  2. **User B signed in, against user A's rows:**
     - select of A's rows (by A's `id` / `user_id`) returns 0 rows, on every user table;
     - update of A's `profiles` row affects 0 rows (use `.select()` to count);
     - update and delete of A's `user_progress` affect 0 rows;
     - insert into `performance_records`, `user_progress` and `user_achievements` with `user_id = A` is denied;
     - insert, update or delete on `lessons` and `achievements` is denied.
  3. **User A signed in, own rows (permitted operations):** each operation the approved matrix **allows** succeeds (for example own `profiles` select; own `user_progress` select). A permitted operation that fails is also a failure: it means the remediation broke the app.
  4. **Own progression writes (D14-R):**
     - If D14 is **retained** (re-confirmed in writing): own-row `profiles.exp` / `hearts` / streak updates and own completion writes succeed, and the report lists them under "Allowed by D14 (accepted risk, re-confirmed on <date>)", with the limitation stated: *a signed-in user can set their own progression values; this is not protection against self-manipulation.*
     - If D14 is **reversed**: those direct writes must be **denied**, and progression changes must happen only through the trusted operation. A direct write that succeeds is a **failure**.
     - Until D14-R is recorded, this section cannot pass. Do not mark it either way.
  5. **`is_dev` (only if A has applied AUX-TEST-ACCESS-01 on this staging):** user A cannot set their own `is_dev` to true (the value stays unchanged), and a non-developer cannot insert into `dev_test_results`. Cross-reference A's `docs/auxiliary/sql/is_dev_guard_check.sql` result; do not run A's grant steps.
  6. **Grants (read-only, separate from policies):** the privileges held by `PUBLIC`, `anon` and `authenticated` on each table, from `information_schema.role_table_grants`, equal the approved matrix. A policy that denies access does **not** excuse an excess grant; record both.
- **New `docs/test/SECURITY_TEST_REPORT.md`:** the results table, the grants table, the environment role and the date, plus the TLS version observed in the browser (DevTools → Security, on the Supabase request).

**Unexpected access is a security failure.** Any allowed operation that the approved matrix does not allow is recorded as **FAIL** and reported to A as a **P0** the same day. It is never recorded as "acceptable", "known" or "by design" unless an approved decision (such as a re-confirmed D14) explicitly names that exact operation.

**4. Step-by-step**
1. Branch `task/T-20-rls-check`.
2. Write the script against the draft matrix (READY). Add it to `scripts/tsconfig.json` `include`, then run `npm run typecheck:seed`.
3. **Wait** until: U-22 recorded; T-05 Part 2 checklist passed on that staging; F2 and SEC-01 applied there; D14-R recorded. Update the expected table to the approved matrix.
4. Create test users A and B on that staging. Give A at least one row in each user table: complete one lesson as A (through the path the approved architecture uses).
5. Run the script. In PowerShell, set `$env:SUPABASE_URL='...'` and the other variables first.
6. Write the report.

**5. Expected output**

A repeatable RLS-and-grants check and a security report against the approved matrix.

**6. Testing**

Run the script twice: once when the preconditions are first met, and once after T-23 has created more data.

**7. Acceptance criteria**
1. The script exits 0 against the **approved** matrix, on an environment whose role is recorded.
2. Every anonymous and cross-user attempt is denied, on every table.
3. Every operation the approved matrix permits succeeds.
4. The grants table equals the approved matrix.
5. The D14-R section matches the recorded decision (retained → listed as an accepted limitation with its date; reversed → direct progression writes denied).
6. The report lists the TLS version.

**8. Evidence**

PR link, the script output pasted into the report, the grants table, and a KAN-275 comment. Any unexpected access is a **P0**: tell A immediately.

**Do NOT change:** policies or grants, as part of this task or to make a check pass. Report problems; A decides. Remediation belongs to F2, SEC-01 or T-28.

---

### T-23 End-to-end integration checklist

**Status:** Draft **READY**. Rows marked † and the final acceptance criteria are **BLOCKED** on U-23 / U-24 (and on T-13 13.3).

**1. Purpose**

SPMP 3.2 and §6 require functional and integration testing of every flow before deployment. Only unit tests exist today. T-23 must test the **final** implementation: if the trusted progression operation replaces the client-side pipeline, T-23 tests that operation, not the old pipeline.

**2. Current state**

There is no checklist. The flows are listed in the SPMP §6 functional list.

**3. Required changes**

New file `docs/test/E2E_CHECKLIST.md`. Each step has an ID (E2E-01…), a precondition, the action, the expected result, the actual result, pass/fail, and a defect ID if it failed. Record at the top: the environment (role from U-22), the commit tested, and which progression architecture is deployed (U-23). Cover at least:

| ID | Flow |
|---|---|
| E2E-01 | Email signup (profile row created by the signup trigger, not by the client) |
| E2E-02 | Sign-in |
| E2E-03 | Password recovery |
| E2E-04 | Google sign-in |
| E2E-05 | Unverified email + resend |
| E2E-06 | Welcome screen + placement (Novice / Proficient / Virtuoso, ruling D8); Welcome shown according to the T-14 persistence rule (U-25) |
| E2E-07 | Locked node shake + banner names the blocking lesson |
| E2E-08 | Theory lesson: wrong answer re-queued |
| E2E-09 | Rhythm lesson (Perfect/Good/Miss shown; consistency on results, never above 100 %) |
| E2E-10 | Posture hold (green/red, cue text) |
| E2E-11 | Play-note: right note passes, wrong octave fails |
| E2E-12 | Play-chord |
| E2E-13 | Wait-state: right sound with bad posture is blocked |
| E2E-14 | Hearts: 15 s timeout costs 1 |
| E2E-15 | Hearts: 3 misses cost 1 |
| E2E-16 | Hearts: quit mid-drill keeps the loss |
| E2E-17 | Hearts: regeneration after 15 min (shorten by editing the regen anchor in localStorage only if A approves, U-14; otherwise wait). † If hearts become server-authoritative, regeneration is tested on the server-side mechanism. |
| E2E-18 | Hearts: ≥ 80 % theory restores 1 |
| E2E-19 | At 0 hearts: practice lessons blocked, theory and rhythm open |
| E2E-20 | † EXP only on first mastery; streak increments next day (or note as not testable in one day); values confirmed from the server after the save |
| E2E-21 | † Achievements: first-lesson unlocks, awarded once |
| E2E-22 | Analytics: charts show real points |
| E2E-23 | † Offline save then sync (T-13 manual steps 3–5) |
| E2E-24 | Demo/guest mode saves nothing |
| E2E-25 | † **Trusted progression operation:** a completed lesson updates completion, performance record, EXP, hearts, streak and achievements together, through the operation chosen in U-23 (no direct client table writes in the Network tab, if D14 is reversed) |
| E2E-26 | † **Duplicate submission:** the same lesson submission sent twice (double click, or two tabs) is applied once |
| E2E-27 | † **Offline queue replay:** an already-applied queued item replayed after reconnect changes nothing (T-13 step 6) |
| E2E-28 | † **Retry behaviour:** a transient server failure is retried with backoff; a permanent rejection is surfaced and not retried forever |
| E2E-29 | † **Atomicity:** a failure inside the operation leaves no partial progression state (method depends on U-24; may need a test hook approved by A) |
| E2E-30 | † **Failure recovery:** after a failed save, reload and sign back in: the user sees the server state, and a retry applies once |
| E2E-31 | Lesson completion and performance record are persisted and visible after reload |

**4. Step-by-step**
1. Draft the checklist on D9, during the buffer.
2. After U-23 / U-24, fill in the expected results for the † rows from the approved contract. **Do not finalise the acceptance criteria before then.**
3. Execute it on the **prepared** staging (T-05 Part 2 baseline) from D10 to D12. B pairs with you on E2E-01 to 05 and E2E-22.
4. Log each failure in the SPMP Issue Log (D maintains it in T-22) with all 9 fields, and tell A.

**5. Expected output**

A fully executed checklist against the delivered architecture.

**6. Testing**

This task is the test. Do not fix bugs inside this task.

**7. Acceptance criteria** *(provisional until U-23 / U-24 are approved)*
1. 100 % of steps executed (a † row whose feature A cut is marked `n/a` with the decision ID, never pass).
2. Every failure has a defect ID.
3. **New:** the checklist header records the environment role, the commit and the progression architecture tested.

**8. Evidence**

The completed checklist, plus comments on KAN-271 and KAN-274.

---

## D. Git and pull-request instructions

| Item | Rule |
|---|---|
| Branches | `task/F2-audited-drift-tests`, `task/T-05-staging-db`, `task/T-13-offline-sync`, `task/T-20-rls-check`, `task/T-23-e2e-checklist`; all from current `main` |
| Wait for | T-13 13.1 needs A's approval; 13.3 needs U-23, U-24 and T-28. Cut the T-13 wiring commit after D's T-15 (`DashboardScreen.tsx`). T-20 execution needs U-22, T-05 Part 2, F2, SEC-01 and D14-R. |
| Do not touch | `src/audio/practice/*` (except reading), the worklet, `PracticeDrill.ts` (A); `AuthContext.tsx`, `LoginPage.tsx`, `ProfileAnalyticsView.tsx` (B); `src/lesson/*` without A's approval; `DashboardScreen.tsx` beyond the save handler and one effect; policies and grants outside F2 / an approved remediation task; `// SPEC` config values; **any hosted Supabase project without A's written approval for that action** |
| Commits | One change per commit, citing the task (e.g. "F2: test the audited public-policy drift") |
| PR contents | Acceptance checklist with evidence; anything not verified; **which environment, if any, the change was applied to** |
| Reviewer | A |
| Must pass | CI: `npm test`, `npx tsc -p tsconfig.json`, `npx vite build`, `npm run seed:lessons:check`, the size check. Also `npm run typecheck:seed` for T-20. |

---

## E. Coordination and handoffs

| Task | You depend on | Depends on you | Agree on | Notify when | Handoff content |
|---|---|---|---|---|---|
| F2 (`profiles` access fix) | A (U-22, U-26 before applying) | T-05 Part 2, T-20; **A (AUX-TEST-ACCESS-01 migration, checks and tester grants: all A's)**; SEC-01 | Which environment it is applied to | When merged, and when applied | "F2 merged/applied: anonymous `profiles` access denied; ownership enforced" + PR/commit + environment |
| T-05 | A (U-22, U-28; applies migrations on hosted projects), B (Vercel, U-15) | B (T-03, T-10 staging), you (T-13, T-20, T-23), everyone (CI) | Environment roles; reconciliation plan (Path B) | Checklist result | Staging URL, CI link, `docs/ENVIRONMENTS.md`, checklist result |
| T-07 | — (merged) | — | — | — | — |
| T-13 | A (`runId` approval; U-23, U-24), T-28 owner, B (T-11 `ProgressStore`, if the interim option is chosen), D (T-15 merged) | IC-3, T-23 | Queue item shape; result classification; the offline note text | 13.2 merged; 13.3 start | How to inspect the queue; which backend operation it replays |
| T-20 | T-05 Part 2, F2, SEC-01, D14-R, U-22 | T-24, release go/no-go | Approved matrix; test users | When run | Report link |
| T-23 | IC-3, T-05 Part 2, U-23, U-24 | T-24 | Which steps B executes | D10 start, D12 done | Checklist with defect IDs |
| SEC-01 (proposed) | A (U-27: scope and owner), U-23, D14-R | T-05 Part 2 baseline, T-20 | Approved per-table matrix | When approved / applied | Matrix + migration link |
| Google provider (T-10) | Google Cloud project owner (U-07), A (D11) | B (T-10) | Redirect URLs | D7 | "Provider enabled on staging" |
| Production Supabase (T-25) | U-06, U-22 | B (T-25) | New vs promoted project | D13 | Project role; every migration applied in order; checklist V1–V10 result; Auth URLs set |

---

## F. Daily working checklist

**Start of day**
1. `git switch main && git pull`, then rebase your branch.
2. Check CI on `main` and your PRs' review comments.
3. Check whether today's task has any dependency or decision still open (see §B status column). If so, work on the "while waiting" item instead.

**During the day**
- Stay inside the listed files.
- If the brief does not answer a question, ask A in the team chat. Do not guess.
- Before any command that reaches a hosted Supabase project, check: is its role recorded (U-22)? Did A approve this exact action?

**When to ask for help**
- After half a day blocked.
- Before any schema change, dependency or contract change.

**End of day**
- Push your work, update Jira, and post your status.

**Daily status (post by 09:30):**
```
Yesterday's progress:
Today's target:
Current blocker:
Jira ticket:
Expected deliverable:
```
