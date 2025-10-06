-- Security hardening: Force RLS on sensitive tables and tighten audit_logs and user_sessions policies

-- 1) Force Row Level Security on all PHI and sensitive tables
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'public.clients',
    'public.audit_logs',
    'public.conversations',
    'public.messages',
    'public.structured_notes',
    'public.recordings',
    'public.uploaded_files',
    'public.patient_assignments',
    'public.patient_identity_links',
    'public.part2_consents',
    'public.disclosure_consents',
    'public.compliance_reports',
    'public.programs',
    'public.user_program_memberships',
    'public.user_roles',
    'public.failed_login_attempts',
    'public.mfa_recovery_codes',
    'public.user_sessions'
  ]) LOOP
    EXECUTE 'ALTER TABLE ' || t || ' FORCE ROW LEVEL SECURITY';
  END LOOP;
END $$;

-- 2) Tighten audit_logs access: restrict SELECT to admins only; keep service inserts
DROP POLICY IF EXISTS "audit_logs_block_anonymous_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_block_anonymous_update" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_block_anonymous_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_block_anonymous_delete" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_clinical_staff_select" ON public.audit_logs;

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

-- 3) Harden user_sessions policies
DROP POLICY IF EXISTS "Service role can manage sessions" ON public.user_sessions;
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