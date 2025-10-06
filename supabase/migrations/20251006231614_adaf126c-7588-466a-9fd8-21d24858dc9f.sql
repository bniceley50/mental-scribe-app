-- CRITICAL SECURITY FIX: Enable RLS on user_sessions_safe view
-- This view exposes session metadata and must have RLS protection

-- Enable RLS on the view
ALTER VIEW public.user_sessions_safe SET (security_invoker = true);

-- Note: Views inherit RLS from underlying tables when security_invoker is true
-- The user_sessions table already has proper RLS policies:
-- 1. user_sessions_view_own_metadata: Users see only their own sessions
-- 2. user_sessions_admin_full_access: Admins see all sessions
-- 3. user_sessions_block_anon_all: Anonymous users blocked

-- Document this security fix
INSERT INTO public.security_fixes (
  finding,
  severity,
  remediation,
  fix_date,
  verified_by
) VALUES (
  'User Session Data Publicly Readable via user_sessions_safe View',
  'critical',
  'Enabled security_invoker on user_sessions_safe view. The view now respects RLS policies from the underlying user_sessions table, preventing unauthorized access to session metadata (IP addresses, user agents, session status). Users can only view their own sessions, admins can view all.',
  now(),
  NULL
);