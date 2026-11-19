-- Decision D1 (A, 2026-11-19): developer test results are kept apart from learner progress.
--
-- A developer account (profiles.is_dev, 20261120000000_profiles_is_dev.sql) may open
-- locked lessons. The result of a lesson opened that way is TEST DATA: it is written
-- here and nowhere else. It never touches user_progress, performance_records,
-- user_achievements, or the profile's exp / current_streak / last_activity_date.
-- Only the hearts change of a test run is applied to the profile, so the zero-heart
-- rule keeps working for developers (client: src/lib/progress/devTestResults.ts).
--
-- Learner progress, analytics and achievements read only the learner tables, so they
-- exclude test data by construction; nothing in src/ reads this table except the
-- developer save path.
--
-- Depends on: 20261120000000_profiles_is_dev.sql (the is_dev column).
-- Additive: no existing table, policy or grant is changed.

create table if not exists public.dev_test_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id text not null references public.lessons (id),
  recorded_at timestamptz not null default now(),
  -- LessonResult.status (src/lesson/types.ts), minus 'running'.
  status text not null,
  passed boolean not null,
  accuracy numeric(5, 2) not null,
  hearts_lost integer not null default 0,
  -- pitchAccuracy, rhythmConsistency, postureScore, theoryScore, durationSec.
  metrics jsonb not null default '{}'::jsonb,
  constraint dev_test_results_status check (status in ('passed', 'failed', 'out-of-hearts', 'quit')),
  constraint dev_test_results_accuracy_range check (accuracy >= 0 and accuracy <= 100),
  constraint dev_test_results_hearts_nonnegative check (hearts_lost >= 0)
);

comment on table public.dev_test_results is
  'D1: results of lessons a developer account opened through the lock override. Test data: never read by learner progress, analytics or achievements.';

create index if not exists dev_test_results_user_time_idx
  on public.dev_test_results (user_id, recorded_at desc);

alter table public.dev_test_results enable row level security;

drop policy if exists dev_test_results_select_own on public.dev_test_results;
create policy dev_test_results_select_own
  on public.dev_test_results
  for select
  to authenticated
  using (user_id = auth.uid());

-- Only a current developer can write, and only their own rows. The subquery runs
-- under profiles_select_own, which lets a user read their own profile row.
drop policy if exists dev_test_results_insert_developer on public.dev_test_results;
create policy dev_test_results_insert_developer
  on public.dev_test_results
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_dev)
  );

-- Supabase grants new tables to every role by default; narrow that explicitly.
revoke all on public.dev_test_results from anon;
revoke all on public.dev_test_results from authenticated;
grant select, insert on public.dev_test_results to authenticated;

-- Verify after applying:
--   select policyname, cmd from pg_policies where tablename = 'dev_test_results';  -- select_own, insert_developer
--   select grantee, privilege_type from information_schema.role_table_grants
--   where table_name = 'dev_test_results' and grantee in ('anon', 'authenticated');  -- authenticated: SELECT, INSERT
--
-- Rollback (A's approval; deploy a client without the developer save path first):
--   drop table if exists public.dev_test_results;
