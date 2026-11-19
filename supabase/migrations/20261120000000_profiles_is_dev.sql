-- AUX-TEST-ACCESS-01: developer lesson-access flag on profiles.
-- Design: docs/auxiliary/AUX_TEST_ACCESS_IS_DEV_DESIGN.md
--
-- is_dev = true lets an account OPEN lessons the skill tree shows as locked.
-- It is an access override only: it awards no EXP, progress, streak, hearts or badges.
--
-- Why a trigger: profiles grants UPDATE on every column to authenticated, and RLS
-- (profiles_update_own) restricts rows, not columns. Without this guard any user
-- could PATCH their own is_dev to true. The guard silently keeps the stored value
-- unless the writer is an admin role (dashboard SQL editor / service role) AND the
-- request does not carry an end-user JWT (anon / authenticated). The second check also
-- covers any future SECURITY DEFINER function that writes profiles on a user's behalf.
--
-- Not a content boundary: lessons stay readable by every authenticated user, and
-- the lock itself is still enforced in the client for everyone.
--
-- Additive: no existing policy or grant is changed.

alter table public.profiles
  add column if not exists is_dev boolean not null default false;

comment on column public.profiles.is_dev is
  'Developer/tester lesson-access override. Access only, never progress. Set only via SQL editor / service role.';

-- SECURITY INVOKER on purpose: current_user must be the calling role. Under
-- SECURITY DEFINER it would always be the owner and the guard would never fire.
create or replace function public.protect_profiles_is_dev()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  jwt_role text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role', '');
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role')
     and jwt_role not in ('anon', 'authenticated') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.is_dev := false;
  else
    new.is_dev := old.is_dev;
  end if;
  return new;
end;
$$;

comment on function public.protect_profiles_is_dev() is
  'AUX-TEST-ACCESS-01: client roles and end-user JWTs can never set or change profiles.is_dev.';

drop trigger if exists profiles_protect_is_dev on public.profiles;
create trigger profiles_protect_is_dev
  before insert or update on public.profiles
  for each row execute function public.protect_profiles_is_dev();

-- Rollback (needs A's approval and a backup; deploy the client revert first):
--   drop trigger if exists profiles_protect_is_dev on public.profiles;
--   drop function if exists public.protect_profiles_is_dev();
--   alter table public.profiles drop column if exists is_dev;
