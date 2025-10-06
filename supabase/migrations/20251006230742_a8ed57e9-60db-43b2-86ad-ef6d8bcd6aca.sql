-- CRITICAL SECURITY FIX: Remove audit_logs_admin_delete policy
-- HIPAA Requirement: Audit logs must be immutable
-- This policy allows admins to delete audit trails, violating compliance

DROP POLICY IF EXISTS "audit_logs_admin_delete" ON public.audit_logs;

-- Document this security fix
INSERT INTO public.security_fixes (
  finding,
  severity,
  remediation,
  fix_date,
  verified_by
) VALUES (
  'Audit Log Immutability Compromised - Admin DELETE Policy',
  'critical',
  'Removed audit_logs_admin_delete policy. Audit logs are now immutable (INSERT only by service role, SELECT by admins). This ensures compliance with HIPAA audit control requirements (45 CFR § 164.312(b)).',
  now(),
  NULL
);