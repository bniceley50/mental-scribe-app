-- PARANOID MODE: Lock down private schema and audit_secrets table
-- Ensures HMAC secrets are never exposed to client-side roles
REVOKE ALL ON SCHEMA private FROM anon, authenticated, public;
REVOKE ALL ON TABLE private.audit_secrets FROM anon, authenticated, public;

-- Ensure service_role can still access (it bypasses RLS anyway, but explicit is safer)
GRANT USAGE ON SCHEMA private TO service_role;
GRANT SELECT ON TABLE private.audit_secrets TO service_role;

-- Idempotent hourly SQL cron: verifies chain and logs results
-- Runs every hour at :00 minutes
DO $outer$
BEGIN
  -- Only schedule if not already scheduled
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'audit_verify_hourly_sql') THEN
    PERFORM cron.schedule(
      'audit_verify_hourly_sql',
      '0 * * * *',
      $inner$
      INSERT INTO public.audit_verify_runs(intact, total_entries, verified_entries, broken_at_id, details)
      SELECT 
        v.intact, 
        v.total_entries, 
        v.verified_entries, 
        v.broken_at_id,
        jsonb_build_object('expected', v.expected, 'actual', v.actual, 'cron', true)
      FROM public.verify_audit_chain(NULL) v;
      $inner$
    );
  END IF;
END$outer$;