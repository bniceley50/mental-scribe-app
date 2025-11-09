# SPEC-2 Phase 2 Setup Guide

## Prerequisites Checklist

- [ ] Supabase project on paid plan (required for read replicas)
- [ ] Upstash Redis account created
- [ ] Phase 1 complete (27 indexes, audit immutability, perf views)

## Step 1: Enable Read Replica

### 1.1 Create Read Replica

1. Go to Supabase Dashboard → **Database** → **Read Replicas**
2. Click **Create Read Replica**
3. Select same region as primary (us-east-1)
4. Choose same compute size as primary
5. Wait for provisioning (~5-10 minutes)

### 1.2 Get Connection Strings

After replica is ready, copy the connection URLs:

**Primary (pooled):**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**Replica (pooled, read-only):**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### 1.3 Add Secrets

```bash
# Set primary and replica URLs
supabase secrets set DB_PRIMARY_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

supabase secrets set DB_REPLICA_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
```

## Step 2: Setup Redis Cache (Upstash)

### 2.1 Create Upstash Database

1. Go to https://console.upstash.com/
2. Create a new Redis database
3. Select region close to your Supabase region
4. Copy **REST URL** and **REST Token**

### 2.2 Add Redis Secrets

```bash
supabase secrets set UPSTASH_REDIS_REST_URL="https://[region].upstash.io"
supabase secrets set UPSTASH_REDIS_REST_TOKEN="[your-token]"
```

## Step 3: Create Materialized Views

Run this SQL in Supabase SQL Editor:

```sql
-- Enable pg_cron extension (required for scheduled jobs)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Materialized view: tenant daily note counts
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_tenant_daily_note_counts AS
SELECT 
  user_id,
  date_trunc('day', created_at) AS day,
  count(*) AS note_count
FROM conversations
GROUP BY user_id, date_trunc('day', created_at);

-- Unique index required for CONCURRENT refresh
CREATE UNIQUE INDEX IF NOT EXISTS mv_tenant_daily_note_counts_uidx
  ON mv_tenant_daily_note_counts (user_id, day);

-- Schedule refresh every 5 minutes
SELECT cron.schedule(
  'refresh_note_counts',
  '*/5 * * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tenant_daily_note_counts$$
);
```

### 3.1 Additional Materialized Views

```sql
-- MV: Client access summary (non-PHI metadata)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_client_access_summary AS
SELECT 
  client_id,
  accessed_by,
  count(*) AS access_count,
  max(created_at) AS last_access
FROM client_access_logs
WHERE created_at > now() - interval '30 days'
GROUP BY client_id, accessed_by;

CREATE UNIQUE INDEX IF NOT EXISTS mv_client_access_summary_uidx
  ON mv_client_access_summary (client_id, accessed_by);

-- Schedule: hourly refresh
SELECT cron.schedule(
  'refresh_client_access',
  '0 * * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_client_access_summary$$
);
```

## Step 4: Deploy Edge Functions

The shared helpers and example functions are already created:
- `supabase/functions/_shared/db.ts` - Read/write routing
- `supabase/functions/_shared/cache.ts` - Redis caching
- `supabase/functions/tenant-settings-cached/index.ts` - Example cached endpoint

Functions will auto-deploy with your next build.

## Step 5: Update Frontend to Use Cached Endpoints

### Example: Calling cached tenant settings

```typescript
// Instead of direct DB query
const { data } = await supabase
  .from('tenants')
  .select('*')
  .eq('id', tenantId)
  .single();

// Use cached edge function
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/tenant-settings-cached?tenant_id=${tenantId}`,
  {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  }
);
const { data } = await response.json();
```

## Step 6: Create Read-Only RPC Functions

For dashboard queries that should hit replicas:

```sql
-- Mark function as STABLE so it can be called with GET (routes to replica)
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE -- Critical: enables replica routing
AS $$
  SELECT jsonb_build_object(
    'conversation_count', (SELECT count(*) FROM conversations WHERE user_id = _user_id),
    'client_count', (SELECT count(*) FROM clients WHERE user_id = _user_id),
    'recent_activity', (SELECT max(updated_at) FROM conversations WHERE user_id = _user_id)
  );
$$;
```

### Frontend: Call with `{ get: true }`

```typescript
// This will route to read replica
const { data } = await supabase.rpc(
  'get_user_dashboard_stats',
  { _user_id: userId },
  { get: true } // Routes to replica
);
```

## Step 7: Monitor & Verify

### Check Replica Lag

```sql
-- Run on primary
SELECT 
  client_addr,
  state,
  sent_lsn,
  write_lsn,
  flush_lsn,
  replay_lsn,
  sync_state,
  pg_wal_lsn_diff(sent_lsn, replay_lsn) AS lag_bytes
FROM pg_stat_replication;
```

Expected: lag_bytes < 10MB, state = 'streaming'

### Check Cache Hit Rate

Monitor Edge Function logs for `[Cache HIT]` vs `[Cache MISS]` messages:

```bash
supabase functions logs tenant-settings-cached --tail
```

Target: >70% hit rate after warm-up period

### Check Performance Metrics

Use the performance views from Phase 1:

```sql
-- Table bloat and vacuum status
SELECT * FROM performance_table_bloat
ORDER BY pct_dead DESC NULLS LAST
LIMIT 10;

-- Index usage
SELECT * FROM performance_index_usage
WHERE schemaname = 'public'
ORDER BY scans DESC NULLS LAST
LIMIT 20;
```

## Step 8: Supavisor Pool Tuning

Check current pool settings:

1. Dashboard → **Database** → **Connection Pooling**
2. Verify:
   - **Mode**: Transaction (for most queries)
   - **Pool Size**: 15-30 (adjust based on load)
   - **Default Pool Size**: 20

Monitor active connections:

```sql
SELECT 
  count(*) AS connection_count,
  state,
  usename
FROM pg_stat_activity
WHERE datname = 'postgres'
GROUP BY state, usename
ORDER BY connection_count DESC;
```

Alert if connection_count > 80% of pool size.

## What's Cached (Non-PHI Only)

✅ **Safe to cache:**
- Tenant settings (name, plan, feature flags)
- User roles and permissions
- Program metadata (non-clinical)
- Materialized view results
- Client list metadata (name, ID only)

❌ **NEVER cache:**
- Clinical notes content
- Conversation messages
- Structured notes
- Recording transcriptions
- Part 2 consent details
- Any field containing PHI

## Rollback Plan

If issues arise:

1. **Disable replica routing**: Remove `DB_REPLICA_URL` secret
   ```bash
   supabase secrets unset DB_REPLICA_URL
   ```
   Functions will fallback to primary automatically.

2. **Disable caching**: Remove Redis secrets
   ```bash
   supabase secrets unset UPSTASH_REDIS_REST_URL
   supabase secrets unset UPSTASH_REDIS_REST_TOKEN
   ```
   Functions will skip caching and query DB directly.

3. **Remove cron jobs**:
   ```sql
   SELECT cron.unschedule('refresh_note_counts');
   SELECT cron.unschedule('refresh_client_access');
   ```

## Next Steps (Week 3-4)

- [ ] Add caching to 3-5 more hot endpoints
- [ ] Create dashboard MVs for analytics
- [ ] Set up Datadog/CloudWatch for replica lag alerts
- [ ] Run load tests with k6 against cached endpoints
- [ ] Document per-tenant rate limits

## Resources

- [Supabase Read Replicas](https://supabase.com/docs/guides/platform/read-replicas)
- [Upstash Redis with Supabase](https://upstash.com/docs/redis/integrations/supabase-edge-functions)
- [pg_cron documentation](https://github.com/citusdata/pg_cron)
- [Materialized Views Best Practices](https://www.postgresql.org/docs/current/rules-materializedviews.html)
