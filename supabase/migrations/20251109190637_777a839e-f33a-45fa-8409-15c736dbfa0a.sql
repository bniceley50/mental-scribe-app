-- =============================================================================
-- MV UNIQUE INDEX (NON-CONCURRENT)
-- =============================================================================

-- Create unique index (non-concurrent since we're in a transaction)
CREATE UNIQUE INDEX IF NOT EXISTS mv_audit_daily_stats_day_uq
  ON public.mv_audit_daily_stats (day);