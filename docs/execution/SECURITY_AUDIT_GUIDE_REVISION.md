# Security-Audit Revision of the Member C and D Guides

| | |
|---|---|
| **Date** | 2026-11-21 |
| **Scope** | Documentation and task planning only. No code, SQL, database change or deployment was made. |
| **Revised files** | `docs/execution/MEMBER_C_EXECUTION_GUIDE.md`, `docs/execution/MEMBER_D_EXECUTION_GUIDE.md` (Deliverables 1 and 2: complete guides) |
| **This file** | Deliverable 3 (change log), 4 (unresolved decisions), 5 (execution sequence), and the final consistency check |
| **Code baseline** | `origin/main` @ `e96c34c`, branch `task/SEC-AUDIT-guide-revision`. First drafted on an older branch, then moved here and re-checked after F2 (PR #33) and `dev_test_results` were merged. |

## 1. Sources used

| Source | Where it came from | Notes |
|---|---|---|
| Member C and D guides | `docs/execution/` on `origin/main` | Structure, IDs and acceptance-criteria format preserved |
| Hosted Supabase security audit (`Muz-Database`) | The findings as stated in the revision request | **The audit report itself is not in the repository.** Findings were used as given; nothing in them was re-measured. |
| Application dependency audit | The findings as stated in the request, **cross-checked against `main`** (client write paths W1–W7, Member C guide §C.0) | Write paths confirmed in code |
| Project decisions | `main`: `docs/decisions/RULINGS.md` (decided version), `docs/decisions/T-02_VERIFICATION_PLAN_HANDOFF.md`, `docs/ENVIRONMENTS.md`, `docs/test/DEFECT_LOG_AND_TRIAGE.md`, `docs/auxiliary/AUX_TEST_ACCESS_IS_DEV_DESIGN.md` | The `RULINGS.md` on this branch is the earlier **draft**; the decided one is on `main` |
| F2 work | Merged in PR #33 | Migration `20261119120000_profiles_rls_hardening.sql` + PGlite tests (SELECT-only drift fixtures) |

**Decisions already recorded on `main` that the original C/D guides did not reflect** (now reflected): U-08 (existing project = staging, no new project); U-17 (A reviews everything; C has no review duties); T-17 cut; T-26 SRS/SDD drafting moved to A; T-05 code part delivered (PR #30); T-07/T-08 delivered (PR #31); F2 migration merged (PR #33); developer test results kept apart from learner progress (`20261121000000_dev_test_results.sql`, write path W7).

---

## 2. Deliverable 3: Change log

Status key: **Ready** · **Partly done** · **Blocked** · **Awaiting approval**. "Finding" refers to the audit findings: **HA** = hosted audit, **DA** = dependency audit, **DEC** = existing project decision.

### Member C

| Task | What changed | Why | Caused by | Status |
|---|---|---|---|---|
| Header / revision notice | Added re-verified repo facts on `main`; audit summary; status labels; four environment safety rules (no action on a hosted project without role recorded + written approval; A applies migrations; read-only inspection only; no secrets) | Guide predated PR #30/#31 and the audit; prevents an action on the wrong database | HA (whole); DEC (`ENVIRONMENTS.md`: "applied by A only") | — |
| §A Role overview | Added F2 to deliverables, SEC-01 (proposed), "any action on a hosted project" to approvals; removed review duties | U-17 decided | DEC (U-17); F2 branch | — |
| §B Schedule | New status column values; F2 row moved to top with widened scope; T-07 marked merged; T-13/T-20/T-23/T-25 dates replaced with their blocking decisions; load warning updated (now over capacity) | Several dates depend on decisions that do not exist yet | HA, DA | — |
| §C.0 (new) | Table of client write paths W1–W7 on `origin/main` (W7 = developer test runs) | Every progression/permission task depends on it; makes the "multiple client paths" finding concrete | DA | — |
| **F2** (new full brief; ID unchanged) | Scope widened from "anonymous read" to F2-1…F2-4 (anon blocked; own-row SELECT / INSERT / UPDATE); tests required against the **audited** drift (`{public}` SELECT/INSERT/UPDATE policies, broad grants); explicitly **excludes** grants on the other five tables (→ SEC-01), column-level progression restrictions (→ D14-R / T-28) and the `is_dev` steps (A); applying to a hosted project is a separate approved step | Hosted policies allow anonymous **writes**, not only reads; RLS and grants are different controls | HA (profiles policies; grants on all six tables) | Migration **merged** (PR #33); audited INSERT/UPDATE drift tests **Ready** (follow-up PR); applying to a hosted project **Awaiting approval** (U-22, U-26) |
| **T-05** | Split into Part 1 (CI / hosting / env guard / docs: **partly done**, PR #30) and Part 2 (staging database). Part 2: Step 0 identify environment (U-22, U-28); Path A fresh project = **all** migrations in timestamp order; Path B `Muz-Database` = backup, read-only diff, A-approved reconciliation plan, never run the migrations as-is; verification checklist V1–V10 (tables, columns, constraints, indexes, triggers, functions, RLS, policies, grants, history); signup row must be **created by the trigger** (client upsert W5 can mask a missing trigger); final baseline requires the approved security architecture + SEC-01. AC 7–10 added; AC 3 tightened | Audited DB differs from the migrations; migration history empty; triggers/functions/indexes/constraints differ; U-08 said "existing project = staging" without knowing that | HA (all schema findings); DEC (U-08, `ENVIRONMENTS.md`) | Part 1 **Partly done**; Part 2 **Blocked** (U-22, U-28, U-23, D14-R, SEC-01) |
| T-07 | Status line only ("merged, `372f1d7`") | Accuracy | DEC (PR #31) | Done (no requirement changed) |
| **T-13** | Split into 13.1 stable run identifier (kept; architecture-neutral), 13.2 queue mechanics with injected `submit` and result classifier and an opaque versioned payload, 13.3 replay binding with requirements I-1…I-6 (whole-operation at-most-once, atomic, already-applied = success, server-confirmed result). Queue must not replay `saveLessonResult` or queue client-computed outcomes / client-supplied lesson facts. The `run_id` migration kept **on hold**, not deleted. Interim option made an explicit A decision (U-30). Manual tests 6–7 and AC 6–7 added | `saveLessonResult` is three non-atomic writes; a unique `run_id` on one table does not make EXP/hearts/streak/achievements/progress exactly-once; the save path is expected to be replaced | DA (W1, multiple paths); architecture direction | 13.1 **Awaiting approval** (A); 13.2 **Ready**; 13.3 **Blocked** (U-23, U-24, T-28) |
| **T-20** | Runs only on an identified (U-22), prepared (T-05 V1–V10), remediated (F2 + SEC-01) staging; draft matrix marked "final only when SEC-01 and D14-R are approved"; checks extended to every table (six, plus `dev_test_results` if applied) for anon, cross-user read/write/delete, **permitted own-row operations**, grants (separately from policies), `is_dev` (if applied); environment-label guard in the script; D14 section is now conditional (retained → accepted limitation with date and wording; reversed → direct progression writes must be denied); unexpected access = FAIL + P0, never "acceptable" | The old brief assumed the hosted DB matched the migrations and pre-accepted D14 | HA (policies, grants, five tables without policies); DEC (D14) | **Blocked** for execution (U-22, D14-R, SEC-01, T-05 Part 2); script **Ready** |
| **T-23** | Header must record environment, commit, architecture; added E2E-25…E2E-31 (trusted operation, duplicate submission, queue replay, retry, atomicity, failure recovery, persistence); † marks contract-dependent rows (E2E-17, 20, 21, 23, 25–30); acceptance criteria marked provisional; cut features → `n/a` with decision ID | Must test the final implementation, not the client pipeline | DA; architecture direction | Draft **Ready**; † rows and final AC **Blocked** (U-23, U-24) |
| T-25 support | Blocked on U-22 as well as U-06; handoff content now includes "every migration applied in order" and V1–V10 | Production must not silently become the audited DB | HA; DEC (U-06) | **Blocked** |
| §D / §E / §F | Branch list updated; "do not touch" adds hosted projects; PR must state the environment; SEC-01 row; daily check before any hosted-project command | Consistency with the above | — | — |

### Member D

| Task | What changed | Why | Caused by | Status |
|---|---|---|---|---|
| Header / revision notice / rules | Re-verified line refs; reflects U-17, T-17 cut, T-26 split, "T-14 if A keeps it"; new rule 8 "display is not security"; screenshot redaction in rule 4 | Guide predated decisions on `main` | DEC; request §3B | — |
| §A, §B | Reviewer = A for every task (U-17); `DashboardHud.tsx` and `timing.ts` lines added to ownership; B named for the profile-status dependency; status column per task | Consistency | DEC (U-17) | — |
| **T-16** | Evidence that `matched.length > passedBeats` is **reachable** (`useRhythmJudge` matches up to 50 ms early but counts a beat as passed only 50 ms after it); requires either evidence it is impossible for every caller or an explicit cap at 100; new tests (upper bound, `passedBeats = 0`); AC 4; formula unchanged, with the per-target denominator raised as U-35 instead of changed | The D13 formula as coded can return > 100 % | Request §3C; code on `main` | **Ready** |
| **T-15** | Item 1 rewritten: `loading={!profile}` withdrawn (a missing profile would show a permanent loading state); four states (loading / loaded / not found / failed) with a UI table; needs a profile status from B (`AuthContext.tsx` is B's file and today swallows errors and upserts a default profile, DEF-002); wording from A (U-37); "not a security control" note; AC 5; items 2–8 unchanged and may merge first. Line refs for item 1 updated to `main` (`:80-84`, HUD `:325`) | Missing vs loading vs error are indistinguishable today | Request §3B; code on `main` (W5) | Items 2–8 **Ready**; item 1 **Blocked** (B; U-37) |
| T-18 | Note that the T-07 files are already deleted | Accuracy | DEC (PR #31) | **Ready** |
| **T-14** | Explains why `useState(false)` fails AC2 (lost on reload/sign-out before placement) and why it partly works (placement is account-level in `user_metadata`); options P1 session / P2 browser-local `localStorage` per user / P3 account-level (`user_metadata` or a `profiles` column); P2 explicitly not cross-device; P3 requires A to lift "No database writes" and AC4 first; AC 2 and 4 made conditional on U-25; AC 5; new manual checks (reload before placement, second browser) | "Once" was undefined; the stated implementation cannot meet the stated criteria | Request §3A; code on `main` | **Decision required** (U-25); component **Ready** |
| **T-17** | Status = Cut unless reinstated (U-36); consumer table from `main`; found `NotationTest.tsx:34 notes.map(midiToName)` (index would become `spelling`); compatibility check (item 0) before claiming backward compatibility; field-by-field regression tests over MIDI 21–108 written before the change; AC 1 and 5 | The return shape changes even though values do not | Request §3D; code on `main` | **Cut** (requirements ready if reinstated) |
| **T-21** | HAR handling rules (tokens, cookies, ids, payloads; never committed; delete after acceptance); redaction rules; test account; unexpected-request triage procedure (initiator, camera/mic off comparison, clean profile); trusted-operation endpoint expected if deployed; AC 2–3 | HAR files hold secrets; third-party requests are not automatically leaks | Request §3E | **Ready** (needs a staging URL) |
| **T-22** | Header metadata (versions, OS, device); `n/a` must have a reason; untested cells never pass; no results from memory or other columns | Prevent fabricated results | Request §3F | Waits for IC-3 |
| **T-26** | D = test appendix only (A drafts SRS/SDD); describe the delivered implementation; sections depending on U-23 / U-24 / D14-R / U-25 marked pending until decided and merged; re-check against `main` on sign-off day | D14 is being revisited; docs must not be outdated on delivery | Request §3G; DEC (handoff §F) | **Blocked** for final content |
| §D / §E / §F | "Never commit" row (HAR, unredacted screenshots, `.env`); hosted projects added to "do not touch"; PR lists open decisions | Consistency | — | — |

---

## 3. Deliverable 4: Unresolved decisions

These IDs are **proposed**. A should add them to `docs/execution/UNRESOLVED_DECISIONS_AND_INFORMATION_NEEDED.md` (and D14-R to `RULINGS.md`). None of them is decided by this revision.

> **Status update 2026-11-21.** The project owner approved the defaults in `docs/audit/PROGRESSION_ARCHITECTURE_DECISION.md`. That settles these rows:
>
> | Row | Settled by | Outcome | What still needs doing |
> |---|---|---|---|
> | U-23 | PA-D11 + whole document | PostgreSQL `SECURITY DEFINER` RPCs | **An owner for T-28 is still unassigned** |
> | U-24 | §7 contracts, §7.0 ledger | Contracts and idempotency rules fixed | — |
> | D14-R | PA-D10 | Staged: Stage A keeps D14; Stage B revokes direct writes | Team ratification (it reverses a team ruling) |
> | U-30 | §11 row 16 | (a) Stage A only, if E1 exists by Mon 11-23; else (c) current path with D14 and P1/P2 documented by a ruling | Record which branch applies on Mon 11-23 |
> | U-31 | §7.5 | Profiles created only by the signup trigger; client upsert removed | B's DEF-002 / T-03 change |
> | U-32 | PA-D8 | Hearts and regeneration are server-authoritative | — |
>
> **Also settled (handoff X2–X11, approved 2026-11-21):**
> - U-22: shared dev with real user data.
> - U-28: fresh E1, Path A.
> - U-26: F2 on `Muz-Database` after a backup and an E1 test.
> - U-06: fresh production project.
> - U-27: SEC-01 C writes, A reviews; T-28 A writes, C reviews.
> - U-25: P1, tied to placement.
> - U-33: A applies migrations.
> - U-34: apply `is_dev` + `dev_test_results` on E1.
> - U-35: cap at 100.
> - U-36: T-17 stays cut.
>
> **Still open:** U-29 (only if `Muz-Database` is ever reconciled) and U-37 (A's wording). The C/D guides carry a "Decision update 2026-11-21" block, and their §B statuses are updated (N-9 done).

| ID | Question | Why it matters | Affects | Options (no recommendation is a decision) | Decides |
|---|---|---|---|---|---|
| **U-22** | Is `Muz-Database` staging, production, or a shared dev/staging project holding real user data? Is it the "existing project" in U-08? | Everything that touches the database depends on it. The handoff counted 5 existing profiles and said to leave them alone; local dev also points at the existing project (`ENVIRONMENTS.md`) | F2 (applying), T-05, T-13, T-20, T-23, T-25, AUX-TEST-ACCESS-01 | Record the role per project in `docs/ENVIRONMENTS.md` | A |
| **U-28** | Revisit U-08: keep `Muz-Database` as staging after reconciliation, or create a fresh isolated staging project? | U-08 was decided before the audit showed the schema differs and the migration history is empty. With only one database, nothing can be "tested on staging before live" | T-05 Part 2, T-20, T-23, and the "staging before live" rule | Fresh project (Path A) · reconcile the existing one (Path B) | A |
| **U-29** | For Path B: bring the hosted schema to the repository's definitions, or update the repository to match hand-made hosted changes (e.g. `profiles.last_heart_update`), or both? How is the migration history reconciled? | Decides which SQL gets written; C must not choose | T-05 Path B, every later migration | Per difference, as a plan A approves | A (C proposes) |
| **U-23** | Trusted progression architecture: is progression (completion, performance, EXP, hearts, streak, achievements) moved to a trusted backend operation (RPC or Edge Function)? Which kind? Who owns it (T-28 is unassigned)? When? | T-13 13.3, T-20's matrix, T-23 † rows, T-26 and the D14 revisit all depend on it | T-28, T-13, T-20, T-23, T-26, T-11 (B), placement (W3), hearts regen (W2) | Approve T-28 now · keep it deferred (then D14 stays and the limitation is documented) | A (+ team) |
| **U-24** | Trusted save operation and idempotency contract: inputs (what the client sends), what the server derives (lesson facts, EXP, hearts, streak, badges), the idempotency key (name, scope, where it is stored), atomicity, and the response classes (applied / already applied / retryable / permanent) | Without it, the offline queue cannot be bound and exactly-once cannot be tested | T-13 13.3, T-23 E2E-25…30, T-28 | To be designed with T-28; the on-hold `run_id` migration is one possible piece | A (T-28 owner designs) |
| **D14-R** | Revisit ruling D14: does a user keep direct write access to their own `exp` / `hearts` / streak / completion / performance / achievement rows? | Retaining it conflicts with server-authoritative progression; reversing it removes write paths W1–W3, W5 and T-11's design, so it **must not** be applied before the replacement works | T-20 §4, SEC-01, T-28, T-26, F2's boundary, B's T-11 | **Retain:** T-20 records it as an accepted limitation with date and wording "not protection against self-manipulation"; SDD 3.3 says so · **Reverse:** revoke direct client writes on progression columns/tables (SEC-01/T-28), update T-20 to expect denial, update T-11 and placement to use the trusted operation | A (+ team; it was a team ruling) |
| **U-26** | May F2 be applied to the live/shared database **before** the progression architecture is ready? | The sequencing rule says not to tighten permissions on the live database first. But F2 closes **anonymous** read and write of every profile and removes no legitimate client path (every client access is own-row, verified on `main`). Waiting may leave a P0 open until release | F2, AUX-TEST-ACCESS-01 (waits on F2) | Apply F2 to the shared database after a backup and a test on an isolated copy · wait for full staging | A |
| **U-27** | SEC-01 (proposed new task): who owns the remediation of RLS policies **and** grants for the other five tables (and the final `profiles` grants)? What is its scope, and does it run before or with T-28? | Grants and policies are separate; nothing currently owns the five tables' grants | T-05 baseline, T-20 | New task ID and owner (C proposed as `supabase/` owner, but C is over capacity) | A |
| **U-30** | Schedule: the release target is Fri Nov 27 / Sat Nov 28 (U-01). T-28 → T-13 13.3 → T-20 → T-23 cannot all fit in 4 working days after today (Nov 21) with the current capacity. What is cut or deferred? Specifically: does T-13 ship as (a) not delivered, (b) an interim queue over the client pipeline with a documented duplicate/partial-save risk, or (c) wait for T-28? | Otherwise the plan silently slips or silently ships an unsafe interim | T-13, T-20, T-23, T-28, T-24, T-25 | Cut order from roadmap §9 plus an explicit T-13 choice | A (with the adviser if an SRS item is dropped) |
| **U-31** | Under the trusted architecture, who creates a missing profile and with which starting values? Today the browser upserts one with EXP 100 / hearts 5 / streak 1 (W5), which also hides a missing signup trigger | Conflicts with server-authoritative progression; masks a T-05 defect; overlaps DEF-002 (B, T-03) | T-03 (B), T-05, T-15 item 1, D14-R | Trigger only · client upsert with server-side defaults · keep as is (documented) | A + B |
| **U-32** | Are hearts regeneration and the "next heart" timer server-authoritative? (deferred T-30 exists) | If hearts become server-authoritative, W2 and `useHeartRegen` must change too, and E2E-17 changes | T-28 / T-30, T-23 E2E-17 | Include in T-28 · keep client-side under D14 | A |
| **U-33** | Who applies migrations to each hosted project? `ENVIRONMENTS.md` says "A only"; the original C guide had C apply them | Avoids two people changing the same database | F2, T-05, T-13, SEC-01 | A only · A delegates per action in writing | A |
| **U-34** | On a fresh staging project, is `20261120000000_profiles_is_dev.sql` applied (and by whom), given that AUX-TEST-ACCESS-01's apply/check/grant steps are A's? | "Apply all migrations in order" includes it | T-05 Path A, AUX-TEST-ACCESS-01, T-20 check 5 | Apply with the others (A) · skip until A's AUX workflow | A |
| **U-25** | T-14: does "once" mean once per browser or once per account across devices? Is "until placement is finished" enough? | P3 needs a backend write, which the original brief forbade | T-14, T-23 E2E-06 | P1 · P2 · P3 (`user_metadata` or `profiles` column) | A |
| **U-35** | T-16: is the D13 denominator `passedBeats` or "every target that has a matched tap or has passed"? | The coded formula can exceed 100 % mid-run; a cap fixes the range but not the definition | T-16 | Cap only · adjust the denominator (formula change, needs a ruling) | A |
| **U-36** | Reinstate T-17? | It is cut; the revised requirements only apply if reinstated | T-17 | Keep cut · reinstate | A |
| **U-37** | T-15 item 1: what the HUD says for "profile not found" and "profile failed to load", and how "not found" is reported | Rule 7 forbids D inventing wording | T-15 | Wording + reporting channel | A (+ B) |
| (existing) U-06 | Production: new project or promote staging | Now also depends on U-22 | T-25 | — | A + B |
| (existing) branch protection | "A failing PR blocks merge" | T-05 AC 2 | T-05 | — | A |

---

## 4. Deliverable 5: Updated execution sequence

### Can proceed now (no open decision needed)

| Member | Work |
|---|---|
| C | F2 follow-up: audited INSERT/UPDATE drift tests (step 3), open PR. T-05 Part 1 open items with B (env vars, staging URL, Auth URLs). T-05 verification checklist as a reusable section. T-13 13.2 queue mechanics (in-memory tests). T-20 script against the draft matrix (not run for evidence). T-23 draft. |
| D | T-16 (incl. upper bound). T-15 items 2–8. T-18. T-14 component only. T-21 as soon as a staging URL exists. T-22 prep. T-26 appendix outline. |

### Waiting for an approval (quick, no architecture needed)

| Item | Waits for |
|---|---|
| F2 applied to the shared DB | U-22, U-26, U-33, backup |
| T-13 13.1 (`runId`) | A |
| T-14 wiring | U-25 (and A keeping T-14) |
| T-15 item 1 | B's profile status; U-37 wording |
| T-17 | U-36 |

### Blocked on the architecture (dependency order)

1. **Resolve the trusted progression architecture** (U-23), including U-31 and U-32.
2. **Decide D14-R** (retain or reverse), recorded in `RULINGS.md`.
3. **Define the trusted save operation and idempotency contract** (U-24).
4. **Update C's tasks to the decisions:** T-05 baseline definition, F2 boundary (unchanged unless D14-R changes column rules), T-13 13.3, T-20 approved matrix. **Update D's tasks:** T-14 (U-25), T-15 item 1 (U-31 / U-37), T-17 if reinstated (U-36).
5. **Identify and prepare staging:** U-22, U-28, (U-29 if Path B); T-05 Part 2 checklist V1–V10 passes.
6. **Complete the approved staging security remediation:** F2 + SEC-01 (+ T-28 permission changes if D14 is reversed), on staging only.
7. **Execute T-20** against the prepared staging.
8. **T-13 13.3 and T-23** against the final architecture on staging.
9. **Only then** apply the progression-related permission changes to the live/shared database (exception: F2's anonymous/ownership fix, if A approves U-26).
10. **T-26:** documentation matches the delivered implementation; T-25 production follows the same migration list and checklist.

**Schedule warning (U-30).** Steps 1–8 are not achievable by the Nov 27 release at current capacity. A must choose cuts or deferrals explicitly; this revision does not assume any.

---

## 5. Final consistency check

| # | Question | Result |
|---|---|---|
| 1 | Do C and D have conflicting assumptions? | **One conflict left, flagged.** T-15 item 1 (D) needs a profile status from `AuthContext.tsx` (B), while B's T-03 (DEF-002) is changing the same function. Both guides now name B as the owner; B is not a member of this revision. Otherwise none: both treat progression as client-side today and the trusted operation as pending; both use A as reviewer; T-13 still cuts its wiring after D's T-15. |
| 2 | Does any task depend on a migration or policy that does not exist in the audited database? | **Yes, and now stated:** T-05 (signup trigger, constraints, indexes), F2 (assumes repo policy names only for the policies it keeps; drops the others whatever they are called), T-13 (`run_id`, on hold), T-20 (owner-only policies on all six tables), AUX-TEST-ACCESS-01 (`is_dev` column and guard trigger, missing on the hosted DB). Each is now gated on T-05 Part 2 / SEC-01 rather than assumed. **Not verifiable here:** whether RLS is *enabled* on the five tables that have no policies. If it is enabled, every client read/write of those tables (W1, W3, `useDashboardData`) is denied today and saving is already broken on the hosted DB; if it is disabled, the broad `anon` grants make them anonymously readable and writable. The audit report should state which; this is a P0 either way. |
| 3 | Does any acceptance criterion permit behaviour that contradicts the approved security architecture? | No architecture is approved yet. Under the **current** ruling (D14 as decided on `main`), T-20 still permits own-row progression writes, **but only if D14-R re-confirms D14**, and then only as a dated, worded limitation. No criterion treats an anonymous or cross-user write as acceptable. |
| 4 | Does offline sync rely on an outdated client-side save pipeline? | No. T-13 13.3 must target the trusted operation (I-1) and AC 6 forbids calling `saveLessonResult` from the queue. The only exception is interim option (b), which exists only if A explicitly chooses it under U-30. |
| 5 | Are progression values still writable directly by ordinary clients? | **Yes, today, and the guides say so** (W1–W7; plus anonymous writes to any `profiles` row on the hosted DB until F2 is applied). This stays true until D14-R and T-28 are decided and delivered. It is listed as an open security limitation, not as resolved. |
| 6 | Are staging and production clearly distinguished? | In the guides, yes: T-05 has a two-column table (fresh staging vs `Muz-Database`), every hosted action needs the role recorded (U-22), and T-20's script refuses to run without a matching environment label. **In the project, not yet:** U-08 says the existing project is staging, the same project is used by local dev, it holds existing real profiles, and U-06 may promote it to production. That is unresolved (U-22, U-28). |
| 7 | Are unresolved decisions visibly marked rather than silently assumed? | Yes. Every dependent part carries **BLOCKED**, **AWAITING APPROVAL** or **DECISION REQUIRED** with a decision ID, and the IDs are listed in §3. No SQL, RPC signature, Edge Function contract or idempotency key name was invented. |
| 8 | Do the task dependencies reflect the actual implementation order? | Yes, per §4. **Remaining tension:** the request's rule "do not tighten permissions on the live database before the replacement mechanisms are ready and tested on staging" conflicts with F2 being an open P0 that allows anonymous writes to every profile. The guides do not resolve this; they make it decision U-26. |
| 9 | Other issues found while reconciling | (a) The revision was first drafted on a branch 92 files behind `main` and has been moved to `task/SEC-AUDIT-guide-revision` (from `origin/main` @ `e96c34c`); the `dev_test_results` table and F2's merge were folded in afterwards. (b) The old branch carried the draft `RULINGS.md`; this branch has the decided one. (c) An uncommitted `supabase` CLI dev dependency in `package.json` / `package-lock.json` on the old branch was stashed (`stash@{0}`), not committed or discarded. (d) `NotationTest.tsx` uses `notes.map(midiToName)`, relevant if T-17 is reinstated before T-18 deletes it. (e) `devTestResults.ts` and its migration call their decision "Decision D1", which collides with ruling **D1** (audio window) in `RULINGS.md`; A should give it a distinct ID. |
