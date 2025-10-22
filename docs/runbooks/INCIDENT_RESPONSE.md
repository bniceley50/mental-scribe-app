# Incident Response Runbook

## Overview

This runbook provides step-by-step procedures for responding to production incidents in the Mental Scribe application.

## Severity Levels

### P0 - Critical (System Down)
- **Response Time:** Immediate (5 minutes)
- **Examples:** Complete system outage, data breach, authentication failure
- **Action:** Page on-call engineer, start war room

### P1 - High (Major Degradation)
- **Response Time:** 15 minutes
- **Examples:** Edge function failures, database performance issues, partial outages
- **Action:** Alert engineering team, begin investigation

### P2 - Medium (Minor Impact)
- **Response Time:** 1 hour
- **Examples:** Non-critical feature down, elevated error rates
- **Action:** Create incident ticket, investigate during business hours

### P3 - Low (Monitoring Alert)
- **Response Time:** 4 hours
- **Examples:** Warning thresholds exceeded, minor performance degradation
- **Action:** Track in backlog, address in next sprint

## Incident Response Checklist

### 1. Detect & Alert (0-5 minutes)

- [ ] **Confirm the incident** - Verify the issue is real
- [ ] **Assess severity** - Determine P0/P1/P2/P3 level
- [ ] **Create incident ticket** - Document in tracking system
- [ ] **Notify stakeholders** - Alert team via Slack/Teams

**Commands:**
```bash
# Check system health
curl https://YOUR_DOMAIN/api/health

# Check edge function status
curl https://YOUR_SUPABASE_URL/rest/v1/

# Monitor error logs
pnpm run logs:errors
```

### 2. Triage & Assess (5-15 minutes)

- [ ] **Gather metrics** - Collect error rates, latency, throughput
- [ ] **Check recent changes** - Review last deployments/config changes
- [ ] **Identify affected users** - Determine blast radius
- [ ] **Form hypothesis** - Develop initial theory of root cause

**Investigation Commands:**
```bash
# Recent deployments
git log --oneline -10

# Check Vercel deployment status
vercel ls

# Database connection test
psql $DATABASE_URL -c "SELECT NOW();"

# Edge function logs
supabase functions logs --tail
```

### 3. Mitigate & Stabilize (15-60 minutes)

- [ ] **Apply immediate fix** - Rollback, restart, or patch
- [ ] **Verify mitigation** - Confirm issue is resolved
- [ ] **Monitor for recurrence** - Watch metrics for 15-30 minutes
- [ ] **Update stakeholders** - Communicate status

**Mitigation Actions:**

#### Rollback Deployment
```bash
# Rollback to previous Vercel deployment
vercel rollback <DEPLOYMENT_URL>

# Or redeploy stable commit
git revert HEAD
git push origin main
```

#### Restart Edge Functions
```bash
# Redeploy all edge functions
supabase functions deploy --no-verify-jwt
```

#### Database Connection Reset
```sql
-- Kill long-running queries
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 minutes';

-- Reset connection pool
SELECT pg_reload_conf();
```

### 4. Root Cause Analysis (1-4 hours)

- [ ] **Conduct postmortem** - Schedule within 24 hours
- [ ] **Document timeline** - Record all events and actions
- [ ] **Identify root cause** - Find the underlying issue
- [ ] **Create prevention tasks** - Add items to backlog

**RCA Template:**
```markdown
## Incident: [Title]
**Date:** YYYY-MM-DD
**Severity:** P0/P1/P2/P3
**Duration:** XX minutes/hours
**Affected Users:** XX% / XX users

### Timeline
- HH:MM - Initial alert received
- HH:MM - Investigation started
- HH:MM - Mitigation applied
- HH:MM - Issue resolved

### Root Cause
[Detailed explanation]

### Impact
- User impact: [Description]
- Business impact: [Description]
- Technical impact: [Description]

### Resolution
[What fixed the issue]

### Action Items
- [ ] Prevention task 1
- [ ] Prevention task 2
- [ ] Monitoring improvement
```

### 5. Communicate & Document (Ongoing)

- [ ] **Update incident channel** - Keep team informed
- [ ] **Customer communication** - Inform affected users if needed
- [ ] **Status page update** - Post to public status page
- [ ] **Close incident** - Mark as resolved in tracking system

## Common Incident Scenarios

### Authentication Failures

**Symptoms:**
- Users cannot log in
- "Invalid credentials" errors
- JWT validation failures

**Investigation:**
```bash
# Check Supabase auth service
curl https://YOUR_SUPABASE_URL/auth/v1/health

# Verify JWT configuration
cat .env | grep VITE_SUPABASE

# Check for auth-related errors
pnpm run logs:auth
```

**Common Causes:**
- Expired API keys
- Supabase service degradation
- CORS configuration issues
- Rate limiting

**Mitigation:**
1. Verify Supabase dashboard for service status
2. Check API key expiration
3. Review recent CORS changes
4. Temporarily increase rate limits

### Database Performance Degradation

**Symptoms:**
- Slow query responses (>1s)
- Connection timeouts
- High CPU usage

**Investigation:**
```sql
-- Find slow queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;

-- Check table bloat
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- Missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
AND n_distinct > 100
ORDER BY abs(correlation) DESC;
```

**Common Causes:**
- Missing indexes
- Table bloat
- Long-running transactions
- Connection pool exhaustion

**Mitigation:**
1. Kill long-running queries
2. Add missing indexes
3. Run VACUUM ANALYZE
4. Increase connection pool size

### Edge Function Timeouts

**Symptoms:**
- 504 Gateway Timeout errors
- Edge function logs show timeouts
- Increased latency

**Investigation:**
```bash
# Check edge function logs
supabase functions logs <FUNCTION_NAME> --tail

# Test function directly
curl -X POST https://YOUR_SUPABASE_URL/functions/v1/<FUNCTION_NAME> \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Monitor function execution time
pnpm run monitor:functions
```

**Common Causes:**
- Downstream API timeouts
- Large payload processing
- Database connection delays
- Cold start issues

**Mitigation:**
1. Increase function timeout (max 60s)
2. Implement circuit breakers
3. Add request timeout limits
4. Optimize database queries

### High Error Rates

**Symptoms:**
- Error rate >1%
- Multiple error types
- User-reported issues

**Investigation:**
```bash
# Check error logs
pnpm run logs:errors --tail

# Get error summary
pnpm run logs:errors --summary

# Check specific error type
pnpm run logs:errors --filter "TypeError"
```

**Common Causes:**
- Recent deployment bugs
- Third-party API failures
- Client-side errors
- Configuration issues

**Mitigation:**
1. Rollback recent deployment
2. Add error handling
3. Implement fallbacks
4. Fix client-side bugs

## Escalation Procedures

### When to Escalate

- Incident exceeds estimated resolution time by 2x
- Severity level increases (P2 → P1 → P0)
- Additional expertise needed
- Customer-facing impact expanding

### Escalation Contacts

**Engineering Lead:** [Contact Info]
**DevOps/SRE:** [Contact Info]
**Security Team:** [Contact Info]
**Executive On-Call:** [Contact Info]

### Escalation Steps

1. **Notify next level** - Direct message or page
2. **Provide context** - Share incident details
3. **Continue mitigation** - Don't stop work
4. **Transfer ownership** - If needed

## Post-Incident Review

### Within 24 Hours

- [ ] Schedule postmortem meeting
- [ ] Invite all responders
- [ ] Prepare timeline and metrics
- [ ] Draft initial RCA

### Within 48 Hours

- [ ] Complete postmortem document
- [ ] Identify action items
- [ ] Assign owners and due dates
- [ ] Share with team

### Within 1 Week

- [ ] Begin action item work
- [ ] Update monitoring/alerting
- [ ] Share learnings with broader team
- [ ] Update runbooks if needed

## Monitoring & Alerting

### Key Metrics to Monitor

- **Error Rate:** <0.1% (alert at 1%)
- **Response Time:** p95 <500ms (alert at 1s)
- **Availability:** >99.9% (alert at 99%)
- **Database Connections:** <80% (alert at 90%)
- **Edge Function Success:** >99% (alert at 95%)

### Alert Channels

- **PagerDuty:** Critical incidents (P0/P1)
- **Slack #alerts:** All severity levels
- **Email:** Daily summaries
- **Dashboard:** Real-time metrics

## Tools & Resources

### Monitoring Dashboards
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Supabase Dashboard:** https://app.supabase.com
- **Security Monitoring:** /security/monitoring
- **Health Check:** /api/health

### Log Aggregation
```bash
# View all logs
pnpm run logs:all

# Filter by service
pnpm run logs:edge-functions
pnpm run logs:database
pnpm run logs:frontend

# Export logs for analysis
pnpm run logs:export --since "1 hour ago"
```

### Performance Profiling
```bash
# Run performance audit
pnpm run audit:performance

# Analyze bundle size
pnpm run analyze:bundle

# Database query analysis
pnpm run analyze:queries
```

## References

- [System Architecture](../ARCHITECTURE.md)
- [Security Procedures](../SECURITY.md)
- [Deployment Guide](../DEPLOY_READY.md)
- [Health Check System](./HEALTH_CHECKS.md)
- [Maintenance Runbook](./MAINTENANCE.md)
