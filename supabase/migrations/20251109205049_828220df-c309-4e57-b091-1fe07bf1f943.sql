-- Security Hardening Migration
-- 1. Ensure v2 audit secret exists (idempotent)
-- 2. Restrict materialized view access to service role only
-- 3. Add MFA enrollment check function

-- =============================================================================
-- 1. Ensure v2 audit secret exists
-- =============================================================================
-- NOTE: This uses a placeholder. Admins MUST update with actual 32-byte hex secret
-- Generate with: openssl rand -hex 32
INSERT INTO private.audit_secrets(version, secret)
VALUES (2, 'REPLACE_WITH_ACTUAL_32_BYTE_HEX_SECRET_FROM_OPENSSL')
ON CONFLICT (version) DO NOTHING;

-- Add comment to table for visibility
COMMENT ON TABLE private.audit_secrets IS 
'CRITICAL: Secret version 2 must be replaced with actual cryptographic secret. Generate with: openssl rand -hex 32';

-- =============================================================================
-- 2. Restrict materialized view to service role only
-- =============================================================================
-- Remove public API access to materialized view (addresses linter warning)
REVOKE SELECT ON public.mv_audit_daily_stats FROM anon;
REVOKE SELECT ON public.mv_audit_daily_stats FROM authenticated;
GRANT SELECT ON public.mv_audit_daily_stats TO service_role;

-- =============================================================================
-- 3. Add admin-only RLS policy for mv_refresh_log
-- =============================================================================
-- The mv_refresh_log should also be admin-only
-- (Note: policy already exists from previous migration, this is idempotent)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'mv_refresh_log' 
    AND policyname = 'mv_refresh_status_admin_only'
  ) THEN
    CREATE POLICY "mv_refresh_status_admin_only"
    ON public.mv_refresh_log
    FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- =============================================================================
-- 4. Add helper function to check MFA enrollment status
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_mfa_enrolled(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.mfa_factors
    WHERE user_id = _user_id
      AND status = 'verified'
  )
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_mfa_enrolled TO authenticated;

-- =============================================================================
-- VALIDATION QUERIES (for manual execution)
-- =============================================================================
-- Run these queries to verify the migration:
-- 
-- 1. Check secret versions in use:
--    SELECT secret_version, COUNT(*) FROM public.audit_logs GROUP BY 1 ORDER BY 1;
--
-- 2. Verify MV access restrictions:
--    SELECT grantee, privilege_type 
--    FROM information_schema.role_table_grants 
--    WHERE table_name='mv_audit_daily_stats';
--
-- 3. List all SECURITY DEFINER functions:
--    SELECT n.nspname, p.proname 
--    FROM pg_proc p 
--    JOIN pg_namespace n ON n.oid = p.pronamespace 
--    WHERE p.prosecdef = true AND n.nspname = 'public';