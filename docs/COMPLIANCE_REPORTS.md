# HIPAA Compliance Reports

## Overview

The Compliance Report Generator provides automated HIPAA audit trail reporting by analyzing data from the audit chain verification system. Reports are generated on-demand and stored for regulatory review.

## Features

- **Date Range Selection**: Generate reports for any time period
- **Comprehensive Analytics**: Covers all HIPAA audit control requirements
- **Automated Storage**: Reports saved to `compliance_reports` table
- **JSON Export**: Download reports for external analysis
- **Admin-Only Access**: Restricted to users with admin role

## Accessing Reports

Navigate to: **Security → Compliance Reports**

Or visit: `/security/compliance`

## Generating a Report

1. Select **Start Date** and **End Date** for the reporting period
2. Click **Generate Report** button
3. Report will be generated and displayed automatically
4. Report is also saved to the database for future reference

### Report Contents

Each compliance report includes:

#### Summary Metrics
- Total audit entries in period
- Number of unique users
- Chain integrity checks performed
- Failed verifications (if any)

#### Compliance Status
- ✅ Audit Logs Immutable (enforced by triggers)
- ✅ Chain Integrity Verified (cryptographic verification)
- ✅ Automated Monitoring Active (hourly cron jobs)
- ✅ Retention Compliant (data retention policies)

#### Daily Statistics
- Audit entries per day
- Unique users per day
- Resource types accessed
- Action types performed

#### Verification History
- All chain integrity checks during period
- Success/failure status
- Detailed error information for failures

#### Action Breakdown
- Distribution of audit actions (create, update, delete, view, etc.)
- Count and percentage for each action type
- Top 10 most frequent actions

#### Resource Breakdown
- Distribution of resource access (clients, messages, notes, etc.)
- Count and percentage for each resource type
- Top 10 most accessed resources

## Viewing Past Reports

The **Recent Reports** section shows the 10 most recently generated reports:

- Click on any report to view its details
- Use the download button to export as JSON
- Reports are ordered by generation date (newest first)

## Downloading Reports

Click the **Download JSON** button to export a report in machine-readable format. This is useful for:

- Importing into compliance management systems
- Archiving for long-term storage
- Sharing with auditors or regulatory bodies
- Automated compliance checking

### JSON Format

```json
{
  "summary": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "totalAuditEntries": 15432,
    "uniqueUsers": 45,
    "chainIntegrityChecks": 744,
    "failedVerifications": 0
  },
  "complianceStatus": {
    "auditLogsImmutable": true,
    "chainIntegrityVerified": true,
    "automatedMonitoring": true,
    "retentionCompliant": true
  },
  "dailyStats": [...],
  "verificationHistory": [...],
  "actionBreakdown": [...],
  "resourceBreakdown": [...]
}
```

## HIPAA Compliance Mapping

### Required Audit Controls (§164.312(b))

| HIPAA Requirement | Implementation | Evidence |
|-------------------|----------------|----------|
| **Audit Controls** | Hash chain + triggers | Immutable audit_logs table |
| **Implement hardware, software, and/or procedural mechanisms that record and examine activity** | Automated hourly verification | audit_verify_runs table |
| **Information system activity** | All CRUD operations logged | Action/resource breakdowns |
| **Regular review of records** | Compliance reports | Generated reports with admin access |

### Addressable Specifications

| Specification | Status | Implementation |
|--------------|--------|----------------|
| Access Authorization (§164.308(a)(4)(ii)(B)) | ✅ Implemented | RLS policies + role checks |
| Access Establishment (§164.308(a)(4)(ii)(C)) | ✅ Implemented | Patient assignments + consent |
| Audit Review (§164.308(a)(1)(ii)(D)) | ✅ Implemented | Compliance reports + daily stats |
| Log-in Monitoring (§164.308(a)(5)(ii)(C)) | ✅ Implemented | Session tracking + failed logins |

## 42 CFR Part 2 Considerations

For Part 2 protected programs (substance use disorder treatment), additional safeguards apply:

- **Consent Verification**: All Part 2 access requires active consent
- **Disclosure Logging**: Part 2 disclosures tracked with purpose
- **Breach Detection**: Chain verification detects unauthorized access
- **Audit Trail Integrity**: Cryptographic verification prevents tampering

Reports automatically include Part 2-specific metrics when applicable:
- Part 2 consent grants/revocations
- Part 2 disclosure events
- Consent compliance rate

## Automation

Reports can be generated via API for automated compliance workflows:

```bash
# Generate report via Edge Function
curl -X POST "https://[project-ref].supabase.co/functions/v1/generate-compliance-report" \
  -H "Authorization: Bearer [session-token]" \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2024-01-01",
    "end_date": "2024-01-31",
    "report_type": "hipaa_audit_trail"
  }'
```

### Scheduled Generation

To generate monthly compliance reports automatically:

```sql
-- Add to pg_cron (example: monthly report on 1st of each month)
SELECT cron.schedule(
  'monthly_compliance_report',
  '0 0 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://[project-ref].supabase.co/functions/v1/generate-compliance-report',
    headers := '{"Authorization": "Bearer [service-role-key]", "Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'start_date', (CURRENT_DATE - INTERVAL '1 month')::text,
      'end_date', (CURRENT_DATE - INTERVAL '1 day')::text
    )
  );
  $$
);
```

## Troubleshooting

### No Data in Report

**Cause**: No audit entries in selected date range

**Solution**: 
- Verify date range includes periods with system activity
- Check that audit logging is enabled
- Verify audit_logs table contains entries

### Failed Verifications

**Cause**: Chain integrity check detected tampering

**Solution**:
1. Review verification history details
2. Identify broken entry ID from report
3. Investigate database access logs
4. Follow incident response procedures (see [AUDIT_CHAIN_ROTATION.md](./security/AUDIT_CHAIN_ROTATION.md))

### Missing Action/Resource Breakdowns

**Cause**: Metadata may be incomplete for some audit entries

**Solution**:
- Reports show data as available
- Ensure all audit logging includes action and resource_type
- Review audit entry triggers for completeness

## Best Practices

1. **Regular Generation**: Generate reports monthly for regulatory review
2. **Long-Term Storage**: Export and archive reports in secure location
3. **Review Anomalies**: Investigate unusual patterns in breakdowns
4. **Verify Integrity**: Check that all integrity checks pass
5. **Document Issues**: Note any failed verifications in incident log

## Security

- Reports contain PHI metadata (user IDs, resource types)
- Admin-only access enforced via RLS policies
- Actual PHI content not included in reports
- Hash values exposed only show integrity, not content
- Store reports securely per organizational policy

## References

- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [Audit Infrastructure Setup](./AUDIT_INFRASTRUCTURE_SETUP.md)
- [Audit Chain Documentation](./AUDIT_CHAIN.md)
- [Secret Rotation Guide](./security/AUDIT_CHAIN_ROTATION.md)

## Support

For questions about compliance reporting:
1. Review this documentation
2. Check audit chain verification status
3. Ensure admin access is properly configured
4. Contact security team for interpretation of results
