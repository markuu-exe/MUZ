-- AUX-TEST-ACCESS-01: verification of the profiles.is_dev guard (scenarios DB-1 … DB-7).
--
-- Run the whole script in the Supabase dashboard SQL editor (as the project owner)
-- AFTER 20261120000000_profiles_is_dev.sql has been applied.
-- Everything runs in one transaction that is ROLLED BACK at the end: the throwaway
-- auth users and their profiles are never committed. No real account is read or changed.
-- Each check raises an exception on failure; a clean run ends with
-- "AUX-TEST-ACCESS-01 is_dev guard: all checks passed".
-- DB-8 (REST PATCH with a real JWT) is a manual check; see the test report.

begin;

do $$
declare
  a uuid := gen_random_uuid();  -- ordinary learner
  b uuid := gen_random_uuid();  -- second learner (cross-user check)
begin
  insert into auth.users (id, email, aud, role) values
    (a, 'aux-a-' || a || '@example.invalid', 'authenticated', 'authenticated'),
    (b, 'aux-b-' || b || '@example.invalid', 'authenticated', 'authenticated');
  -- DB-1: profiles created by handle_new_user default to false
  if (select count(*) from public.profiles where id in (a, b) and is_dev = false) <> 2 then
    raise exception 'DB-1: new profiles must default to is_dev = false';
  end if;
  perform set_config('aux.a', a::text, true);
  perform set_config('aux.b', b::text, true);
end $$;

create or replace function pg_temp.act_as(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uid, true);
end $$;

-- As learner A (role authenticated)
select pg_temp.act_as(current_setting('aux.a'));
set local role authenticated;

-- DB-2: self-update of is_dev is silently ignored
update public.profiles set is_dev = true where id::text = current_setting('aux.a');
do $$ begin
  if (select is_dev from public.profiles where id::text = current_setting('aux.a')) then
    raise exception 'DB-2: client was able to set its own is_dev';
  end if;
end $$;

-- DB-3: ordinary writes still work, and in the same statement is_dev is ignored
update public.profiles set exp = exp + 7, is_dev = true where id::text = current_setting('aux.a');
do $$ begin
  if (select exp from public.profiles where id::text = current_setting('aux.a')) <> 7 then
    raise exception 'DB-3: normal profile update no longer works';
  end if;
  if (select is_dev from public.profiles where id::text = current_setting('aux.a')) then
    raise exception 'DB-3: is_dev changed alongside a normal update';
  end if;
end $$;

-- DB-4: upsert of own row with is_dev = true (the AuthContext default-profile path) keeps false
insert into public.profiles (id, username, is_dev)
values (current_setting('aux.a')::uuid, 'aux-upsert-' || substr(current_setting('aux.a'), 1, 8), true)
on conflict (id) do update set username = excluded.username, is_dev = excluded.is_dev;
do $$ begin
  if (select is_dev from public.profiles where id::text = current_setting('aux.a')) then
    raise exception 'DB-4: upsert set is_dev';
  end if;
end $$;

-- DB-5: another user's row is not updatable at all (RLS, unchanged)
update public.profiles set is_dev = true, exp = 999 where id::text = current_setting('aux.b');
reset role;
do $$ begin
  if (select is_dev or exp = 999 from public.profiles where id::text = current_setting('aux.b')) then
    raise exception 'DB-5: learner A modified learner B';
  end if;
end $$;

-- DB-6: the owner (SQL editor role) can grant and revoke
update public.profiles set is_dev = true where id::text = current_setting('aux.b');
do $$ begin
  if not (select is_dev from public.profiles where id::text = current_setting('aux.b')) then
    raise exception 'DB-6: owner could not grant is_dev';
  end if;
end $$;

-- DB-7: a developer's flag survives client writes, including the default-profile upsert
select pg_temp.act_as(current_setting('aux.b'));
set local role authenticated;
update public.profiles set hearts = 3, is_dev = false where id::text = current_setting('aux.b');
insert into public.profiles (id, username, is_dev)
values (current_setting('aux.b')::uuid, 'aux-wipe-' || substr(current_setting('aux.b'), 1, 8), false)
on conflict (id) do update set username = excluded.username, is_dev = excluded.is_dev;
reset role;
do $$ begin
  if not (select is_dev from public.profiles where id::text = current_setting('aux.b')) then
    raise exception 'DB-7: client write reset a developer flag';
  end if;
end $$;

-- DB-6 (revoke)
update public.profiles set is_dev = false where id::text = current_setting('aux.b');
do $$ begin
  if (select is_dev from public.profiles where id::text = current_setting('aux.b')) then
    raise exception 'DB-6: owner could not revoke is_dev';
  end if;
end $$;

-- Guard is SECURITY INVOKER (a definer guard would never fire for clients)
do $$ begin
  if (select prosecdef from pg_proc where proname = 'protect_profiles_is_dev' and pronamespace = 'public'::regnamespace) then
    raise exception 'guard function must be SECURITY INVOKER';
  end if;
end $$;

select 'AUX-TEST-ACCESS-01 is_dev guard: all checks passed' as result;

rollback;
