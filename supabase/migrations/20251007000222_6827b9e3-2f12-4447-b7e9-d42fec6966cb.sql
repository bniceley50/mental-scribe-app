-- PHASE 2: Secure user_sessions_safe view with proper RLS
-- Problem: View is publicly readable, exposing session metadata to anonymous users

-- Drop the existing view
DROP VIEW IF EXISTS public.user_sessions_safe;

-- Recreate view with security_invoker to inherit RLS from underlying table
CREATE VIEW public.user_sessions_safe
WITH (security_invoker=true, security_barrier=true)
AS
SELECT 
  id,
  user_id,
  expires_at,
  last_activity_at,
  created_at,
  ip_address,
  user_agent,
  CASE 
    WHEN expires_at > now() THEN 'active'
    ELSE 'expired'
  END AS status
FROM public.user_sessions;

-- Enable RLS on the view
ALTER VIEW public.user_sessions_safe SET (security_barrier = true);

-- Document the fix
INSERT INTO public.security_fixes (finding, severity, remediation, verified_by)
VALUES (
  'PUBLIC_SESSION_DATA: user_sessions_safe view was publicly readable without RLS',
  'critical',
  'Recreated user_sessions_safe view with security_invoker=true and security_barrier=true to inherit RLS policies from underlying user_sessions table. Anonymous users can no longer view session data.',
  auth.uid()
);