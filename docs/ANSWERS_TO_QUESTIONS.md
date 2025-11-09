# Answers to Architecture Questions

## Question 1: Quotas - Per-User or Per-Tenant?

### Current Implementation
**Per-User** (via `auth.uid()`)

Each individual provider/clinician has their own quota limits:
- LLM tokens: 1,000,000 per month
- STT minutes: 600 per month
- API calls: 10,000 per month

### Considerations

#### Stay Per-User ✅ (Current)
**Pros:**
- Simpler architecture
- Clear attribution (who used what)
- No cross-user quota conflicts
- Works for solo practitioners
- Easier billing per seat

**Cons:**
- Organizations can't pool resources
- Harder to manage quotas for large teams
- Can't shift unused quota between users

#### Switch to Per-Tenant
**Pros:**
- Organizations share quota pool
- Flexible resource allocation within team
- Better for enterprise billing
- Unused capacity benefits all users

**Cons:**
- Requires tenant tables + membership system
- More complex RLS policies
- Risk of single user exhausting shared pool
- Harder to attribute usage

### Recommendation
**Stay per-user for now** if:
- You're targeting solo/small practices
- Per-seat billing model
- Want simple attribution

**Switch to per-tenant** if:
- Enterprise/organization focus
- Pooled billing model
- Need flexible resource sharing

### Migration Path (if switching to per-tenant)

1. **Add tenant tables**:
```sql
CREATE TABLE tenants (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE tenant_memberships (
  user_id uuid REFERENCES auth.users,
  tenant_id uuid REFERENCES tenants,
  role text NOT NULL,
  PRIMARY KEY (user_id, tenant_id)
);
```

2. **Convert quotas**:
```sql
ALTER TABLE tenant_quotas 
  RENAME TO user_quotas;

CREATE TABLE tenant_quotas (
  id uuid PRIMARY KEY,
  tenant_id uuid REFERENCES tenants,
  quota_type text NOT NULL,
  limit_value integer NOT NULL,
  current_usage integer DEFAULT 0,
  reset_at timestamptz,
  UNIQUE(tenant_id, quota_type)
);
```

3. **Update quota function**:
```sql
CREATE OR REPLACE FUNCTION check_and_increment_quota(...)
RETURNS boolean AS $$
DECLARE
  _tenant_id uuid;
BEGIN
  -- Derive tenant from user's membership
  SELECT tenant_id INTO _tenant_id
  FROM tenant_memberships
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  -- Rest of logic uses _tenant_id instead of auth.uid()
  ...
END;
$$;
```

**Decision**: Let me know if you want me to implement per-tenant architecture.

---

## Question 2: DB-Side Audit Verifier RPC Now?

### Current Implementation
**Edge function** calls DB to verify, but could be optimized.

The `audit-verify` edge function currently:
1. Authenticates user
2. Calls `supabase.rpc('verify_audit_chain')`
3. Returns result

### Proposed: Full DB-Side Verifier

**Benefits:**
- ✅ Secrets never leave Postgres
- ✅ Faster (no network hop)
- ✅ Can be called from SQL directly
- ✅ Easier to audit via logs
- ✅ Integrates with pg_cron for automated verification

**Implementation:**
```sql
CREATE OR REPLACE FUNCTION public.verify_audit_chain()
RETURNS TABLE(
  intact boolean,
  total_entries int,
  verified_entries int,
  broken_at_id uuid,
  expected text,
  actual text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  r RECORD;
  prev_hash_val text := '';
  vcount int := 0;
  tcount int := 0;
  secret_val text;
  expected_hash text;
  payload text;
BEGIN
  FOR r IN
    SELECT *
    FROM public.audit_logs
    ORDER BY id
  LOOP
    tcount := tcount + 1;
    
    -- Check previous hash chain
    IF COALESCE(r.prev_hash, '') <> prev_hash_val THEN
      RETURN QUERY SELECT false, tcount, vcount, r.id, prev_hash_val, COALESCE(r.prev_hash, '');
      RETURN;
    END IF;
    
    -- Get secret for this row
    SELECT s.secret INTO secret_val 
    FROM private.audit_secrets s 
    WHERE s.version = r.secret_version;
    
    IF secret_val IS NULL THEN
      RETURN QUERY SELECT false, tcount, vcount, r.id, '<missing secret>', r.secret_version::text;
      RETURN;
    END IF;
    
    -- Recompute hash
    payload := COALESCE(r.prev_hash, '')
            || COALESCE(r.user_id::text, 'null')
            || r.action
            || r.resource_type
            || COALESCE(r.resource_id::text, 'null')
            || COALESCE(r.metadata::text, '{}')
            || EXTRACT(EPOCH FROM r.created_at)::bigint;
    
    expected_hash := encode(
      hmac(payload::bytea, convert_to(secret_val, 'utf8'), 'sha256'),
      'hex'
    );
    
    IF expected_hash <> r.hash THEN
      RETURN QUERY SELECT false, tcount, vcount, r.id, expected_hash, r.hash;
      RETURN;
    END IF;
    
    vcount := vcount + 1;
    prev_hash_val := r.hash;
  END LOOP;
  
  RETURN QUERY SELECT true, tcount, vcount, NULL::uuid, NULL::text, NULL::text;
END
$$;

-- Grant execute to service role only
REVOKE ALL ON FUNCTION public.verify_audit_chain() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_audit_chain() TO service_role;

-- Simplify edge function to thin wrapper
-- supabase/functions/audit-verify/index.ts becomes:
/*
const { data } = await supabase.rpc('verify_audit_chain');
return new Response(JSON.stringify(data));
*/
```

### When to Deploy This

**Deploy now** if:
- You want maximum security (secrets in DB only)
- You're ready to implement hash chaining
- You want automated hourly verification via pg_cron

**Wait** if:
- Still iterating on audit architecture
- Not ready to commit to hash chain format
- Want to ship other features first

### Current Status
- ✅ Append-only audit logs enforced (baseline)
- ✅ Hash chain columns added (`prev_hash`, `hash`, `secret_version`)
- ⏳ Hash computation trigger (pending)
- ⏳ DB-side verifier RPC (pending)

**Decision**: Ready to implement full DB-side verifier and hash chain triggers if you say go.

---

## Summary

### Per-User Quotas (Current) ✅
- Staying per-user for now
- Can migrate to per-tenant if needed

### DB-Side Audit Verifier
- Ready to implement when you approve
- Includes hash chain triggers + verification RPC
- Secrets stay in Postgres

**Let me know:**
1. Stay per-user or migrate to per-tenant?
2. Deploy DB-side audit verifier now or defer?

I can implement either (or both) immediately upon your decision.
