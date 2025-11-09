# Audit Infrastructure - SPEC-2 Phase 2 Implementation

## Overview

This document details the audit chain verification and monitoring infrastructure implemented for Mental Scribe's HIPAA compliance requirements.

## Architecture

### Append-Only Hash Chain

The audit_logs table implements a cryptographic hash chain:
- Each entry contains `prev_hash` (previous entry's hash) and `hash` (current entry's HMAC-SHA256)
- Hash is computed from: `prev_hash + actor_id + action + resource + resource_id + details + timestamp`
- Secrets are versioned in `private.audit_secrets` for rotation without breaking old entries
- Triggers prevent UPDATE/DELETE operations (append-only)
- Any tampering breaks the chain and is immediately detectable

## Components Implemented

### 1. Audit Chain Verification Dashboard

**Location:** `/security/audit`

**Features:**
- Real-time verification of audit chain integrity via `audit-verify` edge function
- Admin-only access with role checking
- Auto-refresh every 5 minutes
- Displays:
  - Chain status (intact/broken)
  - Total entries in audit chain
  - Verified entries count
  - Detailed error information if chain is compromised

**Access:** Navigate to Security → Audit Chain in the sidebar (admin users only)

### 2. Audit Verify Edge Function

**Location:** `supabase/functions/audit-verify/index.ts`

**Purpose:** Verifies the immutability of the audit log chain using DB-side HMAC-SHA256 verification

**How it works:**
1. Calls `verify_audit_chain()` PostgreSQL function via RPC
2. DB function verifies each entry's hash using versioned secrets
3. Returns verification result with detailed error info if broken
4. No secrets leave the database - all crypto happens server-side

**Response format:**
```typescript
{
  intact: boolean,
  totalEntries: number,
  verifiedEntries: number,
  error?: string,
  brokenAtEntry?: number,
  details?: {
    expected: string,
    actual: string
  }
}
```

### 3. Automated Verification Cron Job

**Schedule:** Every hour (0 * * * *)

**Purpose:** Automatically verifies audit chain integrity and logs results

**Implementation:** pg_cron job calls the audit-verify edge function hourly

### 4. Materialized Views for Performance

**View:** `mv_audit_daily_stats`

**Columns:**
- `day` - Date truncated to day
- `total_entries` - Total audit log entries
- `unique_users` - Count of distinct users
- `resource_types` - Count of distinct resource types
- `action_types` - Count of distinct action types

**Refresh Schedule:** Every 5 minutes via pg_cron

**Query example:**
```sql
SELECT * FROM mv_audit_daily_stats 
WHERE day > NOW() - INTERVAL '30 days'
ORDER BY day DESC;
```

## Deployment Status

✅ **Completed:**
- Append-only audit_logs with HMAC-SHA256 hash chain
- Versioned secret storage in private.audit_secrets
- DB-side verification function (verify_audit_chain)
- Audit dashboard UI created
- Admin-only navigation added
- Edge function deployed (audit-verify)
- Materialized views created (mv_audit_daily_stats)
- pg_cron jobs scheduled (hourly verification + 5min MV refresh)
- Verification run logging (audit_verify_runs table)
- Zero-dependency CORS and metrics helpers

⏸️ **Deferred (awaiting denopkg.com resolution):**
- Direct postgres Pool read replica routing
- Upstash Redis caching

**Current workaround:** Using Supabase client passthrough for read/write operations until postgres Pool can be safely imported

## Security Considerations

1. **Admin Access Only:** Audit verification is restricted to users with admin role
2. **Immutable Logs:** Audit entries cannot be modified or deleted (enforced by triggers)
3. **Cryptographic Verification:** HMAC-SHA256 hash chain ensures tampering detection
4. **Automated Monitoring:** Hourly verification catches issues quickly
5. **Versioned Secrets:** Supports rotation without breaking existing entries
6. **DB-Side Crypto:** Secrets never leave the database
7. **Verification Logging:** All verification runs logged to audit_verify_runs

## Usage

### Viewing Audit Status

1. Log in as admin user
2. Navigate to sidebar → "Audit Chain"
3. View current verification status
4. Click "Verify Now" for manual verification

### Querying Audit Statistics

```sql
-- View daily audit activity trend
SELECT 
  day,
  total_entries,
  unique_users,
  resource_types
FROM mv_audit_daily_stats
WHERE day > NOW() - INTERVAL '7 days'
ORDER BY day DESC;
```

### Manual Verification via API

```typescript
const { data, error } = await supabase.functions.invoke("audit-verify", {
  headers: {
    Authorization: `Bearer ${session.access_token}`,
  },
});

if (data.intact) {
  console.log("✅ Audit chain verified");
} else {
  console.error("❌ Chain broken at entry:", data.brokenAtEntry);
}
```

## Troubleshooting

### Chain Verification Fails

1. Check `audit_verify_runs` for error details:
```sql
SELECT * FROM audit_verify_runs 
WHERE intact = false 
ORDER BY run_at DESC LIMIT 1;
```

2. Review the broken entry:
```sql
SELECT * FROM audit_logs 
WHERE id = '<broken_at_id_from_above>';
```

3. Check secret availability:
```sql
SELECT version, created_at FROM private.audit_secrets ORDER BY version;
```

4. Investigate database access logs for unauthorized modifications
5. Contact security team immediately if tampering is suspected

### Cron Jobs Not Running

```sql
-- Check cron job status
SELECT * FROM cron.job;

-- Check cron job run history
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

### Materialized View Out of Date

```sql
-- Manually refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_audit_daily_stats;

-- Check last refresh time
SELECT schemaname, matviewname, last_refresh
FROM pg_matviews
WHERE matviewname = 'mv_audit_daily_stats';
```

## Secret Rotation

See [AUDIT_CHAIN_ROTATION.md](./security/AUDIT_CHAIN_ROTATION.md) for complete rotation procedures.

Quick rotation:
```sql
-- 1. Add new secret
INSERT INTO private.audit_secrets (version, secret) 
VALUES (2, 'NEW-SECURE-RANDOM-SECRET');

-- 2. Update default
ALTER TABLE audit_logs ALTER COLUMN secret_version SET DEFAULT 2;

-- 3. Verify
SELECT * FROM verify_audit_chain();
```

## Next Steps (Phase 3)

1. **Enable Read Replicas:** Once denopkg.com issue resolved, implement true postgres Pool routing
2. **Add Redis Caching:** Enable Upstash Redis for non-PHI data caching
3. **Alert System:** Email/Slack notifications when chain verification fails
4. **Compliance Reports:** Generate periodic audit compliance reports from materialized views
5. **Advanced Analytics:** Add more granular materialized views for specific audit patterns
6. **Secret Rotation Schedule:** Set up automated quarterly rotation reminders

## References

- [Audit Chain Documentation](./AUDIT_CHAIN.md)
- [Secret Rotation Guide](./security/AUDIT_CHAIN_ROTATION.md)
- [SPEC-2 Requirements](./SPEC-2_OPTIMIZE_SUPABASE.md)
- [SPEC-2 Phase 2 Setup](./SPEC-2_PHASE2_SETUP.md)
