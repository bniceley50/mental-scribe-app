-- Security Fix: Explicitly block anonymous SELECT access to clients table
-- This prevents any possibility of unauthorized PHI exposure

-- Drop the existing generic block policy
DROP POLICY IF EXISTS "clients_block_anonymous" ON public.clients;

-- Create explicit RESTRICTIVE policies for each operation type
-- These ensure NO anonymous access is possible under any circumstances

-- Block anonymous SELECT (read) operations - CRITICAL for PHI protection
CREATE POLICY "clients_block_anonymous_select"
ON public.clients
AS RESTRICTIVE
FOR SELECT
TO PUBLIC
USING (auth.uid() IS NOT NULL);

-- Block anonymous INSERT operations
CREATE POLICY "clients_block_anonymous_insert"
ON public.clients
AS RESTRICTIVE
FOR INSERT
TO PUBLIC
WITH CHECK (auth.uid() IS NOT NULL);

-- Block anonymous UPDATE operations
CREATE POLICY "clients_block_anonymous_update"
ON public.clients
AS RESTRICTIVE
FOR UPDATE
TO PUBLIC
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Block anonymous DELETE operations
CREATE POLICY "clients_block_anonymous_delete"
ON public.clients
AS RESTRICTIVE
FOR DELETE
TO PUBLIC
USING (auth.uid() IS NOT NULL);

-- Add comment explaining the security requirement
COMMENT ON TABLE public.clients IS 'Contains protected health information (PHI). All access requires authentication. Anonymous access is explicitly blocked by RESTRICTIVE RLS policies.';

-- Verify RLS is enabled (should already be enabled, but double-check)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Similarly fix audit_logs table which has the same issue
DROP POLICY IF EXISTS "audit_logs_block_anonymous" ON public.audit_logs;

CREATE POLICY "audit_logs_block_anonymous_select"
ON public.audit_logs
AS RESTRICTIVE
FOR SELECT
TO PUBLIC
USING (auth.uid() IS NOT NULL);

CREATE POLICY "audit_logs_block_anonymous_insert"
ON public.audit_logs
AS RESTRICTIVE
FOR INSERT
TO PUBLIC
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "audit_logs_block_anonymous_update"
ON public.audit_logs
AS RESTRICTIVE
FOR UPDATE
TO PUBLIC
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "audit_logs_block_anonymous_delete"
ON public.audit_logs
AS RESTRICTIVE
FOR DELETE
TO PUBLIC
USING (auth.uid() IS NOT NULL);

COMMENT ON TABLE public.audit_logs IS 'Contains security-sensitive audit logs. All access requires authentication. Anonymous access is explicitly blocked by RESTRICTIVE RLS policies.';

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;