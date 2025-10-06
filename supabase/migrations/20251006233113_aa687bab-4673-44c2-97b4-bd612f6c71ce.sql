-- ============================================================================
-- CRITICAL SECURITY FIXES: Address audit logging, RLS, and Part 2 validation
-- ============================================================================
-- Fixes: 
-- 1. Remove external_id trigger (column doesn't exist)
-- 2. Tighten Part 2 consent validation
-- 3. Fix audit_logs RLS to allow service role inserts
-- 4. Implement log_client_view function for PHI access tracking
-- 5. Revoke excessive grants on audit tables
-- ============================================================================

-- 1. DROP the broken external_id trigger (column doesn't exist in clients table)
DROP TRIGGER IF EXISTS ensure_client_external_id ON public.clients;
DROP FUNCTION IF EXISTS public.ensure_client_external_id();

-- 2. FIX Part 2 consent validation - enforce granted_date, revoked status, and temporal logic
DROP FUNCTION IF EXISTS public.has_active_part2_consent_for_conversation(uuid);
CREATE OR REPLACE FUNCTION public.has_active_part2_consent_for_conversation(_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.part2_consents
    WHERE conversation_id = _conversation_id
      AND status = 'active'  -- MUST be active
      AND revoked_date IS NULL  -- MUST NOT be revoked
      AND granted_date IS NOT NULL  -- MUST have been granted
      AND granted_date <= now()  -- MUST have already been granted (not future)
      AND (expiry_date IS NULL OR expiry_date > now())  -- Either no expiry or not yet expired
  );
$$;

-- 3. FIX audit_logs RLS - allow service role to insert
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "audit_logs_service_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_block_anon_all" ON public.audit_logs;

-- Create new policies that allow service role inserts
CREATE POLICY "audit_logs_service_role_insert"
ON public.audit_logs
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "audit_logs_authenticated_insert"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND action IS NOT NULL 
  AND resource_type IS NOT NULL
);

CREATE POLICY "audit_logs_block_anon"
ON public.audit_logs
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 4. CREATE log_client_view function for PHI access tracking
CREATE OR REPLACE FUNCTION public.log_client_view(_client_id uuid, _access_method text DEFAULT 'ui_view')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _program_id uuid;
BEGIN
  -- Get client's program_id
  SELECT program_id INTO _program_id
  FROM public.clients
  WHERE id = _client_id;
  
  -- Insert access log
  INSERT INTO public.client_access_logs (
    client_id,
    accessed_by,
    access_type,
    access_method,
    program_id
  ) VALUES (
    _client_id,
    auth.uid(),
    'view',
    _access_method,
    _program_id
  );
END;
$$;

-- 5. REVOKE excessive permissions on audit tables
-- Only admins can SELECT, service role can INSERT
REVOKE ALL ON public.audit_logs FROM anon;
REVOKE ALL ON public.audit_logs FROM authenticated;
REVOKE TRUNCATE ON public.audit_logs FROM anon, authenticated, service_role;

GRANT SELECT ON public.audit_logs TO authenticated;  -- For admin queries via has_role
GRANT INSERT ON public.audit_logs TO service_role;
GRANT INSERT ON public.audit_logs TO authenticated;  -- For user actions

-- Same for client_access_logs
REVOKE ALL ON public.client_access_logs FROM anon;
REVOKE ALL ON public.client_access_logs FROM authenticated;
REVOKE TRUNCATE ON public.client_access_logs FROM anon, authenticated, service_role;

GRANT SELECT ON public.client_access_logs TO authenticated;
GRANT INSERT ON public.client_access_logs TO service_role;
GRANT INSERT ON public.client_access_logs TO authenticated;

-- 6. Document the fixes
INSERT INTO public.security_fixes (
  finding,
  severity,
  remediation,
  fix_date
) VALUES 
(
  'Audit logs unreachable due to anon key vs service role mismatch',
  'critical',
  'Modified audit_logs RLS to allow service_role INSERT and authenticated INSERT (for user actions). Edge functions must use service role client for audit writes. Revoked TRUNCATE from all roles except postgres.',
  now()
),
(
  'Part 2 consent validation allowed future/revoked consents',
  'critical',
  'Rewrote has_active_part2_consent_for_conversation to enforce: (1) status=active, (2) revoked_date IS NULL, (3) granted_date IS NOT NULL, (4) granted_date <= now(), (5) expiry_date IS NULL OR > now(). Prevents future-dated and revoked consents from granting access.',
  now()
),
(
  'Missing log_client_view function for PHI access tracking',
  'critical',
  'Created log_client_view(client_id, access_method) function to track all PHI reads. Must be called before displaying client data in UI. Writes to client_access_logs with user_id, timestamp, and access method.',
  now()
),
(
  'Broken ensure_client_external_id trigger referencing nonexistent column',
  'high',
  'Removed ensure_client_external_id trigger and function. The clients.external_id column does not exist in schema. If external ID hashing is needed, add column first with proper migration.',
  now()
),
(
  'Audit tables had TRUNCATE permission for non-admin roles',
  'high',
  'Revoked TRUNCATE on audit_logs and client_access_logs from all roles except postgres. This prevents audit trail deletion even with compromised tokens.',
  now()
);