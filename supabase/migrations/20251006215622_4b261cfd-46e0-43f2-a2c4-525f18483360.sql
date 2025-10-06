-- CRITICAL SECURITY FIX: Prevent unauthorized patient assignment manipulation
-- Issue: Staff could potentially create their own patient assignments

-- 1. Drop existing permissive policies on patient_assignments
DROP POLICY IF EXISTS "patient_assignments_staff_view_own" ON public.patient_assignments;

-- 2. Add stricter policies - only admins can create/modify assignments
CREATE POLICY "patient_assignments_admin_insert"
ON public.patient_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND assigned_by = auth.uid()
);

CREATE POLICY "patient_assignments_admin_update"
ON public.patient_assignments
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "patient_assignments_admin_delete"
ON public.patient_assignments
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Allow staff to view their own assignments (read-only)
CREATE POLICY "patient_assignments_staff_select_own"
ON public.patient_assignments
FOR SELECT
TO authenticated
USING (
  auth.uid() = staff_user_id 
  AND revoked_at IS NULL
);

-- 4. Add audit logging for client data modifications
-- Note: PostgreSQL doesn't support SELECT triggers, so we log INSERT/UPDATE operations
-- For SELECT logging, implement at application level
CREATE TABLE IF NOT EXISTS public.client_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  accessed_by UUID NOT NULL,
  access_type TEXT NOT NULL, -- 'create', 'update', 'delete', 'view' (view from app)
  access_method TEXT NOT NULL, -- 'direct_owner', 'clinical_staff', 'admin'
  program_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on access logs
ALTER TABLE public.client_access_logs ENABLE ROW LEVEL SECURITY;

-- Block all anonymous access
CREATE POLICY "client_access_logs_block_anon"
ON public.client_access_logs
FOR ALL
TO anon, public
USING (false)
WITH CHECK (false);

-- Only admins can view access logs
CREATE POLICY "client_access_logs_admin_select"
ON public.client_access_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert access logs (via triggers and application)
CREATE POLICY "client_access_logs_service_insert"
ON public.client_access_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Access logs are immutable
CREATE POLICY "client_access_logs_immutable"
ON public.client_access_logs
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "client_access_logs_no_delete"
ON public.client_access_logs
FOR DELETE
TO authenticated
USING (false);

-- 5. Create function to log client modifications
CREATE OR REPLACE FUNCTION public.log_client_modification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _access_method text;
  _access_type text;
BEGIN
  -- Determine access type
  IF TG_OP = 'INSERT' THEN
    _access_type := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    _access_type := 'update';
  ELSIF TG_OP = 'DELETE' THEN
    _access_type := 'delete';
  END IF;

  -- Determine access method
  IF TG_OP = 'DELETE' THEN
    IF auth.uid() = OLD.user_id THEN
      _access_method := 'direct_owner';
    ELSIF has_role(auth.uid(), 'admin'::app_role) THEN
      _access_method := 'admin';
    ELSIF OLD.program_id IS NOT NULL AND is_clinical_staff(auth.uid(), OLD.program_id) THEN
      _access_method := 'clinical_staff';
    ELSE
      _access_method := 'unknown';
    END IF;

    -- Log the deletion
    INSERT INTO public.client_access_logs (
      client_id, accessed_by, access_type, access_method, program_id
    ) VALUES (
      OLD.id, auth.uid(), _access_type, _access_method, OLD.program_id
    );
    RETURN OLD;
  ELSE
    IF auth.uid() = NEW.user_id THEN
      _access_method := 'direct_owner';
    ELSIF has_role(auth.uid(), 'admin'::app_role) THEN
      _access_method := 'admin';
    ELSIF NEW.program_id IS NOT NULL AND is_clinical_staff(auth.uid(), NEW.program_id) THEN
      _access_method := 'clinical_staff';
    ELSE
      _access_method := 'unknown';
    END IF;

    -- Log the access
    INSERT INTO public.client_access_logs (
      client_id, accessed_by, access_type, access_method, program_id
    ) VALUES (
      NEW.id, auth.uid(), _access_type, _access_method, NEW.program_id
    );
    RETURN NEW;
  END IF;
END;
$$;

-- 6. Add triggers to log client record modifications
DROP TRIGGER IF EXISTS log_client_insert_trigger ON public.clients;
CREATE TRIGGER log_client_insert_trigger
AFTER INSERT ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.log_client_modification();

DROP TRIGGER IF EXISTS log_client_update_trigger ON public.clients;
CREATE TRIGGER log_client_update_trigger
AFTER UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.log_client_modification();

DROP TRIGGER IF EXISTS log_client_delete_trigger ON public.clients;
CREATE TRIGGER log_client_delete_trigger
AFTER DELETE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.log_client_modification();

-- 7. Add validation function for assignment integrity
CREATE OR REPLACE FUNCTION public.validate_patient_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify assignment is created by admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only administrators can create patient assignments';
  END IF;

  -- Verify the staff user exists in the same program as the client
  IF NOT EXISTS (
    SELECT 1
    FROM public.clients c
    JOIN public.user_program_memberships upm 
      ON c.program_id = upm.program_id
    WHERE c.id = NEW.client_id
      AND upm.user_id = NEW.staff_user_id
      AND upm.role IN ('treating_provider', 'care_team')
  ) THEN
    RAISE EXCEPTION 'Cannot assign staff member to client: staff is not in the same program with appropriate clinical role';
  END IF;

  -- Auto-set assigned_by to current user
  NEW.assigned_by := auth.uid();
  NEW.assigned_at := now();

  RETURN NEW;
END;
$$;

-- 8. Add trigger to validate assignments before creation
DROP TRIGGER IF EXISTS validate_patient_assignment_trigger ON public.patient_assignments;
CREATE TRIGGER validate_patient_assignment_trigger
BEFORE INSERT ON public.patient_assignments
FOR EACH ROW
EXECUTE FUNCTION public.validate_patient_assignment();

-- 9. Add index for performance on access logs
CREATE INDEX IF NOT EXISTS idx_client_access_logs_client_accessed 
ON public.client_access_logs(client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_access_logs_accessor
ON public.client_access_logs(accessed_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_access_logs_type
ON public.client_access_logs(access_type, created_at DESC);

-- 10. Create function for admins to review suspicious access patterns
CREATE OR REPLACE FUNCTION public.get_suspicious_access_patterns(
  _hours_lookback integer DEFAULT 24,
  _access_threshold integer DEFAULT 10
)
RETURNS TABLE (
  accessed_by uuid,
  access_count bigint,
  unique_clients bigint,
  access_types jsonb,
  access_methods jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    accessed_by,
    COUNT(*) as access_count,
    COUNT(DISTINCT client_id) as unique_clients,
    jsonb_agg(DISTINCT access_type) as access_types,
    jsonb_agg(DISTINCT access_method) as access_methods
  FROM public.client_access_logs
  WHERE created_at > now() - (_hours_lookback || ' hours')::INTERVAL
  GROUP BY accessed_by
  HAVING COUNT(*) >= _access_threshold
  ORDER BY access_count DESC;
$$;

-- 11. Create helper function for application-level access logging
CREATE OR REPLACE FUNCTION public.log_client_view(
  _client_id uuid,
  _access_method text DEFAULT 'unknown'
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.client_access_logs (
    client_id,
    accessed_by,
    access_type,
    access_method,
    program_id
  ) SELECT 
    _client_id,
    auth.uid(),
    'view',
    _access_method,
    c.program_id
  FROM public.clients c
  WHERE c.id = _client_id;
$$;