-- Security Fix: Add SELECT policy to audit_logs table
-- Audit logs should not be accessible to regular users to maintain audit trail integrity
CREATE POLICY "Prevent public access to audit logs"
ON public.audit_logs
FOR SELECT
USING (false);