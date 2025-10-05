-- Fix RLS policies for audit_logs table to prevent unauthorized access
-- Current issue: All policies are RESTRICTIVE and the "Block all anonymous" policy 
-- uses false which when ANDed with other policies blocks ALL access

-- Step 1: Drop existing restrictive policies
DROP POLICY IF EXISTS "Block all anonymous access to audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Only admins can read audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Service role audit logging with validation" ON public.audit_logs;

-- Step 2: Create PERMISSIVE policies with explicit authentication checks

-- SELECT policy - Only admins can read audit logs
CREATE POLICY "Admins can read all audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- INSERT policy - Service role can insert with validation
-- This allows edge functions to write audit logs
CREATE POLICY "Service role can insert audit logs with validation"
ON public.audit_logs
FOR INSERT
TO service_role
WITH CHECK (
  action IS NOT NULL 
  AND resource_type IS NOT NULL 
  AND user_id IS NOT NULL 
  AND (metadata IS NULL OR jsonb_typeof(metadata) = 'object'::text)
);

-- UPDATE policy - Audit logs are immutable (no updates allowed)
-- No policy needed - this effectively blocks all updates

-- DELETE policy - Audit logs are immutable (only admins can delete for compliance)
CREATE POLICY "Only admins can delete audit logs"
ON public.audit_logs
FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Step 3: Add a final RESTRICTIVE policy to absolutely block anonymous access
CREATE POLICY "Absolute block for anonymous access to audit logs"
ON public.audit_logs
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Verify RLS is enabled
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;