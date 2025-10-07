-- CRITICAL FIX: Ensure audit_logs table is completely locked down from public access
-- Problem: Security scanner detects audit_logs as publicly readable

-- Step 1: Force RLS on audit_logs (if not already forced)
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- Step 2: Revoke ALL direct table permissions from public roles
REVOKE ALL ON public.audit_logs FROM PUBLIC;
REVOKE ALL ON public.audit_logs FROM anon;
REVOKE ALL ON public.audit_logs FROM authenticated;

-- Step 3: Grant minimal permissions (will be filtered by RLS)
GRANT SELECT ON public.audit_logs TO authenticated; -- Filtered by admin-only RLS policy
GRANT INSERT ON public.audit_logs TO authenticated; -- Filtered by user_id = auth.uid() policy
GRANT ALL ON public.audit_logs TO service_role; -- For system operations and triggers

-- Step 4: Verify all existing RESTRICTIVE policies are in place
-- These should already exist, but we'll verify/recreate them

-- Ensure anonymous blocking policy exists (RESTRICTIVE)
DROP POLICY IF EXISTS "audit_logs_block_anon_all" ON public.audit_logs;
CREATE POLICY "audit_logs_block_anon_all"
  ON public.audit_logs
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Ensure admin-only SELECT policy exists (RESTRICTIVE)
DROP POLICY IF EXISTS "audit_logs_require_admin_select" ON public.audit_logs;
CREATE POLICY "audit_logs_require_admin_select"
  ON public.audit_logs
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Ensure immutability policies exist (RESTRICTIVE)
DROP POLICY IF EXISTS "audit_logs_immutable_deletes" ON public.audit_logs;
CREATE POLICY "audit_logs_immutable_deletes"
  ON public.audit_logs
  AS RESTRICTIVE
  FOR DELETE
  TO public
  USING (false);

DROP POLICY IF EXISTS "audit_logs_immutable_updates" ON public.audit_logs;
CREATE POLICY "audit_logs_immutable_updates"
  ON public.audit_logs
  AS RESTRICTIVE
  FOR UPDATE
  TO public
  USING (false);

-- Document the fix
INSERT INTO public.security_fixes (finding, severity, remediation, verified_by)
VALUES (
  'PUBLIC_AUDIT_DATA: audit_logs table grants allowed potential public access despite RLS',
  'critical',
  'Forced RLS on audit_logs, revoked all permissions from PUBLIC/anon/authenticated, granted minimal permissions filtered by RLS, verified all RESTRICTIVE policies in place. Anonymous users completely blocked, only admins can SELECT, all users blocked from UPDATE/DELETE.',
  auth.uid()
);