-- CRITICAL SECURITY FIX: Block anonymous access to audit tables
-- These tables contain sensitive tracking data that MUST NOT be publicly readable

-- Fix 1: audit_logs - Block all anonymous access
DROP POLICY IF EXISTS "audit_logs_block_anon_all" ON public.audit_logs;
CREATE POLICY "audit_logs_block_anon_all"
ON public.audit_logs
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Fix 2: client_access_logs - Block all anonymous access
DROP POLICY IF EXISTS "client_access_logs_block_anon_all" ON public.client_access_logs;
CREATE POLICY "client_access_logs_block_anon_all"
ON public.client_access_logs
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Fix 3: user_sessions - Block all anonymous access
DROP POLICY IF EXISTS "user_sessions_block_anon_all" ON public.user_sessions;
CREATE POLICY "user_sessions_block_anon_all"
ON public.user_sessions
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Fix 4: Audit logs should be IMMUTABLE - remove admin DELETE policy
DROP POLICY IF EXISTS "audit_logs_admin_delete" ON public.audit_logs;

-- Note: user_sessions_safe is a VIEW - RLS is enforced by the underlying user_sessions table
-- The view will automatically respect the table's RLS policies

-- VERIFICATION: After this migration, test that anonymous users are blocked:
-- 1. Log out completely
-- 2. Open browser console
-- 3. Run: supabase.from('audit_logs').select('*')
-- 4. Should receive: "permission denied for table audit_logs"
