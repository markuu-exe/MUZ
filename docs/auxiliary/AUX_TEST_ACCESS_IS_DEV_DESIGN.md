# AUX-TEST-ACCESS-01 — Revised Design: `profiles.is_dev`

| | |
|---|---|
| **Task** | AUX-TEST-ACCESS-01 (additional workstream, Member A). Not part of T-01…T-26. |
| **Status** | **Implemented** on branch `task/AUX-TEST-ACCESS-01` (A's go-ahead, 2026-11-19; decisions in §10). **Migration not applied** (waits for C's `profiles` fix, §10.5). Results in `AUX_TEST_ACCESS_TEST_REPORT.md`. |
| **Supersedes** | `AUX_TEST_ACCESS_DESIGN.md` (the `lesson_test_access` table, approach A) |
| **Date** | 2026-11-19 |
| **Code baseline** | `origin/main` @ `67dc05e` |

## 1. Current architecture (as relevant here)

### 1.1 Lesson access

**Lesson access is decided only in the browser.**

| Step | Where | What |
|---|---|---|
| 1 | `src/lib/dashboard/curriculum.ts:122-145` `nodeStatus()` | Pure function → `mastered` / `current` / `locked` |
| 2 | `src/components/dashboard/DashboardScreen.tsx:171` `handleSelect()` | `if (status === 'locked')` → shake + banner, return. **This is the only access gate.** Both the skill tree (`SkillTreeView` → `onSelect`) and the Lessons list (`DashboardScreen.tsx:497-509`) route clicks through it. |
| 3 | `DashboardScreen.tsx:190` | `hearts === 0 && lesson.kind === 'practice'` → blocked (the heart rule) |
| 4 | `DashboardScreen.tsx:695-701` | "Start Lesson" → `setActiveLesson` → `LessonPlayer` |

### 1.2 The `profiles` table (migration `20260509120000_initial_schema.sql`)

| Item | Current state | Consequence for `is_dev` |
|---|---|---|
| Table grant | `grant select, insert, update on public.profiles to authenticated` | **A table-level UPDATE grant covers every column, including a new one.** |
| RLS | `profiles_select_own`, `profiles_insert_own`, `profiles_update_own` (all `id = auth.uid()`) | RLS restricts **rows, not columns.** A user can `PATCH /rest/v1/profiles?id=eq.<self>` with `{"is_dev": true}`, and RLS would allow it. |
| Client reads | `AuthContext.tsx:74` `.select('*')`, so a new column arrives in `profile` automatically | No extra query needed |
| Client writes | `AuthContext.tsx:169` `.update(updates)`; `:203` `.upsert(defaultProfile)` (profile-wipe path, T-03); `:559` hearts sync; `useGamification.ts:340,526`; `supabaseStore.ts:49,61,100` | None of these send `is_dev` today, but **an attacker can send any column** |
| Live drift (rulings §4.3) | The live `profiles` table was found **readable anonymously** (P0, owner C, T-20) | Until fixed, anyone could see **which accounts are developers** |

**Conclusion:** adding the column alone is **not safe**. Users could make themselves developers. The column needs a database-side guard.

## 2. Proposed schema change

### 2.1 Options considered for protecting the column

| | 1. Column + guard trigger (**recommended**) | 2. Column-level grants | 3. Separate table (previous design) |
|---|---|---|---|
| **How** | A `BEFORE INSERT OR UPDATE` trigger keeps `is_dev` unchanged unless the writer is an admin role | `revoke insert, update on profiles from authenticated`, then `grant insert (…), update (…)` on every column **except** `is_dev` | Allowlist table |
| **Changes existing grants?** | No | **Yes:** rewrites the `profiles` grants that C's T-20 is working on | No |
| **Breaks existing writes?** | No. Writes that don't mention `is_dev` are untouched. | Any client write naming an unlisted column fails (e.g. the `upsert(defaultProfile)` sends `created_at`) | No |
| **Future columns** | Unaffected | Every new column needs an explicit grant (an easy-to-forget gotcha) | — |
| **Size** | 1 column + 1 small function + 1 trigger | 1 column + 2 revokes + 2 long grant lists | 1 table + policy (rejected by A as too complex) |

**Recommendation: option 1.** It is the smallest change that is still safe, and it leaves the existing grants and RLS alone.

### 2.2 SQL (as designed; see `supabase/migrations/20261120000000_profiles_is_dev.sql` for the implemented version)

> **Change made after the code review:** the implemented guard also treats any request carrying an end-user JWT (`request.jwt.claims` role `anon` / `authenticated`) as a client, even when `current_user` is an admin role. This covers any future `SECURITY DEFINER` function that writes `profiles` on a user's behalf.

```sql
-- AUX-TEST-ACCESS-01: developer lesson-access flag.
alter table public.profiles
  add column if not exists is_dev boolean not null default false;

comment on column public.profiles.is_dev is
  'Developer/tester lesson-access override. Access only, never progress. Set only via SQL editor / service role.';

-- Guard: client roles (anon, authenticated) can never set or change is_dev.
-- SECURITY INVOKER on purpose: current_user must be the caller's role.
create or replace function public.protect_profiles_is_dev()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;                       -- SQL editor / service role may change it
  end if;
  if tg_op = 'INSERT' then
    new.is_dev := false;              -- a client can never create a developer profile
  else
    new.is_dev := old.is_dev;         -- a client can never change it (silently kept)
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_is_dev on public.profiles;
create trigger profiles_protect_is_dev
  before insert or update on public.profiles
  for each row execute function public.protect_profiles_is_dev();
```

Why it is written this way:
- **Allow-list of admin roles.** Any other role, including one added in future, is treated as a client. This fails safe.
- **`SECURITY INVOKER`.** In a `SECURITY DEFINER` function, `current_user` would always be the owner, and the guard would never fire.
- **The signup trigger `handle_new_user`** (a security definer owned by `postgres`) inserts profiles without `is_dev`, so new users get the default `false`.
- **"Silently kept" rather than an error.** A legitimate client write that happens to include `is_dev` (none exists today) still succeeds, and the profile-wipe `upsert` (`AuthContext.tsx:203`) cannot reset a developer's flag. The alternative (raise an error) is listed in §10.
- **Functions returning `trigger` cannot be called through the PostgREST RPC endpoint**, so this adds no new API surface.

### 2.3 Granting and revoking (SQL editor, project owner only)

```sql
-- Grant (by email lookup; never put IDs or emails in the repo)
update public.profiles set is_dev = true
where id = (select id from auth.users where email = '<tester email>');

-- Revoke
update public.profiles set is_dev = false
where id = (select id from auth.users where email = '<tester email>');

-- Verify
select u.email, p.username, p.is_dev
from public.profiles p join auth.users u on u.id = p.id
where p.is_dev;
```

## 3. Authorization and security

| Requirement | How it is met |
|---|---|
| 1. Default `false` | `not null default false` |
| 2. Users cannot change their own flag | Guard trigger; RLS does **not** protect columns, so it is not relied on |
| 3. Only an admin grants or revokes | Only the `postgres` / `service_role` / `supabase_admin` roles pass the guard. In practice that means the dashboard SQL editor. |
| 4. Existing RLS and grants inspected | §1.2. **Nothing is changed.** |
| 5. No service-role key exposed | The client uses only the publishable key; no new secret |
| 6. No developer IDs in frontend | The flag comes from the user's own `profiles` row |
| 7. A locally modified flag is not authorization | See below |
| 8. Progression and saving untouched | §4: no change to `nodeStatus`, `applyResult`, `saveLessonResult`, placement or hearts |

**Requirement 7, honestly.** The *source* of the flag is trustworthy: a user cannot set it in the database. But the lesson lock itself is enforced only in the browser, for everyone:
- Lesson payloads are in the public JS bundle, and any signed-in user can read them from `lessons`.
- Users can already open any lesson by editing state in dev tools, or by writing their own `user_progress`.

A user who forges `is_dev` in their own browser gains nothing they couldn't already do. **The flag controls the app's lesson-lock experience. It does not protect lesson content and must not be described as doing so.**

**Additional exposure:** while the live anonymous-read drift on `profiles` (P0, C) is unfixed, `is_dev` is publicly readable. This is not a privilege escalation, but it reveals who the testers are. **Apply this migration after C's fix**, or accept that exposure.

## 4. Lesson-access logic affected (the smallest change)

| File | Change |
|---|---|
| **New** `src/lib/progress/devAccess.ts` | `isDevAccount(profile, isDemo): boolean` → `!isDemo && profile?.is_dev === true`. `canOpenLesson(status, isDev): boolean` → `isDev \|\| status !== 'locked'`. |
| **New** `src/lib/progress/__tests__/devAccess.test.ts` | Unit tests (§7) |
| `src/components/dashboard/DashboardScreen.tsx` | `handleSelect`: `if (status === 'locked')` becomes `if (!canOpenLesson(status, isDev))`. The 0-heart branch below is untouched. Optionally, a one-line "Developer access" banner and a "Start lesson (developer access)" label (decision §10.4). About 10 lines. |
| `src/types/database.types.ts` | `profiles.Row.is_dev?: boolean`. **Optional on purpose**, so `DEMO_PROFILES` and `defaultProfile` in `AuthContext.tsx` (B's T-03 area) need no edit (decision §10.3). |

**Not changed:** `nodeStatus`, `SkillTreeView.tsx` (D), `useDashboardData.ts`, `AuthContext.tsx`, `applyResult.ts`, `saveLessonResult.ts`, `placement.ts`, `runner.ts`, hearts logic, any RLS policy or grant.

The tree still *displays* locked nodes as locked for developers; they simply open on click. No `SkillTreeView` change is technically necessary.

## 5. Expected behaviour

| | `is_dev = true` | `is_dev = false` (everyone else) |
|---|---|---|
| Click a locked node | Opens | Shake + "Node Locked" (unchanged) |
| Tree display | Unchanged (padlocks still shown) | Unchanged |
| Granting the flag | Writes nothing else: no EXP, completion, badges, streak or hearts | — |
| Finishing a lesson | Saved **normally from the real result**, like any learner (mastery gate, EXP for that lesson only) | Unchanged |
| 0 hearts + practice lesson | **Still blocked** (§6) | Unchanged |
| Guest / demo mode | Never a developer | — |
| Revocation takes effect | On the next profile load: sign-in, page reload, or `refreshProfile()` after a lesson save | — |

## 6. Heart system

**Initially unchanged:** the flag does not bypass the zero-hearts rule.

**A later developer heart bypass: affected logic**

| Where | What blocks or charges hearts |
|---|---|
| `DashboardScreen.tsx:190` | 0 hearts + practice lesson → blocked at selection |
| `lesson/runner.ts:45,47-50` | `createLessonRun(…, hearts)`; practice exercises need hearts |
| `practice/PracticeDrill.ts` `start()` | A drill started with 0 hearts locks at once |
| `DashboardScreen.tsx:733` → `useGamification.depleteHeartForDrill` | Each lost heart is written to `profiles.hearts` immediately (`useGamification.ts:351-360`) |
| `applyResult.ts:75` | On save, the profile's hearts change by `heartsEnd − heartsStart` |
| `SkillTreeView.tsx:117` | `drillsDisabled` styling only (D's file; cosmetic) |

The simplest bypass would:
1. skip the `:190` check for developers;
2. open `LessonPlayer` with a virtual `hearts = 5`;
3. skip `depleteHeartForDrill` for developers;
4. pass a zero heart delta to the save.

**Estimate: S–M, about 2–3 hours, all in `DashboardScreen.tsx`** plus tests.

**Risk:** it touches the heart-persistence path that T-06 just fixed, so a mistake would write wrong hearts to a developer's profile. **Recommendation:** decide separately after release testing shows a need. Testers can instead regain hearts through a ≥ 80 % theory lesson, or an admin can set `hearts = 5` in SQL.

## 7. Testing scenarios

**Database (SQL editor, in one rolled-back transaction, two throwaway users):**

| ID | Scenario | Expected |
|---|---|---|
| DB-1 | New signup | `is_dev = false` |
| DB-2 | As `authenticated` (own row): `update profiles set is_dev = true` | Statement succeeds; **value stays `false`** |
| DB-3 | As `authenticated`: `update profiles set exp = exp + 1` | Works exactly as before (the guard doesn't break normal writes) |
| DB-4 | As `authenticated`: insert or upsert own profile with `is_dev = true` | Stored as `false` (insert) or unchanged (upsert) |
| DB-5 | As `authenticated`: update **another** user's `is_dev` | 0 rows (RLS, unchanged) |
| DB-6 | As `postgres` (SQL editor): set `true`, then `false` | Both stick |
| DB-7 | A developer's profile hit by the profile-wipe `upsert(defaultProfile)` | `is_dev` still `true` |
| DB-8 | REST: `PATCH /rest/v1/profiles?id=eq.<self>` `{"is_dev": true}` with a normal JWT | 2xx but the value unchanged (re-read shows `false`) |

**Client (unit tests):** `canOpenLesson`:
- `('locked', false)` → false
- `('current', false)` → true
- `('mastered', false)` → true
- `('locked', true)` → true

`isDevAccount`:
- `is_dev: true` → true
- `false` / `undefined` → false
- `null` profile → false
- `isDemo = true` with `is_dev: true` → false

**Manual (`vite preview`, developer D and normal N accounts):**
1. D opens a locked node.
2. N is blocked on the same node.
3. N's unlocked and locked behaviour is unchanged.
4. D completes a lesson: only that lesson's rows and EXP change.
5. D reloads, signs out and back in: still a developer. N signs in in the same tab: not a developer.
6. Revoke D in SQL, then reload: normal locks.
7. N forges `is_dev` in dev tools: their own UI unlocks. **Expected, documented limitation (§3).**
8. Granting D changes nothing in `profiles` (apart from `is_dev`), `user_progress` or `user_achievements` (before/after snapshot).
9. D at 0 hearts on a practice lesson: still blocked.
10. Regression: full `npx vitest run`, `npm run build`, placement, the 0-heart block and heart regeneration for N.

## 8. Rollback strategy

| Level | Action | Destructive? |
|---|---|---|
| Soft (instant) | `update public.profiles set is_dev = false where is_dev;` | No; flags only |
| Client | Revert the client PR; the column stays inert | No |
| Full | `drop trigger if exists profiles_protect_is_dev on public.profiles; drop function if exists public.protect_profiles_is_dev(); alter table public.profiles drop column if exists is_dev;` | Drops only the flag values. **Requires A's approval and a backup.** Deploy the client revert first, so no build reads the column. |

## 9. Effort

| Step | Estimate |
|---|---|
| Migration file + SQL verification script | 1 h |
| `devAccess.ts` + tests (TDD) | 1 h |
| `DashboardScreen` wiring + types | 0.5 h |
| Apply on the shared project (backup first) + DB-1…DB-8 | 1 h |
| Manual scenarios + test report | 1 h |
| **Total** | **≈ 4.5 h (about half a day)** |

**Schedule:** this is a new feature, so it must merge before the IC-3 freeze (Tue Nov 24). It should come after T-08 part 2 (IC-2, Fri Nov 20) and after C's `profiles` RLS fix.

## 10. Decisions

**Recorded 2026-11-19.** A chose the recommended option for every item.

| # | Decision | Chosen |
|---|---|---|
| 1 | Protection mechanism | **Guard trigger** (`protect_profiles_is_dev`) |
| 2 | Client attempt to change `is_dev` | **Silently keep the old value** |
| 3 | TypeScript | **`is_dev?: boolean` (optional)**; no `AuthContext.tsx` edit |
| 4 | Developer indicator | **One-line banner + "Start lesson (developer access)" label** |
| 5 | Migration | **After C's `profiles` anonymous-read fix, with a backup first.** Applied by A or C; not part of the code PR. |
| 6 | Branch base | **`main` now** (`task/AUX-TEST-ACCESS-01`); rebase if `task/revert-pr-22` merges first. This item had no recommendation in the original list; this is Claude's call, because the `handleSelect` hunk is the same on both bases. |
| 7 | Developer heart bypass | **Deferred**; a separate decision later |
| 8 | Tester accounts | **A supplies them privately** when the flag is ready to grant |

Original options, for reference:

1. **Protection mechanism:** guard trigger (recommended) or column-level grants.
2. **When a client tries to change `is_dev`:** silently keep the old value (recommended), or raise an error.
3. **TypeScript:** `is_dev` optional in the `profiles` Row type (recommended; no `AuthContext` edit), or required, with `AuthContext` `DEMO_PROFILES` / `defaultProfile` updated in coordination with B.
4. **Visible indicator for developers:** a one-line banner and the start-button label (recommended), or none.
5. **Migration timing and who applies it:** after C's `profiles` anonymous-read fix, with a backup; A or C applies it.
6. **Branch base:** `main` now, or after `task/revert-pr-22` merges (the `handleSelect` hunk is the same on both).
7. **Developer heart bypass:** later and separately (§6). Not part of this design.
8. **Tester accounts:** you supply them privately when the flag is ready to grant.
