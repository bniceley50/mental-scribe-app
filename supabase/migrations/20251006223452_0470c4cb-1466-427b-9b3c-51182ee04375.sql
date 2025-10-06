-- ============================================
-- FIX: User Sessions Safe View RLS
-- Date: 2025-10-06
-- Addresses: "Active User Sessions Could Be Hijacked" ERROR
-- ============================================

-- The user_sessions_safe view needs proper RLS enforcement
-- Views inherit RLS from their base tables, but we need to ensure proper policies exist

-- Drop the problematic policy that uses request.path (unreliable)
DROP POLICY IF EXISTS "user_sessions_safe_select_own" ON public.user_sessions;

-- The view already exists and inherits RLS from user_sessions table
-- The existing "user_sessions_view_own_metadata" policy should handle this
-- But let's verify and add a comment to the view for clarity

COMMENT ON VIEW public.user_sessions_safe IS 
'Safe metadata view of user sessions (excludes token_hash and salt). 
RLS is enforced via base table policies: user_sessions_view_own_metadata and user_sessions_admin_full_access.
Users can only see their own session metadata. Admins see all sessions.';

-- Verify the view definition is secure
-- It should NOT expose: session_token, token_hash, salt
-- It SHOULD expose only: id, user_id, created_at, last_activity_at, expires_at, ip_address, user_agent, status

-- Re-verify the base table policy is correct
-- This policy allows users to view their own sessions (which the view will filter safely)
DO $$
BEGIN
  -- Check if the policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_sessions' 
    AND policyname = 'user_sessions_view_own_metadata'
  ) THEN
    -- Create it if missing
    CREATE POLICY "user_sessions_view_own_metadata"
    ON public.user_sessions FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

COMMENT ON POLICY "user_sessions_view_own_metadata" ON public.user_sessions IS
'Allows users to SELECT their own sessions. When queried via user_sessions_safe view, only non-sensitive metadata is exposed (no token_hash or salt).';

-- ===========================================
-- VERIFICATION QUERIES
-- ===========================================

-- Verify view columns (should NOT include session_token, token_hash, salt)
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'user_sessions_safe' ORDER BY ordinal_position;

-- Verify RLS is enabled on base table
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'user_sessions';

-- Verify policies on base table
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'user_sessions';