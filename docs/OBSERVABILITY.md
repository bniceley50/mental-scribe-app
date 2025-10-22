# Feature #9: Edge Function Observability with Prometheus Metrics

This feature introduces comprehensive observability for Supabase Edge Functions using Prometheus-compatible metrics.

## Components

### Metrics Library (`supabase/functions/_shared/metrics.ts`)

A lightweight, Prometheus-compatible metrics collection library for Deno edge functions supporting:

- **Counters**: Monotonically increasing values (request counts, error counts)
- **Gauges**: Values that can go up or down (active connections, queue size)
- **Histograms**: Distribution of values with configurable buckets (latency, request size)

#### API Reference

```typescript
import { Counter, Gauge, Histogram, startTimer, exportMetrics } from '../_shared/metrics.ts';

// Counter - tracks total counts
const requestsTotal = new Counter('http_requests_total', 'Total HTTP requests');
requestsTotal.inc({ method: 'GET', status: '200' }); // increment by 1
requestsTotal.inc({ method: 'POST', status: '201' }, 5); // increment by 5

// Gauge - tracks current values
const activeConnections = new Gauge('active_connections', 'Number of active connections');
activeConnections.set(42, { service: 'api' });
activeConnections.inc({ service: 'api' }); // increment by 1
activeConnections.dec({ service: 'api' }, 2); // decrement by 2

// Histogram - tracks distributions
const requestDuration = new Histogram(
  'request_duration_seconds',
  'Request duration in seconds',
  [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10] // optional buckets
);
requestDuration.observe(0.123, { endpoint: '/api/users' });

// Timer utility
const timer = startTimer();
// ... do work ...
const duration = timer(); // returns duration in seconds
requestDuration.observe(duration, { endpoint: '/api/users' });

// Export all metrics in Prometheus text format
const metricsText = exportMetrics();
```

### Instrumented Edge Functions

#### 1. Health Check (`supabase/functions/health-check/index.ts`)

**Metrics exposed**:

- `health_check_requests_total` (counter): Total health check requests by status and method
- `health_check_duration_seconds` (histogram): Health check request duration
- `health_check_component_duration_seconds` (histogram): Individual component check duration (database, auth, storage)

**Labels**:

- `status`: `healthy`, `degraded`, `unhealthy`, `error`
- `method`: `GET`, `POST`, etc.
- `component`: `database`, `auth`, `storage`

#### 2. Audit Verify (`supabase/functions/audit-verify/index.ts`)

**Metrics exposed**:

- `audit_verify_requests_total` (counter): Total audit verification requests by status, error type, and integrity
- `audit_verify_duration_seconds` (histogram): Audit verification request duration
- `audit_chain_integrity` (gauge): Audit chain integrity status (1=intact, 0=broken)
- `audit_entries_verified` (gauge): Number of audit entries verified in last check

**Labels**:

- `status`: `success`, `error`, `unauthorized`, `forbidden`
- `error`: `missing_auth`, `invalid_token`, `not_admin`
- `intact`: `true`, `false`
- `chain`: `audit`

#### 3. Metrics Export (`supabase/functions/metrics/index.ts`)

A dedicated endpoint that exports all collected metrics in Prometheus text format.

**Endpoint**: `GET /metrics`

**Response format**: Prometheus text format (version 0.0.4)

**Example output**:

```text
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 1523

# HELP request_duration_seconds Request duration in seconds
# TYPE request_duration_seconds histogram
request_duration_seconds_bucket{endpoint="/api/users",le="0.005"} 24
request_duration_seconds_bucket{endpoint="/api/users",le="0.01"} 54
request_duration_seconds_bucket{endpoint="/api/users",le="0.025"} 89
request_duration_seconds_bucket{endpoint="/api/users",le="0.05"} 142
request_duration_seconds_bucket{endpoint="/api/users",le="0.1"} 201
request_duration_seconds_bucket{endpoint="/api/users",le="0.25"} 289
request_duration_seconds_bucket{endpoint="/api/users",le="0.5"} 312
request_duration_seconds_bucket{endpoint="/api/users",le="1"} 324
request_duration_seconds_bucket{endpoint="/api/users",le="2.5"} 329
request_duration_seconds_bucket{endpoint="/api/users",le="5"} 331
request_duration_seconds_bucket{endpoint="/api/users",le="10"} 331
request_duration_seconds_bucket{endpoint="/api/users",le="+Inf"} 331
request_duration_seconds_sum{endpoint="/api/users"} 45.2
request_duration_seconds_count{endpoint="/api/users"} 331
```

## Deployment

### 1. Deploy Edge Functions

```bash
# Deploy metrics export endpoint
supabase functions deploy metrics

# Deploy instrumented functions (if not already deployed)
supabase functions deploy health-check
supabase functions deploy audit-verify
```

### 2. Configure Prometheus Scraping

Add to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'supabase-edge-functions'
    scrape_interval: 30s
    scrape_timeout: 10s
    scheme: https
    metrics_path: /metrics
    static_configs:
      - targets:
          - '<your-project-ref>.supabase.co'
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: '<your-project-ref>.supabase.co'
    # Optional: Add authentication if your metrics endpoint is protected
    authorization:
      type: Bearer
      credentials: '<service-role-key>'
```

### 3. Grafana Dashboard Configuration

Example dashboard JSON snippet for visualizing edge function metrics:

```json
{
  "dashboard": {
    "title": "Mental Scribe Edge Functions",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(health_check_requests_total[5m])",
            "legendFormat": "{{status}}"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Request Duration (p50, p95, p99)",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, rate(health_check_duration_seconds_bucket[5m]))",
            "legendFormat": "p50"
          },
          {
            "expr": "histogram_quantile(0.95, rate(health_check_duration_seconds_bucket[5m]))",
            "legendFormat": "p95"
          },
          {
            "expr": "histogram_quantile(0.99, rate(health_check_duration_seconds_bucket[5m]))",
            "legendFormat": "p99"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Audit Chain Integrity",
        "targets": [
          {
            "expr": "audit_chain_integrity",
            "legendFormat": "{{chain}}"
          }
        ],
        "type": "stat"
      }
    ]
  }
}
```

## Usage Patterns

### Adding Metrics to a New Edge Function

```typescript
/* eslint-env deno */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Counter, Histogram, startTimer } from '../_shared/metrics.ts';

// Define metrics
const requestsTotal = new Counter('my_function_requests_total', 'Total requests');
const requestDuration = new Histogram('my_function_duration_seconds', 'Request duration');

serve(async (req) => {
  const timer = startTimer();
  
  try {
    // Your function logic here
    const result = await doWork();
    
    // Record success metrics
    requestsTotal.inc({ status: 'success' });
    requestDuration.observe(timer(), { status: 'success' });
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    // Record error metrics
    requestsTotal.inc({ status: 'error' });
    requestDuration.observe(timer(), { status: 'error' });
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

### Recommended Metrics for Edge Functions

- **Request counters**: Track total requests by endpoint, method, status
- **Duration histograms**: Measure latency with appropriate buckets for your SLOs
- **Error rates**: Count errors by type for alerting
- **Resource gauges**: Track active connections, queue sizes, cache hits
- **Business metrics**: Track domain-specific events (signups, conversions, etc.)

## Alerting Rules

Example Prometheus alerting rules:

```yaml
groups:
  - name: edge_functions
    rules:
      - alert: HighErrorRate
        expr: |
          rate(health_check_requests_total{status="error"}[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate in health checks"
          description: "Error rate is {{ $value }} errors/sec"
      
      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, rate(health_check_duration_seconds_bucket[5m])) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High latency in health checks"
          description: "95th percentile latency is {{ $value }}s"
      
      - alert: AuditChainBroken
        expr: |
          audit_chain_integrity == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Audit chain integrity compromised"
          description: "Audit chain verification failed"
```

## Performance Considerations

- **Memory**: Metrics are stored in-memory within each edge function instance. High-cardinality labels can increase memory usage.
- **CPU overhead**: Histogram observations require bucket calculations; use appropriate bucket ranges.
- **Label cardinality**: Avoid unbounded label values (e.g., user IDs, session IDs). Use fixed sets of labels.
- **Scrape interval**: Balance freshness vs. load; 30-60s is typical.

## Troubleshooting

### Metrics not appearing

1. Verify edge function is deployed: `supabase functions list`
2. Check function logs: `supabase functions logs <function-name>`
3. Test metrics endpoint directly: `curl https://<project>.supabase.co/metrics`
4. Verify Prometheus scrape config and check Prometheus targets page

### High memory usage

- Reduce label cardinality
- Reset metrics periodically if appropriate for your use case
- Consider aggregating metrics externally instead of in-memory

### Metrics reset on function restart

This is expected behavior. Edge functions are stateless and metrics are ephemeral. Use Prometheus to persist historical data.

## Best Practices

1. **Naming convention**: Use `<namespace>_<subsystem>_<name>_<unit>` format
2. **Label consistency**: Use same label names across related metrics
3. **Instrument early**: Add metrics during development, not after incidents
4. **Monitor what matters**: Focus on RED metrics (Rate, Errors, Duration) first
5. **Document metrics**: Include HELP text explaining what each metric measures
6. **Set SLOs**: Define target latencies and error rates, then alert on violations
7. **Test instrumentation**: Verify metrics are emitted correctly in development

## Security

- **Access control**: Consider protecting `/metrics` endpoint with authentication
- **PII**: Never include personally identifiable information in metric labels
- **Rate limiting**: Implement rate limiting on metrics endpoint if exposed publicly

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/naming/)
- [Grafana Dashboard Design](https://grafana.com/docs/grafana/latest/dashboards/)
- [OpenMetrics Specification](https://openmetrics.io/)
