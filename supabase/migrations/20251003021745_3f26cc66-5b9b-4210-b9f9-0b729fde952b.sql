-- Security Hardening Migration for Part 2 Compliance and Data Integrity

-- 1. Part 2 Consents: Prevent deletion (consents should be revoked via status update, not deleted)
CREATE POLICY "Part 2 consents cannot be deleted"
ON public.part2_consents
FOR DELETE
TO authenticated
USING (false);

-- 2. Messages: Prevent updates (messages are immutable records)
CREATE POLICY "Messages cannot be updated"
ON public.messages
FOR UPDATE
TO authenticated
USING (false);

-- 3. Uploaded Files: Prevent updates (file records are immutable)
CREATE POLICY "Uploaded files cannot be updated"
ON public.uploaded_files
FOR UPDATE
TO authenticated
USING (false);

-- 4. Compliance Reports: Add missing UPDATE and DELETE policies
CREATE POLICY "Compliance reports cannot be updated"
ON public.compliance_reports
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "Compliance reports cannot be deleted"
ON public.compliance_reports
FOR DELETE
TO authenticated
USING (false);

-- 5. Audit Logs: Remove conflicting policy and ensure proper access control
DROP POLICY IF EXISTS "Prevent public access to audit logs" ON public.audit_logs;

-- The existing "Admins can view all audit logs" policy is sufficient for SELECT
-- The "Service role can insert audit logs" policy is sufficient for INSERT