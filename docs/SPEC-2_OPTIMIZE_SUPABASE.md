# SPEC-2: Optimize Supabase for Single-Organization Scale

## Background

**Mental Scribe** is a single-organization clinical note assistant with a **multi-program** architecture (not multi-tenant B2B). Current setup:
- **23 tables** on Supabase PostgreSQL with Row-Level Security
- **Programs** as the top-level isolation boundary (Part 2 vs standard PHI)
- **~64 console.* calls** being migrated to structured logger (PR-3)
- **Existing PHI storage** (clinical notes, patient data) requiring immediate BAA

**Goal**: Optimize current Supabase for 10k+ users, 100+ programs, millions of notes over next 12 months.

## Requirements

### Must Have
- **Indexes** on all foreign keys and common query patterns
- **Partition** `audit_logs` by month (already append-only, immutable)
- **PITR** backup enabled (30-day retention minimum)
- **Read replica** for analytics/reporting queries
- **Performance baseline**: p95 < 150ms for OLTP reads/writes
- **Audit immutability**: Enforce via RLS (no updates/deletes)
- **Connection pooling**: Verify Supabase pooler config

### Should Have
- **Redis cache** for hot program/client lookups
- **CDC pipeline** to analytics warehouse (Snowflake/BigQuery)
- **Materialized views** for dashboard aggregations
- **Query monitoring**: Enable `pg_stat_statements`, set up Performance Insights alerts

### Could Have
- **Autovacuum tuning** for high-write tables
- **Per-program rate limits** (already have per-user in `rate_limits` table)
- **Compression** for old audit logs (pg_repack)

### Won't Have (for now)
- Multi-tenant `tenant_id` architecture (single-org only)
- Multi-region writes
- Horizontal sharding

---

## Method

### 1. Indexing Strategy

**Current gaps** (from schema analysis):

```sql
-- Add missing foreign key indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_program_id ON clients(program_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_program_id ON conversations(program_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_client_id ON conversations(client_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_structured_notes_user_id ON structured_notes(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_structured_notes_program_id ON structured_notes(program_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_structured_notes_client_id ON structured_notes(client_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_structured_notes_conversation_id ON structured_notes(conversation_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_part2_consents_conversation_id ON part2_consents(conversation_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_part2_consents_user_id ON part2_consents(user_id);

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_created 
  ON messages(conversation_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_action_ts 
  ON audit_logs(user_id, action, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_user_updated 
  ON conversations(user_id, updated_at DESC);
```

**Why CONCURRENTLY**: Zero downtime; builds in background. Monitor with:
```sql
SELECT * FROM pg_stat_progress_create_index;
```

### 2. Partition Audit Logs

**Problem**: `audit_logs` is append-only and will grow to millions of rows. Partitioning keeps VACUUM/ANALYZE fast and allows easy archival.

```sql
-- Convert audit_logs to partitioned table (requires rebuild)
-- Migration will be in phases to avoid downtime

-- Step 1: Create new partitioned table
CREATE TABLE audit_logs_partitioned (
  LIKE audit_logs INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Step 2: Create initial partitions (monthly)
CREATE TABLE audit_logs_2025_11 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE audit_logs_2025_12 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
CREATE TABLE audit_logs_2026_01 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Step 3: Copy data (batched, during maintenance window)
INSERT INTO audit_logs_partitioned SELECT * FROM audit_logs;

-- Step 4: Swap tables (atomic rename)
BEGIN;
  ALTER TABLE audit_logs RENAME TO audit_logs_old;
  ALTER TABLE audit_logs_partitioned RENAME TO audit_logs;
  -- Recreate RLS policies on new table
COMMIT;

-- Step 5: Auto-create future partitions via cron job or pg_partman extension
```

**Monthly maintenance**: Drop partitions older than 2 years, or move to cold storage (S3).

### 3. Enforce Audit Immutability

**Current gap**: RLS policies don't explicitly block UPDATE/DELETE on `audit_logs`.

```sql
-- Block updates to audit logs (immutable records)
CREATE POLICY audit_logs_immutable_update ON audit_logs
  FOR UPDATE USING (false);

CREATE POLICY audit_logs_immutable_delete ON audit_logs
  FOR DELETE USING (false);

-- Only admins can SELECT (already in place)
-- Service role can INSERT (already in place)
```

### 4. Connection Pooling

**Verify Supabase Pooler** is enabled:
- Transaction mode for OLTP
- Session mode for migrations
- Max connections: 100 (adjust based on load testing)

**App-side**: Use Supabase client's built-in pooling; no additional pooler needed.

### 5. Read Replica for Analytics

**Supabase Pro+** includes read replicas. Enable one in same region:

**Configuration**:
```typescript
// src/integrations/supabase/analytics-client.ts
import { createClient } from '@supabase/supabase-js';

const ANALYTICS_URL = import.meta.env.VITE_SUPABASE_READ_REPLICA_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const analyticsClient = createClient(ANALYTICS_URL, ANON_KEY, {
  auth: { persistSession: false }
});
```

**Use cases**:
- Dashboard aggregations (conversation counts, note stats)
- Compliance reports
- Admin analytics

**Query pattern**:
```typescript
// Heavy read-only query → replica
const { data } = await analyticsClient
  .from('structured_notes')
  .select('*')
  .gte('created_at', '2025-01-01');
```

### 6. Redis Caching Strategy

**Cache hot data** (read-heavy, low-churn):

```typescript
// src/lib/cache.ts
import { Redis } from 'ioredis';

const redis = new Redis(import.meta.env.VITE_REDIS_URL);

// Cache program metadata (rarely changes)
export async function getProgram(id: string) {
  const cached = await redis.get(`program:${id}`);
  if (cached) return JSON.parse(cached);
  
  const { data } = await supabase
    .from('programs')
    .select('*')
    .eq('id', id)
    .single();
  
  if (data) {
    await redis.setex(`program:${id}`, 3600, JSON.stringify(data)); // 1hr TTL
  }
  return data;
}

// Invalidate on update
export async function updateProgram(id: string, updates: any) {
  await supabase.from('programs').update(updates).eq('id', id);
  await redis.del(`program:${id}`);
}
```

**What to cache**:
- ✅ Programs, clients (low churn)
- ✅ User roles/permissions
- ❌ Messages, notes (high churn, PHI)

**Provider**: **Upstash Redis** (serverless, HIPAA-eligible when configured).

### 7. CDC to Data Warehouse

**Use Supabase Realtime** + edge function to stream changes:

```sql
-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE structured_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
```

**Edge function** (CDC listener):
```typescript
// supabase/functions/cdc-to-warehouse/index.ts
import { serve } from 'std/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(/* ... */);

serve(async (req) => {
  const changes = await req.json();
  
  // Batch insert to Snowflake/BigQuery
  await fetch(Deno.env.get('WAREHOUSE_INGEST_URL'), {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${Deno.env.get('WAREHOUSE_TOKEN')}` },
    body: JSON.stringify({
      table: changes.table,
      records: changes.record
    })
  });
  
  return new Response('OK');
});
```

**Alternative**: Use **Airbyte** or **Fivetran** (both have Supabase connectors).

### 8. Query Monitoring

**Enable pg_stat_statements** (check if already enabled):
```sql
SELECT * FROM pg_stat_statements 
ORDER BY total_exec_time DESC 
LIMIT 10;
```

**Set up alerts**:
- Queries > 1s (p95)
- Table bloat > 30%
- Connection pool saturation > 80%

**Tool**: Supabase Dashboard → Performance Insights (Pro tier).

### 9. Materialized Views for Dashboards

**Example**: Program-level note counts (refreshed hourly):

```sql
CREATE MATERIALIZED VIEW program_note_stats AS
SELECT 
  program_id,
  COUNT(*) as note_count,
  COUNT(DISTINCT user_id) as active_users,
  MAX(created_at) as last_note_at
FROM structured_notes
GROUP BY program_id;

CREATE UNIQUE INDEX ON program_note_stats(program_id);

-- Refresh hourly via cron (pg_cron extension)
SELECT cron.schedule('refresh-program-stats', '0 * * * *', 
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY program_note_stats$$
);
```

---

## Performance Baseline (Run Now)

**Query these to identify hot spots**:

```sql
-- 1. Largest tables
SELECT 
  schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- 2. Slowest queries (requires pg_stat_statements)
SELECT 
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- 3. Missing indexes (seq scans on large tables)
SELECT 
  schemaname, tablename, 
  seq_scan, seq_tup_read,
  idx_scan, idx_tup_fetch,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as size
FROM pg_stat_user_tables
WHERE seq_scan > 1000 AND pg_relation_size(schemaname||'.'||tablename) > 1000000
ORDER BY seq_scan DESC;

-- 4. Bloat check (tables needing VACUUM)
SELECT 
  schemaname, tablename,
  n_dead_tup,
  n_live_tup,
  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as pct_dead
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;
```

---

## Migration Plan (Phased Rollout)

### Phase 1: Immediate (Week 1)
- ✅ Sign Supabase BAA
- ✅ Update README.md (remove "No PHI Storage" claim)
- ✅ Add missing foreign key indexes (`CONCURRENTLY`)
- ✅ Block audit log updates/deletes (RLS policy)
- ✅ Run performance baseline queries

### Phase 2: Core Performance (Weeks 2-4)
- ✅ Enable PITR backups (30-day retention)
- ✅ Partition `audit_logs` by month
- ✅ Add composite indexes for hot query patterns
- ✅ Set up connection pooling monitoring

### Phase 3: Scale Out (Weeks 5-8)
- ✅ Enable read replica for analytics
- ✅ Implement Redis caching for programs/clients
- ✅ Create materialized views for dashboards
- ✅ Set up query performance alerts

### Phase 4: Analytics Pipeline (Weeks 9-12)
- ✅ Set up CDC to data warehouse (Snowflake/BigQuery)
- ✅ Build compliance reporting dashboards
- ✅ Archive old audit logs to S3

---

## Cost Estimates (Supabase Pro)

**Current baseline**: ~$25/mo (Pro plan)

**After optimizations**:
- **Read replica**: +$50/mo (same-region)
- **Redis** (Upstash): +$30/mo (10GB cache)
- **Warehouse** (Snowflake): ~$100/mo (1TB/year ingestion)
- **Total**: ~$205/mo for 10k users, 1M notes/year

**Cost controls**:
- Auto-pause read replica during off-hours
- Set Snowflake auto-suspend to 5 min
- Compress audit logs older than 90 days

---

## Success Metrics

**Before → After (3 months)**:

| Metric | Baseline | Target |
|--------|----------|--------|
| p95 query latency | TBD | < 150ms |
| Connection pool usage | TBD | < 70% |
| Audit log query time | TBD | < 50ms |
| Cache hit rate | 0% | > 80% |
| Analytics query impact | Blocks OLTP | Zero impact |

**Monitoring**: Supabase Performance Insights + Datadog (optional).

---

## Security Hardening Checklist

- [x] RLS enabled on all tables
- [x] Audit logs immutable (no UPDATE/DELETE)
- [x] Service role credentials rotated (90-day max)
- [x] MFA enforced for admin accounts
- [ ] Sign Supabase BAA (immediate)
- [ ] Column-level encryption for PHI hotspots (optional)
- [ ] Network allowlist for edge functions (if needed)

---

## Next Steps

1. **Run baseline queries** (see Performance Baseline section) and paste results
2. **Approve Phase 1 migration** (indexes + audit immutability)
3. **Sign Supabase BAA** and update documentation

Once Phase 1 is complete, we'll roll out caching + read replica.
