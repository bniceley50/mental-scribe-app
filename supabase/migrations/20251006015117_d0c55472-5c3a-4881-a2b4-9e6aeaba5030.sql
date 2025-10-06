-- Security hardening: Force RLS on all PHI and sensitive tables
-- This ensures service-role callers cannot bypass RLS policies

ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.messages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.structured_notes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.recordings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_files FORCE ROW LEVEL SECURITY;
ALTER TABLE public.patient_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.patient_identity_links FORCE ROW LEVEL SECURITY;
ALTER TABLE public.part2_consents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.disclosure_consents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_reports FORCE ROW LEVEL SECURITY;
ALTER TABLE public.programs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_program_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.failed_login_attempts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_recovery_codes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions FORCE ROW LEVEL SECURITY;

-- Tighten audit_logs: only admins can view/delete
DROP POLICY IF EXISTS "audit_logs_admin_select" ON public.audit_logs;
CREATE POLICY "audit_logs_admin_select"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "audit_logs_admin_delete" ON public.audit_logs;
CREATE POLICY "audit_logs_admin_delete"
ON public.audit_logs
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Harden user_sessions policies
DROP POLICY IF EXISTS "user_sessions_admin_all" ON public.user_sessions;
CREATE POLICY "user_sessions_admin_all"
ON public.user_sessions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "user_sessions_owner_delete" ON public.user_sessions;
CREATE POLICY "user_sessions_owner_delete"
ON public.user_sessions
FOR DELETE
USING (auth.uid() = user_id);