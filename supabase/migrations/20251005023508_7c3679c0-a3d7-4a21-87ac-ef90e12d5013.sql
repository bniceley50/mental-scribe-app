-- Fix audit logs authentication gap for non-admin users
-- Finding: Missing explicit authentication requirement for SELECT on audit_logs

-- Block non-admin authenticated users from reading audit logs
CREATE POLICY "Block non-admin authenticated users from audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Note: This works with existing policies:
-- 1. "Admins can view all audit logs" allows admin SELECT
-- 2. "Deny anonymous access to audit logs" blocks anon
-- 3. This new policy ensures only admins among authenticated users can read