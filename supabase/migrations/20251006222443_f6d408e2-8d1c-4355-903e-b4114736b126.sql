-- Fix SECURITY DEFINER view warning by using SECURITY INVOKER instead
-- This ensures RLS is enforced based on the querying user, not the view creator

-- Drop and recreate the view with proper security settings
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
  CASE WHEN expires_at > now() THEN 'active' ELSE 'expired' END as status
FROM public.user_sessions;

-- Enable RLS on the view
ALTER VIEW public.user_sessions_safe SET (security_barrier = true);

-- Grant SELECT to authenticated users
GRANT SELECT ON public.user_sessions_safe TO authenticated;

-- Add RLS policy for the view (users can only see their own sessions)
CREATE POLICY "user_sessions_safe_select_own"
ON public.user_sessions
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  AND current_setting('request.path', true) LIKE '%user_sessions_safe%'
);

COMMENT ON VIEW public.user_sessions_safe IS 
'SECURITY INVOKER view of user sessions (excludes sensitive token data).
Users can see their own session metadata but never the actual session tokens.
Uses SECURITY INVOKER to enforce RLS based on querying user.';
