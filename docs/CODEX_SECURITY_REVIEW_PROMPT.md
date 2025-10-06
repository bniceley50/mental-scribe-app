# Comprehensive Security Review Prompt for Codex

## Context
The mental-scribe-app is a HIPAA-compliant clinical documentation system handling Protected Health Information (PHI) and 42 CFR Part 2 protected substance use disorder records. An external security audit identified critical gaps that have been addressed. Your task is to verify the fixes and perform a comprehensive security code review.

## 1. Database Security: Row Level Security (RLS) Verification

### Task 1A: FORCE ROW LEVEL SECURITY
**Objective**: Verify that all PHI/sensitive tables use `FORCE ROW LEVEL SECURITY` to prevent service-role bypass.

**Tables to check**:
- `conversations`
- `messages`
- `uploaded_files`
- `patient_identity_links`
- `audit_logs`
- `part2_consents`
- `structured_notes`
- `clients`
- `recordings`
- `programs`
- `user_program_memberships`
- `user_roles`
- `compliance_reports`
- `disclosure_consents`
- `failed_login_attempts`
- `mfa_recovery_codes`
- `user_sessions`
- `patient_assignments`

**Verification commands**:
```bash
rg "FORCE ROW LEVEL SECURITY" supabase/migrations/
```

**Expected**: Each table should appear in migration files with `ALTER TABLE <table> FORCE ROW LEVEL SECURITY;`

**Review checklist**:
- [ ] All 18+ sensitive tables have FORCE RLS enabled
- [ ] No tables containing PHI are missing this protection
- [ ] Migration files contain the statement before or after `ENABLE ROW LEVEL SECURITY`

---

### Task 1B: SQL Function Syntax
**Objective**: Verify that all helper functions use proper dollar-quoted bodies, not malformed `AS 272` syntax.

**Verification commands**:
```bash
# Should return NO matches
rg "AS \d+;" supabase/migrations/

# Should return ONLY proper functions
rg "AS \$\$" supabase/migrations/
```

**Expected**: Zero matches for malformed syntax, all functions should use `AS $$ ... $$;`

**Functions to spot-check**:
- `has_role(_user_id uuid, _role app_role)`
- `is_clinical_staff(_user_id uuid, _program_id uuid)`
- `is_assigned_to_patient(_user_id uuid, _client_id uuid)`
- `has_active_part2_consent_for_conversation(_conversation_id uuid)`
- `derive_classification(_program_id uuid)`
- `sanitize_audit_metadata(meta jsonb)`
- `hash_external_id(raw_id text)`

**Review checklist**:
- [ ] All functions compile without errors
- [ ] Functions are marked `SECURITY DEFINER` where appropriate
- [ ] Functions use `SET search_path = public` to prevent search_path attacks
- [ ] No recursive RLS issues (functions don't query the table they protect)

---

### Task 1C: RLS Policy Completeness
**Objective**: Verify that every sensitive table has appropriate blocking policies and proper access control.

**Verification**: For each table, check:

1. **Anonymous blocking policy** (RESTRICTIVE):
```sql
CREATE POLICY "<table>_block_anon_all"
ON public.<table>
AS RESTRICTIVE
FOR ALL
TO public
USING (false)
WITH CHECK (false);
```

2. **Service role enforcement**:
```sql
CREATE POLICY "Service role must use RLS for <table>"
ON public.<table>
FOR ALL
USING (auth.uid() IS NOT NULL AND ...)
```

3. **Owner-based policies** for user data:
```sql
CREATE POLICY "Users can view their own <records>"
ON public.<table>
FOR SELECT
USING (auth.uid() = user_id);
```

4. **Part 2 protected data policies**:
```sql
CREATE POLICY "Part 2 <table> visible to clinical staff"
ON public.<table>
FOR SELECT
USING (
  (auth.uid() = user_id) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  (
    data_classification = 'part2_protected'::data_classification
    AND program_id IS NOT NULL
    AND is_clinical_staff(auth.uid(), program_id)
    AND client_id IS NOT NULL
    AND is_assigned_to_patient(auth.uid(), client_id)
    AND conversation_id IS NOT NULL
    AND has_active_part2_consent_for_conversation(conversation_id)
  )
);
```

**Review checklist**:
- [ ] All tables have anonymous blocking policies
- [ ] User-owned data uses `auth.uid() = user_id` checks
- [ ] Part 2 data requires: clinical staff + assignment + active consent
- [ ] Audit logs are admin-only SELECT, service-only INSERT, no UPDATE/DELETE
- [ ] No policies use wildcards or `true` without justification

---

## 2. Client-Side Storage Security

### Task 2A: Session Storage for Draft Messages
**Objective**: Verify that chat drafts use `sessionStorage` instead of `localStorage` to prevent PHI persistence across sessions.

**Verification commands**:
```bash
rg "clinicalai_draft" src/components/ChatInterface.tsx
rg "localStorage" src/components/ChatInterface.tsx
rg "sessionStorage" src/components/ChatInterface.tsx
```

**Expected**:
- `clinicalai_draft` should ONLY appear with `sessionStorage`
- No `localStorage.setItem("clinicalai_draft", ...)` calls
- All reads use `sessionStorage.getItem("clinicalai_draft")`

**Review checklist**:
- [ ] Drafts use `sessionStorage` exclusively
- [ ] Drafts are cleared on send/discard
- [ ] No PHI leaks to `localStorage`

---

### Task 2B: Auth Token Storage
**Objective**: Verify that Supabase auth tokens use a custom `sessionStorage` adapter instead of default `localStorage`.

**Verification commands**:
```bash
rg "sessionStorageAdapter" src/integrations/supabase/client.ts
rg "storage:" src/integrations/supabase/client.ts
```

**Expected**:
```typescript
const sessionStorageAdapter = {
  getItem: (key: string) => sessionStorage.getItem(key),
  setItem: (key: string, value: string) => sessionStorage.setItem(key, value),
  removeItem: (key: string) => sessionStorage.removeItem(key),
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: sessionStorageAdapter,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

**Review checklist**:
- [ ] Auth storage uses `sessionStorageAdapter`
- [ ] Code comment explains security rationale
- [ ] No `localStorage` references in client.ts

---

## 3. Edge Function Security

### Task 3A: Content Security Policy (CSP) Headers
**Objective**: Verify that all edge functions include CSP headers to mitigate XSS/injection attacks.

**Verification commands**:
```bash
rg "Content-Security-Policy" supabase/functions/
```

**Expected**: CSP headers in:
- `supabase/functions/secure-signup/index.ts`
- `supabase/functions/disclose/index.ts`
- `supabase/functions/realtime-voice/index.ts`
- `supabase/functions/analyze-clinical-notes/index.ts`

**Required CSP directive**:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; object-src 'none';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};
```

**Review checklist**:
- [ ] All 4 functions have CSP headers
- [ ] CSP uses restrictive `default-src 'self'`
- [ ] Additional hardening headers present (X-Frame-Options, etc.)
- [ ] CORS headers properly configured

---

### Task 3B: HaveIBeenPwned (HIBP) Integration
**Objective**: Verify that `secure-signup` implements server-side password breach checking with fail-closed semantics.

**Verification commands**:
```bash
rg "pwnedpasswords" supabase/functions/
rg "isPasswordLeaked" supabase/functions/secure-signup/
```

**Expected implementation**:
```typescript
async function isPasswordLeaked(password: string): Promise<boolean> {
  try {
    // SHA-1 hash the password
    const hashBuffer = await crypto.subtle.digest('SHA-1', ...);
    const hashHex = ... .toUpperCase();
    
    // k-Anonymity: send only first 5 chars
    const prefix = hashHex.slice(0, 5);
    const suffix = hashHex.slice(5);
    
    // Query HIBP API
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' }
    });
    
    // CRITICAL: Fail closed on errors
    if (!response.ok) {
      console.error('HIBP API unavailable, failing closed');
      return true; // Treat as leaked
    }
    
    // Check if suffix matches
    const text = await response.text();
    return text.split('\n').some(line => line.split(':')[0] === suffix);
  } catch (error) {
    // CRITICAL: Fail closed on exceptions
    console.error('Password leak check failed:', error);
    return true;
  }
}
```

**Review checklist**:
- [ ] Function exists in `secure-signup/index.ts`
- [ ] Uses k-anonymity (only sends first 5 SHA-1 chars)
- [ ] **CRITICAL**: Fails closed on API errors (returns `true`)
- [ ] **CRITICAL**: Fails closed on exceptions (returns `true`)
- [ ] Includes `Add-Padding: true` header for privacy
- [ ] Called before `createUser()` in signup flow

---

### Task 3C: Rate Limiting & Account Lockout
**Objective**: Verify that edge functions check for account lockouts and rate limits.

**Verification**: Check `secure-signup/index.ts` and `src/pages/Auth.tsx`

**Expected in edge function**:
```typescript
// Check account lockout
const { data: isLocked } = await supabaseAdmin.rpc('is_account_locked', {
  _identifier: email
});

if (isLocked) {
  return new Response(
    JSON.stringify({ error: 'Account temporarily locked due to failed attempts' }),
    { status: 429, headers: corsHeaders }
  );
}
```

**Expected in Auth.tsx**:
```typescript
const handleSignIn = async () => {
  // Check lockout before attempting sign-in
  const { data: isLocked } = await supabase.rpc('is_account_locked', {
    _identifier: email
  });
  
  if (isLocked) {
    toast.error('Account locked. Try again later.');
    return;
  }
  
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error) {
    // Record failed attempt
    await supabase.rpc('record_failed_login', {
      _user_id: null,
      _email: email,
      _ip_address: '...'
    });
  } else {
    // Clear failed attempts on success
    await supabase.rpc('clear_failed_logins', { _identifier: email });
  }
};
```

**Review checklist**:
- [ ] `is_account_locked()` RPC exists and is SECURITY DEFINER
- [ ] Edge function checks lockout before signup
- [ ] Frontend checks lockout before sign-in
- [ ] Failed attempts recorded on auth failure
- [ ] Successful login clears failed attempts
- [ ] Lockout threshold is 5 attempts in 15 minutes

---

## 4. Input Validation & Sanitization

### Task 4A: Authentication Input Validation
**Objective**: Verify that email/password inputs are validated with Zod schemas.

**Verification**: Check `src/pages/Auth.tsx`

**Expected**:
```typescript
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
});
```

**Review checklist**:
- [ ] Email validated with `z.string().email()`
- [ ] Password requires 12+ characters
- [ ] Password requires uppercase, lowercase, number
- [ ] Schema used before API calls
- [ ] Validation errors shown to user

---

### Task 4B: Audit Log Metadata Sanitization
**Objective**: Verify that sensitive keys are stripped from audit log metadata.

**Verification**: Check for `sanitize_audit_metadata()` function

**Expected**:
```sql
CREATE OR REPLACE FUNCTION public.sanitize_audit_metadata(meta jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_object_agg(key, value),
    '{}'::jsonb
  )
  FROM jsonb_each(meta)
  WHERE key NOT IN (
    'password', 'token', 'api_key', 'secret', 'authorization',
    'access_token', 'refresh_token', 'session_token', 'bearer',
    'apikey', 'api-key', 'auth', 'credentials'
  )
$$;
```

**Review checklist**:
- [ ] Function exists and is SECURITY DEFINER
- [ ] Blocklist includes password, token, api_key, etc.
- [ ] Used in INSERT triggers on `audit_logs` table
- [ ] Returns empty object if all keys blocked

---

### Task 4C: External ID Hashing
**Objective**: Verify that external patient IDs are hashed using HMAC-SHA256.

**Expected**:
```sql
CREATE OR REPLACE FUNCTION public.hash_external_id(raw_id text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hmac_key text;
BEGIN
  hmac_key := COALESCE(
    current_setting('app.secrets.hmac_key', true),
    current_setting('app.settings.hmac_key', true),
    'CHANGE-THIS-IN-PRODUCTION-VIA-SUPABASE-SECRETS'
  );
  
  IF hmac_key = 'CHANGE-THIS-IN-PRODUCTION-VIA-SUPABASE-SECRETS' THEN
    RAISE EXCEPTION 'HMAC key not configured. Set HMAC_SECRET_KEY in Supabase secrets.';
  END IF;
  
  RETURN encode(
    hmac(raw_id::bytea, hmac_key::bytea, 'sha256'),
    'hex'
  );
END;
$$;
```

**Review checklist**:
- [ ] Function exists and uses HMAC-SHA256
- [ ] Prevents use of default key in production
- [ ] Uses Supabase secrets for key storage
- [ ] Applied to `client.external_id` field

---

## 5. Authentication & Authorization

### Task 5A: Multi-Factor Authentication (MFA)
**Objective**: Verify that MFA enrollment and verification are properly implemented.

**Verification**: Check `src/pages/SecuritySettings.tsx`

**Expected features**:
- QR code generation for TOTP enrollment
- Recovery code generation (10 codes, hashed with salt)
- Verification flow before enabling MFA
- Unenroll capability

**Review checklist**:
- [ ] `enrollMfa()` generates QR code and recovery codes
- [ ] Recovery codes hashed using `hash_recovery_code()` function
- [ ] Verification required before MFA activation
- [ ] `mfa_recovery_codes` table has RLS policies
- [ ] Recovery codes stored with salt for security

---

### Task 5B: Role-Based Access Control (RBAC)
**Objective**: Verify that roles are stored in a separate `user_roles` table (not on profiles) and checked via `has_role()` function.

**Expected schema**:
```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'treating_provider', 'care_team');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;
```

**Review checklist**:
- [ ] Roles stored in separate `user_roles` table
- [ ] **CRITICAL**: Roles NOT stored on `profiles` or `auth.users` table
- [ ] `has_role()` function is SECURITY DEFINER
- [ ] RLS policies use `has_role(auth.uid(), 'admin'::app_role)`
- [ ] No client-side role checks (localStorage/sessionStorage)

---

## 6. Data Classification & Part 2 Compliance

### Task 6A: Automatic Data Classification
**Objective**: Verify that records are automatically classified based on program Part 2 status.

**Expected triggers**:
```sql
CREATE TRIGGER classify_client_trigger
BEFORE INSERT OR UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.classify_client();

CREATE TRIGGER classify_conversation_trigger
BEFORE INSERT OR UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.classify_conversation();
```

**Review checklist**:
- [ ] `derive_classification(_program_id uuid)` function exists
- [ ] Returns `part2_protected` if program.is_part2 = true
- [ ] Returns `standard_phi` otherwise
- [ ] Triggers auto-classify clients, conversations, notes, recordings

---

### Task 6B: Part 2 Consent Enforcement
**Objective**: Verify that Part 2 protected data requires active consent before clinical staff access.

**Expected policy pattern**:
```sql
CREATE POLICY "Clinical staff view Part 2 conversations with assignment and consent"
ON public.conversations
FOR SELECT
USING (
  data_classification = 'part2_protected'::data_classification
  AND program_id IS NOT NULL
  AND client_id IS NOT NULL
  AND is_clinical_staff(auth.uid(), program_id)
  AND is_assigned_to_patient(auth.uid(), client_id)
  AND has_active_part2_consent_for_conversation(id)
);
```

**Review checklist**:
- [ ] `has_active_part2_consent_for_conversation()` is SECURITY DEFINER
- [ ] Checks: status = 'active', not revoked, not expired
- [ ] RLS policies enforce all 3 conditions: staff + assignment + consent
- [ ] Applies to: conversations, messages, structured_notes, recordings, uploaded_files
- [ ] Consent revocation blocks access immediately

---

## 7. Audit Logging

### Task 7A: Comprehensive Audit Trail
**Objective**: Verify that all sensitive operations are logged to `audit_logs`.

**Expected triggers**:
- `audit_part2_consent_changes()` - Logs consent grants/revocations
- `audit_clinical_conversation_access()` - Logs Part 2 conversation views
- `audit_patient_assignment_changes()` - Logs staff assignments
- `audit_rate_limit_changes()` - Logs rate limit modifications

**Review checklist**:
- [ ] All triggers insert to `audit_logs` with sanitized metadata
- [ ] Logs include: user_id, action, resource_type, resource_id, timestamp
- [ ] Part 2 logs include: data_classification, purpose, consent_id
- [ ] Audit logs are immutable (no UPDATE/DELETE policies)
- [ ] Only admins can SELECT audit logs

---

### Task 7B: Audit Log Immutability
**Objective**: Verify that audit logs cannot be modified or deleted.

**Expected policies**:
```sql
CREATE POLICY "audit_logs_immutable_updates"
ON public.audit_logs
FOR UPDATE
USING (false);

CREATE POLICY "audit_logs_admin_delete"
ON public.audit_logs
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
```

**Review checklist**:
- [ ] UPDATE policy blocks all modifications
- [ ] DELETE restricted to admins only
- [ ] INSERT allowed via service role (triggers)
- [ ] SELECT restricted to admins

---

## 8. Known False Positives

### Task 8A: Scanner Alerts to Ignore
**Objective**: Document and justify known false positives.

**False Positive 1: "Leaked Password Protection Disabled"**
- **Scanner**: Supabase linter
- **Reason**: Server-side HIBP check in `secure-signup` edge function provides stronger protection than Supabase's built-in feature
- **Verification**: Confirmed HIBP implementation in edge function

**False Positive 2: "Publicly Readable Tables"**
- **Scanner**: Automated security scanner
- **Tables flagged**: clients, conversations, messages, etc.
- **Reason**: Tables have RESTRICTIVE blocking policies (`USING (false)`) that deny all anonymous access
- **Verification**: All tables have `_block_anon_all` policies

**Review checklist**:
- [ ] False positives documented in `docs/SECURITY_HARDENING_VERIFICATION.md`
- [ ] Justifications include evidence (code snippets, policy names)
- [ ] No actual security gaps dismissed as "false positives"

---

## 9. Missing Security Hardening

### Critical Finding: rate_limit_configs Missing Anonymous Block

**Issue**: The `rate_limit_configs` table lacks a RESTRICTIVE policy to block anonymous access.

**Current state**:
```sql
-- Only this policy exists:
CREATE POLICY "Only admins can manage rate limit configs"
ON public.rate_limit_configs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

**Required fix**:
```sql
CREATE POLICY "rate_limit_configs_block_anon_all"
ON public.rate_limit_configs
AS RESTRICTIVE
FOR ALL
TO public
USING (false)
WITH CHECK (false);
```

**Review checklist**:
- [ ] Verify if this policy has been added
- [ ] Check if any other tables are missing anonymous blocking policies

---

## 10. Documentation Review

### Task 10A: Verify Documentation Exists
**Objective**: Confirm that security documentation is complete and accurate.

**Required documents**:
- `docs/SECURITY_HARDENING_VERIFICATION.md`
- `docs/SECURITY_IMPLEMENTATION.md`
- `docs/SECURITY_ENHANCEMENTS.md`
- `SECURITY.md`

**Verification**:
```bash
ls -la docs/SECURITY*.md
ls -la SECURITY.md
```

**Review checklist**:
- [ ] All documents exist
- [ ] Documents reference correct migration files
- [ ] Verification commands match actual implementation
- [ ] False positives documented with evidence
- [ ] Production checklist included

---

## Final Deliverables

After completing all tasks above, provide:

1. **Executive Summary**:
   - Overall security grade (A+, A, B, C, D, F)
   - Count of critical/high/medium/low findings
   - List of verified hardening measures
   - List of remaining vulnerabilities

2. **Detailed Findings Report**:
   - Each finding with: severity, description, affected files, remediation
   - Evidence (code snippets, grep outputs, policy names)
   - Status: Fixed / Not Fixed / False Positive

3. **Compliance Assessment**:
   - HIPAA alignment (PHI protection, audit trails, access control)
   - 42 CFR Part 2 alignment (consent management, disclosure logging)
   - OWASP Top 10 coverage

4. **Recommendations**:
   - Prioritized list of remaining security improvements
   - Timeline for addressing each item
   - Monitoring/maintenance suggestions

5. **Verification Commands Summary**:
   ```bash
   # Paste all verification commands used
   rg "FORCE ROW LEVEL SECURITY" supabase/migrations/
   rg "AS \d+" supabase/migrations/
   # ... etc
   ```

---

## Review Methodology

1. **Automated Checks**: Run all `rg` commands and document outputs
2. **Manual Code Review**: Read RLS policies, edge functions, triggers
3. **Logic Analysis**: Verify fail-closed semantics, recursive RLS prevention
4. **Compliance Mapping**: Trace data flows for HIPAA/Part 2 compliance
5. **Attack Surface Analysis**: Identify potential privilege escalation, injection, bypass vectors

---

## Success Criteria

This review is considered **PASSING** if:
- ✅ All 18+ sensitive tables have FORCE RLS
- ✅ Zero malformed SQL functions (AS \d+)
- ✅ All edge functions have CSP headers
- ✅ HIBP implemented with fail-closed semantics
- ✅ Client storage uses sessionStorage for PHI
- ✅ Auth tokens use sessionStorageAdapter
- ✅ All RLS policies include anonymous blocking
- ✅ Roles stored in separate user_roles table
- ✅ Part 2 data requires staff + assignment + consent
- ✅ Audit logs are immutable and admin-only
- ✅ MFA properly implemented
- ✅ Input validation with Zod schemas
- ✅ Metadata sanitization in audit logs
- ✅ Documentation complete and accurate

**FAILING** criteria:
- ❌ Any table with PHI missing FORCE RLS
- ❌ HIBP fails open on errors
- ❌ Roles stored on profiles table
- ❌ Client-side role checks (localStorage)
- ❌ Anonymous access to sensitive tables
- ❌ Recursive RLS issues in policies
- ❌ Missing CSP headers in edge functions
- ❌ PHI persisted in localStorage

---

## Output Format

```markdown
# Security Review Report: mental-scribe-app
**Date**: [YYYY-MM-DD]
**Reviewer**: Codex
**Grade**: [A+/A/B/C/D/F]

## Executive Summary
[3-5 sentence overview]

## Findings by Severity

### Critical (0)
[List or state "None found"]

### High (1)
- **H-1**: rate_limit_configs missing anonymous blocking policy
  - **Remediation**: Add RESTRICTIVE policy to block anonymous access

### Medium (0)
[List or state "None found"]

### Low (0)
[List or state "None found"]

## Verified Security Controls

### ✅ Database Security
- [X] FORCE ROW LEVEL SECURITY on 18 tables
- [X] SQL functions use proper syntax
- [X] RLS policies complete and correct

### ✅ Client Storage
- [X] Draft messages use sessionStorage
- [X] Auth tokens use sessionStorage adapter

### ✅ Edge Functions
- [X] CSP headers on all 4 functions
- [X] HIBP with fail-closed semantics
- [X] Rate limiting and account lockout

### ✅ Authentication & Authorization
- [X] MFA enrollment and verification
- [X] Roles in separate user_roles table
- [X] Input validation with Zod

### ✅ Data Classification
- [X] Automatic classification triggers
- [X] Part 2 consent enforcement

### ✅ Audit Logging
- [X] Comprehensive audit trail
- [X] Immutable audit logs

## Recommendations
1. **Immediate**: Add anonymous blocking policy to rate_limit_configs
2. **Short-term**: [Any other items]
3. **Long-term**: [Any other items]

## Compliance Status
- **HIPAA**: ✅ Compliant
- **42 CFR Part 2**: ✅ Compliant
- **OWASP Top 10**: ✅ Addressed

## Verification Evidence
[Paste relevant grep outputs, code snippets]

---
**Reviewed by**: Codex  
**Signature**: [Digital signature or timestamp]
```
