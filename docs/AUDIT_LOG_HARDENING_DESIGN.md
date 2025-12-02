# Audit Log Hardening Design Proposal (GAP-01)

## 1. Database Schema Changes

We will extend the `public.audit_logs` table to include the required HIPAA compliance fields.

### New Columns
- `session_id` (UUID, nullable): Links the audit entry to a specific user session.
- `phi_accessed` (BOOLEAN, default false): Explicit flag indicating if PHI was touched.
- `outcome` (TEXT): Status of the action. Values: `success`, `failure`, `denied`.
- `client_ip` (TEXT): The IP address of the client. *Note: We already have `ip_address`. We will migrate to `client_ip` or alias it to ensure strict adherence to the spec.*

### Retention Policy (7 Years)
To enforce the 7-year retention requirement:
1.  **Prevent Premature Deletion**: A database trigger will be added to `audit_logs` that raises an exception if any row is deleted or updated before it is 7 years old.
2.  **Automated Cleanup**: A scheduled job (using `pg_cron` or Supabase Scheduled Functions) will be defined to archive/delete records older than 7 years.

### SQL Migration Draft
```sql
ALTER TABLE public.audit_logs
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.user_sessions(id),
ADD COLUMN IF NOT EXISTS phi_accessed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS outcome TEXT CHECK (outcome IN ('success', 'failure', 'denied')),
ADD COLUMN IF NOT EXISTS client_ip TEXT; -- Will populate from ip_address initially

-- Backfill client_ip from ip_address
UPDATE public.audit_logs SET client_ip = ip_address WHERE client_ip IS NULL;

-- Trigger to prevent modification/deletion within retention period
CREATE OR REPLACE FUNCTION prevent_audit_log_tampering()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
        IF OLD.created_at > (NOW() - INTERVAL '7 years') THEN
            RAISE EXCEPTION 'Audit logs cannot be modified or deleted within the 7-year retention period.';
        END IF;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_audit_retention
BEFORE DELETE OR UPDATE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_tampering();
```

## 2. Edge Function Updates

### `disclose` Function
- **Session ID**: Will be extracted using `validate_session_token` or from the request context.
- **PHI Accessed**: Will be set to `true` for all disclosure events involving `standard_phi` or `part2_protected` data.
- **Outcome**:
    - `success`: When the disclosure payload is returned.
    - `denied`: When consent is missing/invalid or RLS fails.
    - `failure`: When an unexpected error occurs.
- **Client IP**: Will be explicitly mapped to the new `client_ip` field.

### `audit-verify-incremental` Function
- Will be updated to include the new fields in the hash calculation to ensure the integrity of the *entire* audit record, including the new compliance fields.

## 3. Verification Plan
1.  Run migration.
2.  Test `disclose` function with valid and invalid requests.
3.  Verify `audit_logs` entries contain new fields.
4.  Attempt to delete a recent audit log entry (should fail).
5.  Run `audit-verify-incremental` to ensure chain integrity is maintained (or re-hashed if we decide to include new fields in the hash). *Decision: We should include new fields in the hash for completeness.*

## Questions
- Should we rename `ip_address` to `client_ip` or keep both? *Proposal: Keep `ip_address` for backward compatibility but populate `client_ip`.*
- Is `pg_cron` available for the cleanup job? *Assumption: Yes, or we will use a scheduled Edge Function.*
