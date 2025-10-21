# Tamper-Evident Audit Log Chain

## Overview

The Mental Scribe app now includes a cryptographically secure, tamper-evident audit log chain using HMAC-SHA256 hashing. This ensures HIPAA compliance and provides irrefutable proof of system integrity.

## Features

- **Immutable Chain**: Each audit entry is cryptographically linked to the previous entry
- **Tamper Detection**: Any modification to past entries breaks the chain and is immediately detectable
- **HIPAA Compliant**: Meets audit log requirements for healthcare applications
- **Performance Optimized**: Indexed for fast queries and verification
- **RLS Protected**: Row Level Security ensures only authorized users can access logs

## Architecture

### Database Schema

```sql
TABLE audit_chain (
  id              SERIAL PRIMARY KEY,
  timestamp       TIMESTAMPTZ NOT NULL,
  actor_id        UUID,                    -- User who performed the action
  action          TEXT NOT NULL,           -- Action type (CREATE, READ, UPDATE, DELETE)
  resource        TEXT NOT NULL,           -- Resource type (patient, session, note, etc.)
  resource_id     TEXT,                    -- Specific resource ID
  details         JSONB,                   -- Additional context
  prev_hash       TEXT,                    -- Hash of previous entry
  hash            TEXT NOT NULL            -- HMAC-SHA256 of this entry
)
```

### Hash Computation

Each entry's hash is computed as:

```
hash = HMAC-SHA256(prev_hash || actor_id || action || resource || resource_id || details || timestamp, secret)
```

The first entry has `prev_hash = ''`, and each subsequent entry links to the previous entry's hash.

## Usage

### Adding Audit Entries

Use the `add_audit_entry` function to add entries to the chain:

```typescript
const { data, error } = await supabase.rpc('add_audit_entry', {
  p_actor_id: user.id,
  p_action: 'CREATE',
  p_resource: 'session_note',
  p_resource_id: sessionId,
  p_details: {
    patient_id: patientId,
    note_type: 'SOAP',
    fields_modified: ['subjective', 'objective']
  }
})
```

### Actions

Standard action types:
- `CREATE` - Resource created
- `READ` - Resource accessed/viewed
- `UPDATE` - Resource modified
- `DELETE` - Resource deleted (soft or hard)
- `EXPORT` - Data exported
- `LOGIN` - User authentication
- `CONSENT_GRANTED` - Patient consent given
- `CONSENT_REVOKED` - Patient consent withdrawn

### Resources

Common resource types:
- `patient` / `client`
- `session`
- `session_note`
- `soap_note`
- `consent`
- `user`
- `backup`
- `export`

## Verification

### Via Edge Function

Call the `audit-verify` edge function to verify chain integrity:

```typescript
const { data, error } = await supabase.functions.invoke('audit-verify', {
  headers: {
    Authorization: `Bearer ${session.access_token}`
  }
})

if (data.intact) {
  console.log(`✓ Audit chain verified: ${data.verifiedEntries} entries`)
} else {
  console.error(`✗ Chain broken at entry ${data.brokenAtEntry}`)
  console.error(`Expected: ${data.details.expected}`)
  console.error(`Actual: ${data.details.actual}`)
}
```

### Via CLI

```bash
mscribe audit verify
```

### Response Format

```typescript
interface VerifyResult {
  intact: boolean           // Overall integrity status
  totalEntries: number      // Total entries in chain
  verifiedEntries: number   // Entries verified before failure
  error?: string           // Error message if broken
  brokenAtEntry?: number   // ID where chain broke
  details?: {
    expected: string       // Expected hash
    actual: string         // Actual hash
  }
}
```

## Integration Examples

### Session Creation

```typescript
async function createSession(patientId: string, therapistId: string) {
  // Create session
  const { data: session } = await supabase
    .from('sessions')
    .insert({ patient_id: patientId, therapist_id: therapistId })
    .select()
    .single()

  // Add audit entry
  await supabase.rpc('add_audit_entry', {
    p_actor_id: therapistId,
    p_action: 'CREATE',
    p_resource: 'session',
    p_resource_id: session.id,
    p_details: {
      patient_id: patientId,
      session_type: 'individual'
    }
  })

  return session
}
```

### Consent Management

```typescript
async function grantConsent(patientId: string, consentType: string) {
  const { data: consent } = await supabase
    .from('consents')
    .insert({
      patient_id: patientId,
      consent_type: consentType,
      granted_at: new Date().toISOString()
    })
    .select()
    .single()

  // Critical: Audit consent actions
  await supabase.rpc('add_audit_entry', {
    p_actor_id: patientId,
    p_action: 'CONSENT_GRANTED',
    p_resource: 'consent',
    p_resource_id: consent.id,
    p_details: {
      consent_type: consentType,
      granted_at: consent.granted_at
    }
  })
}
```

### Data Export

```typescript
async function exportPatientData(patientId: string, requestedBy: string) {
  const data = await fetchPatientData(patientId)
  
  // HIPAA requires auditing all exports
  await supabase.rpc('add_audit_entry', {
    p_actor_id: requestedBy,
    p_action: 'EXPORT',
    p_resource: 'patient',
    p_resource_id: patientId,
    p_details: {
      export_type: 'full_record',
      record_count: data.length,
      format: 'JSON'
    }
  })

  return data
}
```

## Security Considerations

### Secret Management

The audit chain secret (`AUDIT_SECRET`) must be:
1. Stored securely (Supabase Vault or environment variables)
2. Never committed to version control
3. Rotated periodically (requires chain recomputation)
4. Backed up securely and separately

### Access Control

- Only authenticated users can read audit logs (RLS policy)
- Only admin users can verify the chain
- Direct inserts are blocked (must use `add_audit_entry`)
- Deletion of audit entries should be prevented in production

### Monitoring

Set up alerts for:
- Failed verification attempts
- Gaps in the chain
- Unusual audit entry patterns
- Verification failures

## Performance

### Indexes

The following indexes are created for optimal performance:
- `idx_audit_chain_timestamp` - Query by time range
- `idx_audit_chain_actor` - Query by user
- `idx_audit_chain_resource` - Query by resource type
- `idx_audit_chain_hash` - Verification lookups

### Benchmarks

Expected performance (varies by deployment):
- Insert: ~50-100ms per entry
- Verification: ~2-5 seconds per 1,000 entries
- Query: <100ms for indexed lookups

### Optimization Tips

1. **Batch Operations**: Group audit entries when possible
2. **Async Logging**: Don't block user operations on audit writes
3. **Archive Old Entries**: Move old entries to cold storage (keeping hashes intact)
4. **Scheduled Verification**: Run verification during off-peak hours

## Testing

### Unit Tests

```bash
npm test test/audit-chain.test.ts
```

### Integration Tests

```bash
npm run test:e2e -- --grep "audit chain"
```

### Manual Verification

```bash
# Add test entries
psql -c "SELECT add_audit_entry(uuid_generate_v4(), 'TEST', 'test', 'test-1', '{}'::jsonb)"

# Verify
curl -X POST https://your-project.supabase.co/functions/v1/audit-verify \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Chain Verification Fails

1. Check if `AUDIT_SECRET` matches across environments
2. Verify no manual modifications to `audit_chain` table
3. Check for missing entries (gaps in IDs)
4. Review Supabase logs for trigger errors

### Performance Issues

1. Check index usage with `EXPLAIN ANALYZE`
2. Consider partitioning for very large chains
3. Archive old entries to separate table
4. Increase connection pool size if needed

### Missing Audit Entries

1. Verify triggers are enabled
2. Check application error logs
3. Confirm RLS policies aren't blocking inserts
4. Test `add_audit_entry` function directly

## Compliance

This audit chain implementation supports:

- **HIPAA §164.312(b)** - Audit Controls
- **HIPAA §164.308(a)(1)(ii)(D)** - Information System Activity Review
- **SOC 2 CC6.1** - Logical and Physical Access Controls
- **ISO 27001 A.12.4** - Logging and Monitoring

## Migration Guide

If you have existing audit logs, migrate them to the chain:

```sql
-- Example migration script
INSERT INTO audit_chain (
  timestamp,
  actor_id,
  action,
  resource,
  resource_id,
  details
)
SELECT
  created_at,
  user_id,
  action_type,
  table_name,
  record_id,
  jsonb_build_object('legacy_id', id, 'details', details)
FROM old_audit_logs
ORDER BY created_at ASC;
```

The trigger will automatically compute hashes for migrated entries.

## Future Enhancements

Potential improvements:
- [ ] Merkle tree structure for faster verification
- [ ] Blockchain anchor for external verification
- [ ] Automatic secret rotation with re-hashing
- [ ] Real-time verification streaming
- [ ] Distributed chain across regions

## Support

For issues or questions:
- Open an issue on GitHub
- Contact the security team
- Review HIPAA compliance documentation
