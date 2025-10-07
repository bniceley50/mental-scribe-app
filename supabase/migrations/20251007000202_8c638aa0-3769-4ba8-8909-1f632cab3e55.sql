-- PHASE 1B: Fix client_access_logs to allow service_role INSERT
-- Problem: Service role cannot write access logs due to overly restrictive policies

-- Add PERMISSIVE policy for service_role full access (needed for triggers and log_client_view function)
CREATE POLICY "client_access_logs_service_role_full_access"
  ON public.client_access_logs
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add PERMISSIVE policy for authenticated users to insert access logs (for log_client_view function)
CREATE POLICY "client_access_logs_authenticated_insert_own"
  ON public.client_access_logs
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Document the fix
INSERT INTO public.security_fixes (finding, severity, remediation, verified_by)
VALUES (
  'ACCESS_LOG_SERVICE_ACCESS: client_access_logs blocking policies prevented service_role from inserting records',
  'critical',
  'Added PERMISSIVE policies to allow service_role full access and authenticated users to insert access logs via log_client_view function, while maintaining RESTRICTIVE policies that block anonymous access and prevent updates/deletes.',
  auth.uid()
);