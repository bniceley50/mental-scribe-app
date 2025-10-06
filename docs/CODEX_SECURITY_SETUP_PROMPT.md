# Codex Security Setup & Verification Prompt

## Context
Mental Scribe is a HIPAA-compliant clinical documentation system for mental health professionals. The application requires strict security controls including:
- Row Level Security (RLS) on all PHI tables
- Comprehensive audit logging
- Server-side password breach checking
- 42 CFR Part 2 compliance for substance abuse treatment records
- Secure authentication with MFA support

## Current Security Status

### ✗ Failed Checks from `node scripts/security-check.js`

1. **Missing Environment Variables**
   - `VITE_SUPABASE_URL` is missing
   - `VITE_SUPABASE_PUBLISHABLE_KEY` is missing
   - **Impact**: Cannot connect to backend, RLS checks fail

2. **Unverified Secrets**
   - `OPENAI_API_KEY` - Required for AI clinical note analysis
   - `HMAC_SECRET_KEY` - Required for external patient ID hashing
   - **Impact**: Cannot verify these exist in Lovable Cloud

3. **RLS Verification Blocked**
   - Cannot check if RLS is properly enabled on all tables
   - Cannot verify policy implementation
   - **Impact**: Potential data exposure risk

4. **Audit Triggers Unverified**
   - Cannot confirm audit triggers exist on PHI tables
   - Expected tables: `messages`, `uploaded_files`, `structured_notes`, `recordings`, `part2_consents`
   - **Impact**: PHI modifications may not be logged

## Your Task

### Phase 1: Environment Setup
1. **Create `.env` file** in project root with:
   ```
   VITE_SUPABASE_URL=https://bmtzgeffbzmcwmnprxmx.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtdHpnZWZmYnptY3dtbnByeG14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjEwMDYsImV4cCI6MjA3NDk5NzAwNn0.xEwOe1w7BaNhr6iCcHz14endnf1_tm79HeSdMZTZpz0
   ```

2. **Verify secrets in Lovable Cloud**:
   - Open backend dashboard
   - Navigate to Secrets tab
   - Confirm `OPENAI_API_KEY` exists (or guide user to add it)
   - Confirm `HMAC_SECRET_KEY` exists (or guide user to add it)

### Phase 2: Database Security Verification

Run the following queries in Lovable Cloud SQL editor to verify security implementation:

#### 2.1 Check RLS is Enabled
```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN (
    'messages', 'uploaded_files', 'structured_notes', 
    'recordings', 'part2_consents', 'clients', 
    'clinical_notes', 'disclosure_consents', 'user_roles',
    'user_program_memberships', 'programs', 'audit_logs'
  )
ORDER BY tablename;
```
**Expected**: All tables should have `rowsecurity = true`

#### 2.2 Verify RLS Policies Exist
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```
**Expected**: Each table should have policies for SELECT, INSERT, UPDATE, DELETE operations

#### 2.3 Check Audit Triggers
```sql
SELECT
  c.relname AS table_name,
  COUNT(t.tgname) AS trigger_count,
  array_agg(t.tgname) AS triggers
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND c.relname IN ('messages', 'uploaded_files', 'structured_notes', 'recordings', 'part2_consents')
  AND t.tgname LIKE 'audit_%'
  AND NOT t.tgisinternal
GROUP BY c.relname
ORDER BY c.relname;
```
**Expected**: At least 1 audit trigger per PHI table

#### 2.4 Verify Security Functions
```sql
-- Check has_role function
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'has_role';

-- Check is_clinical_staff function
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'is_clinical_staff';

-- Check derive_classification function
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'derive_classification';
```
**Expected**: All three security functions should exist

### Phase 3: Critical Security Issues

Review and address findings from `SECURITY_CONTEXT_EXPORT.md`:

1. **ERROR: Healthcare program information visible to all program members**
   - Table: `programs`
   - Issue: Current policy allows any program member to see all program metadata
   - Fix: Implement role-based access (only admins should see full program details)

2. **WARN: Audit logs expose user activity to anonymous visitors**
   - Table: `audit_logs`
   - Issue: No RLS policy blocks anonymous access
   - Fix: Add policy requiring authentication

3. **WARN: Compliance reports could be accessed by unauthorized staff**
   - Verify only authorized roles can access sensitive reports

### Phase 4: Testing Checklist

After fixes, verify:
- [ ] Run `node scripts/security-check.js` - all checks pass
- [ ] Test user signup/login flow
- [ ] Test client creation with `external_id` (verifies HMAC_SECRET_KEY)
- [ ] Test Part 2 consent workflow
- [ ] Verify RLS blocks cross-user data access
- [ ] Verify audit logs capture all PHI operations

## Reference Documentation

- `docs/CODEX_SECURITY_REVIEW_PROMPT.md` - Comprehensive security review requirements
- `docs/SECURITY_CONTEXT_EXPORT.md` - Current security findings and recommendations
- `docs/CODEX_SECURITY_COLLABORATION.md` - Security collaboration guide
- `docs/SECURITY_IMPLEMENTATION.md` - Implementation details
- `docs/SECURITY_HARDENING_VERIFICATION.md` - Verification procedures

## Success Criteria

✅ All environment variables configured
✅ All secrets verified in Lovable Cloud
✅ RLS enabled on all sensitive tables with proper policies
✅ Audit triggers confirmed on all PHI tables
✅ Security functions (`has_role`, `is_clinical_staff`, `derive_classification`) exist and work correctly
✅ No CRITICAL or HIGH security findings remain
✅ `node scripts/security-check.js` passes all checks
✅ Application functions correctly with authentication and authorization

## Notes

- This project uses **Lovable Cloud** (Supabase backend)
- Never mention "Supabase" to users - always say "Lovable Cloud" or "backend"
- All database changes must use the migration tool
- HIPAA and 42 CFR Part 2 compliance is mandatory
- Security is non-negotiable - when in doubt, be more restrictive
