-- AUX-TEST-ACCESS-01: verification of the profiles.is_dev guard (scenarios DB-1 … DB-7).
--
-- Run the whole script in the Supabase dashboard SQL editor (as the project owner)
-- AFTER the migration *_profiles_is_dev.sql has been applied. Prefer a Supabase
-- branch or local `supabase start` first. It inserts into auth.users, although it rolls back.
-- Everything runs in one transaction that is ROLLED BACK at the end: the throwaway
-- auth users and their profiles are never committed. No real account is read or changed.
-- Each check raises an exception on failure, including when the row is missing
-- (all comparisons are NULL-safe); a clean run ends with
-- "AUX-TEST-ACCESS-01 is_dev guard: all checks passed".
-- DB-8 (REST PATCH with a real JWT) is manual: see AUX_TEST_ACCESS_TEST_REPORT.md §3.

begin;

do $$
declare
  a uuid := gen_random_uuid();  -- ordinary learner
  b uuid := gen_random_uuid();  -- second learner, later a developer
  c uuid := gen_random_uuid();  -- learner whose profile row is created by the client (DB-4b)
begin
  insert into auth.users (id, email, aud, role) values
    (a, 'aux-a-' || a || '@example.invalid', 'authenticated', 'authenticated'),
    (b, 'aux-b-' || b || '@example.invalid', 'authenticated', 'authenticated'),
    (c, 'aux-c-' || c || '@example.invalid', 'authenticated', 'authenticated');
  -- DB-1: profiles created by handle_new_user default to false
  if (select count(*) from public.profiles where id in (a, b, c) and is_dev is false) <> 3 then
    raise exception 'DB-1: new profiles must exist and default to is_dev = false';
  end if;
  -- DB-4b setup: remove C's trigger-made profile so the client must INSERT a fresh row
  delete from public.profiles where id = c;
  perform set_config('aux.a', a::text, true);
  perform set_config('aux.b', b::text, true);
  perform set_config('aux.c', c::text, true);
end $$;

create or replace function pg_temp.act_as(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uid, true);
end $$;

-- Back to a plain owner session (what the SQL editor is): no end-user JWT.
create or replace function pg_temp.as_owner() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;

-- Owner-side read helper. Not called while acting as `authenticated` (temp-schema access
-- under SET ROLE depends on the database TEMP privilege); those blocks query inline.
create or replace function pg_temp.dev(uid text) returns boolean language sql as $$
  select is_dev from public.profiles where id::text = uid
$$;

-- ---------------------------------------------------------------- learner A
select pg_temp.act_as(current_setting('aux.a'));
set local role authenticated;

-- DB-2: self-update of is_dev is silently ignored (and the statement does hit the row)
do $$
declare n int;
begin
  update public.profiles set is_dev = true where id::text = current_setting('aux.a');
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'DB-2: expected to update own row, updated %', n; end if;
  if (select is_dev from public.profiles where id::text = current_setting('aux.a')) is not false then
    raise exception 'DB-2: client was able to set its own is_dev';
  end if;
end $$;

-- DB-3: ordinary writes still work; is_dev in the same statement is ignored
do $$ begin
  update public.profiles set exp = exp + 7, is_dev = true where id::text = current_setting('aux.a');
  if (select exp from public.profiles where id::text = current_setting('aux.a')) is distinct from 7 then
    raise exception 'DB-3: normal profile update no longer works';
  end if;
  if (select is_dev from public.profiles where id::text = current_setting('aux.a')) is not false then
    raise exception 'DB-3: is_dev changed alongside a normal update';
  end if;
end $$;

-- DB-4: upsert onto the existing own row with is_dev = true keeps false
insert into public.profiles (id, username, is_dev)
values (current_setting('aux.a')::uuid, 'aux-upsert-' || substr(current_setting('aux.a'), 1, 8), true)
on conflict (id) do update set username = excluded.username, is_dev = excluded.is_dev;
do $$ begin
  if (select is_dev from public.profiles where id::text = current_setting('aux.a')) is not false then raise exception 'DB-4: upsert set is_dev'; end if;
end $$;

-- DB-5: another user's row is not updatable at all (RLS, unchanged)
do $$
declare n int;
begin
  update public.profiles set is_dev = true, exp = 999 where id::text = current_setting('aux.b');
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'DB-5: learner A updated % row(s) of learner B', n; end if;
end $$;
reset role;

-- ---------------------------------------------------------------- learner C (fresh INSERT)
-- DB-4b: a client INSERT of a brand-new profile row with is_dev = true is stored as false
select pg_temp.act_as(current_setting('aux.c'));
set local role authenticated;
insert into public.profiles (id, username, is_dev)
values (current_setting('aux.c')::uuid, 'aux-fresh-' || substr(current_setting('aux.c'), 1, 8), true);
reset role;
select pg_temp.as_owner();
do $$ begin
  if pg_temp.dev(current_setting('aux.c')) is not false then
    raise exception 'DB-4b: fresh client insert stored is_dev = true (INSERT branch missing)';
  end if;
end $$;

-- ---------------------------------------------------------------- owner / service role
-- DB-6: the owner (SQL editor) can grant
update public.profiles set is_dev = true where id::text = current_setting('aux.b');
do $$ begin
  if pg_temp.dev(current_setting('aux.b')) is not true then raise exception 'DB-6: owner could not grant is_dev'; end if;
end $$;

-- DB-6b: the service role (no end-user JWT) can revoke and re-grant
set local role service_role;
update public.profiles set is_dev = false where id::text = current_setting('aux.b');
reset role;
do $$ begin
  if pg_temp.dev(current_setting('aux.b')) is not false then raise exception 'DB-6b: service_role could not revoke'; end if;
end $$;
set local role service_role;
update public.profiles set is_dev = true where id::text = current_setting('aux.b');
reset role;
do $$ begin
  if pg_temp.dev(current_setting('aux.b')) is not true then raise exception 'DB-6b: service_role could not grant'; end if;
end $$;

-- DB-6c: an admin role carrying an end-user JWT (e.g. a SECURITY DEFINER RPC) cannot change it
select pg_temp.act_as(current_setting('aux.a'));
update public.profiles set is_dev = true where id::text = current_setting('aux.a');
select pg_temp.as_owner();
do $$ begin
  if pg_temp.dev(current_setting('aux.a')) is not false then
    raise exception 'DB-6c: owner role with an end-user JWT changed is_dev';
  end if;
end $$;

-- ---------------------------------------------------------------- developer B
-- DB-7: a developer's flag survives client writes, including the default-profile upsert
select pg_temp.act_as(current_setting('aux.b'));
set local role authenticated;
update public.profiles set hearts = 3, is_dev = false where id::text = current_setting('aux.b');
insert into public.profiles (id, username, is_dev)
values (current_setting('aux.b')::uuid, 'aux-wipe-' || substr(current_setting('aux.b'), 1, 8), false)
on conflict (id) do update set username = excluded.username, is_dev = excluded.is_dev;
reset role;
select pg_temp.as_owner();
do $$ begin
  if (select hearts from public.profiles where id::text = current_setting('aux.b')) is distinct from 3 then
    raise exception 'DB-7: normal developer write (hearts) did not apply';
  end if;
  if pg_temp.dev(current_setting('aux.b')) is not true then
    raise exception 'DB-7: client write reset a developer flag';
  end if;
end $$;

-- DB-6 (revoke by owner)
update public.profiles set is_dev = false where id::text = current_setting('aux.b');
do $$ begin
  if pg_temp.dev(current_setting('aux.b')) is not false then raise exception 'DB-6: owner could not revoke is_dev'; end if;
end $$;

-- Guard exists, is SECURITY INVOKER, and fires on INSERT and UPDATE
do $$
declare definer boolean;
begin
  select prosecdef into definer from pg_proc
  where proname = 'protect_profiles_is_dev' and pronamespace = 'public'::regnamespace;
  if not found then raise exception 'guard function missing'; end if;
  if definer then raise exception 'guard function must be SECURITY INVOKER'; end if;
  if not exists (
    select 1 from information_schema.triggers
    where event_object_schema = 'public' and event_object_table = 'profiles'
      and trigger_name = 'profiles_protect_is_dev' and event_manipulation = 'INSERT' and action_timing = 'BEFORE'
  ) or not exists (
    select 1 from information_schema.triggers
    where event_object_schema = 'public' and event_object_table = 'profiles'
      and trigger_name = 'profiles_protect_is_dev' and event_manipulation = 'UPDATE' and action_timing = 'BEFORE'
  ) then
    raise exception 'trigger must be BEFORE INSERT and BEFORE UPDATE on public.profiles';
  end if;
end $$;

select 'AUX-TEST-ACCESS-01 is_dev guard: all checks passed' as result;

rollback;
