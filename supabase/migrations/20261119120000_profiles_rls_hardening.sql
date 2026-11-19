-- F2 / DEF-001: close anonymous read access to public.profiles.
--
-- Found 2026-11-17 and re-checked 2026-11-19 (read-only REST, publishable key):
-- the live `profiles` table returns every row and column to an anonymous caller,
-- while the other five tables return none. The repo's initial schema already
-- limits profiles to `id = auth.uid()` for `authenticated` only, so the live
-- database has drifted: an extra permissive policy, RLS switched off, or both.
-- The exact live policy names are unknown, so this migration does not guess them:
-- it removes every policy on profiles except the repo's three and re-creates those.
--
-- Safe for the app: every profiles read and write in src/ is the signed-in
-- user's own row (AuthContext.fetchProfile, supabaseStore). Nothing reads
-- profiles before sign-in.
--
-- Idempotent. Must be applied BEFORE 20261120000000_profiles_is_dev.sql, otherwise
-- the developer flag would be publicly readable too. Data is not touched.

alter table public.profiles enable row level security;

do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname not in ('profiles_select_own', 'profiles_insert_own', 'profiles_update_own')
  loop
    execute format('drop policy %I on public.profiles', p.policyname);
  end loop;
end
$$;

-- Re-create the repo's policies so their definitions are exactly the repo's.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Supabase's default privileges grant every role everything on new public
-- tables; RLS is then the only gate. Remove anon entirely and give authenticated
-- exactly what the initial schema intended.
revoke all on public.profiles from anon;
revoke all on public.profiles from authenticated;
grant select, insert, update on public.profiles to authenticated;

-- Verify after applying (Dashboard → SQL Editor, role postgres):
--   select policyname, roles, cmd, qual from pg_policies
--   where schemaname = 'public' and tablename = 'profiles';      -- exactly the 3 *_own policies
--   select relrowsecurity from pg_class where oid = 'public.profiles'::regclass;  -- true
--   select grantee, privilege_type from information_schema.role_table_grants
--   where table_schema = 'public' and table_name = 'profiles' and grantee in ('anon', 'authenticated');
--     -- authenticated: SELECT, INSERT, UPDATE; anon: none
-- Then, from a terminal with the publishable key (no user token):
--   GET <SUPABASE_URL>/rest/v1/profiles?select=id&limit=1  → 401/permission error or [], never a row.
--
-- Rollback: none needed for data (no row is changed). Restoring public read access
-- would re-open DEF-001, so do not. If a signed-in flow breaks, check it reads only
-- its own row before changing any policy.
