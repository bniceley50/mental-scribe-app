-- Fix 2: Revoked Consent Bypass Risk & Clinical Staff Restrictions (Corrected)
-- Security-definer function to check if user is clinical staff
CREATE OR REPLACE FUNCTION public.is_clinical_staff(_user_id uuid, _program_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_program_memberships
    WHERE user_id = _user_id
      AND program_id = _program_id
      AND role IN ('treating_provider', 'care_team')
  );
$$;

-- Security-definer function to check active Part 2 consent
CREATE OR REPLACE FUNCTION public.has_active_part2_consent(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.part2_consents pc
    JOIN public.conversations c ON c.id = pc.conversation_id
    WHERE pc.conversation_id = _conversation_id
      AND c.user_id = _user_id
      AND pc.status = 'active'
      AND (pc.expiry_date IS NULL OR pc.expiry_date > now())
  );
$$;

-- Update Part 2 conversations policy to include clinical staff check
DROP POLICY IF EXISTS "Part 2 conversations visible to program members" ON public.conversations;

CREATE POLICY "Part 2 conversations visible to clinical staff"
ON public.conversations
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    data_classification = 'part2_protected'::data_classification
    AND program_id IS NOT NULL
    AND is_clinical_staff(auth.uid(), program_id)
    AND (
      has_active_part2_consent(user_id, id)
      OR auth.uid() = user_id
    )
  )
);

-- Update Part 2 structured notes policy
DROP POLICY IF EXISTS "Part 2 notes visible to program members" ON public.structured_notes;

CREATE POLICY "Part 2 notes visible to clinical staff"
ON public.structured_notes
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    data_classification = 'part2_protected'::data_classification
    AND program_id IS NOT NULL
    AND is_clinical_staff(auth.uid(), program_id)
  )
);

-- Update Part 2 uploaded files policy
DROP POLICY IF EXISTS "Part 2 files visible to program members" ON public.uploaded_files;

CREATE POLICY "Part 2 files visible to clinical staff"
ON public.uploaded_files
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM conversations c
    WHERE c.id = uploaded_files.conversation_id
      AND (
        c.user_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
        OR (
          c.data_classification = 'part2_protected'::data_classification
          AND c.program_id IS NOT NULL
          AND is_clinical_staff(auth.uid(), c.program_id)
        )
      )
  )
);