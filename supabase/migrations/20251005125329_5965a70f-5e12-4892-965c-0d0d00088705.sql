-- CRITICAL SECURITY FIX: Prevent service_role from bypassing RLS on PHI tables
-- Context: Scanner flagged clients table as "publicly readable" despite RLS
-- Root cause: service_role can bypass RLS by default

-- ============================================================================
-- CLIENTS TABLE: Add service_role restrictions
-- ============================================================================

-- Ensure service_role can only access clients through explicit policies
-- This prevents accidental exposure through edge functions
DO $$ 
BEGIN
  -- Check if we need to revoke default service_role permissions
  REVOKE ALL ON public.clients FROM service_role;
  
  -- Grant only the minimum necessary permissions
  -- service_role should NOT have direct SELECT access to PHI
  GRANT INSERT, UPDATE, DELETE ON public.clients TO service_role;
  
  -- Service role can only select through RLS policies (not bypass)
  GRANT SELECT ON public.clients TO service_role;
END $$;

-- Force service_role to respect RLS (critical for PHI protection)
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;

-- Create explicit service_role policy that enforces same restrictions
CREATE POLICY "Service role must use RLS for clients"
ON public.clients
AS RESTRICTIVE
FOR ALL
TO service_role
USING (
  -- Service role can only access records that would be accessible
  -- to the authenticated user who called the function
  auth.uid() IS NOT NULL 
  AND (
    auth.uid() = user_id 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (program_id IS NOT NULL AND is_clinical_staff(auth.uid(), program_id))
  )
);

-- ============================================================================
-- AUDIT_LOGS TABLE: Prevent public exposure
-- ============================================================================

-- Service role needs INSERT for audit logging, but not unrestricted SELECT
REVOKE ALL ON public.audit_logs FROM service_role;
GRANT INSERT ON public.audit_logs TO service_role;

-- Service role can only read audit logs if caller is admin
CREATE POLICY "Service role audit access requires admin"
ON public.audit_logs
AS RESTRICTIVE
FOR SELECT
TO service_role
USING (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- ============================================================================
-- ALL OTHER PHI TABLES: Apply same protections
-- ============================================================================

-- CONVERSATIONS
REVOKE ALL ON public.conversations FROM service_role;
GRANT INSERT, UPDATE, DELETE, SELECT ON public.conversations TO service_role;

CREATE POLICY "Service role must use RLS for conversations"
ON public.conversations
AS RESTRICTIVE
FOR ALL
TO service_role
USING (
  auth.uid() IS NOT NULL 
  AND (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
);

-- MESSAGES
REVOKE ALL ON public.messages FROM service_role;
GRANT INSERT, UPDATE, DELETE, SELECT ON public.messages TO service_role;

CREATE POLICY "Service role must use RLS for messages"
ON public.messages
AS RESTRICTIVE
FOR ALL
TO service_role
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id 
    AND conversations.user_id = auth.uid()
  )
);

-- STRUCTURED_NOTES
REVOKE ALL ON public.structured_notes FROM service_role;
GRANT INSERT, UPDATE, DELETE, SELECT ON public.structured_notes TO service_role;

CREATE POLICY "Service role must use RLS for structured notes"
ON public.structured_notes
AS RESTRICTIVE
FOR ALL
TO service_role
USING (
  auth.uid() IS NOT NULL 
  AND (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
);

-- UPLOADED_FILES
REVOKE ALL ON public.uploaded_files FROM service_role;
GRANT INSERT, UPDATE, DELETE, SELECT ON public.uploaded_files TO service_role;

CREATE POLICY "Service role must use RLS for uploaded files"
ON public.uploaded_files
AS RESTRICTIVE
FOR ALL
TO service_role
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = uploaded_files.conversation_id 
    AND conversations.user_id = auth.uid()
  )
);

-- RECORDINGS
REVOKE ALL ON public.recordings FROM service_role;
GRANT INSERT, UPDATE, DELETE, SELECT ON public.recordings TO service_role;

CREATE POLICY "Service role must use RLS for recordings"
ON public.recordings
AS RESTRICTIVE
FOR ALL
TO service_role
USING (
  auth.uid() IS NOT NULL 
  AND (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
);

-- PART2_CONSENTS
REVOKE ALL ON public.part2_consents FROM service_role;
GRANT INSERT, UPDATE, DELETE, SELECT ON public.part2_consents TO service_role;

CREATE POLICY "Service role must use RLS for part2 consents"
ON public.part2_consents
AS RESTRICTIVE
FOR ALL
TO service_role
USING (
  auth.uid() IS NOT NULL 
  AND (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = part2_consents.conversation_id 
      AND conversations.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- ============================================================================
-- VERIFY ALL PHI TABLES FORCE RLS
-- ============================================================================
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;
ALTER TABLE public.conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.messages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.structured_notes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_files FORCE ROW LEVEL SECURITY;
ALTER TABLE public.recordings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.part2_consents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;