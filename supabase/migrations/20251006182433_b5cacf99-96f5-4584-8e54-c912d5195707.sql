-- CRITICAL SECURITY FIX: Convert blocking policies from PERMISSIVE to RESTRICTIVE
-- PERMISSIVE policies with USING (false) don't actually block - they just don't grant
-- RESTRICTIVE policies with USING (false) create absolute blocks that override all other policies

-- 1. DROP existing broken PERMISSIVE blocking policies
DROP POLICY IF EXISTS "clients_block_anon_all" ON public.clients;
DROP POLICY IF EXISTS "conversations_block_anon_all" ON public.conversations;
DROP POLICY IF EXISTS "messages_block_anon_all" ON public.messages;
DROP POLICY IF EXISTS "structured_notes_block_anon_all" ON public.structured_notes;
DROP POLICY IF EXISTS "uploaded_files_block_anon_all" ON public.uploaded_files;
DROP POLICY IF EXISTS "part2_consents_block_anon_all" ON public.part2_consents;
DROP POLICY IF EXISTS "audit_logs_block_anon_all" ON public.audit_logs;
DROP POLICY IF EXISTS "user_roles_block_anon_all" ON public.user_roles;
DROP POLICY IF EXISTS "user_sessions_block_anon_all" ON public.user_sessions;
DROP POLICY IF EXISTS "programs_block_anon_all" ON public.programs;
DROP POLICY IF EXISTS "user_program_memberships_block_anon_all" ON public.user_program_memberships;
DROP POLICY IF EXISTS "patient_assignments_block_anon_all" ON public.patient_assignments;
DROP POLICY IF EXISTS "patient_identity_links_block_anon_all" ON public.patient_identity_links;
DROP POLICY IF EXISTS "disclosure_consents_block_anon_all" ON public.disclosure_consents;
DROP POLICY IF EXISTS "failed_login_attempts_block_anon_all" ON public.failed_login_attempts;
DROP POLICY IF EXISTS "mfa_recovery_codes_block_anon_all" ON public.mfa_recovery_codes;
DROP POLICY IF EXISTS "compliance_reports_block_anon_all" ON public.compliance_reports;
DROP POLICY IF EXISTS "recordings_block_anon_all" ON public.recordings;

-- 2. CREATE RESTRICTIVE blocking policies that ACTUALLY block anonymous access
-- These apply to both 'public' and 'anon' roles for complete coverage

CREATE POLICY "clients_block_anon_all"
ON public.clients
AS RESTRICTIVE
FOR ALL
TO public, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "conversations_block_anon_all"
ON public.conversations
AS RESTRICTIVE
FOR ALL
TO public, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "messages_block_anon_all"
ON public.messages
AS RESTRICTIVE
FOR ALL
TO public, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "structured_notes_block_anon_all"
ON public.structured_notes
AS RESTRICTIVE
FOR ALL
TO public, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "uploaded_files_block_anon_all"
ON public.uploaded_files
AS RESTRICTIVE
FOR ALL
TO public, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "part2_consents_block_anon_all"
ON public.part2_consents
AS RESTRICTIVE
FOR ALL
TO public, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "audit_logs_block_anon_all"
ON public.audit_logs
AS RESTRICTIVE
FOR ALL
TO public, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "user_roles_block_anon_all"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO public, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "user_sessions_block_anon_all"
ON public.user_sessions
AS RESTRICTIVE
FOR ALL
TO public, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "programs_block_anon_all"
ON public.programs
AS RESTRICTIVE
FOR ALL
TO public, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "user_program_memberships_block_anon_all"
ON public.user_program_memberships
AS RESTRICTIVE
FOR ALL
TO public, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "patient_assignments_block_anon_all"
ON public.patient_assignments
AS RESTRICTIVE
FOR ALL
TO public, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "patient_identity_links_block_anon_all"
ON public.patient_identity_links
AS RESTRICTIVE
FOR ALL
TO public, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "disclosure_consents_block_anon_all"
ON public.disclosure_consents
AS RESTRICTIVE
FOR ALL
TO public, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "failed_login_attempts_block_anon_all"
ON public.failed_login_attempts
AS RESTRICTIVE
FOR ALL
TO public, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "mfa_recovery_codes_block_anon_all"
ON public.mfa_recovery_codes
AS RESTRICTIVE
FOR ALL
TO public, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "compliance_reports_block_anon_all"
ON public.compliance_reports
AS RESTRICTIVE
FOR ALL
TO public, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "recordings_block_anon_all"
ON public.recordings
AS RESTRICTIVE
FOR ALL
TO public, anon
USING (false)
WITH CHECK (false);

-- 3. Verify FORCE ROW LEVEL SECURITY is enabled on all PHI tables
-- This prevents service role from bypassing RLS
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;
ALTER TABLE public.conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.messages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.structured_notes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_files FORCE ROW LEVEL SECURITY;
ALTER TABLE public.part2_consents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.programs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_program_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE public.patient_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.patient_identity_links FORCE ROW LEVEL SECURITY;
ALTER TABLE public.disclosure_consents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.failed_login_attempts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_recovery_codes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_reports FORCE ROW LEVEL SECURITY;
ALTER TABLE public.recordings FORCE ROW LEVEL SECURITY;