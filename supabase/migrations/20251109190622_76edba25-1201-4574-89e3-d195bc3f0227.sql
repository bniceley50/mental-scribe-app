-- =============================================================================
-- MV REFRESH SAFETY + LOGGING (NON-CONCURRENT)
-- =============================================================================

-- ==================== 1. DROP OLD INDEXES ====================
DROP INDEX IF EXISTS public.mv_audit_daily_stats_uidx;
DROP INDEX IF EXISTS public.mv_audit_daily_stats_day_uq;
DROP INDEX IF EXISTS public.mv_audit_daily_stats_user_day_uq;
DROP INDEX IF EXISTS public.mv_audit_daily_stats_tenant_day_uq;