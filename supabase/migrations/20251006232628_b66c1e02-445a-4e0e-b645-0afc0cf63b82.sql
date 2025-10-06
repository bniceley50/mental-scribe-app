-- ============================================================================
-- SECURITY FIX: Make user_sessions_safe a security invoker view
-- ============================================================================
-- Issue: user_sessions_safe view has no RLS policies (scanner flagged as critical)
-- Root Cause: Views cannot have RLS policies directly in PostgreSQL
-- Solution: Recreate view with security_invoker option to inherit RLS from base table
-- ============================================================================

-- Drop existing view
DROP VIEW IF EXISTS public.user_sessions_safe;

-- Recreate view with security_invoker option
-- This makes the view execute with the caller's permissions, not the view owner's
-- Therefore it will inherit all RLS policies from the user_sessions table
CREATE VIEW public.user_sessions_safe
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  created_at,
  last_activity_at,
  expires_at,
  ip_address,
  user_agent,
  CASE
    WHEN expires_at > now() THEN 'active'::text
    ELSE 'expired'::text
  END AS status
FROM public.user_sessions;

-- Add security comment
COMMENT ON VIEW public.user_sessions_safe IS 
'SECURITY: This view uses security_invoker=true to inherit RLS policies from user_sessions table. Access is controlled by: (1) user_sessions_admin_full_access - admins can view all sessions, (2) user_sessions_view_own_metadata - users can view only their own session metadata, (3) user_sessions_block_anon_all - blocks all anonymous access. Session tokens and hashes are never exposed.';

-- Grant appropriate permissions
GRANT SELECT ON public.user_sessions_safe TO authenticated;
REVOKE ALL ON public.user_sessions_safe FROM anon;

-- Document the fix
INSERT INTO public.security_fixes (
  finding,
  severity,
  remediation,
  fix_date
) VALUES (
  'user_sessions_safe view exposing session metadata without RLS protection',
  'critical',
  'Recreated user_sessions_safe view with security_invoker=true option. This makes the view inherit all RLS policies from the underlying user_sessions table: blocks anonymous access, restricts users to viewing only their own sessions, allows admin access. Prevents session monitoring attacks where attackers could track user IPs, activity patterns, and active sessions.',
  now()
) ON CONFLICT DO NOTHING;