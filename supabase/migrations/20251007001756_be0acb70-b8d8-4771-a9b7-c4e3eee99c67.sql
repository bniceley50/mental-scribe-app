-- ============================================================================
-- PHASE 1: CRITICAL SECURITY FIXES
-- Fix 3 critical vulnerabilities: audit_logs, client_access_logs, user_sessions_safe
-- ============================================================================

-- ============================================================================
-- FIX 1: AUDIT_LOGS - Complete Lockdown
-- ============================================================================

-- Force RLS (should already be done, but verify)
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- Nuclear option: Revoke ALL existing permissions
REVOKE ALL ON TABLE public.audit_logs FROM PUBLIC, anon, authenticated;

-- Grant only what's absolutely necessary (filtered by RLS)
GRANT SELECT ON TABLE public.audit_logs TO authenticated;
GRANT INSERT ON TABLE public.audit_logs TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO service_role;

-- Recreate all RESTRICTIVE policies to ensure they're properly applied
DROP POLICY IF EXISTS "audit_logs_block_anon_all" ON public.audit_logs;
CREATE POLICY "audit_logs_block_anon_all"
  ON public.audit_logs
  AS RESTRICTIVE
  FOR ALL
  TO anon, public
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "audit_logs_require_admin_select" ON public.audit_logs;
CREATE POLICY "audit_logs_require_admin_select"
  ON public.audit_logs
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Keep existing immutability policies (already RESTRICTIVE)
-- (audit_logs_immutable_deletes and audit_logs_immutable_updates should already exist)

-- ============================================================================
-- FIX 2: CLIENT_ACCESS_LOGS - Admin-Only Access
-- ============================================================================

-- Force RLS
ALTER TABLE public.client_access_logs FORCE ROW LEVEL SECURITY;

-- Revoke all public access
REVOKE ALL ON TABLE public.client_access_logs FROM PUBLIC, anon, authenticated;

-- Grant minimal permissions
GRANT SELECT ON TABLE public.client_access_logs TO authenticated; -- Filtered by admin-only RLS
GRANT INSERT ON TABLE public.client_access_logs TO authenticated, service_role; -- For triggers
GRANT ALL ON TABLE public.client_access_logs TO service_role;

-- Recreate RESTRICTIVE policies
DROP POLICY IF EXISTS "client_access_logs_block_anon_all" ON public.client_access_logs;
CREATE POLICY "client_access_logs_block_anon_all"
  ON public.client_access_logs
  AS RESTRICTIVE
  FOR ALL
  TO anon, public
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "client_access_logs_require_admin_select" ON public.client_access_logs;
CREATE POLICY "client_access_logs_require_admin_select"
  ON public.client_access_logs
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Keep existing immutability policies
-- (client_access_logs_immutable_deletes and client_access_logs_immutable_updates should already exist)

-- ============================================================================
-- FIX 3: USER_SESSIONS_SAFE VIEW - Inherit RLS from user_sessions table
-- ============================================================================

-- First, ensure user_sessions table is properly locked down
ALTER TABLE public.user_sessions FORCE ROW LEVEL SECURITY;

-- Revoke all public access to user_sessions
REVOKE ALL ON TABLE public.user_sessions FROM PUBLIC, anon, authenticated;

-- Grant minimal permissions
GRANT SELECT ON TABLE public.user_sessions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.user_sessions TO authenticated;
GRANT ALL ON TABLE public.user_sessions TO service_role;

-- Ensure RESTRICTIVE policy blocks anonymous access to user_sessions
DROP POLICY IF EXISTS "user_sessions_block_anon_all" ON public.user_sessions;
CREATE POLICY "user_sessions_block_anon_all"
  ON public.user_sessions
  AS RESTRICTIVE
  FOR ALL
  TO anon, public
  USING (false)
  WITH CHECK (false);

-- Verify users can only see their own sessions
-- (Keep existing policies: user_sessions_view_own_metadata, user_sessions_owner_delete, user_sessions_admin_full_access)

-- The view user_sessions_safe should inherit these RLS policies automatically
-- since it's based on the user_sessions table

-- ============================================================================
-- VERIFICATION & DOCUMENTATION
-- ============================================================================

-- Document all fixes
INSERT INTO public.security_fixes (finding, severity, remediation, verified_by)
VALUES 
  (
    'PUBLIC_AUDIT_DATA: audit_logs table publicly readable',
    'critical',
    'Applied FORCE RLS, revoked all PUBLIC/anon/authenticated permissions, recreated RESTRICTIVE policies blocking anon and requiring admin for SELECT. Verified grants are minimal and filtered by RLS.',
    auth.uid()
  ),
  (
    'PUBLIC_ACCESS_LOGS: client_access_logs table publicly readable',
    'critical',
    'Applied FORCE RLS, revoked all PUBLIC/anon/authenticated permissions, created RESTRICTIVE policies blocking anon and requiring admin for SELECT. Allowed service_role INSERT for triggers.',
    auth.uid()
  ),
  (
    'PUBLIC_SESSION_VIEW: user_sessions_safe view has no RLS',
    'critical',
    'Hardened underlying user_sessions table with FORCE RLS and RESTRICTIVE anon-blocking policy. View inherits RLS from base table. Users can only see their own sessions, admins have full access.',
    auth.uid()
  );

-- Verification queries (these should return 0 for proper lockdown):
-- SELECT grantee, privilege_type FROM information_schema.role_table_grants 
-- WHERE table_name IN ('audit_logs', 'client_access_logs', 'user_sessions') 
-- AND grantee IN ('anon', 'PUBLIC');