-- Tighten clients table RLS to prevent cross-program exposure

DROP POLICY IF EXISTS "clients_clinical_staff_select" ON public.clients;
CREATE POLICY "clients_clinical_staff_select"
ON public.clients
FOR SELECT
USING (
  program_id IS NOT NULL
  AND is_clinical_staff(auth.uid(), program_id)
  AND is_assigned_to_patient(auth.uid(), id)
);