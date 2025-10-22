# Maintenance Runbook

## Overview

Standard operating procedures for routine maintenance tasks in the Mental Scribe application.

## Scheduled Maintenance Windows

- **Weekly:** Sundays 2:00 AM - 4:00 AM UTC
- **Monthly:** First Sunday 2:00 AM - 6:00 AM UTC
- **Quarterly:** Announced 2 weeks in advance

## Database Maintenance

### Weekly Database Cleanup

**Frequency:** Every Sunday 2:00 AM UTC

**Tasks:**

1. **Vacuum and Analyze Tables**

```sql
-- Vacuum all tables to reclaim space
VACUUM ANALYZE;

-- Vacuum specific tables
VACUUM ANALYZE public.audit_log;
VACUUM ANALYZE public.conversations;
VACUUM ANALYZE public.messages;
```

2. **Archive Old Audit Logs**

```sql
-- Archive audit logs older than 90 days
INSERT INTO audit_log_archive
SELECT * FROM audit_log
WHERE created_at < NOW() - INTERVAL '90 days';

DELETE FROM audit_log
WHERE created_at < NOW() - INTERVAL '90 days';
```

3. **Update Table Statistics**

```sql
ANALYZE;
```

### Monthly Database Optimization

**Frequency:** First Sunday of month, 2:00 AM UTC

**Tasks:**

1. **Reindex Tables**

```sql
REINDEX DATABASE mental_scribe;
```

2. **Check for Table Bloat**

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS external_size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;
```

3. **Optimize Frequently Updated Tables**

```sql
VACUUM FULL public.messages;
VACUUM FULL public.conversations;
```

## Log Management

### Log Rotation

**Frequency:** Daily at midnight UTC

**Automated via scheduled job:**

```typescript
// Rotates logs older than 30 days
await rotateApplicationLogs({
  retentionDays: 30,
  archiveToS3: true
});
```

### Log Archival

**Frequency:** Monthly

**Tasks:**

1. **Export logs to long-term storage**
2. **Compress archived logs**
3. **Delete logs older than 1 year**

## Backup Procedures

### Database Backups

**Frequency:** Daily at 3:00 AM UTC

**Automated via Supabase:**

- Point-in-time recovery enabled
- 30-day retention
- Stored in multi-region S3

**Manual Backup:**

```bash
# Create manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Compress backup
gzip backup_$(date +%Y%m%d).sql

# Upload to S3
aws s3 cp backup_$(date +%Y%m%d).sql.gz s3://mental-scribe-backups/
```

**Restore from Backup:**

```bash
# Download backup
aws s3 cp s3://mental-scribe-backups/backup_20251021.sql.gz .

# Decompress
gunzip backup_20251021.sql.gz

# Restore (CAUTION: This will overwrite existing data)
psql $DATABASE_URL < backup_20251021.sql
```

### File Storage Backups

**Frequency:** Daily

**Automated via Supabase Storage:**

- Automatic replication
- Version history enabled
- Cross-region backup

## Security Maintenance

### Certificate Renewal

**Frequency:** Automated (Let's Encrypt)

**Verification:**

```bash
# Check certificate expiration
echo | openssl s_client -servername YOUR_DOMAIN -connect YOUR_DOMAIN:443 2>/dev/null | openssl x509 -noout -dates

# Expected: notAfter should be >30 days in future
```

### API Key Rotation

**Frequency:** Quarterly

**Procedure:**

1. Generate new API keys in Supabase dashboard
2. Update environment variables in Vercel
3. Update `.env.example` documentation
4. Monitor for errors after rotation
5. Deprecate old keys after 7-day grace period

### Security Patch Updates

**Frequency:** As needed (critical patches immediately)

**Procedure:**

1. Review security advisories
2. Test updates in staging environment
3. Schedule deployment during maintenance window
4. Verify no breaking changes
5. Deploy to production

## Dependency Updates

### Weekly Dependency Check

**Frequency:** Every Monday

```bash
# Check for outdated dependencies
pnpm outdated

# Check for security vulnerabilities
pnpm audit

# Update dependencies
pnpm update
```

### Monthly Major Updates

**Frequency:** First Monday of month

**Procedure:**

1. Review changelog for breaking changes
2. Update dependencies in feature branch
3. Run full test suite
4. Deploy to staging for testing
5. Deploy to production during maintenance window

## Performance Optimization

### Weekly Performance Audit

**Frequency:** Every Sunday after database maintenance

```bash
# Run performance tests
pnpm run audit:performance

# Analyze bundle size
pnpm run analyze:bundle

# Check for memory leaks
pnpm run test:memory-leaks
```

### Monthly Performance Review

**Tasks:**

1. Review slow query logs
2. Identify optimization opportunities
3. Update indexes as needed
4. Optimize large assets
5. Review CDN cache hit rates

## Monitoring & Alerts Review

### Weekly Alert Review

**Tasks:**

1. Review false positive alerts
2. Adjust alert thresholds if needed
3. Verify on-call rotation
4. Test alert delivery channels

### Monthly Monitoring Audit

**Tasks:**

1. Review SLA compliance
2. Analyze incident trends
3. Update monitoring dashboards
4. Add new metrics as needed

## Capacity Planning

### Monthly Capacity Review

**Metrics to Review:**

- Database storage growth rate
- API request volume trends
- Edge function execution counts
- File storage usage
- User growth rate

**Actions:**

1. Forecast resource needs for next quarter
2. Plan infrastructure scaling
3. Review cost optimization opportunities
4. Update capacity alerts

## Disaster Recovery Testing

### Quarterly DR Drill

**Frequency:** Every quarter (announced 1 week in advance)

**Procedure:**

1. Simulate production outage
2. Execute disaster recovery plan
3. Restore from backups
4. Verify data integrity
5. Measure RTO (Recovery Time Objective)
6. Measure RPO (Recovery Point Objective)
7. Document lessons learned

**Success Criteria:**

- RTO < 4 hours
- RPO < 1 hour
- No data loss
- All systems operational

## Maintenance Checklists

### Pre-Maintenance Checklist

- [ ] Notify users via status page
- [ ] Create maintenance ticket
- [ ] Take pre-maintenance snapshot
- [ ] Verify backup completion
- [ ] Prepare rollback plan
- [ ] Notify team in Slack/Teams

### During Maintenance Checklist

- [ ] Put site in maintenance mode (if needed)
- [ ] Execute maintenance tasks
- [ ] Monitor system health
- [ ] Verify each task completion
- [ ] Document any issues

### Post-Maintenance Checklist

- [ ] Remove maintenance mode
- [ ] Verify system functionality
- [ ] Check error logs
- [ ] Monitor metrics for 30 minutes
- [ ] Update status page
- [ ] Close maintenance ticket
- [ ] Document completion

## Automated Maintenance Jobs

See [Scheduled Jobs System](../FEATURE_8_OPS_RUNBOOKS.md#scheduled-jobs) for details on automated tasks:

- `daily-cleanup` - Runs at 2:00 AM UTC
- `weekly-maintenance` - Runs Sundays 2:00 AM UTC
- `monthly-optimization` - Runs 1st Sunday 2:00 AM UTC
- `log-rotation` - Runs daily at midnight UTC
- `backup-verification` - Runs daily at 4:00 AM UTC

## Rollback Procedures

### Application Rollback

```bash
# Via Vercel
vercel rollback <DEPLOYMENT_URL>

# Via Git
git revert HEAD
git push origin main
```

### Database Rollback

```bash
# Restore from point-in-time backup
# (Use Supabase dashboard for point-in-time recovery)

# Or restore from manual backup
psql $DATABASE_URL < backup_YYYYMMDD.sql
```

### Configuration Rollback

```bash
# Revert environment variables in Vercel dashboard
# Or use Vercel CLI
vercel env rm VARIABLE_NAME
vercel env add VARIABLE_NAME
```

## Emergency Procedures

### Emergency Maintenance

**When to Execute:**

- Critical security vulnerability
- Data corruption detected
- System instability

**Procedure:**

1. Immediately notify team
2. Put site in maintenance mode
3. Execute emergency fix
4. Verify resolution
5. Remove maintenance mode
6. Conduct post-incident review

### Emergency Contact List

- **Engineering Lead:** [Contact]
- **Database Admin:** [Contact]
- **Security Team:** [Contact]
- **DevOps/SRE:** [Contact]

## References

- [Incident Response Runbook](./INCIDENT_RESPONSE.md)
- [Health Checks Documentation](./HEALTH_CHECKS.md)
- [Scheduled Jobs System](../FEATURE_8_OPS_RUNBOOKS.md)
- [Security Procedures](../SECURITY.md)
