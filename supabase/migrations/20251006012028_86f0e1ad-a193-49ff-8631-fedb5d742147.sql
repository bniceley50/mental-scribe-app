-- CRITICAL SECURITY FIX: Force RLS on all PHI-containing tables
-- This prevents service-role bypass and ensures all queries go through RLS policies

-- Force RLS on conversations (contains PHI clinical discussions)
ALTER TABLE public.conversations FORCE ROW LEVEL SECURITY;

-- Force RLS on messages (contains PHI clinical content)
ALTER TABLE public.messages FORCE ROW LEVEL SECURITY;

-- Force RLS on uploaded_files (may contain PHI documents)  
ALTER TABLE public.uploaded_files FORCE ROW LEVEL SECURITY;

-- Force RLS on audit_logs (contains PHI access records)
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- Force RLS on patient_identity_links (contains PHI patient identifiers)
ALTER TABLE public.patient_identity_links FORCE ROW LEVEL SECURITY;

-- Force RLS on disclosure_consents (contains Part 2 consent records)
ALTER TABLE public.disclosure_consents FORCE ROW LEVEL SECURITY;

-- Force RLS on part2_consents (contains Part 2 consent metadata)
ALTER TABLE public.part2_consents FORCE ROW LEVEL SECURITY;

-- Force RLS on structured_notes (contains PHI clinical notes)
ALTER TABLE public.structured_notes FORCE ROW LEVEL SECURITY;

-- Force RLS on clients (contains PHI patient demographics)
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;

-- Force RLS on recordings (contains PHI audio data)
ALTER TABLE public.recordings FORCE ROW LEVEL SECURITY;

-- Force RLS on patient_assignments (contains PHI assignment records)
ALTER TABLE public.patient_assignments FORCE ROW LEVEL SECURITY;

-- Force RLS on compliance_reports (contains aggregated PHI)
ALTER TABLE public.compliance_reports FORCE ROW LEVEL SECURITY;

-- Force RLS on programs (contains treatment program data)
ALTER TABLE public.programs FORCE ROW LEVEL SECURITY;

-- Force RLS on user_program_memberships (contains clinical staff assignments)
ALTER TABLE public.user_program_memberships FORCE ROW LEVEL SECURITY;

-- Force RLS on user_roles (contains authorization data)
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;

-- Force RLS on failed_login_attempts (contains security audit data)
ALTER TABLE public.failed_login_attempts FORCE ROW LEVEL SECURITY;

-- Force RLS on mfa_recovery_codes (contains authentication secrets)
ALTER TABLE public.mfa_recovery_codes FORCE ROW LEVEL SECURITY;

-- Force RLS on rate_limits (contains security control data)
ALTER TABLE public.rate_limits FORCE ROW LEVEL SECURITY;

-- Force RLS on user_sessions (contains session tokens)
ALTER TABLE public.user_sessions FORCE ROW LEVEL SECURITY;