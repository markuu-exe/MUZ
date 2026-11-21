# Auxiliary Workstreams — Status

These are Member A's additional tasks, kept separate from T-01…T-26. Neither changes any original T-xx assignment or deadline. Since 2026-11-19 the AUX-TEST-ACCESS-01 follow-up is listed in the execution docs as **A-owned work outside T-01…T-26**, with C's existing F2 fix as its prerequisite.

| ID | Status (2026-11-19) | Next step |
|---|---|---|
| **AUX-AI-01** | **Paused.** The assessment is kept as reference. No implementation and no measurements. R1/R2/R3 are not started. | Any measurement is coordinated with T-19 (one hardware session), when A decides |
| **AUX-TEST-ACCESS-01** | **Redesign: `profiles.is_dev`** (`AUX_TEST_ACCESS_IS_DEV_DESIGN.md`). §10 decisions recorded (all recommended options). **Code merged** (PR #23, `f2c79ed`). **Migration not applied.** | **Prerequisite (Member C):** F2 `profiles` fix merged, then notify A. **Then Member A:** verify F2 → backup → apply migration → run `sql/is_dev_guard_check.sql` → grant test accounts → manual checks → record results, update Jira and notify the team (design §11). |

## Reversion audit (2026-11-19)

**Database:** nothing was applied. No Supabase SQL was run, no migration pushed, and no project setting changed. I never connected to the Supabase project during this work.

**Git:** the only work after the first approval is one **local, unpushed** commit, `c47a50c`, on the new branch `task/AUX-TEST-ACCESS-01` (cut from `origin/main` @ `67dc05e`). It contains:

| File | Origin | Proposed fate |
|---|---|---|
| `supabase/migrations/20261120000000_lesson_test_access.sql` | Implementation (old table design) | Discard |
| `src/types/database.types.ts` (+8 lines, `lesson_test_access` type) | Implementation | Discard |
| `docs/auxiliary/sql/test_access_rls.sql` | Implementation (table-specific RLS test) | Discard |
| `docs/auxiliary/AUX_TEST_ACCESS_DESIGN.md` | Design doc 4 of 6 | A decides: superseded |
| `docs/auxiliary/AUX_TEST_ACCESS_IMPLEMENTATION_PLAN.md` | Design doc 5 of 6 | A decides: superseded |
| `docs/auxiliary/AUX_TEST_ACCESS_TEST_REPORT.md` | Design doc 6 of 6 | A decides: superseded |

**Untouched:** `task/T-02-rulings-final` (still @ `0fcec46`, clean), `main`, every other branch, and all T-xx work. No AUX-AI-01 code was written.

**Untracked on disk at the time of the audit** (not committed anywhere then): `AUX_AI_FEATURE_ASSESSMENT.md`, `AUX_AI_CLAIMS_AND_EVIDENCE.md`, `AUX_AI_IMPROVEMENT_PLAN.md`, `AUX_TEST_ACCESS_IS_DEV_DESIGN.md`, and this file.

**Reversion: DONE (approved by A, 2026-11-19).**
- Steps 1 and 3 were run; step 2 was skipped, so the three old test-access docs were not kept.
- The old `task/AUX-TEST-ACCESS-01` (table design, `c47a50c`) was deleted. The branch name was reused afterwards for the `is_dev` implementation, cut fresh from `origin/main`. If ever needed: `git branch recover-aux c47a50c` while it is still in the reflog.
- Verified afterwards: on `task/T-02-rulings-final` @ `0fcec46`; no `lesson_test_access` in `src/` or `supabase/`; only the five untracked `docs/auxiliary/` files remain.

Steps as proposed:
1. `git switch task/T-02-rulings-final`. The untracked docs move with the working tree.
2. If A wants to keep any of the three old test-access docs: `git show c47a50c:docs/auxiliary/<file> > docs/auxiliary/<file>`.
3. `git branch -D task/AUX-TEST-ACCESS-01`. It was never pushed; the commit stays recoverable through `git reflog` for about 90 days.

No cleanup commit is needed, because the change never reached a shared branch.
