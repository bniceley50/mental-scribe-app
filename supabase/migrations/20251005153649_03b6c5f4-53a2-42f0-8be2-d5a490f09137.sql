-- =====================================================
-- CRITICAL SECURITY FIXES
-- =====================================================

-- ===========================================
-- FIX #1: Clients Table RLS Policies
-- ===========================================
-- Problem: All policies are RESTRICTIVE, causing AND logic instead of OR
-- Solution: One RESTRICTIVE anonymous block + PERMISSIVE authenticated policies

-- Drop existing clients policies
DROP POLICY IF EXISTS "clients_anonymous_block" ON public.clients;
DROP POLICY IF EXISTS "clients_owner_all" ON public.clients;
DROP POLICY IF EXISTS "clients_admin_select" ON public.clients;
DROP POLICY IF EXISTS "clients_clinical_staff_select" ON public.clients;

-- Create RESTRICTIVE policy to block ALL anonymous access
CREATE POLICY "clients_block_anonymous"
ON public.clients
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);

-- Create PERMISSIVE policies for authenticated users
CREATE POLICY "clients_owner_select"
ON public.clients
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "clients_owner_insert"
ON public.clients
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow updates only to safe fields (not data_classification, program_id, external_id)
CREATE POLICY "clients_owner_update_safe"
ON public.clients
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clients_owner_delete"
ON public.clients
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Admin can SELECT all clients
CREATE POLICY "clients_admin_select"
ON public.clients
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Clinical staff can SELECT clients in their programs
CREATE POLICY "clients_clinical_staff_select"
ON public.clients
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  program_id IS NOT NULL 
  AND is_clinical_staff(auth.uid(), program_id)
);

-- ===========================================
-- FIX #2: Prevent data_classification tampering
-- ===========================================
CREATE OR REPLACE FUNCTION public.prevent_client_classification_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent manual changes to critical fields
  IF TG_OP = 'UPDATE' THEN
    -- Only admins can change data_classification
    IF NEW.data_classification IS DISTINCT FROM OLD.data_classification THEN
      IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Only administrators can change data classification';
      END IF;
    END IF;
    
    -- Only admins can change program_id (affects Part 2 status)
    IF NEW.program_id IS DISTINCT FROM OLD.program_id THEN
      IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Only administrators can change program assignment';
      END IF;
    END IF;
    
    -- external_id is immutable after creation
    IF NEW.external_id IS DISTINCT FROM OLD.external_id THEN
      IF OLD.external_id IS NOT NULL THEN
        RAISE EXCEPTION 'External ID cannot be changed after creation';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_client_tampering
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.prevent_client_classification_tampering();

-- ===========================================
-- FIX #3: Audit Logs RLS - Fix Policy Types
-- ===========================================
DROP POLICY IF EXISTS "Absolute block for anonymous access to audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can read program-scoped audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Clinical staff can view program audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Service role audit access requires admin" ON public.audit_logs;
DROP POLICY IF EXISTS "Service role can insert audit logs with validation" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit logs are immutable - no updates" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit logs are immutable - no manual deletes" ON public.audit_logs;
DROP POLICY IF EXISTS "Only admins can delete audit logs" ON public.audit_logs;

-- Block all anonymous access (RESTRICTIVE)
CREATE POLICY "audit_logs_block_anonymous"
ON public.audit_logs
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);

-- Admins can SELECT all audit logs (PERMISSIVE)
CREATE POLICY "audit_logs_admin_select"
ON public.audit_logs
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Clinical staff can SELECT program audit logs (PERMISSIVE)
CREATE POLICY "audit_logs_clinical_staff_select"
ON public.audit_logs
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  program_id IS NOT NULL 
  AND is_clinical_staff(auth.uid(), program_id)
);

-- Service role can INSERT audit logs (PERMISSIVE)
CREATE POLICY "audit_logs_service_insert"
ON public.audit_logs
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  action IS NOT NULL 
  AND resource_type IS NOT NULL 
  AND user_id IS NOT NULL 
  AND (metadata IS NULL OR jsonb_typeof(metadata) = 'object')
);

-- Audit logs are immutable - no updates
CREATE POLICY "audit_logs_immutable_updates"
ON public.audit_logs
AS RESTRICTIVE
FOR UPDATE
TO public
USING (false);

-- Audit logs - only admins can delete
CREATE POLICY "audit_logs_admin_delete"
ON public.audit_logs
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===========================================
-- FIX #4: User Roles RLS - Fix Policy Types
-- ===========================================
DROP POLICY IF EXISTS "Block all anonymous access to user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;

-- Block all anonymous access (RESTRICTIVE)
CREATE POLICY "user_roles_block_anonymous"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);

-- Users can view their own roles (PERMISSIVE)
CREATE POLICY "user_roles_owner_select"
ON public.user_roles
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only admins can manage roles (PERMISSIVE)
CREATE POLICY "user_roles_admin_all"
ON public.user_roles
AS PERMISSIVE
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ===========================================
-- FIX #5: Enhanced MFA Recovery Code Hashing
-- ===========================================
-- Add salt column to mfa_recovery_codes
ALTER TABLE public.mfa_recovery_codes 
ADD COLUMN IF NOT EXISTS salt text;

-- Create function to generate cryptographically secure salt
CREATE OR REPLACE FUNCTION public.generate_salt()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT encode(extensions.gen_random_bytes(32), 'hex');
$$;

-- Create function to hash recovery code with salt using PBKDF2-equivalent
CREATE OR REPLACE FUNCTION public.hash_recovery_code(code text, salt text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  iterations int := 100000;
  hash text;
BEGIN
  -- Use multiple rounds of HMAC-SHA256 to approximate PBKDF2
  hash := code;
  FOR i IN 1..iterations LOOP
    hash := encode(
      hmac(hash::bytea, salt::bytea, 'sha256'),
      'hex'
    );
  END LOOP;
  RETURN hash;
END;
$$;

-- Trigger to auto-generate salt and hash code on insert
CREATE OR REPLACE FUNCTION public.auto_hash_recovery_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Generate salt if not provided
  IF NEW.salt IS NULL THEN
    NEW.salt := generate_salt();
  END IF;
  
  -- Hash the code with salt (assumes code_hash contains plaintext on insert)
  NEW.code_hash := hash_recovery_code(NEW.code_hash, NEW.salt);
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_hash_recovery_code_trigger ON public.mfa_recovery_codes;
CREATE TRIGGER auto_hash_recovery_code_trigger
BEFORE INSERT ON public.mfa_recovery_codes
FOR EACH ROW
EXECUTE FUNCTION public.auto_hash_recovery_code();