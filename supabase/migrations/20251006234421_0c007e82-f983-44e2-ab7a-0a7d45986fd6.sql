-- Fix user_sessions_safe view security
-- Views cannot have RLS directly, but we can make the view SECURITY INVOKER
-- to ensure it respects the RLS policies on the underlying user_sessions table

-- Drop and recreate the view with SECURITY INVOKER
DROP VIEW IF EXISTS public.user_sessions_safe;

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

-- Document the fix (using 'critical' instead of 'error' for severity)
INSERT INTO public.security_fixes (finding, severity, remediation, verified_by)
VALUES (
  'PUBLIC_SESSION_METADATA: user_sessions_safe view was publicly readable',
  'critical',
  'Recreated user_sessions_safe view with SECURITY INVOKER option to enforce RLS policies from underlying user_sessions table. The view now respects existing policies: users can only view their own sessions, admins can view all sessions.',
  auth.uid()
);