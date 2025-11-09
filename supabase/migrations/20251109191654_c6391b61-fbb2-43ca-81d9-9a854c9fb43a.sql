-- Fix the permission issues - audit_verify_runs already exists
-- Just grant permissions
GRANT SELECT, INSERT ON TABLE public.audit_verify_runs TO service_role;

-- Remove old HTTP cron jobs if they exist
DO $$
BEGIN
  PERFORM cron.unschedule(jobid) 
  FROM cron.job 
  WHERE jobname LIKE '%verify%audit%' 
    AND command LIKE '%http%';
END$$;