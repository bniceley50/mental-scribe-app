-- Fix: Set security_invoker=true on views to prevent security_definer behavior
-- This ensures views execute with the permissions of the calling user, not the view creator

-- Fix mv_refresh_status view
CREATE OR REPLACE VIEW public.mv_refresh_status
WITH (security_invoker = true, security_barrier = true)
AS
SELECT 
  mv_name,
  MAX(refreshed_at) AS last_refresh,
  COUNT(*) AS total_refreshes,
  NOW() - MAX(refreshed_at) AS time_since_refresh
FROM public.mv_refresh_log
GROUP BY mv_name;

-- Fix performance_index_usage view
CREATE OR REPLACE VIEW public.performance_index_usage
WITH (security_invoker = true, security_barrier = true)
AS
SELECT 
  schemaname,
  relname AS table_name,
  indexrelname AS index_name,
  idx_scan AS scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid::regclass)) AS size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan, pg_relation_size(indexrelid::regclass) DESC;

-- Fix performance_table_bloat view
CREATE OR REPLACE VIEW public.performance_table_bloat
WITH (security_invoker = true, security_barrier = true)
AS
SELECT 
  schemaname,
  relname AS table_name,
  n_live_tup AS live_tuples,
  n_dead_tup AS dead_tuples,
  ROUND(100.0 * n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0)::numeric, 2) AS pct_dead,
  pg_size_pretty(pg_total_relation_size((schemaname || '.' || relname)::regclass)) AS total_size,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_dead_tup DESC;

COMMENT ON VIEW public.mv_refresh_status IS 'Materialized view refresh status (security_invoker)';
COMMENT ON VIEW public.performance_index_usage IS 'Index usage statistics (security_invoker)';
COMMENT ON VIEW public.performance_table_bloat IS 'Table bloat analysis (security_invoker)';