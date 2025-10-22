-- Create table to track scheduled job executions
create table if not exists public.scheduled_job_executions (
  id uuid primary key default gen_random_uuid(),
  job_id text not null,
  execution_id text not null,
  attempt integer not null default 1,
  status text not null check (status in ('running','success','failed','retrying','cancelled')) default 'running',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_ms integer,
  error text,
  result jsonb,
  metrics jsonb,
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists scheduled_job_executions_job_time_idx
  on public.scheduled_job_executions (job_id, started_at desc);

create index if not exists scheduled_job_executions_status_time_idx
  on public.scheduled_job_executions (status, started_at desc);

create index if not exists scheduled_job_executions_execution_id_idx
  on public.scheduled_job_executions (execution_id);

-- Enable RLS and restrict access
alter table public.scheduled_job_executions enable row level security;

-- Allow service_role full access
create policy if not exists "scheduled_job_executions service access"
  on public.scheduled_job_executions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Allow admins to read
create policy if not exists "scheduled_job_executions admin read"
  on public.scheduled_job_executions
  for select
  using (
    coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '') in ('admin', 'service_role')
  );

-- Optionally, function helpers to write from the app's backend (service role)
create or replace function public.log_job_start(
  p_job_id text,
  p_execution_id text,
  p_attempt integer default 1
) returns uuid
language plpgsql
security definer set search_path = public as $$
declare
  v_id uuid;
begin
  insert into public.scheduled_job_executions (job_id, execution_id, attempt, status)
  values (p_job_id, p_execution_id, coalesce(p_attempt, 1), 'running')
  returning id into v_id;
  return v_id;
end; $$;

create or replace function public.log_job_complete(
  p_execution_id text,
  p_success boolean,
  p_error text default null,
  p_duration_ms integer default null,
  p_result jsonb default null,
  p_metrics jsonb default null
) returns void
language plpgsql
security definer set search_path = public as $$
begin
  update public.scheduled_job_executions
     set status = case when p_success then 'success' else 'failed' end,
         completed_at = now(),
         duration_ms = p_duration_ms,
         error = p_error,
         result = p_result,
         metrics = p_metrics
   where execution_id = p_execution_id;
end; $$;
