# Audit Infrastructure - SPEC-2 Phase 2 Implementation

## Overview

This document details the audit chain verification and monitoring infrastructure implemented for Mental Scribe's HIPAA compliance requirements.

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

**Purpose:** Cryptographically verifies the immutability of the audit log chain using HMAC-SHA256

**How it works:**
1. Fetches all audit entries in order
2. Recomputes hash for each entry
3. Verifies prev_hash chain links
4. Returns verification result with detailed error info if broken

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
- Audit dashboard UI created
- Admin-only navigation added
- Edge function deployed (audit-verify)
- Materialized views created
- pg_cron jobs scheduled
- Zero-dependency CORS and metrics helpers

⏸️ **Deferred (awaiting denopkg.com resolution):**
- Direct postgres Pool read replica routing
- Upstash Redis caching

**Current workaround:** Using Supabase client passthrough for read/write operations until postgres Pool can be safely imported

## Security Considerations

1. **Admin Access Only:** Audit verification is restricted to users with admin role
2. **Immutable Logs:** Audit entries cannot be modified or deleted (enforced by RLS)
3. **Cryptographic Verification:** HMAC-SHA256 ensures tampering detection
4. **Automated Monitoring:** Hourly verification catches issues quickly

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

1. Check `audit_chain` table for tampering
2. Review database access logs
3. Verify RLS policies are enabled on audit tables
4. Check `AUDIT_SECRET` environment variable

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

## Next Steps (Phase 3)

1. **Enable Read Replicas:** Once denopkg.com issue resolved, implement true postgres Pool routing
2. **Add Redis Caching:** Enable Upstash Redis for non-PHI data caching
3. **Alert System:** Email/Slack notifications when chain verification fails
4. **Compliance Reports:** Generate periodic audit compliance reports from materialized views
5. **Advanced Analytics:** Add more granular materialized views for specific audit patterns

## References

- [Audit Chain Documentation](./AUDIT_CHAIN.md)
- [SPEC-2 Requirements](./SPEC-2_OPTIMIZE_SUPABASE.md)
- [SPEC-2 Phase 2 Setup](./SPEC-2_PHASE2_SETUP.md)
