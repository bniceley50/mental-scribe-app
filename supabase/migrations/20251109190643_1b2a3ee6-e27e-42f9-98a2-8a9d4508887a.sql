-- =============================================================================
-- MV REFRESH LOGGING + CRON UPDATE
-- =============================================================================

-- ==================== 1. REFRESH LOG TABLE ====================
CREATE TABLE IF NOT EXISTS public.mv_refresh_log (
  id bigserial PRIMARY KEY,
  mv_name text NOT NULL,
  refreshed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mv_refresh_log_mv_name_idx 
  ON public.mv_refresh_log (mv_name, refreshed_at DESC);

-- ==================== 2. WRAPPER FUNCTION ====================
CREATE OR REPLACE FUNCTION public.refresh_mv_and_log(_mv text)
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I', _mv);
  INSERT INTO public.mv_refresh_log (mv_name) VALUES (_mv);
  
  -- Cleanup old logs
  DELETE FROM public.mv_refresh_log
  WHERE id IN (
    SELECT id FROM public.mv_refresh_log
    WHERE mv_name = _mv
    ORDER BY refreshed_at DESC
    OFFSET 1000
  );
END;
$$;

-- ==================== 3. UPDATE CRON JOB ====================
-- Unschedule old job
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'refresh_audit_stats';

-- Create new job with logging
SELECT cron.schedule(
  'refresh_audit_stats',
  '*/5 * * * *',
  'SELECT public.refresh_mv_and_log(''mv_audit_daily_stats'')'
);

-- ==================== 4. ADMIN STATUS VIEW ====================
CREATE OR REPLACE VIEW public.mv_refresh_status AS
SELECT 
  mv_name,
  MAX(refreshed_at) as last_refresh,
  COUNT(*) as total_refreshes,
  now() - MAX(refreshed_at) as time_since_refresh
FROM public.mv_refresh_log
GROUP BY mv_name;

GRANT SELECT ON public.mv_refresh_status TO authenticated;

-- ==================== 5. INITIAL REFRESH + LOG ====================
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_audit_daily_stats;
INSERT INTO public.mv_refresh_log (mv_name) VALUES ('mv_audit_daily_stats');