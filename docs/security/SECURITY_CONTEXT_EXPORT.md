# Security Context Export for Codex

## Current Security Findings (4 Issues)

### 1. 🔴 ERROR: Healthcare Program Information Visible to All Program Members
**Table**: `programs`  
**Risk Level**: High  
**Issue**: Any authenticated user who is a program member can read sensitive program metadata including:
- `is_part2` flag (indicates substance abuse program - protected under 42 CFR Part 2)
- `org_unit_code` (organizational structure information)

**Current Policy**:
```sql
CREATE POLICY "Authenticated users can view their programs"
ON programs FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_program_member(auth.uid(), id)
);
```

**Recommended Fix**: Restrict program metadata to administrators only. Program members should only see their membership status, not program details.

---

### 2. ⚠️ WARN: Audit Logs Expose User Activity to Anonymous Visitors
**Table**: `audit_logs`  
**Risk Level**: Medium  
**Issue**: Contains sensitive tracking data (IP addresses, user agents, actions). Has deny-anonymous policy but service role INSERT could be exploited.

**Current Policies**:
```sql
-- Blocks anonymous reads
CREATE POLICY "Deny anonymous access to audit logs"
ON audit_logs FOR SELECT
USING (false);

-- Admin access
CREATE POLICY "Admins can view all audit logs"
ON audit_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert
CREATE POLICY "Service role can insert audit logs"
ON audit_logs FOR INSERT
WITH CHECK (true);
```

**Recommended Fix**: 
- Verify service role INSERT is properly scoped
- Consider adding explicit deny for non-admin authenticated users
- Audit edge function usage of audit_logs

---

### 3. ⚠️ WARN: Leaked Password Protection Disabled (Supabase Toggle)
**Source**: Supabase native auth settings  
**Risk Level**: Medium  
**Status**: ✅ **MITIGATED** - Server-side HIBP protection implemented

**Current Mitigation**:
- Custom `secure-signup` edge function with server-side HIBP API check
- Uses k-anonymity model (only sends first 5 chars of SHA-1 hash)
- Blocks signup if password found in breach database
- Located in: `supabase/functions/secure-signup/index.ts`

**No action needed** - Already implementing stricter protection than Supabase native toggle.

---

### 4. ⚠️ WARN: Compliance Reports Could Be Accessed by Unauthorized Staff
**Table**: `compliance_reports`  
**Risk Level**: Medium  
**Issue**: Only protected by `has_role()` function. If role system compromised, reports could be exposed.

**Current Policies**:
```sql
CREATE POLICY "Only admins can view compliance reports"
ON compliance_reports FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can create compliance reports"
ON compliance_reports FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND (auth.uid() = generated_by)
);

-- Immutable once created
CREATE POLICY "Compliance reports cannot be updated"
ON compliance_reports FOR UPDATE
USING (false);

CREATE POLICY "Compliance reports cannot be deleted"
ON compliance_reports FOR DELETE
USING (false);
```

**Recommended Fix**: Add additional validation layer or audit all admin role assignments.

---

## Database Schema Context

### Security Definer Functions (Critical for RLS)

```sql
-- Role checking (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Program membership checking
CREATE OR REPLACE FUNCTION public.is_program_member(_user_id uuid, _program_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_program_memberships
    WHERE user_id = _user_id AND program_id = _program_id
  );
$$;

-- Data classification helper
CREATE OR REPLACE FUNCTION public.derive_classification(_program_id uuid)
RETURNS data_classification
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN p.is_part2 THEN 'part2_protected'::public.data_classification
    ELSE 'standard_phi'::public.data_classification
  END
  FROM public.programs p
  WHERE p.id = _program_id;
$$;
```

### Custom Types

```sql
-- User roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'provider', 'patient');

-- Data classification for HIPAA/Part 2
CREATE TYPE public.data_classification AS ENUM (
  'standard_phi',      -- Standard HIPAA protected health info
  'part2_protected'    -- 42 CFR Part 2 substance abuse records
);
```

### Role-Based Access Control Tables

**user_roles**: Maps users to roles
```sql
- id: uuid (PK)
- user_id: uuid (FK to auth.users)
- role: app_role enum
- created_at: timestamp
```

**user_program_memberships**: Maps users to healthcare programs
```sql
- id: uuid (PK)
- user_id: uuid (FK to auth.users)
- program_id: uuid (FK to programs)
- role: app_role
- created_at: timestamp
```

**programs**: Healthcare treatment programs (Part 2 protected)
```sql
- id: uuid (PK)
- name: text
- org_unit_code: text (SENSITIVE)
- is_part2: boolean (SENSITIVE - indicates SUD program)
- created_at, updated_at: timestamps
```

---

## Authentication Flow

### Signup Process (Server-Side HIBP Check)

1. User submits email + password via `src/pages/Auth.tsx`
2. Client validates with Zod schema (length, complexity)
3. Calls `supabase/functions/secure-signup/index.ts`
4. Edge function:
   - Validates input again server-side
   - Checks password against HIBP API (k-anonymity)
   - If leaked: Returns 400 error
   - If safe: Creates user via `supabase.auth.admin.createUser()`
   - Auto-confirms email (`email_confirm: true`)
5. User can sign in immediately

### Sign In Process

1. User submits credentials
2. Client calls `supabase.auth.signInWithPassword()`
3. Supabase validates credentials
4. Returns session token (JWT)
5. Client stores in localStorage (Supabase SDK handles)

---

## Edge Functions

### 1. `secure-signup` (Public - verify_jwt: false)
- Server-side password breach checking
- User creation with auto-confirm
- Input validation and sanitization

### 2. `analyze-clinical-notes` (Protected - verify_jwt: true)
- AI-powered SOAP note generation
- Uses OpenAI API
- Sanitizes output with DOMPurify

### 3. `disclose` (Protected - verify_jwt: true)
- Handles 42 CFR Part 2 disclosure requests
- Validates consent and authorization
- Creates audit trail

---

## Storage Buckets

**clinical-documents** (Private)
- RLS policies control access
- Linked to conversation ownership
- Part 2 files require additional consent validation

---

## Proposed Solutions

### Fix #1: Restrict Program Metadata Visibility

```sql
-- Replace the overly permissive policy
DROP POLICY "Authenticated users can view their programs" ON programs;

-- New policy: Users can only see if they're members, not program details
CREATE POLICY "Users can check membership only"
ON programs FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  -- Non-admins can only see id, name (not is_part2, org_unit_code)
);

-- Alternative: Create a view for safe program data
CREATE VIEW public.program_memberships_safe AS
SELECT 
  p.id,
  p.name,
  upm.user_id,
  upm.role
FROM programs p
JOIN user_program_memberships upm ON p.id = upm.program_id;

-- Then add RLS on the view
ALTER VIEW program_memberships_safe OWNER TO authenticated;
```

### Fix #2: Audit Log Hardening

```sql
-- Add explicit deny for authenticated non-admins
CREATE POLICY "Non-admins cannot access audit logs"
ON audit_logs FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Service role insert should remain for edge functions
-- but verify edge functions properly set user_id
```

### Fix #3: Compliance Reports - Already Secure
No changes needed. The immutability policies prevent tampering.

---

## Testing Recommendations

1. **Test RLS with Different Roles**:
   ```sql
   -- As patient user
   SET LOCAL role = authenticated;
   SET LOCAL request.jwt.claims.sub = '<patient_user_id>';
   SELECT * FROM programs; -- Should fail or show limited data
   
   -- As admin
   SET LOCAL request.jwt.claims.sub = '<admin_user_id>';
   SELECT * FROM programs; -- Should succeed
   ```

2. **Test Edge Functions**:
   - Try signup with known breached password (e.g., "password123")
   - Verify HIBP API called and blocks signup
   - Check audit_logs for entries

3. **Verify Part 2 Access**:
   - Create Part 2 program
   - Create conversation linked to program
   - Test access as non-member → should deny
   - Test access as program member → should allow

---

## Next Steps for Codex

1. Review Finding #1 (programs visibility) - **PRIORITY**
2. Propose specific RLS policy changes
3. Create migration SQL for implementation
4. Review edge function audit_logs usage
5. Test proposed changes against sample data
