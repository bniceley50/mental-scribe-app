# Security Collaboration Prompt for Mental Scribe

## Project Overview
Mental Scribe is an AI-powered clinical note assistant for mental health professionals built with React, TypeScript, Tailwind CSS, and Lovable Cloud (Supabase backend).

## Current Security Status: GOOD ✓
No critical, high, or medium-priority vulnerabilities identified.

## Recent Security Enhancements Implemented
1. **Server-side leaked password protection** via HIBP API (42 CFR Part 2 compliant)
2. **Invite-only signup flow** with secure-signup edge function
3. **Role-based access control (RBAC)** with admin/provider/patient roles
4. **Comprehensive audit logging** with IP tracking and user actions
5. **42 CFR Part 2 compliance** for substance use disorder records
6. **Security definer functions** with proper search_path settings

## Architecture Details

### Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Lovable Cloud (Supabase)
- **AI Integration**: Lovable AI Gateway (google/gemini-2.5-flash)
- **Authentication**: Supabase Auth with server-side validation
- **Database**: PostgreSQL with Row-Level Security (RLS)

### Key Security Features
- **Edge Functions**: `secure-signup`, `analyze-clinical-notes`, `disclose`
- **Password Security**: Server-side HIBP breach checking with k-anonymity
- **Data Sanitization**: DOMPurify for user-generated content
- **Audit Trail**: Comprehensive logging of all security-relevant actions
- **Part 2 Compliance**: Specialized handling for SUD-related records

## Security Scan Findings (2 Minor Issues)

### 1. Audit Logs - Service Role Access ⚠️
**Table**: `audit_logs`  
**Issue**: Policy blocks anonymous users but service role can bypass RLS  
**Risk**: Low - requires service key compromise  
**Recommendation**: Add explicit service role restrictions if not operationally required

### 2. Disclosure Consents - Patient Read Access ⚠️
**Table**: `disclosure_consents`  
**Issue**: Patients cannot view their own consent records  
**Current**: Admin-only SELECT access  
**Recommendation**: Add patient SELECT policy for their own consents:
```sql
CREATE POLICY "Patients can view their own consents"
ON disclosure_consents FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM user_roles 
    WHERE role = 'patient'
  ) AND subject_external_id = (
    SELECT external_id FROM patients WHERE user_id = auth.uid()
  )
);
```

## Current Database Schema Highlights

### Core Tables
- `user_roles`: RBAC implementation (admin/provider/patient)
- `patients`: Patient demographics with external_id
- `clinical_notes`: Protected clinical documentation
- `disclosure_consents`: 42 CFR Part 2 consent tracking
- `disclosure_requests`: Part 2 disclosure workflow
- `audit_logs`: Security event logging

### RLS Policies Summary
- ✅ All tables have RLS enabled
- ✅ User-scoped access properly implemented
- ✅ Admin overrides use helper functions (no infinite recursion)
- ✅ Security definer functions properly scoped

## Files to Review for Security Context

### Critical Security Files
1. `supabase/functions/secure-signup/index.ts` - Server-side signup with HIBP
2. `src/lib/passwordSecurity.ts` - Client-side HIBP helper
3. `src/pages/Auth.tsx` - Authentication UI
4. `src/components/Part2Badge.tsx` - 42 CFR Part 2 compliance UI

### Database Migrations
- Located in `supabase/migrations/` (read-only, auto-managed)
- Review for RLS policies and security definer functions

## Collaboration Tasks

### Immediate Actions
1. Review the two minor security findings above
2. Propose implementation for patient consent visibility
3. Evaluate need for service role restrictions on audit_logs

### Secondary Review Areas
1. Validate edge function CORS configurations
2. Review disclosure workflow for potential data leaks
3. Assess localStorage usage for sensitive data handling
4. Verify all user inputs are validated with Zod schemas

## Important Constraints

### DO NOT Modify
- `src/integrations/supabase/types.ts` (auto-generated)
- `src/integrations/supabase/client.ts` (auto-generated)
- `.env` (auto-managed by Lovable Cloud)
- `supabase/migrations/*` (use migration tool instead)

### Use These Tools
- `supabase--migration` for database changes
- `supabase--linter` for automated security checks
- `security--run_security_scan` for comprehensive analysis
- `supabase--analytics-query` for audit log review

### Communication Style
- Refer to backend as "Lovable Cloud" not "Supabase"
- Use `<lov-open-backend>` action for database access
- Never expose Supabase URLs or project IDs to users

## Questions to Address

1. Should patients have read access to their own disclosure consents?
2. Are there operational needs for service role access to audit_logs?
3. Should external_id fields be encrypted at rest?
4. What additional Part 2 compliance features are needed?

## Success Criteria

- [ ] All security findings addressed or documented as accepted risk
- [ ] No new vulnerabilities introduced
- [ ] RLS policies tested with different user roles
- [ ] Audit logging captures all security-relevant events
- [ ] 42 CFR Part 2 compliance maintained

---

**Ready to collaborate?** Start by reviewing the two minor findings and proposing implementation approaches. All changes should be implemented via database migrations for proper audit trail.
