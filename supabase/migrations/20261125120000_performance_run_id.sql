alter table public.performance_records add column run_id uuid;

create unique index performance_records_run_id_key
  on public.performance_records (run_id)
  where run_id is not null;
