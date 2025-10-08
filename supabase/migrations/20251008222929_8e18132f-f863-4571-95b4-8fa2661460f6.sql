-- CRITICAL SECURITY FIX: Block public access to audit and session tables
-- Issue: audit_logs, client_access_logs, user_sessions, and user_sessions_safe are publicly readable
-- This exposes sensitive tracking data, IP addresses, session tokens, and user behavior

-- ============================================================================
-- Part 1: Remove overly permissive policies
-- ============================================================================

-- Remove service role policies that allow unrestricted access
DROP POLICY IF EXISTS "audit_logs_service_role_full_access" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_service_role_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "client_access_logs_service_role_full_access" ON public.client_access_logs;
DROP POLICY IF EXISTS "client_access_logs_service_insert" ON public.client_access_logs;

-- ============================================================================
-- Part 2: Ensure FORCE RLS is enabled (cannot be bypassed by service role)
-- ============================================================================

ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.client_access_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- Part 3: Add RESTRICTIVE policies to block anonymous/public access
-- ============================================================================

-- Block ALL anonymous access to audit_logs (no exceptions)
CREATE POLICY "audit_logs_block_public_access"
ON public.audit_logs AS RESTRICTIVE
FOR ALL TO anon
USING (false)
WITH CHECK (false);

-- Block ALL anonymous access to client_access_logs
CREATE POLICY "client_access_logs_block_public_access"
ON public.client_access_logs AS RESTRICTIVE
FOR ALL TO anon
USING (false)
WITH CHECK (false);

-- Block ALL anonymous access to user_sessions
CREATE POLICY "user_sessions_block_public_access"
ON public.user_sessions AS RESTRICTIVE
FOR ALL TO anon
USING (false)
WITH CHECK (false);

-- ============================================================================
-- Part 4: Fix user_sessions_safe view (it's a view, not a table)
-- ============================================================================

-- Drop and recreate the view with security barrier
DROP VIEW IF EXISTS public.user_sessions_safe;

CREATE VIEW public.user_sessions_safe
WITH (security_barrier = true, security_invoker = true)
AS
SELECT 
  id,
  user_id,
  ip_address,
  user_agent,
  created_at,
  last_activity_at,
  expires_at,
  CASE 
    WHEN expires_at > now() THEN 'active'::text
    ELSE 'expired'::text
  END AS status
FROM public.user_sessions
WHERE user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role);

-- Add comment explaining security
COMMENT ON VIEW public.user_sessions_safe IS 
'Secure view of user sessions - automatically filters to current user or admin. Uses security_barrier to prevent RLS bypass.';

-- ============================================================================
-- Part 5: Ensure proper authenticated user policies exist
-- ============================================================================

-- Ensure authenticated users can only insert their own audit logs
DROP POLICY IF EXISTS "audit_logs_authenticated_insert_own" ON public.audit_logs;
CREATE POLICY "audit_logs_authenticated_insert_own"
ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Ensure authenticated users can insert client access logs (via triggers)
DROP POLICY IF EXISTS "client_access_logs_authenticated_insert_own" ON public.client_access_logs;
CREATE POLICY "client_access_logs_authenticated_insert_own"
ON public.client_access_logs
FOR INSERT TO authenticated
WITH CHECK (accessed_by = auth.uid());

-- ============================================================================
-- Part 6: Verify admin-only SELECT policies are in place
-- ============================================================================

-- These should already exist, but recreate to ensure they're correct
DROP POLICY IF EXISTS "audit_logs_require_admin_select" ON public.audit_logs;
CREATE POLICY "audit_logs_require_admin_select"
ON public.audit_logs
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "client_access_logs_require_admin_select" ON public.client_access_logs;
CREATE POLICY "client_access_logs_require_admin_select"
ON public.client_access_logs
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- Part 7: Log this security fix (using correct severity value 'high')
-- ============================================================================

INSERT INTO public.security_fixes (finding, severity, remediation)
VALUES (
  'PUBLIC_AUDIT_LOGS, PUBLIC_CLIENT_ACCESS_LOGS, PUBLIC_USER_SESSIONS, PUBLIC_USER_SESSIONS_SAFE: Tables were publicly readable',
  'high',
  'Applied RESTRICTIVE RLS policies to block all anonymous access. Enabled FORCE RLS. Recreated user_sessions_safe view with security_barrier. Removed overly permissive service role policies. All audit and session data now requires authentication and proper authorization.'
);