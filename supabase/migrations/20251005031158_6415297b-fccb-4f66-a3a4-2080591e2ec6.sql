-- Fix Part 2 consent logic flaw
-- Remove redundant owner check from clinical staff consent validation

DROP POLICY IF EXISTS "Part 2 conversations visible to clinical staff" ON public.conversations;

CREATE POLICY "Part 2 conversations visible to clinical staff"
ON public.conversations
FOR SELECT TO authenticated
USING (
  -- Owner can always see their own data
  auth.uid() = user_id
  -- Admins can see everything
  OR has_role(auth.uid(), 'admin'::app_role)
  -- Clinical staff can ONLY see Part 2 data with active consent
  OR (
    data_classification = 'part2_protected'::data_classification
    AND program_id IS NOT NULL
    AND is_clinical_staff(auth.uid(), program_id)
    AND has_active_part2_consent(user_id, id)
  )
);

-- Ensure audit logs require admin role for all authenticated users
DROP POLICY IF EXISTS "Only admins can read audit logs" ON public.audit_logs;

CREATE POLICY "Only admins can read audit logs"
ON public.audit_logs
AS RESTRICTIVE
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));