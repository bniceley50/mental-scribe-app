-- ============================================================================
-- pgTAP Test Suite: Audit Logs Immutability
-- File: supabase/tests/pgtap/audit_immutability.sql
-- Purpose: Verify audit_logs table is truly immutable (no UPDATE/DELETE)
-- ============================================================================

BEGIN;

-- Load pgTAP extension
SELECT plan(3);

-- ============================================================================
-- Test 1: Verify audit_logs table exists
-- ============================================================================

SELECT has_table(
  'public',
  'audit_logs',
  'audit_logs table should exist in public schema'
);

-- ============================================================================
-- Test 2: Verify UPDATE operations are blocked
-- ============================================================================

-- Create a test audit log entry
INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
VALUES (
  gen_random_uuid(),
  'test_action',
  'test_resource',
  gen_random_uuid(),
  '{"test": "data"}'::jsonb
)
RETURNING id INTO TEMPORARY TABLE test_audit_log;

-- Attempt to update and verify it throws the expected exception
SELECT throws_ok(
  $$UPDATE public.audit_logs SET action = 'modified_action' WHERE id = (SELECT id FROM test_audit_log)$$,
  'audit_logs are immutable and cannot be UPDATE',
  'UPDATE operations on audit_logs should raise immutability exception'
);

-- ============================================================================
-- Test 3: Verify DELETE operations are blocked
-- ============================================================================

-- Attempt to delete and verify it throws the expected exception
SELECT throws_ok(
  $$DELETE FROM public.audit_logs WHERE id = (SELECT id FROM test_audit_log)$$,
  'audit_logs are immutable and cannot be DELETE',
  'DELETE operations on audit_logs should raise immutability exception'
);

-- ============================================================================
-- Finish tests
-- ============================================================================

SELECT * FROM finish();

ROLLBACK;
