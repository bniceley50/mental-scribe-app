# Security Hardening Verification Guide

This document provides step-by-step verification for the security hardening fixes implemented after the comprehensive security review.

## Quick Verification Checklist

Run these queries in your Lovable Cloud backend SQL editor to verify all fixes are in place:

### 1. ✅ Verify v2 Audit Secret Exists

```sql
-- Check if v2 secret exists (should return 1 row)
SELECT version, created_at, 
       CASE 
         WHEN secret = 'REPLACE_WITH_ACTUAL_32_BYTE_HEX_SECRET_FROM_OPENSSL' THEN 'PLACEHOLDER'
         ELSE 'SET'
       END as secret_status
FROM private.audit_secrets 
WHERE version = 2;
```

**Expected:** 1 row with `secret_status = 'SET'`  
**Action if PLACEHOLDER:** Run `openssl rand -hex 32` and update:

```sql
UPDATE private.audit_secrets 
SET secret = '<your-generated-hex>' 
WHERE version = 2;
```

### 2. ✅ Verify Secret Version Distribution

```sql
-- Check which secret versions are in use
SELECT secret_version, COUNT(*) as entries
FROM public.audit_logs 
GROUP BY secret_version 
ORDER BY secret_version;
```

**Expected:** Should see version 1 (historical) and version 2 (new entries)

### 3. ✅ Verify Materialized View Access Restrictions

```sql
-- Should only return 'service_role' with SELECT privilege
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'mv_audit_daily_stats';
```

**Expected:** Only `service_role` with `SELECT` privilege  
**No:** `anon` or `authenticated` roles

### 4. ✅ List All SECURITY DEFINER Functions

```sql
-- Inventory of SECURITY DEFINER functions
SELECT 
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  obj_description(p.oid) as description
FROM pg_proc p 
JOIN pg_namespace n ON n.oid = p.pronamespace 
WHERE p.prosecdef = true 
  AND n.nspname = 'public'
ORDER BY p.proname;
```

**Expected Functions:**
- `has_role` - Check user roles
- `is_admin` - Check admin status
- `is_clinical_staff` - Check clinical staff membership
- `is_assigned_to_patient` - Check patient assignment
- `is_mfa_enrolled` - Check MFA enrollment (NEW)
- `has_active_part2_consent_for_conversation` - Check Part 2 consent
- `derive_classification` - Derive data classification
- `verify_audit_chain` - Verify audit integrity
- `verify_audit_chain_incremental` - Incremental verification
- All other audit/security helper functions

**Action:** Document rationale for each function. Remove SECURITY DEFINER if not needed.

### 5. ✅ Verify Audit Functions Use Correct Ordering

```sql
-- Check that verify_audit_chain uses (created_at, id) ordering
SELECT 
  proname,
  CASE 
    WHEN prosrc LIKE '%ORDER BY id%' AND prosrc NOT LIKE '%ORDER BY%created_at%' THEN 'INCORRECT'
    WHEN prosrc LIKE '%ORDER BY%created_at%' THEN 'CORRECT'
    ELSE 'CHECK_MANUALLY'
  END as ordering_status
FROM pg_proc p 
JOIN pg_namespace n ON n.oid = p.pronamespace 
WHERE n.nspname = 'public' 
  AND proname LIKE '%verify_audit_chain%';
```

**Expected:** All functions should show `CORRECT` or require manual review (not `INCORRECT`)

### 6. ✅ Verify Incremental Cursor Health

```sql
-- Should return 0 (all cursors have created_at populated)
SELECT COUNT(*) as cursors_missing_created_at
FROM public.audit_chain_cursor 
WHERE last_created_at IS NULL;
```

**Expected:** `0` (no missing created_at values)

### 7. ✅ Verify MFA Enrollment Function

```sql
-- Test the is_mfa_enrolled function exists
SELECT proname, prosrc 
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' 
  AND proname = 'is_mfa_enrolled';
```

**Expected:** 1 row showing the function definition

## Manual Verification Steps

### 1. Environment Variables

Verify these environment variables are set in your Lovable Cloud project:

```bash
# Required for edge functions
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Recommended: Set specific CORS origin (not wildcard)
CORS_ORIGIN=https://your-production-domain.com
```

**Action:** Go to Project Settings → Environment Variables and verify.

### 2. Native Supabase HIBP

**Manual Step:** Enable in Lovable Cloud backend

1. Navigate to: Lovable Cloud → Authentication → Password Settings
2. Enable: "Leaked Password Protection"
3. Set minimum strength: "Good" or higher

**Note:** This provides defense-in-depth backup to your existing edge function HIBP checks.

### 3. Test Audit-Verify Endpoint Security

**As Non-Admin User:**

```typescript
// Should return 403 Forbidden
const response = await fetch(`${SUPABASE_URL}/functions/v1/audit-verify`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${userToken}`,
  }
});
// Expected: response.status === 403
```

**As Admin User:**

```typescript
// Should return 200 OK with verification results
const response = await fetch(`${SUPABASE_URL}/functions/v1/audit-verify`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
  }
});
// Expected: response.status === 200
```

### 4. Test MFA Enforcement

**As Admin User Without MFA:**

1. Login to the application
2. Navigate to any protected page
3. **Expected:** Alert dialog appears: "MFA Required for Admin Access"
4. Click "Enable MFA Now"
5. **Expected:** Redirected to `/settings?tab=security`

**As Admin User With MFA:**

1. Login to the application
2. Navigate to any protected page
3. **Expected:** No MFA warning (normal access)

### 5. Run E2E Security Tests

```bash
# Run the new security hardening test suite
npx playwright test test/e2e/security-hardening.spec.ts

# Expected: All tests pass
# ✓ should return 403 for non-admin users accessing audit-verify
# ✓ should block anonymous access to audit-verify
# ✓ should not use wildcard CORS origin
# ✓ should restrict mv_audit_daily_stats to service role only
# ✓ should include security headers in edge function responses
```

## Security Posture After Hardening

### ✅ Fixed Issues

1. **Audit-Verify Endpoint** - Now admin-gated with RPC check
2. **Materialized View Exposure** - Restricted to service role only
3. **CORS Origin** - Configurable via environment variable (no wildcard)
4. **MFA Enforcement** - Admins prompted to enroll
5. **Audit Secret v2** - Placeholder created, admin must set actual secret
6. **SECURITY DEFINER Inventory** - Documented and verified

### ⚠️ Action Items

1. **Critical: Set v2 Audit Secret**
   ```bash
   openssl rand -hex 32
   # Then update in database
   ```

2. **Recommended: Set CORS_ORIGIN**
   ```bash
   # In Lovable Cloud project settings
   CORS_ORIGIN=https://your-production-domain.com
   ```

3. **Recommended: Enable Native HIBP**
   - Lovable Cloud → Authentication → Password Settings
   - Enable "Leaked Password Protection"

4. **Optional: Review SECURITY DEFINER Functions**
   - Run query #4 above
   - Document rationale for each
   - Consider switching to SECURITY INVOKER where safe

## Compliance Verification

### HIPAA Audit Controls (§164.312(b))

✅ **Verified:**
- Audit logs are immutable (UPDATE/DELETE policies blocked)
- Admin-only access to audit functions
- Cryptographic hash chain for integrity
- Automated verification (hourly cron)

### 42 CFR Part 2 Access Controls

✅ **Verified:**
- Part 2 consent enforcement via RLS policies
- Clinical staff access requires patient assignment
- All Part 2 access logged to audit trail
- Consent status checked before data access

## Troubleshooting

### Issue: "Missing audit secret for version 2"

**Cause:** v2 secret still has placeholder value

**Fix:**
```sql
-- Generate: openssl rand -hex 32
UPDATE private.audit_secrets 
SET secret = '<generated-hex>' 
WHERE version = 2;
```

### Issue: "Access denied" on mv_audit_daily_stats

**Cause:** RLS policies blocking access

**Expected:** This is correct! Materialized view should only be accessible via service role

**Solution:** Access via admin dashboard (which uses service role internally)

### Issue: MFA warning not appearing for admins

**Check:**
1. Is user actually an admin? Run: `SELECT * FROM user_roles WHERE user_id = '<user-id>';`
2. Is MFA already enrolled? Run: `SELECT is_mfa_enrolled('<user-id>');`
3. Are you on `/auth` or `/settings` page? (Warning is suppressed there)

### Issue: E2E tests failing

**Common Causes:**
1. Test user doesn't have admin role
2. Environment variables not set in test environment
3. Database migrations not applied

**Debug:**
```bash
# Run with headed browser to see what's happening
npx playwright test --headed --debug test/e2e/security-hardening.spec.ts
```

## Next Steps

After verifying all items above:

1. ✅ Update the main security audit report with "VERIFIED" status
2. ✅ Schedule quarterly reviews (every 3 months)
3. ✅ Add to CI/CD pipeline: Run validation queries on each deployment
4. ✅ Monitor audit_verify_runs table for chain integrity
5. ✅ Set up alerts for failed verifications

## Support

For issues with verification:

1. Check Lovable Cloud backend logs
2. Review edge function logs for audit-verify
3. Query `audit_verify_runs` table for failure details
4. Contact security team if chain integrity compromised

---

**Last Updated:** 2025-11-09  
**Next Review:** 2026-02-09 (3 months)
