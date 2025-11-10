-- ============================================================================
-- Part 2 Consent Validation Test Suite
-- Run these tests to verify 42 CFR Part 2 compliance before production
-- ============================================================================

-- Prerequisites:
-- 1. Have a test user authenticated (for auth.uid())
-- 2. Have a Part 2 protected conversation created
-- 3. Replace placeholder UUIDs with actual test data IDs

-- ============================================================================
-- TEST 1: CREATE & REVOKE TEST
-- ============================================================================

-- Step 1: Create a test conversation (if needed)
DO $$
DECLARE
  test_user_id uuid := auth.uid(); -- Current authenticated user
  test_conversation_id uuid;
BEGIN
  -- Create Part 2 protected conversation
  INSERT INTO public.conversations (
    user_id,
    title,
    is_part2_protected,
    data_classification
  ) VALUES (
    test_user_id,
    'Part 2 Test Conversation',
    true,
    'part2_protected'
  )
  RETURNING id INTO test_conversation_id;
  
  RAISE NOTICE 'Created test conversation: %', test_conversation_id;
END $$;

-- Step 2: Verify NO consent exists initially
-- Expected: FALSE (no access)
SELECT has_active_part2_consent_for_conversation(
  '<CONVERSATION_ID>'::uuid
) as has_consent;
-- Result should be: f (false)

-- Step 3: Grant consent
INSERT INTO public.part2_consents (
  conversation_id,
  user_id,
  consent_type,
  disclosure_purpose,
  recipient_info,
  granted_date,
  expiry_date,
  status
) VALUES (
  '<CONVERSATION_ID>'::uuid,
  auth.uid(),
  'treatment',
  'Testing Part 2 consent workflow for clinical staff access',
  '{"name": "Test Provider", "organization": "Test Clinic", "npi": "1234567890"}'::jsonb,
  now(),
  now() + interval '90 days',
  'active'
)
RETURNING id, status, granted_date, expiry_date;

-- Step 4: Verify consent NOW EXISTS
-- Expected: TRUE (access granted)
SELECT has_active_part2_consent_for_conversation(
  '<CONVERSATION_ID>'::uuid
) as has_consent;
-- Result should be: t (true)

-- Step 5: Verify audit log entry exists for consent grant
SELECT 
  action,
  resource_type,
  resource_id,
  metadata->>'consent_type' as consent_type,
  created_at
FROM public.audit_logs
WHERE action = 'part2_consent_granted'
ORDER BY created_at DESC
LIMIT 5;

-- Step 6: Revoke the consent
UPDATE public.part2_consents
SET 
  status = 'revoked',
  revoked_date = now()
WHERE conversation_id = '<CONVERSATION_ID>'::uuid
  AND status = 'active'
RETURNING id, status, revoked_date;

-- Step 7: Verify consent is NOW REVOKED
-- Expected: FALSE (access blocked)
SELECT has_active_part2_consent_for_conversation(
  '<CONVERSATION_ID>'::uuid
) as has_consent;
-- Result should be: f (false)

-- Step 8: Verify audit log entry exists for revocation
SELECT 
  action,
  resource_type,
  resource_id,
  metadata->>'revoked_date' as revoked_date,
  created_at
FROM public.audit_logs
WHERE action = 'part2_consent_revoked'
ORDER BY created_at DESC
LIMIT 5;

-- ✅ TEST 1 PASS CRITERIA:
-- - Initial consent check returns FALSE
-- - After grant returns TRUE
-- - After revoke returns FALSE
-- - Two audit log entries exist (grant + revoke)

-- ============================================================================
-- TEST 2: EXPIRY VALIDATION
-- ============================================================================

-- Test 2A: Past expiry date (should NOT activate)
INSERT INTO public.part2_consents (
  conversation_id,
  user_id,
  consent_type,
  disclosure_purpose,
  recipient_info,
  granted_date,
  expiry_date, -- YESTERDAY
  status
) VALUES (
  '<CONVERSATION_ID>'::uuid,
  auth.uid(),
  'treatment',
  'Testing expired consent - should NOT grant access',
  '{"name": "Test Provider"}'::jsonb,
  now() - interval '2 days',
  now() - interval '1 day', -- Expired yesterday
  'active'
)
RETURNING id, expiry_date, expiry_date < now() as is_expired;

-- Verify expired consent does NOT grant access
-- Expected: FALSE
SELECT has_active_part2_consent_for_conversation(
  '<CONVERSATION_ID>'::uuid
) as has_consent_with_expired;
-- Result should be: f (false)

-- Test 2B: Future expiry date (should activate)
INSERT INTO public.part2_consents (
  conversation_id,
  user_id,
  consent_type,
  disclosure_purpose,
  recipient_info,
  granted_date,
  expiry_date, -- TOMORROW
  status
) VALUES (
  '<CONVERSATION_ID>'::uuid,
  auth.uid(),
  'treatment',
  'Testing valid future consent - should grant access',
  '{"name": "Test Provider"}'::jsonb,
  now(),
  now() + interval '30 days', -- Expires in 30 days
  'active'
)
RETURNING id, expiry_date, expiry_date > now() as is_valid;

-- Verify future-expiry consent DOES grant access
-- Expected: TRUE
SELECT has_active_part2_consent_for_conversation(
  '<CONVERSATION_ID>'::uuid
) as has_consent_with_future_expiry;
-- Result should be: t (true)

-- Test 2C: No expiry date (indefinite - should activate)
INSERT INTO public.part2_consents (
  conversation_id,
  user_id,
  consent_type,
  disclosure_purpose,
  recipient_info,
  granted_date,
  expiry_date, -- NULL (indefinite)
  status
) VALUES (
  '<CONVERSATION_ID>'::uuid,
  auth.uid(),
  'treatment',
  'Testing indefinite consent - should grant access',
  '{"name": "Test Provider"}'::jsonb,
  now(),
  NULL, -- No expiry
  'active'
)
RETURNING id, expiry_date IS NULL as is_indefinite;

-- Verify indefinite consent DOES grant access
-- Expected: TRUE
SELECT has_active_part2_consent_for_conversation(
  '<CONVERSATION_ID>'::uuid
) as has_consent_indefinite;
-- Result should be: t (true)

-- ✅ TEST 2 PASS CRITERIA:
-- - Past expiry date returns FALSE
-- - Future expiry date returns TRUE
-- - No expiry date (NULL) returns TRUE

-- ============================================================================
-- TEST 3: POLICY SANITY CHECK
-- ============================================================================

-- Verify all required RLS policies exist
SELECT 
  policyname,
  cmd,
  permissive,
  roles::text as roles_array
FROM pg_policies 
WHERE tablename = 'part2_consents'
ORDER BY cmd, policyname;

-- Expected policies:
-- INSERT: "Users can create consents for their conversations"
-- SELECT: "Users can view consents for their conversations"
-- SELECT: "Admins can view all consents"
-- UPDATE: "Users can update consents for their conversations"
-- DELETE: "Part 2 consents cannot be deleted" (blocks all)
-- ALL (RESTRICTIVE): "Block all anonymous access to part2 consents"
-- ALL (RESTRICTIVE): "Service role must use RLS for part2 consents"

-- Verify function properties
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  provolatile as volatility_type,
  CASE provolatile
    WHEN 'i' THEN 'IMMUTABLE'
    WHEN 's' THEN 'STABLE'
    WHEN 'v' THEN 'VOLATILE'
  END as volatility_name
FROM pg_proc
WHERE proname = 'has_active_part2_consent_for_conversation';

-- Expected:
-- is_security_definer: true
-- volatility_type: s (STABLE)

-- ✅ TEST 3 PASS CRITERIA:
-- - At least 7 policies exist for part2_consents
-- - INSERT, SELECT, UPDATE policies present
-- - DELETE policy blocks all deletes
-- - Function is SECURITY DEFINER and STABLE

-- ============================================================================
-- TEST 4: EDGE CASES
-- ============================================================================

-- Test 4A: Future-dated granted_date (should NOT activate)
INSERT INTO public.part2_consents (
  conversation_id,
  user_id,
  consent_type,
  disclosure_purpose,
  recipient_info,
  granted_date, -- TOMORROW (not yet granted)
  expiry_date,
  status
) VALUES (
  '<CONVERSATION_ID>'::uuid,
  auth.uid(),
  'treatment',
  'Testing future-dated consent - should NOT grant access',
  '{"name": "Test Provider"}'::jsonb,
  now() + interval '1 day', -- Granted tomorrow
  now() + interval '30 days',
  'active'
)
RETURNING id, granted_date, granted_date > now() as is_future;

-- Verify future-granted consent does NOT grant access
-- Expected: FALSE
SELECT has_active_part2_consent_for_conversation(
  '<CONVERSATION_ID>'::uuid
) as has_consent_future_granted;
-- Result should be: f (false)

-- Test 4B: Status='revoked' but revoked_date=NULL (malformed - should NOT activate)
-- This tests the function properly checks BOTH status AND revoked_date
INSERT INTO public.part2_consents (
  conversation_id,
  user_id,
  consent_type,
  disclosure_purpose,
  recipient_info,
  granted_date,
  expiry_date,
  status,
  revoked_date
) VALUES (
  '<CONVERSATION_ID>'::uuid,
  auth.uid(),
  'treatment',
  'Testing malformed revoked consent',
  '{"name": "Test Provider"}'::jsonb,
  now(),
  now() + interval '30 days',
  'revoked', -- Status is revoked
  NULL       -- But no revoked_date (malformed)
)
RETURNING id, status, revoked_date;

-- Function should still block access due to status check
-- Expected: FALSE
SELECT has_active_part2_consent_for_conversation(
  '<CONVERSATION_ID>'::uuid
) as has_consent_malformed;
-- Result should be: f (false)

-- ✅ TEST 4 PASS CRITERIA:
-- - Future-dated granted_date blocks access (FALSE)
-- - Malformed revoked consent blocks access (FALSE)

-- ============================================================================
-- TEST 5: CLEANUP
-- ============================================================================

-- Remove all test consents
DELETE FROM public.part2_consents
WHERE conversation_id = '<CONVERSATION_ID>'::uuid;

-- Verify cleanup
SELECT COUNT(*) as remaining_test_consents
FROM public.part2_consents
WHERE conversation_id = '<CONVERSATION_ID>'::uuid;
-- Result should be: 0

-- ============================================================================
-- PRODUCTION READINESS CHECKLIST
-- ============================================================================

/*
✅ TEST 1: CREATE & REVOKE TEST
  - [ ] Initial check returns FALSE
  - [ ] After grant returns TRUE
  - [ ] After revoke returns FALSE
  - [ ] Audit logs captured both events

✅ TEST 2: EXPIRY VALIDATION
  - [ ] Past expiry blocks access (FALSE)
  - [ ] Future expiry grants access (TRUE)
  - [ ] No expiry grants access (TRUE)

✅ TEST 3: POLICY SANITY
  - [ ] 7+ RLS policies on part2_consents
  - [ ] INSERT, SELECT, UPDATE policies exist
  - [ ] DELETE policy blocks all deletes
  - [ ] Function is SECURITY DEFINER + STABLE

✅ TEST 4: EDGE CASES
  - [ ] Future granted_date blocks access (FALSE)
  - [ ] Malformed revoked consent blocks access (FALSE)

✅ UI SMOKE TEST (Manual)
  - [ ] Works offline (no crashes)
  - [ ] Mobile layout readable
  - [ ] No PHI in console logs

✅ PRODUCTION DEPLOYMENT
  - [ ] All tests pass
  - [ ] Staging environment validated
  - [ ] One final RLS audit completed
*/

-- ============================================================================
-- QUICK PRODUCTION VERIFICATION
-- ============================================================================

-- Run this on production to verify a specific conversation's consent status:
-- SELECT has_active_part2_consent_for_conversation('<YOUR_CONVERSATION_ID>'::uuid);
-- 
-- Expected:
-- - t (true) = Clinical staff CAN access Part 2 data
-- - f (false) = Clinical staff CANNOT access Part 2 data
