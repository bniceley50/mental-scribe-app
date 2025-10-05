-- Fix anonymous access policies - use RESTRICTIVE policies
-- Drop and recreate with correct RESTRICTIVE modifier

DROP POLICY IF EXISTS "Deny anonymous access to audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Deny anonymous access to compliance reports" ON public.compliance_reports;
DROP POLICY IF EXISTS "Deny anonymous access to user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Deny anonymous access to programs" ON public.programs;
DROP POLICY IF EXISTS "Deny anonymous access to user program memberships" ON public.user_program_memberships;
DROP POLICY IF EXISTS "Deny anonymous access to patient identity links" ON public.patient_identity_links;
DROP POLICY IF EXISTS "Deny anonymous access to disclosure consents" ON public.disclosure_consents;
DROP POLICY IF EXISTS "Deny anonymous access to part2 consents" ON public.part2_consents;

-- Create RESTRICTIVE policies to block anonymous access
CREATE POLICY "Block all anonymous access to audit logs"
ON public.audit_logs
AS RESTRICTIVE
FOR ALL TO anon
USING (false);

CREATE POLICY "Block all anonymous access to compliance reports"
ON public.compliance_reports
AS RESTRICTIVE
FOR ALL TO anon
USING (false);

CREATE POLICY "Block all anonymous access to user roles"
ON public.user_roles
AS RESTRICTIVE
FOR ALL TO anon
USING (false);

CREATE POLICY "Block all anonymous access to programs"
ON public.programs
AS RESTRICTIVE
FOR ALL TO anon
USING (false);

CREATE POLICY "Block all anonymous access to memberships"
ON public.user_program_memberships
AS RESTRICTIVE
FOR ALL TO anon
USING (false);

CREATE POLICY "Block all anonymous access to patient links"
ON public.patient_identity_links
AS RESTRICTIVE
FOR ALL TO anon
USING (false);

CREATE POLICY "Block all anonymous access to disclosure consents"
ON public.disclosure_consents
AS RESTRICTIVE
FOR ALL TO anon
USING (false);

CREATE POLICY "Block all anonymous access to part2 consents"
ON public.part2_consents
AS RESTRICTIVE
FOR ALL TO anon
USING (false);