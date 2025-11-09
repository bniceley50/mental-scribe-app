# Production Validation Script

Run these queries to verify all security hardening is active and working correctly.

## 1. Quota Security Tests

### Test 1: Quota function works correctly
```sql
-- Should return true (authenticated user can increment their quota)
SELECT public.check_and_increment_quota('api_calls', 1) AS ok;
```
**Expected**: `ok = true`

### Test 2: Verify users CANNOT directly manipulate quotas
```sql
-- This should FAIL with permission denied
UPDATE public.tenant_quotas 
SET current_usage = 0 
WHERE user_id = auth.uid();
```
**Expected**: ERROR - permission denied for table tenant_quotas

### Test 3: Verify quota usage events are logged
```sql
-- Check usage events are being recorded
SELECT * FROM public.quota_usage_events 
WHERE user_id = auth.uid() 
ORDER BY at DESC 
LIMIT 10;
```
**Expected**: See recent quota increments

### Test 4: Verify quota status view works
```sql
-- Check user can see their quota status
SELECT * FROM public.user_quota_status;
```
**Expected**: Returns quota usage, remaining, and reset info

---

## 2. Audit Log Immutability Tests

### Test 5: Verify audit logs cannot be modified
```sql
-- This should FAIL with "audit_logs is append-only"
UPDATE public.audit_logs 
SET action = 'tampered' 
WHERE id = (SELECT id FROM audit_logs LIMIT 1);
```
**Expected**: ERROR - audit_logs is append-only and cannot be modified

### Test 6: Verify audit logs cannot be deleted
```sql
-- This should FAIL with "audit_logs is append-only"
DELETE FROM public.audit_logs 
WHERE id = (SELECT id FROM audit_logs LIMIT 1);
```
**Expected**: ERROR - audit_logs is append-only and cannot be modified

### Test 7: Verify audit logs can be inserted
```sql
-- This should succeed
INSERT INTO public.audit_logs (
  user_id, action, resource_type, data_classification
) VALUES (
  auth.uid(), 'test_action', 'test_resource', 'standard_phi'
);
```
**Expected**: Success (1 row inserted)

---

## 3. Materialized View Tests

### Test 8: Check MV unique index exists
```sql
-- Verify composite unique index on (user_id, day)
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'mv_audit_daily_stats' 
  AND schemaname = 'public';
```
**Expected**: See `mv_audit_daily_stats_user_day_uq` index on (user_id, day)

### Test 9: Manual MV refresh test
```sql
-- This should succeed without locking the table
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_audit_daily_stats;
```
**Expected**: Success (CONCURRENTLY means no table lock)

### Test 10: Check MV row count
```sql
SELECT COUNT(*) FROM mv_audit_daily_stats;
```
**Expected**: >= 0 (depends on audit log history)

---

## 4. pg_cron Job Validation

### Test 11: Verify cron job is scheduled
```sql
-- Check the refresh job exists
SELECT * FROM cron.job 
WHERE jobname = 'refresh_audit_stats';
```
**Expected**: 1 row with schedule = `*/5 * * * *`

### Test 12: Check cron job history
```sql
-- See recent executions
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'refresh_audit_stats')
ORDER BY start_time DESC 
LIMIT 10;
```
**Expected**: Runs every 5 minutes with status = 'succeeded'

---

## 5. Performance Index Validation

### Test 13: Verify key indexes exist
```sql
-- Check all critical indexes are in place
SELECT 
  schemaname, 
  tablename, 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('audit_logs', 'recordings', 'structured_notes', 'tenant_quotas')
ORDER BY tablename, indexname;
```
**Expected**: See these indexes:
- `audit_logs_user_created_idx`
- `audit_logs_pii_redacted_idx`
- `recordings_status_idx`
- `recordings_resume_token_uq`
- `structured_notes_search_idx`

### Test 14: Test full-text search performance
```sql
-- Should use GIN index for fast search
EXPLAIN ANALYZE
SELECT * FROM structured_notes
WHERE content_search @@ to_tsquery('english', 'depression & anxiety')
LIMIT 10;
```
**Expected**: Query plan shows "Bitmap Index Scan using structured_notes_search_idx"

---

## 6. Audio Processing Constraints

### Test 15: Verify chunk constraints block invalid data
```sql
-- This should FAIL with constraint violation
INSERT INTO recordings (
  user_id, file_name, file_url, 
  chunks_total, chunks_completed
) VALUES (
  auth.uid(), 'test.wav', 'test-url',
  5, 10  -- Invalid: completed > total
);
```
**Expected**: ERROR - violates check constraint "chunks_bounds"

### Test 16: Verify non-negative constraint
```sql
-- This should FAIL
INSERT INTO recordings (
  user_id, file_name, file_url, 
  chunks_total, chunks_completed
) VALUES (
  auth.uid(), 'test.wav', 'test-url',
  -1, 0  -- Invalid: negative chunks
);
```
**Expected**: ERROR - violates check constraint "chunks_nonnegative"

---

## 7. Replica Lag Check (Admin Only)

### Test 17: Check for replication lag (if read replica configured)
```sql
-- Only works if read replica is set up
SELECT 
  now() - pg_last_xact_replay_timestamp() AS replication_lag
FROM pg_stat_replication;
```
**Expected**: lag < 5 seconds (or NULL if no replica)

---

## 8. System Health Dashboard Tests

### Test 18: Visit System Health page
Navigate to: `/admin/system-health`

**Expected**: 
- See "Materialized View" last refresh time
- See "Audit Stats Refresh Job" status = Active
- See quota usage percentages
- All metrics show "Healthy" status (green)

### Test 19: Check quota dashboard
**Expected**:
- LLM tokens usage bar
- STT minutes usage bar
- API calls usage bar
- Each shows current usage / limit
- Reset countdown timer

---

## 9. Security Function Permissions

### Test 20: Verify function permissions
```sql
-- Check quota function is only executable by authenticated
SELECT 
  proname, 
  prosecdef, 
  proacl 
FROM pg_proc 
WHERE proname = 'check_and_increment_quota';
```
**Expected**: 
- `prosecdef = true` (SECURITY DEFINER)
- `proacl` shows only authenticated role has EXECUTE

---

## 10. Edge Function Integration Tests

### Test 21: Call differential-diagnosis with quota check
```bash
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/differential-diagnosis \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"clinicalPresentation": "Patient presents with persistent sadness"}'
```
**Expected**: 
- Response includes diagnoses
- Quota is incremented by 1500 tokens
- No error about user_id

### Test 22: Call summarize with streaming
```bash
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/summarize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Session notes...", "type": "soap"}'
```
**Expected**: 
- SSE stream response
- Quota incremented by 2000 tokens

---

## Validation Checklist

- [ ] Quota security: Users cannot manipulate quotas directly
- [ ] Audit immutability: UPDATE/DELETE blocked on audit_logs
- [ ] MV refresh: Composite unique index exists, CONCURRENTLY works
- [ ] pg_cron: Job scheduled and running every 5 minutes
- [ ] Indexes: All performance indexes created
- [ ] Constraints: Audio chunk validation enforces valid states
- [ ] Full-text search: GIN index used for structured notes
- [ ] Edge functions: Updated to use new quota signature
- [ ] System health page: Shows metrics, quotas, infrastructure status
- [ ] Quota usage events: Logged for analytics

---

## Troubleshooting

### If MV refresh fails:
```sql
-- Check for errors in pg_cron logs
SELECT * FROM cron.job_run_details 
WHERE status = 'failed' 
ORDER BY start_time DESC;

-- Manually refresh to see error
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_audit_daily_stats;
```

### If quota function returns false unexpectedly:
```sql
-- Check quota limits
SELECT * FROM tenant_quotas WHERE user_id = auth.uid();

-- Check usage events
SELECT SUM(increment) FROM quota_usage_events 
WHERE user_id = auth.uid() 
  AND quota_type = 'llm_tokens';
```

### If audit log trigger isn't firing:
```sql
-- Verify trigger exists
SELECT * FROM pg_trigger 
WHERE tgname = 'audit_logs_block_mod';

-- Check function exists
SELECT * FROM pg_proc 
WHERE proname = '_audit_logs_block_mod';
```

---

**Last Updated**: 2025-11-09  
**Status**: Production Ready ✅  
**Next Review**: After deploying DB-side audit verifier
