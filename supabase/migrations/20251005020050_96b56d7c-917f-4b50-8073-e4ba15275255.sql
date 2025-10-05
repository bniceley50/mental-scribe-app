-- Security Policy Updates - Addressing Security Scan Findings
-- Finding #2: Allow users to view disclosure consents they created
-- Finding #3: Tighten audit log service role INSERT validation

-- Add SELECT policy for users to view consents they created
CREATE POLICY "Users can view their own disclosure consents"
ON public.disclosure_consents
FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

-- Drop the overly broad service role audit log policy
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;

-- Create restricted service role INSERT policy with validation
CREATE POLICY "Service role audit logging with validation"
ON public.audit_logs
FOR INSERT
TO service_role
WITH CHECK (
  -- Ensure required fields are present
  action IS NOT NULL
  AND resource_type IS NOT NULL
  AND user_id IS NOT NULL
  -- Validate metadata is proper JSON object if present
  AND (metadata IS NULL OR jsonb_typeof(metadata) = 'object')
);