-- Fix 3: Audit Log Policy Consolidation & Defense-in-Depth
-- Consolidate audit log policies for clarity
DROP POLICY IF EXISTS "Block non-admin authenticated users from audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Deny anonymous access to audit logs" ON public.audit_logs;

-- Single clear policy: Only admins can read audit logs
CREATE POLICY "Only admins can read audit logs"
ON public.audit_logs
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Explicit anonymous denial for defense-in-depth on sensitive tables
CREATE POLICY "Deny anonymous access to audit logs"
ON public.audit_logs
FOR ALL TO anon
USING (false);

CREATE POLICY "Deny anonymous access to compliance reports"
ON public.compliance_reports
FOR ALL TO anon
USING (false);

CREATE POLICY "Deny anonymous access to user roles"
ON public.user_roles
FOR ALL TO anon
USING (false);

CREATE POLICY "Deny anonymous access to programs"
ON public.programs
FOR ALL TO anon
USING (false);

CREATE POLICY "Deny anonymous access to user program memberships"
ON public.user_program_memberships
FOR ALL TO anon
USING (false);

CREATE POLICY "Deny anonymous access to patient identity links"
ON public.patient_identity_links
FOR ALL TO anon
USING (false);

CREATE POLICY "Deny anonymous access to disclosure consents"
ON public.disclosure_consents
FOR ALL TO anon
USING (false);

CREATE POLICY "Deny anonymous access to part2 consents"
ON public.part2_consents
FOR ALL TO anon
USING (false);