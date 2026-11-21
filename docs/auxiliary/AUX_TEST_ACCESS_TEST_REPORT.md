# AUX-TEST-ACCESS-01 — Test Report (`profiles.is_dev`)

| | |
|---|---|
| **Design** | `AUX_TEST_ACCESS_IS_DEV_DESIGN.md` (§7 scenarios) |
| **Branch / commit** | `task/AUX-TEST-ACCESS-01` @ `9c6a7fb` (base `origin/main` @ `67dc05e`); merged to `main` as PR #23 (`f2c79ed`) |
| **Date** | 2026-11-19 |
| **Migration applied?** | **No.** It waits for **Member C's** `profiles` anonymous-read fix (F2, prerequisite). After that, **Member A** owns the backup, migration, check script, tester grants and manual checks (design §11). Until then every DB scenario and every developer-account scenario is **not run**. |

## 1. Automated checks (run)

| Check | Command | Result |
|---|---|---|
| New unit tests: watched them fail first | `npx vitest run src/lib/progress/__tests__/devAccess.test.ts` before `devAccess.ts` existed | FAIL: `Cannot find module '../devAccess'` (expected) |
| New unit tests | same, after implementation | **10 / 10 passed** |
| Full suite | `npx vitest run` | **31 files, 424 tests passed** (baseline on `origin/main`: 30 files, 414) |
| Typecheck | `npx tsc -p tsconfig.json --noEmit` | exit 0 (after adding `is_dev?` to the profiles Insert/Update types; see §4) |
| Production build | `npm run build` | success; `index-*.js` 837.36 kB (252.21 kB gzip). No `origin/main` build was run for comparison. |

The unit tests cover:
- `canOpenLesson` for locked / current / mastered × developer / normal;
- `isDevAccount` for `true`, `false`, a missing column, a null/undefined profile, demo mode, and truthy non-boolean values (fails closed).

## 2. Browser check (run, normal-account path only)

Run on the `npm run dev` preview at 1366×850, guest demo "beginner" persona (`ApprenticeKeys`):

| Scenario | Result |
|---|---|
| Click a locked node ("Treble Clef Lines & Spaces") | **Blocked**: banner "Node Locked: … You must complete the prerequisite lesson nodes…"; nothing opens |
| Click an unlocked node ("Checkpoint: Meet the Keyboard") | Opens the detail panel; button reads **"Start Lesson"** (no developer label) |
| Developer chip | **Not shown** (guest demo is never a developer) |
| Console errors | None |

A real developer account could not be exercised: the column does not exist in the database yet, and Claude does not sign in with real credentials.

## 3. Pending scenarios (run after the migration is applied)

**Owner: Member A** (design §11, steps A-1…A-7). **Prerequisite:** Member C's F2 fix merged and notified. Record each result in this table. Do not record tester emails or IDs here.

| ID | Scenario | How | Result |
|---|---|---|---|
| DB-1…DB-7 | Default false; self-update, upsert and insert ignored; normal writes intact; cross-user blocked; owner grant/revoke; flag survives the profile-wipe upsert; guard is SECURITY INVOKER | Run `docs/auxiliary/sql/is_dev_guard_check.sql` in the SQL editor (it rolls back). It must end with "all checks passed". | Not run |
| DB-8 | REST `PATCH /rest/v1/profiles?id=eq.<self>` `{"is_dev":true}` with a normal user's JWT | Browser dev tools while signed in as a normal test account; then re-read the profile | Not run |
| M-1 | Developer opens a locked node | Grant a test account; reload; click a locked node | Not run |
| M-2 | Normal account blocked on the same node | Second test account | Not run |
| M-4 | Developer completes a lesson: only that lesson's rows/EXP change | Before/after query on `profiles`, `user_progress`, `performance_records`, `user_achievements` | Not run |
| M-5 | Reload / sign out / sign in; switch to a normal account in the same tab | — | Not run |
| M-6 | Revoke in SQL, then reload → normal locks | — | Not run |
| M-7 | Normal account forges `is_dev` in dev tools → own UI unlocks | **Expected, documented limitation** (design §3) | Not run |
| M-8 | Granting changes nothing but `is_dev` | Before/after snapshot | Not run |
| M-9 | Developer at 0 hearts, practice lesson → still blocked | — | Not run |

## 4. Deviations from the design

- **The developer indicator is a header chip** ("Developer access", next to the existing "Guest Demo" chip, with a tooltip) rather than a full-width banner row. It is the same one-line indicator; the chip doesn't compete with the existing locked-node and 0-heart banners.
- **`is_dev?: boolean` is also declared on the profiles Insert/Update types**, not only on Row. `AuthContext.tsx:169,203` pass whole profile rows to `update` / `upsert`, and supabase-js rejects properties missing from those types. Declaring the field keeps `AuthContext.tsx` untouched (decision §10.3). This is not a security control either way: the database trigger ignores client writes.

## 5. Security code review

An independent reviewer read the diff `67dc05e..9c6a7fb`, read-only. It re-ran `tsc` (clean) and the new tests (10/10).

**Verdict:** "With fixes". No critical issues. It found no path by which a client role can set `is_dev`; it checked REST PATCH, plain INSERT, and PostgREST upsert including the `EXCLUDED` semantics.

| Finding | Severity | Action |
|---|---|---|
| The SQL check never exercised the guard's INSERT branch on a fresh row | Important | **Fixed:** new DB-4b deletes a throwaway profile, then inserts it as the client with `is_dev = true` and expects `false` |
| Several checks passed when the row was missing (`if NULL`) | Minor | **Fixed:** all comparisons are NULL-safe (`is not false`, `is distinct from`); row counts asserted with `GET DIAGNOSTICS`; the guard's existence and BEFORE INSERT/UPDATE timing are asserted |
| No check that `service_role` can grant | Minor | **Fixed:** DB-6b revokes and re-grants as `service_role` |
| Docs said "not implemented"; the DB-8 steps were missing from the commit | Minor | **Fixed:** status lines updated; this report committed |
| Defence in depth for future `SECURITY DEFINER` writers (recommendation) | — | **Adopted:** the guard also treats any request carrying an end-user JWT (`anon` / `authenticated`) as a client. New check DB-6c. |
| Leave `is_dev` out of the Insert/Update types | Minor | **Declined:** without it `AuthContext.tsx:169,203` fails to type-check (§4), and decision §10.3 keeps that file untouched. The trigger is the control. |
| No render test for the `handleSelect` wiring | Minor | **Not done:** the repo has no component-test setup (no jsdom or Testing Library), and adding one is out of scope. The wiring is a single condition, checked in the browser (§2). |
| Coordinate migration timestamp ordering with C's `profiles` fix | — | Noted for Member A, who applies the migration (design §11, step A-1) |

The SQL script was revised **without being executed**, because there is no local Postgres here and the migration is not applied. It must pass on the database before the migration is signed off.

## 6. Remaining security limitations

1. **The lesson lock stays client-side for everyone.** Payloads are in the JS bundle and readable from `lessons` by any signed-in user. The flag controls the lock *experience*, not content access.
2. **Revocation takes effect on the next profile load** (reload, sign-in, or `refreshProfile` after a lesson save).
3. **Until C's fix, the live `profiles` table is readable anonymously**, which would reveal which accounts have `is_dev = true`. This is why the migration waits.
