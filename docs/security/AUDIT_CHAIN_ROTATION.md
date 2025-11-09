# Audit Chain Secret Rotation

## Overview

The audit chain uses versioned HMAC secrets stored in the `private.audit_secrets` table. This allows for non-breaking secret rotation where old entries remain verifiable with their original secret version while new entries use the updated secret.

## Secret Storage

Secrets are stored in the `private.audit_secrets` table:

```sql
CREATE TABLE private.audit_secrets (
  version int PRIMARY KEY,
  secret text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);
```

Each audit log entry stores its `secret_version`, allowing the verifier to use the correct secret for validation.

## Rotation Process

### 1. Add New Secret Version

Insert a new secret with the next version number:

```sql
INSERT INTO private.audit_secrets (version, secret) 
VALUES (2, 'NEW-SECURE-RANDOM-SECRET-HERE');
```

**Important**: Generate a cryptographically secure random secret. Use at least 32 characters.

### 2. Update Default Version

Change the default `secret_version` for new audit entries:

```sql
ALTER TABLE public.audit_logs 
  ALTER COLUMN secret_version SET DEFAULT 2;
```

### 3. Verify Rotation

Check that new entries use the new version:

```sql
-- Create a test audit entry
INSERT INTO audit_logs (user_id, action, resource_type, metadata)
VALUES (auth.uid(), 'test_action', 'test_resource', '{}'::jsonb);

-- Verify it uses version 2
SELECT id, secret_version, hash 
FROM audit_logs 
ORDER BY created_at DESC 
LIMIT 1;
```

### 4. Verify Chain Integrity

Run the verification function to ensure both old and new entries verify correctly:

```sql
SELECT * FROM verify_audit_chain();
```

Expected result:
- `intact = true`
- `verified_entries = total_entries`

## Security Best Practices

### Secret Generation

Generate secrets using a cryptographically secure random generator:

```bash
# Linux/Mac
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Secret Storage

1. **Never commit secrets to version control**
2. Store secrets in Lovable Cloud secrets (via secrets tool)
3. Audit access to the `private.audit_secrets` table
4. Use database encryption at rest

### Rotation Schedule

Recommended rotation schedule:
- **Production**: Every 90 days minimum
- **High-security**: Every 30 days
- **After incident**: Immediately

### Access Control

The `private.audit_secrets` table should:
- Only be accessible by database superuser
- Have no RLS policies (schema isolation)
- Be excluded from backups sent to third parties
- Be logged for all access

## Rollback Procedure

If a rotation causes issues:

1. **Do NOT delete the new secret version** - this would break verification
2. Revert the default version:

```sql
ALTER TABLE public.audit_logs 
  ALTER COLUMN secret_version SET DEFAULT 1;
```

3. Investigate the issue
4. Fix and retry rotation

## Verification Logs

All verification runs are logged to `audit_verify_runs`:

```sql
-- Check recent verification results
SELECT 
  run_at,
  intact,
  total_entries,
  verified_entries,
  details
FROM audit_verify_runs
ORDER BY run_at DESC
LIMIT 10;
```

## Monitoring

Set up alerts for:
- Failed verifications (`intact = false`)
- Missing secret versions
- Unusual verification times

## Emergency Procedures

### If Chain is Broken

1. **Do not delete entries** - investigate first
2. Check `audit_verify_runs` for details:

```sql
SELECT * FROM audit_verify_runs 
WHERE intact = false 
ORDER BY run_at DESC 
LIMIT 1;
```

3. The `details` column shows:
   - `broken_at_id`: Which entry failed
   - `expected`: What the hash should be
   - `actual`: What was stored

4. Investigate the cause:
   - Database tampering?
   - Secret corruption?
   - Migration issue?

5. Document incident in security log
6. Contact security team immediately

### If Secret is Compromised

1. Rotate immediately using process above
2. Review all audit entries since compromise
3. Generate new secure secret
4. Update monitoring and access controls
5. Document incident

## Compliance Notes

For HIPAA/42 CFR Part 2 compliance:
- Secret rotation demonstrates access control maintenance
- Verification logs provide audit trail
- Immutability prevents unauthorized modifications
- Version tracking supports forensic analysis

## Testing

Test rotation in non-production first:

```sql
-- 1. Record current state
SELECT COUNT(*) as before_count FROM audit_logs;

-- 2. Add test secret version
INSERT INTO private.audit_secrets (version, secret) 
VALUES (99, 'TEST-SECRET-DO-NOT-USE-IN-PROD');

-- 3. Create entry with test version
INSERT INTO audit_logs (user_id, action, resource_type, secret_version)
VALUES (auth.uid(), 'rotation_test', 'test', 99);

-- 4. Verify chain
SELECT * FROM verify_audit_chain();

-- 5. Cleanup
DELETE FROM audit_logs WHERE secret_version = 99;
DELETE FROM private.audit_secrets WHERE version = 99;
```

## References

- [AUDIT_INFRASTRUCTURE_SETUP.md](../AUDIT_INFRASTRUCTURE_SETUP.md)
- [AUDIT_CHAIN.md](../AUDIT_CHAIN.md)
- [HIPAA Audit Controls](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html)
