-- CRITICAL SECURITY FIXES: Part 2 Consent Logic & Audit Log Immutability
-- Addresses findings from comprehensive security review

-- =============================================================================
-- CRITICAL FIX 1: Part 2 Consent Verification Logic
-- Issue: has_active_part2_consent_for_conversation misses revocation edge cases
-- Fix: Ensure revoked_date check is explicit and correct
-- =============================================================================

CREATE OR REPLACE FUNCTION public.has_active_part2_consent_for_conversation(_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.part2_consents
    WHERE conversation_id = _conversation_id
      AND status = 'active'
      AND revoked_date IS NULL  -- CRITICAL: Explicit NULL check for revoked consents
      AND (expiry_date IS NULL OR expiry_date > now())  -- Handle both NULL and future expiry
      AND granted_date <= now()  -- Consent must have already been granted
  );
$$;

-- Add comment documenting the security fix
COMMENT ON FUNCTION public.has_active_part2_consent_for_conversation IS 
'Verifies active Part 2 consent for a conversation. 
SECURITY: Checks status=active, revoked_date IS NULL, expiry_date validation, and granted_date.
Updated 2025-10-06: Fixed revocation edge case handling.';

-- =============================================================================
-- HIGH PRIORITY FIX: Audit Log Immutability
-- Issue: Admin DELETE policy allows tampering with audit trail
-- Fix: Remove DELETE policy entirely - audit logs must be append-only
-- =============================================================================

-- Drop the permissive admin DELETE policy
DROP POLICY IF EXISTS "audit_logs_admin_delete" ON public.audit_logs;

-- Add restrictive policy blocking ALL deletes (even for admins)
CREATE POLICY "audit_logs_no_delete_ever"
ON public.audit_logs
FOR DELETE
USING (false);

-- Add comment documenting immutability requirement
COMMENT ON POLICY "audit_logs_no_delete_ever" ON public.audit_logs IS 
'HIPAA REQUIREMENT: Audit logs must be immutable and tamper-proof.
No user, including admins, can delete audit log entries.
Retention management must be done via external archival processes.';

-- =============================================================================
-- VERIFICATION: Add index for performance on consent queries
-- Recommendation from review: Index expiry_date and revoked_date
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_part2_consents_active_lookup 
ON public.part2_consents (conversation_id, status, revoked_date, expiry_date)
WHERE status = 'active' AND revoked_date IS NULL;

COMMENT ON INDEX idx_part2_consents_active_lookup IS 
'Performance optimization for has_active_part2_consent_for_conversation function.
Partial index covers only active, non-revoked consents.';

-- Add index on audit logs for suspicious pattern detection
CREATE INDEX IF NOT EXISTS idx_client_access_logs_pattern_detection
ON public.client_access_logs (accessed_by, created_at DESC, client_id);

COMMENT ON INDEX idx_client_access_logs_pattern_detection IS 
'Supports get_suspicious_access_patterns() function and admin audit queries.';

-- =============================================================================
-- DOCUMENTATION: Add security metadata
-- =============================================================================

-- Document the critical fixes in a table for tracking
CREATE TABLE IF NOT EXISTS public.security_fixes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fix_date timestamptz NOT NULL DEFAULT now(),
  severity text NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  finding text NOT NULL,
  remediation text NOT NULL,
  verified_by uuid REFERENCES auth.users(id),
  verification_date timestamptz
);

-- Enable RLS on security_fixes (admin-only)
ALTER TABLE public.security_fixes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_fixes_admin_only"
ON public.security_fixes
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Log these critical fixes
INSERT INTO public.security_fixes (severity, finding, remediation)
VALUES 
  ('critical', 'Part 2 Consent Logic Flaw', 'Fixed has_active_part2_consent_for_conversation to explicitly check revoked_date IS NULL'),
  ('high', 'Audit Log Tampering Risk', 'Removed audit_logs_admin_delete policy; implemented audit_logs_no_delete_ever policy');
