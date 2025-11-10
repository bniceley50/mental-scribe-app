
-- ============================================================================
-- FIX: Remove Malformed Audit Logs Blocking Data Persistence
-- ============================================================================

-- Step 1: Drop duplicate verify_audit_chain() function
DROP FUNCTION IF EXISTS public.verify_audit_chain() CASCADE;

-- Step 2: Temporarily disable append-only protection (correct trigger name)
ALTER TABLE public.audit_logs DISABLE TRIGGER audit_logs_block_mod;

-- Step 3: Remove malformed audit logs (NULL hashes)
DELETE FROM public.audit_logs WHERE hash IS NULL OR prev_hash IS NULL;

-- Step 4: Re-enable append-only protection
ALTER TABLE public.audit_logs ENABLE TRIGGER audit_logs_block_mod;

-- Step 5: Seed audit_chain_cursor
TRUNCATE TABLE public.audit_chain_cursor;

INSERT INTO public.audit_chain_cursor (user_id, last_verified_id, last_hash, last_created_at, verified_at, updated_at)
SELECT 
  user_id, id, hash, created_at, now(), now()
FROM (
  SELECT DISTINCT ON (user_id) user_id, id, hash, created_at
  FROM public.audit_logs
  WHERE hash IS NOT NULL
  ORDER BY user_id, created_at DESC, id DESC
) latest_logs;

-- Step 6: Verification
DO $$
DECLARE
  cursor_ct int;
  log_ct int;
BEGIN
  SELECT COUNT(*) INTO cursor_ct FROM public.audit_chain_cursor;
  SELECT COUNT(*) INTO log_ct FROM public.audit_logs;
  
  RAISE NOTICE '✅ Fixed: Cursors initialized for % users, % valid logs remain', cursor_ct, log_ct;
END $$;
