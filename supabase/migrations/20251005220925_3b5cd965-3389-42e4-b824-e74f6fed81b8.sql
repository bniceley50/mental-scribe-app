-- Phase 1: Patient Assignment System
-- Create patient_assignments table to track which staff members are assigned to which patients

CREATE TABLE IF NOT EXISTS public.patient_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(staff_user_id, client_id)
);

-- Enable RLS
ALTER TABLE public.patient_assignments ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_patient_assignments_staff ON public.patient_assignments(staff_user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_patient_assignments_client ON public.patient_assignments(client_id) WHERE revoked_at IS NULL;

-- Add update trigger
CREATE TRIGGER update_patient_assignments_updated_at
  BEFORE UPDATE ON public.patient_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create security definer function to check patient assignment
CREATE OR REPLACE FUNCTION public.is_assigned_to_patient(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.patient_assignments
    WHERE staff_user_id = _user_id
      AND client_id = _client_id
      AND revoked_at IS NULL
  );
$$;

-- RLS Policies for patient_assignments table
CREATE POLICY "patient_assignments_block_anonymous"
  ON public.patient_assignments
  FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "patient_assignments_admin_all"
  ON public.patient_assignments
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "patient_assignments_staff_view_own"
  ON public.patient_assignments
  FOR SELECT
  USING (auth.uid() = staff_user_id);

-- Update clients RLS policy for clinical staff - now requires patient assignment
DROP POLICY IF EXISTS "clients_clinical_staff_select" ON public.clients;

CREATE POLICY "clients_clinical_staff_select"
  ON public.clients
  FOR SELECT
  USING (
    (program_id IS NOT NULL) AND 
    is_clinical_staff(auth.uid(), program_id) AND
    is_assigned_to_patient(auth.uid(), id)
  );

-- Update conversations RLS policy - add assignment check for Part 2 protected data
DROP POLICY IF EXISTS "Part 2 conversations visible to clinical staff" ON public.conversations;

CREATE POLICY "Part 2 conversations visible to clinical staff"
  ON public.conversations
  FOR SELECT
  USING (
    (auth.uid() = user_id) OR 
    has_role(auth.uid(), 'admin'::app_role) OR
    (
      data_classification = 'part2_protected'::data_classification AND
      program_id IS NOT NULL AND
      is_clinical_staff(auth.uid(), program_id) AND
      client_id IS NOT NULL AND
      is_assigned_to_patient(auth.uid(), client_id) AND
      EXISTS (
        SELECT 1 FROM part2_consents pc
        WHERE pc.conversation_id = conversations.id
          AND pc.status = 'active'
          AND pc.revoked_date IS NULL
          AND (pc.expiry_date IS NULL OR pc.expiry_date > now())
          AND pc.granted_date <= now()
      )
    )
  );

-- Update structured_notes RLS policy - add assignment check
DROP POLICY IF EXISTS "Part 2 notes visible to clinical staff" ON public.structured_notes;

CREATE POLICY "Part 2 notes visible to clinical staff"
  ON public.structured_notes
  FOR SELECT
  USING (
    (auth.uid() = user_id) OR 
    has_role(auth.uid(), 'admin'::app_role) OR
    (
      data_classification = 'part2_protected'::data_classification AND
      program_id IS NOT NULL AND
      is_clinical_staff(auth.uid(), program_id) AND
      client_id IS NOT NULL AND
      is_assigned_to_patient(auth.uid(), client_id) AND
      conversation_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM part2_consents pc
        WHERE pc.conversation_id = structured_notes.conversation_id
          AND pc.status = 'active'
          AND pc.revoked_date IS NULL
          AND (pc.expiry_date IS NULL OR pc.expiry_date > now())
          AND pc.granted_date <= now()
      )
    )
  );

-- Update recordings RLS policy - add assignment check
DROP POLICY IF EXISTS "Part 2 recordings visible to clinical staff" ON public.recordings;

CREATE POLICY "Part 2 recordings visible to clinical staff"
  ON public.recordings
  FOR SELECT
  USING (
    (auth.uid() = user_id) OR 
    has_role(auth.uid(), 'admin'::app_role) OR
    (
      data_classification = 'part2_protected'::data_classification AND
      program_id IS NOT NULL AND
      is_clinical_staff(auth.uid(), program_id) AND
      client_id IS NOT NULL AND
      is_assigned_to_patient(auth.uid(), client_id) AND
      conversation_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM part2_consents pc
        WHERE pc.conversation_id = recordings.conversation_id
          AND pc.status = 'active'
          AND pc.revoked_date IS NULL
          AND (pc.expiry_date IS NULL OR pc.expiry_date > now())
          AND pc.granted_date <= now()
      )
    )
  );

-- Phase 2: Audit Log Access Restriction
-- Restrict clinical staff to only their own audit logs (need-to-know principle)

DROP POLICY IF EXISTS "audit_logs_clinical_staff_select" ON public.audit_logs;

CREATE POLICY "audit_logs_clinical_staff_select"
  ON public.audit_logs
  FOR SELECT
  USING (
    program_id IS NOT NULL AND
    is_clinical_staff(auth.uid(), program_id) AND
    user_id = auth.uid()
  );

-- Add audit logging for patient assignments
CREATE OR REPLACE FUNCTION public.audit_patient_assignment_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id, metadata
    ) VALUES (
      NEW.assigned_by,
      'patient_assigned',
      'patient_assignment',
      NEW.id,
      jsonb_build_object(
        'staff_user_id', NEW.staff_user_id,
        'client_id', NEW.client_id,
        'assigned_at', NEW.assigned_at
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND NEW.revoked_at IS NOT NULL AND OLD.revoked_at IS NULL THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id, metadata
    ) VALUES (
      auth.uid(),
      'patient_unassigned',
      'patient_assignment',
      NEW.id,
      jsonb_build_object(
        'staff_user_id', NEW.staff_user_id,
        'client_id', NEW.client_id,
        'revoked_at', NEW.revoked_at
      )
    );
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_patient_assignment_changes
  AFTER INSERT OR UPDATE ON public.patient_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_patient_assignment_changes();