-- CRITICAL FIX: Convert audit_logs blocking policies from PERMISSIVE to RESTRICTIVE
-- PERMISSIVE policies with USING(false) DO NOT block access - they just add OR conditions
-- RESTRICTIVE policies with USING(false) create absolute blocks

-- Drop the incorrectly configured PERMISSIVE policies
DROP POLICY IF EXISTS "audit_logs_block_anon_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_block_non_admin_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_no_delete_ever" ON public.audit_logs;

-- Create proper RESTRICTIVE blocking policy for anonymous users
CREATE POLICY "audit_logs_block_anon_all"
  ON public.audit_logs
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false);

-- Create proper RESTRICTIVE blocking policy for authenticated non-admins
CREATE POLICY "audit_logs_require_admin_select"
  ON public.audit_logs
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Recreate the delete blocker as RESTRICTIVE
CREATE POLICY "audit_logs_immutable_deletes"
  ON public.audit_logs
  AS RESTRICTIVE
  FOR DELETE
  TO public
  USING (false);

-- Verify RLS is still forced
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- Revoke any direct table permissions
REVOKE ALL ON public.audit_logs FROM PUBLIC;
REVOKE ALL ON public.audit_logs FROM anon;
REVOKE ALL ON public.audit_logs FROM authenticated;

-- Grant minimal permissions
GRANT SELECT ON public.audit_logs TO authenticated; -- Will be filtered by RLS
GRANT INSERT ON public.audit_logs TO authenticated; -- For user's own logs
GRANT ALL ON public.audit_logs TO service_role; -- For system operations

-- Document the fix
INSERT INTO public.security_fixes (finding, severity, remediation, verified_by)
VALUES (
  'PUBLIC_AUDIT_DATA: audit_logs table had PERMISSIVE blocking policies instead of RESTRICTIVE',
  'critical',
  'Converted audit_logs RLS policies from PERMISSIVE to RESTRICTIVE. PERMISSIVE policies with USING(false) do not block - they add to OR conditions. RESTRICTIVE policies create absolute blocks. Now: anon users are completely blocked, authenticated users must be admins to SELECT, all users blocked from DELETE, and table permissions revoked from public/anon.',
  auth.uid()
);