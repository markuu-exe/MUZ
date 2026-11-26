-- Catalog read access for signed-in learners (lessons, achievements).
--
-- Found 2026-11-27 on the hosted project: Settings → Course data said "Database
-- returned 0 piano lessons, 0 in the current format" for a signed-in learner, with
-- no error. RLS was on for `lessons` but its read policy was missing (the November
-- hosted audit found no policies on five tables), so every read returned 0 rows.
-- The app then fell back to the built-in course, which skips placement (SRS 3.1.1.4).
--
-- This restores exactly what the initial schema intended for the two read-only
-- catalog tables: any signed-in user may read them; nobody may write them through
-- the API. Learner tables are not touched. Idempotent: safe to run more than once.

alter table public.lessons enable row level security;
alter table public.achievements enable row level security;

drop policy if exists lessons_select_authenticated on public.lessons;
create policy lessons_select_authenticated
  on public.lessons
  for select
  to authenticated
  using (true);

drop policy if exists achievements_select_authenticated on public.achievements;
create policy achievements_select_authenticated
  on public.achievements
  for select
  to authenticated
  using (true);

grant select on public.lessons to authenticated;
grant select on public.achievements to authenticated;

-- Verify after applying (SQL editor):
--   select tablename, policyname, roles, cmd from pg_policies
--   where schemaname = 'public' and tablename in ('lessons', 'achievements');
--     -- lessons_select_authenticated and achievements_select_authenticated, roles {authenticated}, SELECT
--   select count(*) from public.lessons where instrument = 'piano';   -- 59 (run supabase/seed.sql if 0)
-- Then in the app (signed in): Settings → Course data says "Loaded from the database: 59 lessons."
