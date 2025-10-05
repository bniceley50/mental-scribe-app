-- Fix 1: Patient Consent Authorization Gap
-- Create table to link users to patient external IDs
CREATE TABLE IF NOT EXISTS public.patient_identity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  external_id text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, external_id)
);

ALTER TABLE public.patient_identity_links ENABLE ROW LEVEL SECURITY;

-- Only admins can manage patient identity links
CREATE POLICY "Only admins can manage patient links"
ON public.patient_identity_links
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own patient links
CREATE POLICY "Users can view own patient links"
ON public.patient_identity_links
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Security-definer function to check consent authorization
CREATE OR REPLACE FUNCTION public.can_view_patient_consent(
  _user_id uuid,
  _subject_external_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM patient_identity_links
    WHERE user_id = _user_id AND external_id = _subject_external_id
  )
  OR has_role(_user_id, 'admin'::app_role);
$$;

-- Update disclosure_consents SELECT policy
DROP POLICY IF EXISTS "Users can view their own disclosure consents" ON public.disclosure_consents;

CREATE POLICY "Users can view authorized patient consents"
ON public.disclosure_consents
FOR SELECT TO authenticated
USING (
  can_view_patient_consent(auth.uid(), subject_external_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);