-- ============================================================================
-- CRITICAL: Tighten RLS policies with program/consent/assignment enforcement
-- ============================================================================
-- Addresses: "RLS policies ignore program membership and Part 2 consent"
-- All PHI tables now require proper assignment, clinical staff verification,
-- and Part 2 consent checks before granting access
-- ============================================================================

-- ============== CLIENTS TABLE ==============
-- Drop overly permissive policies
DROP POLICY IF EXISTS "clients_clinical_staff_select" ON public.clients;

-- Clinical staff can ONLY see clients they are assigned to within their program
CREATE POLICY "clients_clinical_staff_select_assigned"
ON public.clients
FOR SELECT
TO authenticated
USING (
  program_id IS NOT NULL
  AND is_clinical_staff(auth.uid(), program_id)
  AND is_assigned_to_patient(auth.uid(), id)
);

-- ============== CONVERSATIONS TABLE ==============
-- Drop weak owner-only policies
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Clinical staff view standard conversations with assignment" ON public.conversations;

-- Owners always see their own
CREATE POLICY "conversations_owner_select"
ON public.conversations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Clinical staff can see IF assigned to client AND proper consent for Part 2
CREATE POLICY "conversations_clinical_staff_select_with_consent"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  program_id IS NOT NULL
  AND client_id IS NOT NULL
  AND is_clinical_staff(auth.uid(), program_id)
  AND is_assigned_to_patient(auth.uid(), client_id)
  AND (
    -- Standard PHI: assignment is enough
    data_classification = 'standard_phi'::data_classification
    OR
    -- Part 2: MUST have active consent
    (
      data_classification = 'part2_protected'::data_classification
      AND has_active_part2_consent_for_conversation(id)
    )
  )
);

-- ============== STRUCTURED_NOTES TABLE ==============
DROP POLICY IF EXISTS "Part 2 notes visible to clinical staff" ON public.structured_notes;

CREATE POLICY "structured_notes_clinical_staff_part2"
ON public.structured_notes
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    program_id IS NOT NULL
    AND client_id IS NOT NULL
    AND conversation_id IS NOT NULL
    AND is_clinical_staff(auth.uid(), program_id)
    AND is_assigned_to_patient(auth.uid(), client_id)
    AND (
      data_classification = 'standard_phi'::data_classification
      OR (
        data_classification = 'part2_protected'::data_classification
        AND has_active_part2_consent_for_conversation(conversation_id)
      )
    )
  )
);

-- ============== RECORDINGS TABLE ==============
DROP POLICY IF EXISTS "Part 2 recordings visible to clinical staff" ON public.recordings;

CREATE POLICY "recordings_clinical_staff_part2"
ON public.recordings
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    program_id IS NOT NULL
    AND client_id IS NOT NULL
    AND conversation_id IS NOT NULL
    AND is_clinical_staff(auth.uid(), program_id)
    AND is_assigned_to_patient(auth.uid(), client_id)
    AND (
      data_classification = 'standard_phi'::data_classification
      OR (
        data_classification = 'part2_protected'::data_classification
        AND has_active_part2_consent_for_conversation(conversation_id)
      )
    )
  )
);

-- ============== UPLOADED_FILES TABLE ==============
DROP POLICY IF EXISTS "Part 2 files visible to clinical staff" ON public.uploaded_files;

CREATE POLICY "uploaded_files_clinical_staff_part2"
ON public.uploaded_files
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = uploaded_files.conversation_id
    AND (
      c.user_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR (
        c.program_id IS NOT NULL
        AND is_clinical_staff(auth.uid(), c.program_id)
        AND c.client_id IS NOT NULL
        AND is_assigned_to_patient(auth.uid(), c.client_id)
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

-- ============== PATIENT_ASSIGNMENTS TABLE ==============
-- Prevent non-admins from creating arbitrary assignments
DROP POLICY IF EXISTS "patient_assignments_admin_insert" ON public.patient_assignments;

CREATE POLICY "patient_assignments_admin_insert_strict"
ON public.patient_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND assigned_by = auth.uid()
  AND EXISTS (
    -- Verify staff is actually in the client's program with clinical role
    SELECT 1
    FROM clients c
    JOIN user_program_memberships upm ON c.program_id = upm.program_id
    WHERE c.id = client_id
      AND upm.user_id = staff_user_id
      AND upm.role IN ('treating_provider', 'care_team')
  )
);

-- Document the RLS hardening
INSERT INTO public.security_fixes (
  finding,
  severity,
  remediation,
  fix_date
) VALUES (
  'RLS policies ignored program membership and Part 2 consent requirements',
  'critical',
  'Rewrote all PHI table SELECT policies to enforce: (1) clinical staff MUST be assigned via patient_assignments, (2) clinical staff MUST have role in the program via user_program_memberships, (3) Part 2 data requires active consent via has_active_part2_consent_for_conversation. Covers clients, conversations, structured_notes, recordings, uploaded_files, and patient_assignments INSERT.',
  now()
);