-- CRITICAL SECURITY FIX: Block all anonymous/public access to PHI tables
-- Explicitly deny access to the 'anon' role (unauthenticated users)

-- Block anonymous access to clients table (contains highly sensitive PHI)
CREATE POLICY "clients_block_anon_all"
ON public.clients
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to audit_logs table (contains security-sensitive data)
CREATE POLICY "audit_logs_block_anon_all"
ON public.audit_logs
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to conversations table (contains therapy session data)
CREATE POLICY "conversations_block_anon_all"
ON public.conversations
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to messages table (contains clinical content)
CREATE POLICY "messages_block_anon_all"
ON public.messages
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to structured_notes table (contains clinical notes)
CREATE POLICY "structured_notes_block_anon_all"
ON public.structured_notes
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to recordings table (contains PHI audio recordings)
CREATE POLICY "recordings_block_anon_all"
ON public.recordings
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to uploaded_files table (may contain PHI documents)
CREATE POLICY "uploaded_files_block_anon_all"
ON public.uploaded_files
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to patient_assignments table
CREATE POLICY "patient_assignments_block_anon_all"
ON public.patient_assignments
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to patient_identity_links table
CREATE POLICY "patient_identity_links_block_anon_all"
ON public.patient_identity_links
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to part2_consents table
CREATE POLICY "part2_consents_block_anon_all"
ON public.part2_consents
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to disclosure_consents table
CREATE POLICY "disclosure_consents_block_anon_all"
ON public.disclosure_consents
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to compliance_reports table
CREATE POLICY "compliance_reports_block_anon_all"
ON public.compliance_reports
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to programs table
CREATE POLICY "programs_block_anon_all"
ON public.programs
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to user_program_memberships table
CREATE POLICY "user_program_memberships_block_anon_all"
ON public.user_program_memberships
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to user_roles table
CREATE POLICY "user_roles_block_anon_all"
ON public.user_roles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to failed_login_attempts table
CREATE POLICY "failed_login_attempts_block_anon_all"
ON public.failed_login_attempts
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to mfa_recovery_codes table
CREATE POLICY "mfa_recovery_codes_block_anon_all"
ON public.mfa_recovery_codes
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to user_sessions table
CREATE POLICY "user_sessions_block_anon_all"
ON public.user_sessions
FOR ALL
TO anon
USING (false)
WITH CHECK (false);