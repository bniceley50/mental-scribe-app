# Health Checks Documentation

## Overview

Comprehensive health check system for monitoring the Mental Scribe application's critical components and dependencies.

## Health Check Endpoint

**Endpoint:** `GET /api/health`

**Response Format:**

```json
{
  "status": "healthy",
  "timestamp": "2025-10-21T10:30:00.000Z",
  "version": "1.3.0",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 45,
      "details": {
        "connections": {
          "active": 12,
          "idle": 8,
          "max": 100
        }
      }
    },
    "supabase": {
      "status": "healthy",
      "responseTime": 120,
      "details": {
        "auth": "operational",
        "storage": "operational",
        "functions": "operational"
      }
    },
    "cache": {
      "status": "healthy",
      "responseTime": 5
    },
    "external": {
      "status": "degraded",
      "responseTime": 2500,
      "details": {
        "openai": "operational",
        "stripe": "slow_response"
      }
    }
  },
  "metrics": {
    "uptime": 99.98,
    "requestsPerMinute": 450,
    "averageResponseTime": 185,
    "errorRate": 0.02
  }
}
```

**Status Values:**

- `healthy` - All systems operational
- `degraded` - Some non-critical issues
- `unhealthy` - Critical issues detected

## Individual Health Checks

### Database Health

**Check:** Database connectivity and performance

**Criteria:**

- Connection successful
- Response time < 100ms
- Active connections < 80% of max
- No long-running queries (>30s)

**Implementation:**

```typescript
async function checkDatabaseHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Test connection
    const { data, error } = await supabase.rpc('health_check_database');
    
    if (error) throw error;
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: responseTime < 100 ? 'healthy' : 'degraded',
      responseTime,
      details: data
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error.message
    };
  }
}
```

**SQL Function:**

```sql
CREATE OR REPLACE FUNCTION health_check_database()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  active_conn integer;
  idle_conn integer;
  max_conn integer;
  long_queries integer;
BEGIN
  -- Get connection stats
  SELECT 
    COUNT(*) FILTER (WHERE state = 'active'),
    COUNT(*) FILTER (WHERE state = 'idle'),
    (SELECT setting::integer FROM pg_settings WHERE name = 'max_connections')
  INTO active_conn, idle_conn, max_conn
  FROM pg_stat_activity;
  
  -- Count long-running queries
  SELECT COUNT(*)
  INTO long_queries
  FROM pg_stat_activity
  WHERE state = 'active' 
    AND query_start < NOW() - INTERVAL '30 seconds';
  
  result := jsonb_build_object(
    'connections', jsonb_build_object(
      'active', active_conn,
      'idle', idle_conn,
      'max', max_conn
    ),
    'longRunningQueries', long_queries,
    'timestamp', NOW()
  );
  
  RETURN result;
END;
$$;
```

### Supabase Services Health

**Check:** Supabase Auth, Storage, and Edge Functions

**Criteria:**

- Auth service responding
- Storage accessible
- Edge functions deployable

**Implementation:**

```typescript
async function checkSupabaseHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const checks = {
    auth: false,
    storage: false,
    functions: false
  };
  
  try {
    // Test Auth
    const { error: authError } = await supabase.auth.getSession();
    checks.auth = !authError;
    
    // Test Storage
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
    checks.storage = !storageError && buckets?.length > 0;
    
    // Test Edge Functions (ping endpoint)
    const { error: functionsError } = await supabase.functions.invoke('health-check');
    checks.functions = !functionsError;
    
    const allHealthy = Object.values(checks).every(c => c);
    
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      responseTime: Date.now() - startTime,
      details: checks
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error.message
    };
  }
}
```

### External Dependencies Health

**Check:** Third-party API availability

**Dependencies:**

- OpenAI API
- Stripe API (if applicable)
- Email service
- Any other external APIs

**Implementation:**

```typescript
async function checkExternalHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const checks: Record<string, string> = {};
  
  try {
    // Check OpenAI
    const openaiStart = Date.now();
    const openaiResponse = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      signal: AbortSignal.timeout(5000)
    });
    checks.openai = openaiResponse.ok ? 'operational' : 'error';
    
    // Add other external checks here
    
    const hasErrors = Object.values(checks).some(s => s === 'error');
    
    return {
      status: hasErrors ? 'degraded' : 'healthy',
      responseTime: Date.now() - startTime,
      details: checks
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error.message
    };
  }
}
```

### Cache Health

**Check:** Application cache (if using Redis/similar)

**Criteria:**

- Cache accessible
- Response time < 10ms
- Memory usage < 80%

**Implementation:**

```typescript
async function checkCacheHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // For simple in-memory cache
    const testKey = `health-check-${Date.now()}`;
    const testValue = 'ok';
    
    // Set
    cache.set(testKey, testValue);
    
    // Get
    const retrieved = cache.get(testKey);
    
    // Delete
    cache.delete(testKey);
    
    const success = retrieved === testValue;
    
    return {
      status: success ? 'healthy' : 'unhealthy',
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error.message
    };
  }
}
```

## Health Check Implementation

### Edge Function: health-check

**File:** `supabase/functions/health-check/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  details?: unknown;
  error?: string;
}

serve(async (req) => {
  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Run all health checks in parallel
    const [database, auth, storage] = await Promise.allSettled([
      checkDatabase(supabase),
      checkAuth(supabase),
      checkStorage(supabase)
    ]);
    
    // Aggregate results
    const checks = {
      database: database.status === 'fulfilled' ? database.value : { status: 'unhealthy', error: database.reason },
      auth: auth.status === 'fulfilled' ? auth.value : { status: 'unhealthy', error: auth.reason },
      storage: storage.status === 'fulfilled' ? storage.value : { status: 'unhealthy', error: storage.reason }
    };
    
    // Determine overall status
    const statuses = Object.values(checks).map(c => c.status);
    const overallStatus = statuses.includes('unhealthy') ? 'unhealthy' :
                         statuses.includes('degraded') ? 'degraded' : 'healthy';
    
    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      checks
    };
    
    return new Response(JSON.stringify(response), {
      status: overallStatus === 'healthy' ? 200 : 503,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      error: error.message
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

async function checkDatabase(supabase: any): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const { data, error } = await supabase.rpc('health_check_database');
  
  return {
    status: error ? 'unhealthy' : 'healthy',
    responseTime: Date.now() - startTime,
    details: data,
    error: error?.message
  };
}

async function checkAuth(supabase: any): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
  
  return {
    status: error ? 'unhealthy' : 'healthy',
    responseTime: Date.now() - startTime,
    error: error?.message
  };
}

async function checkStorage(supabase: any): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const { data, error } = await supabase.storage.listBuckets();
  
  return {
    status: error ? 'unhealthy' : 'healthy',
    responseTime: Date.now() - startTime,
    details: { bucketCount: data?.length || 0 },
    error: error?.message
  };
}
```

## Monitoring Integration

### Alert Configuration

**Critical Alerts (PagerDuty/SMS):**

- Overall status = `unhealthy` for >2 minutes
- Database status = `unhealthy`
- All external dependencies failing

**Warning Alerts (Slack/Email):**

- Overall status = `degraded` for >10 minutes
- Any component `unhealthy` for >5 minutes
- Response time >1000ms

**Info Alerts (Dashboard only):**

- Any component response time increasing
- Connection pool >70% utilized

### Monitoring Setup

**External Monitoring (Recommended):**

```yaml
# Example: UptimeRobot/Pingdom configuration
endpoint: https://YOUR_DOMAIN/api/health
interval: 60 seconds
timeout: 30 seconds
alert_threshold: 2 failures
success_criteria: status_code = 200 AND body contains "healthy"
```

**Internal Monitoring:**

```typescript
// Scheduled job running every 1 minute
async function monitorHealth() {
  const response = await fetch('/api/health');
  const health = await response.json();
  
  // Log to monitoring system
  await logMetrics({
    timestamp: new Date(),
    status: health.status,
    responseTime: health.responseTime,
    checks: health.checks
  });
  
  // Trigger alerts if needed
  if (health.status === 'unhealthy') {
    await alertOncall({
      severity: 'critical',
      message: 'Health check failed',
      details: health
    });
  }
}
```

## Health Dashboard

Visual dashboard showing health status:

**URL:** `/ops/health-dashboard`

**Features:**

- Real-time health status
- Historical uptime charts
- Component-level details
- Recent incidents
- Alert history

## Testing Health Checks

```bash
# Test health check endpoint
curl https://YOUR_DOMAIN/api/health | jq

# Test with timeout
curl --max-time 5 https://YOUR_DOMAIN/api/health

# Test from monitoring location
curl -H "X-Monitor-Key: YOUR_KEY" https://YOUR_DOMAIN/api/health
```

## Troubleshooting

### Health Check Failing

1. Check edge function logs: `supabase functions logs health-check`
2. Verify database connectivity
3. Test Supabase services individually
4. Check external API keys/quotas

### False Positives

- Adjust timeout thresholds
- Add retry logic
- Whitelist monitoring IPs
- Review alert conditions

## References

- [Incident Response Runbook](./INCIDENT_RESPONSE.md)
- [Maintenance Runbook](./MAINTENANCE.md)
- [Scheduled Jobs System](../FEATURE_8_OPS_RUNBOOKS.md)
