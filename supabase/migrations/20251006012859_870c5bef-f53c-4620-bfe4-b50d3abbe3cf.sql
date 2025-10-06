-- Fix: Add RLS policy to prevent clinical staff from accessing conversations 
-- for patients they are not assigned to (for non-Part 2 conversations)

-- Drop the existing broad Part 2 policy and create more restrictive policies
DROP POLICY IF EXISTS "Part 2 conversations visible to clinical staff" ON public.conversations;

-- Policy 1: Clinical staff can view Part 2 conversations ONLY for assigned patients with active consent
CREATE POLICY "Clinical staff view Part 2 conversations with assignment and consent"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  data_classification = 'part2_protected'::data_classification
  AND program_id IS NOT NULL
  AND client_id IS NOT NULL
  AND is_clinical_staff(auth.uid(), program_id)
  AND is_assigned_to_patient(auth.uid(), client_id)
  AND EXISTS (
    SELECT 1
    FROM part2_consents pc
    WHERE pc.conversation_id = conversations.id
      AND pc.status = 'active'
      AND pc.revoked_date IS NULL
      AND (pc.expiry_date IS NULL OR pc.expiry_date > now())
      AND pc.granted_date <= now()
  )
);

-- Policy 2: Clinical staff can view standard PHI conversations ONLY for assigned patients
CREATE POLICY "Clinical staff view standard conversations with assignment"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  data_classification = 'standard_phi'::data_classification
  AND program_id IS NOT NULL
  AND client_id IS NOT NULL
  AND is_clinical_staff(auth.uid(), program_id)
  AND is_assigned_to_patient(auth.uid(), client_id)
);

-- Add audit logging for conversation access by clinical staff
CREATE OR REPLACE FUNCTION public.audit_clinical_conversation_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log when clinical staff access Part 2 conversations
  IF NEW.data_classification = 'part2_protected'::data_classification THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      resource_type,
      resource_id,
      data_classification,
      metadata
    ) VALUES (
      auth.uid(),
      'part2_conversation_accessed',
      'conversation',
      NEW.id,
      'part2_protected'::data_classification,
      jsonb_build_object(
        'client_id', NEW.client_id,
        'program_id', NEW.program_id,
        'access_timestamp', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;