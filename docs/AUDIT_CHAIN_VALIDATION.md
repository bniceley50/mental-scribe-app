# Audit Chain Validation & Operational Runbook

## Quick Smoke Tests

Run these checks after deployment or major changes:

### 1. No Stray ORDER BY id
```sql
-- Should return 0 rows
SELECT proname, prosrc
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND prosrc ILIKE '%ORDER BY id%'
  AND proname LIKE 'verify_audit_chain%';
```

**Expected**: No results (all functions use `ORDER BY created_at, id`)

### 2. Cursor Backfill Check
```sql
-- Should return 0 (all cursors have temporal data)
SELECT COUNT(*) 
FROM public.audit_chain_cursor 
WHERE last_created_at IS NULL;
```

**Expected**: 0 rows

### 3. Cron Job Sanity
```sql
-- Should show both hourly and weekly jobs
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname IN (
  'audit_verify_incremental_hourly',
  'audit_verify_weekly_full'
);
```

**Expected**:
- `audit_verify_incremental_hourly`: `0 * * * *` (hourly)
- `audit_verify_weekly_full`: `0 3 * * 0` (Sunday 03:00 UTC)

### 4. Secret Version Check
```sql
-- Verify v2 secret exists and is the default
SELECT version, secret IS NOT NULL as has_secret
FROM private.audit_secrets
ORDER BY version;

-- Check default version
SELECT column_default
FROM information_schema.columns
WHERE table_name = 'audit_logs'
  AND column_name = 'secret_version';
```

**Expected**:
- v1 and v2 secrets exist
- Default is `2`

### 5. Recent Verification Success
```sql
-- Check last 24h verification results
SELECT 
  COUNT(*) FILTER (WHERE intact) as passed,
  COUNT(*) FILTER (WHERE NOT intact) as failed,
  MAX(run_at) as last_run
FROM audit_verify_runs
WHERE run_at > now() - interval '24 hours';
```

**Expected**: `failed = 0`, `last_run` within last hour

## Tamper Detection Test

**WARNING**: Run only in non-production environment!

```sql
-- 1. Backup a row for restoration
CREATE TEMP TABLE tamper_backup AS
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 1 OFFSET 5;

-- 2. Corrupt the row
UPDATE audit_logs
SET prev_hash = 'tampered'
WHERE id = (SELECT id FROM tamper_backup);

-- 3. Run verification (should detect break)
SELECT * FROM verify_audit_chain();
-- Expected: intact=false, broken_at_id=[corrupted row]

-- 4. Check cursor is unchanged
SELECT last_verified_id, last_created_at
FROM audit_chain_cursor
WHERE user_id = (SELECT user_id FROM tamper_backup);
-- Expected: Cursor should NOT advance past corrupted row

-- 5. Restore the row
UPDATE audit_logs
SET prev_hash = (SELECT prev_hash FROM tamper_backup)
WHERE id = (SELECT id FROM tamper_backup);

-- 6. Re-verify (should pass now)
SELECT * FROM verify_audit_chain();
-- Expected: intact=true

-- 7. Cleanup
DROP TABLE tamper_backup;
```

## Operational Scenarios

### Scenario 1: Backfilling Historical Data

When inserting old audit entries (e.g., migration from another system):

```sql
-- Option A: Delete cursor to force full re-verification
DELETE FROM audit_chain_cursor WHERE user_id = $1;

-- Option B: Run full verifier for specific user
SELECT * FROM verify_audit_chain($1);

-- Option C: Wait for weekly full scan (Sunday 03:00 UTC)
-- No action needed, automatic
```

**Why**: Incremental verifier only processes entries after cursor position. Backfilled data with old `created_at` won't be checked until full scan.

### Scenario 2: Chain Break Detected

If verification fails (`intact = false`):

```sql
-- 1. Get details from latest verification run
SELECT 
  run_at,
  broken_at_id,
  details->>'expected' as expected_hash,
  details->>'actual' as actual_hash,
  details->>'user_id' as affected_user
FROM audit_verify_runs
WHERE NOT intact
ORDER BY run_at DESC
LIMIT 1;

-- 2. Inspect the broken entry
SELECT *
FROM audit_logs
WHERE id = '<broken_at_id>';

-- 3. Check surrounding entries
SELECT *
FROM audit_logs
WHERE user_id = '<affected_user>'
  AND created_at BETWEEN 
    (SELECT created_at FROM audit_logs WHERE id = '<broken_at_id>') - interval '1 hour'
    AND
    (SELECT created_at FROM audit_logs WHERE id = '<broken_at_id>') + interval '1 hour'
ORDER BY created_at, id;

-- 4. Determine root cause:
--    - Tampering: prev_hash doesn't match previous row's hash
--    - Missing secret: expected='<missing secret>'
--    - Algorithm mismatch: both v1 and v2 fail (shouldn't happen with dual-algo)
--    - Data corruption: hash doesn't match recomputed value

-- 5. If confirmed tampering:
--    - Alert security team
--    - Preserve evidence (copy affected rows)
--    - DO NOT modify or delete rows
--    - Escalate per incident response plan
```

### Scenario 3: Secret Rotation

When rotating to a new secret version:

```sql
-- 1. Add new secret (use secure generation, not this example)
INSERT INTO private.audit_secrets(version, secret)
VALUES (3, encode(gen_random_bytes(32), 'hex'))
ON CONFLICT DO NOTHING;

-- 2. Set new default for future rows
ALTER TABLE public.audit_logs 
  ALTER COLUMN secret_version SET DEFAULT 3;

-- 3. Verify old versions still work
SELECT * FROM verify_audit_chain() LIMIT 1;
-- Expected: intact=true

-- 4. Monitor for issues in first 24h
SELECT 
  secret_version,
  COUNT(*) as entries
FROM audit_logs
WHERE created_at > now() - interval '24 hours'
GROUP BY secret_version;
-- Should see entries for both old and new versions
```

**Best Practices**:
- Rotate every 90 days or after suspected compromise
- Never delete old secrets (needed to verify historical entries)
- Store secrets in secure vault (Lovable Cloud secrets, not in code)
- Test verification after rotation

### Scenario 4: High Verification Lag

If incremental verification is taking too long:

```sql
-- 1. Check entries per user
SELECT 
  user_id,
  COUNT(*) as unverified_count,
  MIN(created_at) as oldest_unverified
FROM audit_logs a
LEFT JOIN audit_chain_cursor c ON c.user_id = a.user_id
WHERE c.last_created_at IS NULL 
   OR a.created_at > c.last_created_at
GROUP BY user_id
ORDER BY unverified_count DESC
LIMIT 10;

-- 2. Manually verify high-volume users first
SELECT verify_audit_chain_incremental('<user_id_with_most_entries>');

-- 3. Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read
FROM pg_stat_user_indexes
WHERE tablename = 'audit_logs'
ORDER BY idx_scan DESC;

-- 4. If index not being used, analyze table
ANALYZE audit_logs;
```

### Scenario 5: Cursor Reset

To force full re-verification for a user or all users:

```sql
-- Single user
DELETE FROM audit_chain_cursor WHERE user_id = $1;

-- All users (use with caution)
TRUNCATE audit_chain_cursor;

-- Then trigger verification
SELECT run_incremental_for_all_users();
```

**When to use**:
- After backfilling historical data
- After fixing chain breaks (once root cause resolved)
- After major schema changes to audit_logs
- Never in normal operation (let cron handle it)

## Monitoring Queries

### Daily Health Check
```sql
-- Run this every morning or in monitoring dashboard
WITH recent_runs AS (
  SELECT 
    intact,
    run_at,
    details->>'type' as verification_type,
    verified_entries
  FROM audit_verify_runs
  WHERE run_at > now() - interval '24 hours'
)
SELECT 
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE intact) as passed,
  COUNT(*) FILTER (WHERE NOT intact) as failed,
  AVG(verified_entries) as avg_entries,
  MAX(run_at) as last_run,
  now() - MAX(run_at) as time_since_last
FROM recent_runs;
```

### Cursor Lag Dashboard
```sql
-- Users with oldest unverified entries
SELECT 
  c.user_id,
  c.last_created_at as cursor_position,
  MAX(a.created_at) as latest_entry,
  MAX(a.created_at) - c.last_created_at as lag,
  COUNT(*) as unverified_count
FROM audit_chain_cursor c
JOIN audit_logs a ON a.user_id = c.user_id
WHERE a.created_at > c.last_created_at
GROUP BY c.user_id, c.last_created_at
HAVING MAX(a.created_at) - c.last_created_at > interval '1 hour'
ORDER BY lag DESC
LIMIT 20;
```

### Secret Version Distribution
```sql
-- Track algorithm migration progress
SELECT 
  secret_version,
  COUNT(*) as total_entries,
  MIN(created_at) as oldest,
  MAX(created_at) as newest,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM audit_logs
GROUP BY secret_version
ORDER BY secret_version;
```

## Environment Variables

Required for Edge functions:

```bash
# Production domains (no wildcards)
CORS_ORIGIN=https://app.yourdomain.com

# Supabase credentials (set automatically by Lovable Cloud)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Optional: Sentry/monitoring
SENTRY_DSN=https://...
```

## Common Issues

### Issue: "Missing bearer token" (401)

**Cause**: Edge function called without Authorization header

**Fix**: Pass JWT token in header:
```typescript
const response = await fetch(edgeFunctionUrl, {
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  }
});
```

### Issue: "Forbidden" (403)

**Cause**: User doesn't have admin role

**Fix**: Verify admin role assignment:
```sql
SELECT * FROM user_roles WHERE user_id = $1;
-- Should show role='admin'
```

### Issue: "Missing secret" in verification

**Cause**: Secret for a version doesn't exist

**Fix**: Add missing secret:
```sql
-- Check what's missing
SELECT DISTINCT secret_version
FROM audit_logs
WHERE secret_version NOT IN (SELECT version FROM private.audit_secrets);

-- Add it
INSERT INTO private.audit_secrets(version, secret)
VALUES (<missing_version>, '<secret_here>');
```

### Issue: Cron jobs not running

**Cause**: pg_cron extension not enabled or jobs not scheduled

**Fix**:
```sql
-- Check extension
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Enable if missing (requires superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Re-schedule jobs (run the migration again)
SELECT cron.schedule(
  'audit_verify_incremental_hourly',
  '0 * * * *',
  'SELECT public.run_incremental_for_all_users();'
);
```

## Compliance Notes

### HIPAA Audit Trail Requirements

- ✅ **User identification**: Captured in `user_id` field
- ✅ **Access time**: Captured in `created_at` timestamp
- ✅ **Action type**: Captured in `action` field
- ✅ **Resource accessed**: Captured in `resource_type` and `resource_id`
- ✅ **Outcome**: Can be inferred from context (e.g., error in metadata)
- ✅ **Tamper-evidence**: Hash chain with dual-algorithm verification
- ✅ **Immutability**: Enforced by RLS policies (no UPDATE/DELETE)

### 42 CFR Part 2 Disclosure Tracking

Use `purpose` field for Part 2 disclosures:
```sql
INSERT INTO audit_logs (
  user_id, action, resource_type, resource_id,
  data_classification, purpose, metadata
) VALUES (
  auth.uid(),
  'part2_disclosure',
  'patient_record',
  $1,
  'part2_protected',
  'Treatment coordination - external provider',
  jsonb_build_object('recipient', 'Dr. Smith', 'facility', 'Hospital X')
);
```

## References

- [Audit Chain Architecture](./AUDIT_CHAIN.md)
- [Audit Chain Fixes](./AUDIT_CHAIN_FIXES_2025-11-09.md)
- [Security Hardening](./SECURITY_HARDENING_2025-11-09.md)
- [PostgreSQL pg_cron](https://github.com/citusdata/pg_cron)
- [HIPAA Audit Trail Requirements](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html)
