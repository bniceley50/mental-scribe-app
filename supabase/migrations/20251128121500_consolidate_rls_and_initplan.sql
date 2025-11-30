-- Consolidate RLS policies and apply auth.* initplan-friendly patterns.
-- Targets: messages, conversations, uploaded_files, programs, audit_logs.

-- =========================
-- MESSAGES (merge/modernize)
-- =========================
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can delete messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Service role must use RLS for messages" ON public.messages;

CREATE POLICY "Users can view messages in their conversations"
ON public.messages
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND c.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can create messages in their conversations"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND c.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can delete messages in their conversations"
ON public.messages
FOR DELETE
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND c.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Service role must use RLS for messages"
ON public.messages
AS RESTRICTIVE
FOR ALL
TO service_role
USING (
  (SELECT auth.uid()) IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id 
      AND conversations.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id 
      AND conversations.user_id = (SELECT auth.uid())
  )
);

-- =========================
-- CONVERSATIONS (auth.* -> SELECT pattern)
-- =========================
DROP POLICY IF EXISTS "conversations_owner_select" ON public.conversations;
DROP POLICY IF EXISTS "conversations_clinical_staff_select_with_consent" ON public.conversations;
DROP POLICY IF EXISTS "Users can create their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.conversations;

CREATE POLICY "conversations_owner_select"
ON public.conversations
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create their own conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own conversations"
ON public.conversations
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "conversations_clinical_staff_select_with_consent"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  program_id IS NOT NULL
  AND client_id IS NOT NULL
  AND is_clinical_staff((SELECT auth.uid()), program_id)
  AND is_assigned_to_patient((SELECT auth.uid()), client_id)
  AND (
    data_classification = 'standard_phi'::data_classification
    OR (
      data_classification = 'part2_protected'::data_classification
      AND has_active_part2_consent_for_conversation(id)
    )
  )
);

-- =========================
-- UPLOADED FILES (auth.* -> SELECT pattern)
-- =========================
DROP POLICY IF EXISTS "uploaded_files_clinical_staff_part2" ON public.uploaded_files;
DROP POLICY IF EXISTS "Users can view files in their conversations" ON public.uploaded_files;
DROP POLICY IF EXISTS "Users can create files in their conversations" ON public.uploaded_files;
DROP POLICY IF EXISTS "Users can delete files in their conversations" ON public.uploaded_files;

CREATE POLICY "uploaded_files_clinical_staff_part2"
ON public.uploaded_files
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = uploaded_files.conversation_id
    AND (
      c.user_id = (SELECT auth.uid())
      OR has_role((SELECT auth.uid()), 'admin'::app_role)
      OR (
        c.program_id IS NOT NULL
        AND is_clinical_staff((SELECT auth.uid()), c.program_id)
        AND c.client_id IS NOT NULL
        AND is_assigned_to_patient((SELECT auth.uid()), c.client_id)
        AND (
          c.data_classification = 'standard_phi'::data_classification
          OR (
            c.data_classification = 'part2_protected'::data_classification
            AND has_active_part2_consent_for_conversation(c.id)
          )
        )
      )
    )
  )
);

CREATE POLICY "Users can create files in their conversations"
ON public.uploaded_files
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = uploaded_files.conversation_id
      AND c.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can delete files in their conversations"
ON public.uploaded_files
FOR DELETE
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = uploaded_files.conversation_id
      AND c.user_id = (SELECT auth.uid())
  )
);

-- =========================
-- PROGRAMS (merge duplicate SELECT, apply initplan pattern)
-- =========================
DROP POLICY IF EXISTS "Authenticated users can view their programs" ON public.programs;
DROP POLICY IF EXISTS "Authenticated users can view programs" ON public.programs;
DROP POLICY IF EXISTS "Anyone can view programs" ON public.programs;
DROP POLICY IF EXISTS "Only admins can manage programs" ON public.programs;
DROP POLICY IF EXISTS "Members can view programs" ON public.programs;
DROP POLICY IF EXISTS "Admins manage programs" ON public.programs;

CREATE POLICY "Members can view programs"
ON public.programs
FOR SELECT
TO authenticated
USING (
  has_role((SELECT auth.uid()), 'admin'::app_role)
  OR is_program_member((SELECT auth.uid()), id)
);

CREATE POLICY "Admins manage programs"
ON public.programs
FOR ALL
TO authenticated
USING (has_role((SELECT auth.uid()), 'admin'::app_role))
WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));

-- =========================
-- AUDIT LOGS (initplan pattern + dedupe)
-- =========================
DROP POLICY IF EXISTS "Admins can read all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Service role can insert audit logs with validation" ON public.audit_logs;
DROP POLICY IF EXISTS "Only admins can delete audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Absolute block for anonymous access to audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Service role audit access requires admin" ON public.audit_logs;

CREATE POLICY "Admins can read all audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND has_role((SELECT auth.uid()), 'admin'::app_role)
);

CREATE POLICY "Service role can insert audit logs with validation"
ON public.audit_logs
FOR INSERT
TO service_role
WITH CHECK (
  action IS NOT NULL 
  AND resource_type IS NOT NULL 
  AND user_id IS NOT NULL 
  AND (metadata IS NULL OR jsonb_typeof(metadata) = 'object'::text)
);

CREATE POLICY "Only admins can delete audit logs"
ON public.audit_logs
FOR DELETE
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND has_role((SELECT auth.uid()), 'admin'::app_role)
);

CREATE POLICY "Service role audit access requires admin"
ON public.audit_logs
AS RESTRICTIVE
FOR SELECT
TO service_role
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND has_role((SELECT auth.uid()), 'admin'::app_role)
);

CREATE POLICY "Absolute block for anonymous access to audit logs"
ON public.audit_logs
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);
