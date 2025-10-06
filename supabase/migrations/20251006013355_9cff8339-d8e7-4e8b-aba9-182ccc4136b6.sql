-- CRITICAL SECURITY FIX: Resolve RLS infinite recursion in Part 2 consent checking
-- Create security definer function to check active Part 2 consent without recursion

CREATE OR REPLACE FUNCTION public.has_active_part2_consent_for_conversation(
  _conversation_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.part2_consents
    WHERE conversation_id = _conversation_id
      AND status = 'active'
      AND revoked_date IS NULL
      AND (expiry_date IS NULL OR expiry_date > now())
      AND granted_date <= now()
  );
$$;

-- Drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "Clinical staff view Part 2 conversations with assignment and co" ON public.conversations;

-- Recreate the policy using the security definer function
CREATE POLICY "Clinical staff view Part 2 conversations with assignment and consent"
ON public.conversations
FOR SELECT
USING (
  data_classification = 'part2_protected'::data_classification
  AND program_id IS NOT NULL
  AND client_id IS NOT NULL
  AND is_clinical_staff(auth.uid(), program_id)
  AND is_assigned_to_patient(auth.uid(), client_id)
  AND has_active_part2_consent_for_conversation(id)
);