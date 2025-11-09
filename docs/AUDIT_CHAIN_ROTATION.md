# Audit Chain Secret Rotation

## Overview
The audit chain uses versioned HMAC secrets stored in the `private.audit_secrets` table. Each audit log entry stores which secret version it used, allowing seamless rotation without downtime.

## Architecture
- **Hash Chain**: Each audit log entry contains:
  - `prev_hash`: Hash of the previous entry (per user)
  - `hash`: HMAC-SHA256 of current entry
  - `secret_version`: Which secret was used
  
- **Secrets Storage**: `private.audit_secrets` table (not accessible via API)
- **Verification**: `verify_audit_chain()` RPC runs entirely in database

## Secret Rotation (Zero Downtime)

### 1. Add New Secret Version
```sql
-- Add version 2 secret
INSERT INTO private.audit_secrets (version, secret)
VALUES (2, 'NEW-SECURE-SECRET-GENERATE-WITH-openssl-rand-hex-32');
```

### 2. Update Default Version
```sql
-- New audit entries will use version 2
ALTER TABLE public.audit_logs 
  ALTER COLUMN secret_version SET DEFAULT 2;
```

### 3. Verify Both Versions Work
```sql
-- This should pass - verifier handles multiple versions
SELECT * FROM public.verify_audit_chain(NULL);
```

### 4. Clean Up Old Secret (Optional, after 90 days)
```sql
-- Only after confirming all old entries are archived/verified
-- DELETE FROM private.audit_secrets WHERE version = 1;
```

## Production Deployment Checklist

### Before First Use
- [ ] Generate secure secret: `openssl rand -hex 32`
- [ ] Update secret in database:
  ```sql
  UPDATE private.audit_secrets 
  SET secret = 'YOUR-GENERATED-SECRET'
  WHERE version = 1;
  ```
- [ ] Verify trigger is active:
  ```sql
  SELECT tgname, tgenabled FROM pg_trigger 
  WHERE tgname = 'audit_logs_set_hash';
  ```

### Regular Rotation (Every 90 days)
1. Generate new secret
2. Insert as next version
3. Update default version
4. Monitor `audit_verify_runs` table
5. Archive old logs if needed
6. Delete old secret version (optional)

## Verification

### Manual Verification
```sql
-- Check all users
SELECT * FROM public.verify_audit_chain(NULL);

-- Check specific user
SELECT * FROM public.verify_audit_chain('USER-UUID-HERE');
```

### Expected Result
```json
{
  "intact": true,
  "total_entries": 1234,
  "verified_entries": 1234,
  "broken_at_id": null,
  "expected": null,
  "actual": null
}
```

### Chain Break Detection
If verification fails:
```json
{
  "intact": false,
  "total_entries": 1234,
  "verified_entries": 1200,
  "broken_at_id": "uuid-of-broken-entry",
  "expected": "correct-hash",
  "actual": "tampered-hash"
}
```

## Edge Function Integration

The `audit-verify` edge function is minimal:
```typescript
// Calls DB-side RPC - no secrets exposed
const { data } = await supabase.rpc('verify_audit_chain');
return { ok: true, result: data };
```

## Security Notes

1. **Never expose secrets via API**: Secrets stay in `private` schema
2. **SECURITY DEFINER functions**: Use `search_path = public, private` to prevent SQL injection
3. **Append-only enforcement**: Trigger blocks UPDATE/DELETE on audit_logs
4. **Per-user chains**: Each user has independent hash chain
5. **Version tracking**: Old entries remain verifiable after rotation

## Troubleshooting

### Problem: Hashes are NULL on old entries
**Cause**: Entries created before trigger was installed  
**Solution**: This is expected. Only new entries have hashes.

### Problem: Verifier returns "missing secret"
**Cause**: Secret version referenced by log doesn't exist in `private.audit_secrets`  
**Solution**: 
```sql
-- Check which versions are needed
SELECT DISTINCT secret_version FROM public.audit_logs;

-- Check which versions exist
SELECT version FROM private.audit_secrets;

-- Add missing versions if needed
```

### Problem: Chain breaks at specific entry
**Cause**: Either tampering or data corruption  
**Solution**: Investigate the entry:
```sql
SELECT * FROM public.audit_logs WHERE id = 'BROKEN-ENTRY-ID';
-- Review metadata, compare with application logs
```

## Monitoring

### Automated Verification
Set up pg_cron job:
```sql
SELECT cron.schedule(
  'verify_audit_chain',
  '0 2 * * *',  -- Daily at 2 AM
  $$
  INSERT INTO public.audit_verify_runs (intact, total_entries, verified_entries)
  SELECT intact, total_entries, verified_entries 
  FROM public.verify_audit_chain(NULL);
  $$
);
```

### Dashboard Query
```sql
-- Show last 7 verification runs
SELECT 
  run_at,
  intact,
  total_entries,
  verified_entries,
  CASE WHEN intact THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM public.audit_verify_runs
ORDER BY run_at DESC
LIMIT 7;
```

## Migration From Existing System

If you have existing audit logs without hashes:
1. They will have `hash` and `prev_hash` as NULL
2. Verifier will skip NULL entries automatically
3. New entries will start fresh chains
4. This is safe - no action required

## API Reference

### `verify_audit_chain(p_user_id uuid DEFAULT NULL)`
**Parameters:**
- `p_user_id`: Specific user to verify, or NULL for all users

**Returns:**
```typescript
{
  intact: boolean,
  total_entries: number,
  verified_entries: number,
  broken_at_id: uuid | null,
  expected: string | null,
  actual: string | null
}
```

**Usage:**
```typescript
// From edge function
const { data } = await supabase.rpc('verify_audit_chain', { 
  p_user_id: null  // or specific UUID
});

// From SQL
SELECT * FROM public.verify_audit_chain('user-uuid');
```

---

**Last Updated**: 2025-11-09  
**Status**: Production Ready ✅  
**Next Review**: 2026-02-09 (90 days)
