# Feature #8: Ops Runbooks, Scheduled Jobs, and Health Checks

This feature introduces a complete operational toolkit for Mental Scribe:

- Runbooks for incident response, maintenance, and health checks
- A reusable TypeScript scheduler package (`@mscribe/scheduler`) for cron/interval jobs
- A Supabase Edge Function (`health-check`) providing a system health endpoint
- Example scheduled jobs (cleanup, backups, log rotation, security scans, metric aggregation)
- Database schema for tracking job executions

## Components

- docs/runbooks/INCIDENT_RESPONSE.md — Step-by-step incident response with severity levels
- docs/runbooks/MAINTENANCE.md — Routine maintenance procedures and schedules
- docs/runbooks/HEALTH_CHECKS.md — Health endpoint spec and troubleshooting
- packages/scheduler — Scheduler package source, tests, and config
- supabase/functions/health-check — Edge function with database/auth/storage checks
- apps/playground/scheduled-jobs.example.ts — 7 common operational jobs
- supabase/migrations/*_scheduled_job_executions.sql — Job execution tracking table + policies

## Using the Scheduler

- Import in your app code:

  import { JobScheduler } from '@mscribe/scheduler'

- Initialize and register jobs (see `apps/playground/scheduled-jobs.example.ts`).
- Supports cron strings (e.g., `0 2 * * *`) and ms intervals (e.g., `60_000`).
- Configure per-job timeout and retry with exponential backoff.
- Graceful shutdown via `scheduler.stop()`.

 
### Contract

- Inputs: JobConfig { id, name, schedule, handler, timeout?, retry? }
- Outputs: JobResult { success, error?, durationMs?, data?, metrics? }
- Error modes: handler throws, timeout, cancellation, retries exceeded.
- Success criteria: handler resolves with success: true; scheduler logs status and next run.

## Health Checks

- Endpoint: GET /health-check (Supabase Edge Function)
- Aggregates DB, auth, storage status; returns JSON with `healthy|degraded|unhealthy`.
- Returns 200 for healthy; 503 otherwise. No-cache headers for correctness.

## Job Execution Tracking

- Table: public.scheduled_job_executions
  - Columns: id, job_id, execution_id, attempt, status, started_at, completed_at, duration_ms, error, result, metrics
  - RLS: service_role full access; admin can read
  - Helpers: public.log_job_start(job_id, execution_id, attempt), public.log_job_complete(execution_id,...)

## Local Development

- TypeScript path alias is configured: `@mscribe/scheduler` -> `packages/scheduler/src`
- Tests: unit tests for registry, executor, and scheduler with Vitest

## How to run tests (optional)

- Package-only tests:

  pnpm -C packages/scheduler test

## Deployment notes

- Deploy health check function:

  supabase functions deploy health-check

- Apply migrations (using your Supabase workflow/CI):
  - Run SQL in `supabase/migrations/*_scheduled_job_executions.sql`

## Troubleshooting

- If imports fail: ensure tsconfig path alias is present and your tooling picks it up.
- If jobs don't execute: verify `scheduler.start()` is called and `schedule` is valid.
- If timeouts not triggering: ensure job `timeout` is set and handler reacts to `AbortSignal` when possible.
- Health check failures: see docs/runbooks/HEALTH_CHECKS.md troubleshooting.
