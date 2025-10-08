-- pgTAP tests for audit immutability. Run in CI against a disposable DB.
-- Do NOT run against production.

BEGIN;
SET client_min_messages = warning;

SELECT plan(3);

-- 0) Ensure schema is loaded (audit_logs must already exist)
SELECT has_table('public', 'audit_logs', 'audit_logs table exists before immutability tests');

-- 1) UPDATE must fail
SELECT throws_ok(
  $$ UPDATE public.audit_logs SET event_type = 'tamper' LIMIT 1 $$,
  'audit_logs are immutable',
  'UPDATE on audit_logs is blocked'
);

-- 2) DELETE must fail
SELECT throws_ok(
  $$ DELETE FROM public.audit_logs WHERE true $$,
  'audit_logs are immutable',
  'DELETE on audit_logs is blocked'
);

SELECT * FROM finish();
ROLLBACK;