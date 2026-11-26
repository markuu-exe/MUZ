# MUZ security test report (RLS and permissions)

> Status: TEMPLATE. Nothing has been run yet. Fill it in after running `scripts/rls-check.ts`. Never put keys, passwords, project refs or real users' data in this file.

Requirement: SRS 3.5.2 (owner-only access on all tables), SRS 3.5.1 (no media stored), TLS 1.3 for cloud traffic.
Ticket: KAN-275. Script: `scripts/rls-check.ts`. Reviewer: A.

## 1. Run details

| Item | Value |
|---|---|
| Environment and role (U-22) | ___ (isolated staging only. Never `Muz-Database`, which is shared development with real users) |
| Date and time | ___ |
| Commit of the repository | ___ |
| Migrations applied on this environment, and who applied them (U-33) | ___ |
| Seed applied | ___ (lessons: ___ rows, achievements: ___ rows) |
| Permissions matrix tested | Stage A (today's grants, ruling D14 still in force) |
| Test accounts | User A and user B, throwaway, emails not recorded here |
| Run number | 1 of 2 (second run after the end-to-end checklist has created more data) |

## 2. How to run (PowerShell, inside the project folder)

```powershell
$env:SUPABASE_URL = "<staging project URL>"
$env:SUPABASE_ANON_KEY = "<staging publishable key>"
$env:RLS_USER_A_EMAIL = "<test user A email>"
$env:RLS_USER_A_PASSWORD = "<test user A password>"
$env:RLS_USER_B_EMAIL = "<test user B email>"
$env:RLS_USER_B_PASSWORD = "<test user B password>"
npx tsx scripts/rls-check.ts
```

Before the run: user A must have completed at least one lesson so every table holds an A row (otherwise checks show SKIP). Use the publishable key only, never a secret or service-role key. Close the PowerShell window afterwards so the passwords are gone.

## 3. Results from the script

Paste the table the script prints, or fill one row per check. Verdicts are PASS, FAIL, SKIP or ACCEPTED RISK.

| Check | Expected | Actual | Verdict |
|---|---|---|---|
| anon: select profiles | denied (0 rows or error) | ___ | ___ |
| anon: insert profiles | denied | ___ | ___ |
| anon: update profiles | denied | ___ | ___ |
| anon: delete profiles | denied | ___ | ___ |
| (repeat the four anon checks for `user_progress`, `performance_records`, `user_achievements`, `dev_test_results`, `lessons`, `achievements`) | | | |
| B: select A's rows in each user table | 0 rows or error | ___ | ___ |
| B: update A's row in each user table | 0 rows or error | ___ | ___ |
| B: delete A's row in each user table | 0 rows or error | ___ | ___ |
| B: insert as A into each user table | denied | ___ | ___ |
| B: select `lessons` and `achievements` | allowed (at least 1 row) | ___ | ___ |
| B: insert, update or delete in `lessons` and `achievements` | denied | ___ | ___ |
| B: update own `profiles.exp` (same value) | allowed by design (ruling D14) | ___ | ACCEPTED RISK |

Summary line from the script: ___ checks, ___ failed, ___ skipped. Exit code: ___ (0 = no failures, 1 = at least one failure, 2 = setup problem).

## 4. Checks the script does not do (do these by hand, read-only)

The script tests behaviour. It does not read grants or policies, and it does not test what user A is allowed to do to their own rows. Record each below.

| Check | How | Expected | Actual | Verdict |
|---|---|---|---|---|
| User A can read own `profiles` and `user_progress` | Sign in as A in the app, or add own-row checks to the script | allowed | ___ | ___ |
| User A can save a lesson result (own rows) | Complete a lesson as A | allowed. If this fails, a fix broke the app | ___ | ___ |
| Grants held by `PUBLIC`, `anon` and `authenticated` | SQL editor on the staging project, read-only (query below) | Equals the approved matrix. An excess grant is a FAIL even if a policy blocks it | ___ | ___ |
| RLS enabled on every table | SQL editor, read-only (query below) | true for all | ___ | ___ |
| Policies list | SQL editor, read-only (query below) | `to authenticated` with `auth.uid()` on user tables | ___ | ___ |

Read-only queries (SQL editor, staging only):

```sql
-- grants per role and table
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('PUBLIC','anon','authenticated')
order by table_name, grantee, privilege_type;

-- RLS enabled?
select relname, relrowsecurity from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r' order by relname;

-- policies
select tablename, policyname, roles, cmd from pg_policies
where schemaname = 'public' order by tablename, policyname;
```

## 5. Allowed by an approved ruling (not a failure)

| Operation | Ruling | Limitation to state |
|---|---|---|
| A signed-in user can change their own `exp`, `hearts`, streak and completion rows | D14, kept by U-30 option (c) | A user can set their own progression values. This is not protection against self-manipulation. |

Any other unexpected access is recorded as FAIL and reported to A as a P0 the same day. It is never described as acceptable unless a decision names that exact operation.

## 6. Transport security (SRS 3.5.2)

| Item | Value |
|---|---|
| Browser and version | ___ |
| How observed | DevTools, Security (or Network, Protocol) on a request to the Supabase host |
| TLS version seen | ___ (expected 1.3) |
| Secrets in the client bundle | ___ (search the built `dist/` for the words `service_role` and `secret`; expected none) |

## 7. Defects and follow-up

| Defect ID | Description | Severity | Owner | Status |
|---|---|---|---|---|
| ___ | ___ | ___ | ___ | ___ |

## 8. Sign-off

| Role | Name | Date |
|---|---|---|
| Tester | Rosales (C) | ___ |
| Reviewer | A | ___ |

## 9. Evidence to attach

- PR link and the script output (with no secrets).
- Screenshot of the TLS version.
- Comment on KAN-275 with the PR link and the summary line.
- Second run output after the end-to-end checklist.
