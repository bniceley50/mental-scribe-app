-- PHASE 1A: Fix audit_logs to allow service_role INSERT while maintaining security
-- Problem: Service role cannot write audit logs due to overly restrictive policies

-- Add PERMISSIVE policy for service_role full access (needed for triggers)
CREATE POLICY "audit_logs_service_role_full_access"
  ON public.audit_logs
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add PERMISSIVE policy for authenticated users to insert their own audit logs
CREATE POLICY "audit_logs_authenticated_insert_own"
  ON public.audit_logs
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Document the fix
INSERT INTO public.security_fixes (finding, severity, remediation, verified_by)
VALUES (
  'AUDIT_SERVICE_ACCESS: audit_logs blocking policies prevented service_role from inserting records',
  'critical',
  'Added PERMISSIVE policies to allow service_role full access and authenticated users to insert their own audit logs, while maintaining RESTRICTIVE policies that block anonymous access and prevent updates/deletes.',
  auth.uid()
);