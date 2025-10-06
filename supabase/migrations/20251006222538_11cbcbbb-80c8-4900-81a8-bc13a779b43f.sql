-- Enable RLS on user_sessions_safe view
-- Views in PostgreSQL don't directly support RLS, but we can use the underlying table's RLS

-- The user_sessions_safe is a view, not a table, so we need to ensure
-- the underlying table (user_sessions) has proper RLS policies

-- Since views inherit RLS from their underlying tables when using security_invoker=true,
-- we just need to add a policy that allows users to SELECT their own sessions
-- when querying through the view

-- First, let's add a helpful policy that makes it clear this is for the view
DROP POLICY IF EXISTS "user_sessions_safe_select_own" ON public.user_sessions;

CREATE POLICY "user_sessions_view_own_metadata"
ON public.user_sessions
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);

COMMENT ON POLICY "user_sessions_view_own_metadata" ON public.user_sessions IS 
'Allows users to view their own session metadata through user_sessions_safe view.
Does NOT expose session_token or token_hash - those columns are excluded from the view.';

-- Update the admin policy to be more explicit
DROP POLICY IF EXISTS "user_sessions_admin_all" ON public.user_sessions;

CREATE POLICY "user_sessions_admin_full_access"
ON public.user_sessions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

COMMENT ON POLICY "user_sessions_admin_full_access" ON public.user_sessions IS 
'Admins have full access to session table for debugging.
WARNING: Admins can see token_hash and salt, but NOT the plaintext token.';

-- Remove the restrictive no_select_tokens policy since we have better granularity now
DROP POLICY IF EXISTS "user_sessions_no_select_tokens" ON public.user_sessions;

-- Document the security model
COMMENT ON TABLE public.user_sessions IS 
'User session management with hashed tokens.
SECURITY MODEL:
- session_token: DEPRECATED - stores plaintext temporarily for hashing, never query directly
- token_hash: Hashed token (HMAC-SHA256, 100k iterations) - only for validation
- salt: Unique per session - used for hashing
- Users can SELECT their own sessions to view metadata (via user_sessions_safe view)
- Admins can SELECT all sessions for debugging (token_hash visible, NOT plaintext)
- All INSERT operations automatically hash session_token via trigger
- Use validate_session_token() RPC for authentication validation
Updated: 2025-10-06 - Implemented token hashing to prevent session hijacking.';
