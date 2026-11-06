-- MUZ schema (SDD v01.00)
-- profiles, lessons, user_progress, performance_records, achievements, user_achievements
-- Row-level security limits each learner to their own rows.
-- Webcam frames and microphone audio are never stored here.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  instrument_focus text not null default 'piano',
  current_streak integer not null default 0,
  last_activity_date date default current_date,
  exp integer not null default 0,
  hearts integer not null default 5,
  created_at timestamptz not null default now(),
  constraint profiles_username_unique unique (username),
  constraint profiles_instrument_piano check (instrument_focus = 'piano'),
  constraint profiles_hearts_range check (hearts >= 0 and hearts <= 5),
  constraint profiles_exp_nonnegative check (exp >= 0),
  constraint profiles_streak_nonnegative check (current_streak >= 0)
);

comment on table public.profiles is
  'Learner identity, piano curriculum lock, and high-level progression state.';

-- ---------------------------------------------------------------------------
-- lessons
-- ---------------------------------------------------------------------------

create table public.lessons (
  id text primary key,
  instrument text not null,
  module_index integer not null,
  node_index integer not null,
  title text not null,
  description text,
  required_exp integer not null default 0,
  payload jsonb not null,
  constraint lessons_instrument_piano check (instrument = 'piano'),
  constraint lessons_required_exp_nonnegative check (required_exp >= 0),
  constraint lessons_module_positive check (module_index > 0),
  constraint lessons_node_positive check (node_index > 0),
  constraint lessons_node_unique unique (instrument, module_index, node_index)
);

comment on table public.lessons is
  'Piano curriculum nodes. payload holds theory cards, rhythm patterns, and practice targets.';

-- ---------------------------------------------------------------------------
-- user_progress
-- ---------------------------------------------------------------------------

create table public.user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id text not null references public.lessons (id),
  completed boolean not null default false,
  accuracy_percentage numeric(5, 2) not null default 0.00,
  posture_stability_score numeric(5, 2) not null default 0.00,
  unlocked_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint user_progress_user_lesson_unique unique (user_id, lesson_id),
  constraint user_progress_accuracy_range check (
    accuracy_percentage >= 0 and accuracy_percentage <= 100
  ),
  constraint user_progress_posture_range check (
    posture_stability_score >= 0 and posture_stability_score <= 100
  )
);

comment on table public.user_progress is
  'Per-learner skill-tree unlock and mastery state.';

-- ---------------------------------------------------------------------------
-- performance_records
-- ---------------------------------------------------------------------------

create table public.performance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id text not null references public.lessons (id),
  session_timestamp timestamptz not null default now(),
  pitch_accuracy numeric(5, 2) not null,
  rhythm_consistency numeric(5, 2) not null,
  posture_score numeric(5, 2) not null,
  drill_duration_sec integer not null,
  constraint performance_pitch_range check (pitch_accuracy >= 0 and pitch_accuracy <= 100),
  constraint performance_rhythm_range check (
    rhythm_consistency >= 0 and rhythm_consistency <= 100
  ),
  constraint performance_posture_range check (posture_score >= 0 and posture_score <= 100),
  constraint performance_duration_nonnegative check (drill_duration_sec >= 0)
);

comment on table public.performance_records is
  'Append-only practice session analytics for the profile charts.';

comment on column public.performance_records.posture_score is
  'Percent of frames with elbow 80-110 degrees and wrist 150-180 degrees.';

-- ---------------------------------------------------------------------------
-- achievements
-- ---------------------------------------------------------------------------

create table public.achievements (
  id text primary key,
  title text not null,
  exp_reward integer not null default 50,
  constraint achievements_exp_reward_nonnegative check (exp_reward >= 0)
);

comment on table public.achievements is
  'Milestone badge catalog. Unlock rules are evaluated by the client.';

create table public.user_achievements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id text not null references public.achievements (id),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

comment on table public.user_achievements is
  'Badges a learner has unlocked.';

-- ---------------------------------------------------------------------------
-- indexes
-- ---------------------------------------------------------------------------

create index user_progress_user_id_idx on public.user_progress (user_id);
create index performance_records_user_time_idx
  on public.performance_records (user_id, session_timestamp desc);
create index user_achievements_user_id_idx on public.user_achievements (user_id);

-- ---------------------------------------------------------------------------
-- new-user profile
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_name text;
  final_name text;
begin
  base_name := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  if base_name is null then
    base_name := nullif(split_part(coalesce(new.email, ''), '@', 1), '');
  end if;
  if base_name is null then
    base_name := 'Pianist';
  end if;

  final_name := base_name;
  if exists (select 1 from public.profiles where username = final_name) then
    final_name := base_name || '-' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;

  insert into public.profiles (id, username, instrument_focus)
  values (new.id, final_name, 'piano')
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- row-level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.lessons enable row level security;
alter table public.user_progress enable row level security;
alter table public.performance_records enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy lessons_select_authenticated
  on public.lessons
  for select
  to authenticated
  using (true);

create policy achievements_select_authenticated
  on public.achievements
  for select
  to authenticated
  using (true);

create policy user_progress_select_own
  on public.user_progress
  for select
  to authenticated
  using (user_id = auth.uid());

create policy user_progress_insert_own
  on public.user_progress
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy user_progress_update_own
  on public.user_progress
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy user_progress_delete_own
  on public.user_progress
  for delete
  to authenticated
  using (user_id = auth.uid());

create policy performance_records_select_own
  on public.performance_records
  for select
  to authenticated
  using (user_id = auth.uid());

create policy performance_records_insert_own
  on public.performance_records
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy user_achievements_select_own
  on public.user_achievements
  for select
  to authenticated
  using (user_id = auth.uid());

create policy user_achievements_insert_own
  on public.user_achievements
  for insert
  to authenticated
  with check (user_id = auth.uid());

grant select, insert, update on public.profiles to authenticated;
grant select on public.lessons to authenticated;
grant select, insert, update, delete on public.user_progress to authenticated;
grant select, insert on public.performance_records to authenticated;
grant select on public.achievements to authenticated;
grant select, insert on public.user_achievements to authenticated;
