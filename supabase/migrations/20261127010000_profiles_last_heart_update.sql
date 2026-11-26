-- Persist the heart regeneration start timestamp on profiles so heart countdowns
-- sync across browsers and sessions. Idempotent for databases where the column
-- already exists.

alter table public.profiles
  add column if not exists last_heart_update timestamptz;

comment on column public.profiles.last_heart_update is
  'Start timestamp of the current 15-minute heart regeneration period; null when hearts are full (5).';
