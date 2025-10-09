-- ============================================================================
-- AUDIT LOGS IMMUTABILITY ENFORCEMENT
-- Migration: 20251008T190500_audit_logs_immutable.sql
-- Purpose: Make audit_logs table truly immutable (prevent UPDATE/DELETE)
-- HIPAA/COMPLIANCE: Audit trails must be tamper-proof
-- ============================================================================

-- ============================================================================
-- Part 1: Drop any existing UPDATE/DELETE policies
-- ============================================================================

-- Drop policies that allow updates (if any exist)
DROP POLICY IF EXISTS "Audit logs are immutable - no updates" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_no_update" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_block_update" ON public.audit_logs;

-- Drop policies that allow deletes (if any exist)
DROP POLICY IF EXISTS "Audit logs are immutable - no manual deletes" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_admin_delete" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_no_delete" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_block_delete" ON public.audit_logs;

-- ============================================================================
-- Part 2: Revoke UPDATE and DELETE privileges
-- ============================================================================

-- Revoke UPDATE and DELETE from PUBLIC role
REVOKE UPDATE, DELETE ON public.audit_logs FROM PUBLIC;

-- Revoke UPDATE and DELETE from authenticated users
REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated;

-- Revoke UPDATE and DELETE from anon users
REVOKE UPDATE, DELETE ON public.audit_logs FROM anon;

-- Revoke UPDATE and DELETE from admin role if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN
    REVOKE UPDATE, DELETE ON public.audit_logs FROM admin;
  END IF;
END
$$;

-- ============================================================================
-- Part 3: Create immutability enforcement function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_audit_mods()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Raise exception with operation type
  RAISE EXCEPTION 'audit_logs are immutable and cannot be %', TG_OP;
  RETURN NULL;
END;
$$;

-- Add comment to document the function
COMMENT ON FUNCTION public.prevent_audit_mods() IS 
'Prevents any modifications to audit_logs table. Raises exception on UPDATE or DELETE operations.';

-- ============================================================================
-- Part 4: Create immutability trigger
-- ============================================================================

-- Drop trigger if it already exists
DROP TRIGGER IF EXISTS audit_logs_immutable ON public.audit_logs;

-- Create trigger that fires BEFORE any UPDATE or DELETE
CREATE TRIGGER audit_logs_immutable
  BEFORE UPDATE OR DELETE
  ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_mods();

-- Add comment to document the trigger
COMMENT ON TRIGGER audit_logs_immutable ON public.audit_logs IS 
'Enforces immutability of audit_logs table by preventing all UPDATE and DELETE operations.';

-- ============================================================================
-- Part 5: Update table comment
-- ============================================================================

COMMENT ON TABLE public.audit_logs IS 
'Immutable audit trail - INSERT only. No updates or deletes allowed to ensure HIPAA/compliance requirements. Modifications are blocked at trigger level.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After applying this migration, verify immutability:
-- 1. Try to update: UPDATE audit_logs SET action = 'test' WHERE id = '...'
--    Expected: ERROR: audit_logs are immutable and cannot be UPDATE
-- 2. Try to delete: DELETE FROM audit_logs WHERE id = '...'
--    Expected: ERROR: audit_logs are immutable and cannot be DELETE
-- ============================================================================
