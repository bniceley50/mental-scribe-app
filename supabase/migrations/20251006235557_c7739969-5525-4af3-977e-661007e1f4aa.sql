-- CRITICAL FIX: Convert client_access_logs blocking policies from PERMISSIVE to RESTRICTIVE
-- Same issue as audit_logs - PERMISSIVE policies don't create absolute blocks

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "client_access_logs_block_anon_all" ON public.client_access_logs;
DROP POLICY IF EXISTS "client_access_logs_block_non_admin" ON public.client_access_logs;
DROP POLICY IF EXISTS "client_access_logs_admin_only_select" ON public.client_access_logs;
DROP POLICY IF EXISTS "client_access_logs_immutable" ON public.client_access_logs;
DROP POLICY IF EXISTS "client_access_logs_no_delete" ON public.client_access_logs;
DROP POLICY IF EXISTS "client_access_logs_service_insert" ON public.client_access_logs;

-- Create proper RESTRICTIVE blocking policy for anonymous users
CREATE POLICY "client_access_logs_block_anon_all"
  ON public.client_access_logs
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false);

-- Create proper RESTRICTIVE blocking policy for authenticated non-admins
CREATE POLICY "client_access_logs_require_admin_select"
  ON public.client_access_logs
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Block all updates (immutable audit log)
CREATE POLICY "client_access_logs_immutable_updates"
  ON public.client_access_logs
  AS RESTRICTIVE
  FOR UPDATE
  TO public
  USING (false);

-- Block all deletes (immutable audit log)
CREATE POLICY "client_access_logs_immutable_deletes"
  ON public.client_access_logs
  AS RESTRICTIVE
  FOR DELETE
  TO public
  USING (false);

-- Recreate the service insert policy
CREATE POLICY "client_access_logs_service_insert"
  ON public.client_access_logs
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- FORCE RLS (critical!)
ALTER TABLE public.client_access_logs FORCE ROW LEVEL SECURITY;

-- Revoke any direct table permissions
REVOKE ALL ON public.client_access_logs FROM PUBLIC;
REVOKE ALL ON public.client_access_logs FROM anon;
REVOKE ALL ON public.client_access_logs FROM authenticated;

-- Grant minimal permissions
GRANT SELECT ON public.client_access_logs TO authenticated; -- Filtered by RLS
GRANT INSERT ON public.client_access_logs TO authenticated; -- For logging access
GRANT ALL ON public.client_access_logs TO service_role; -- For system operations

-- Document the fix
INSERT INTO public.security_fixes (finding, severity, remediation, verified_by)
VALUES (
  'PUBLIC_ACCESS_LOGS: client_access_logs table had PERMISSIVE blocking policies and RLS not forced',
  'critical',
  'Converted client_access_logs RLS policies from PERMISSIVE to RESTRICTIVE and enabled FORCE ROW LEVEL SECURITY. Now: anon users completely blocked, authenticated users must be admins to SELECT, all users blocked from UPDATE/DELETE, table permissions revoked from public/anon. Only admins can view patient access patterns.',
  auth.uid()
);