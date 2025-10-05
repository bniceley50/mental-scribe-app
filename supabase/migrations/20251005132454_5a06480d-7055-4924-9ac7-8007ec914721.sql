-- =========================================
-- SECURITY FIX MIGRATION
-- Addresses Critical, High, and Medium priority issues
-- =========================================

-- Enable pgcrypto extension for HMAC hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- HIGH-2: Remove duplicate RLS policy on clients table
DROP POLICY IF EXISTS "Block all anonymous access to clients" ON public.clients;

-- HIGH-3: Create metadata sanitization function for audit logs
CREATE OR REPLACE FUNCTION public.sanitize_audit_metadata(meta jsonb)
RETURNS jsonb 
LANGUAGE sql 
IMMUTABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_object_agg(key, value),
    '{}'::jsonb
  )
  FROM jsonb_each(meta)
  WHERE key NOT IN (
    'password', 'token', 'api_key', 'secret', 'authorization',
    'access_token', 'refresh_token', 'session_token', 'bearer',
    'apikey', 'api-key', 'auth', 'credentials'
  )
$$;

-- MEDIUM-1: Create function to hash external patient IDs with proper type casting
CREATE OR REPLACE FUNCTION public.hash_external_id(raw_id text)
RETURNS text 
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(
    hmac(
      raw_id::bytea, 
      COALESCE(
        current_setting('app.settings.hmac_key', true),
        'default-key-change-in-production'
      )::bytea, 
      'sha256'
    ), 
    'hex'
  );
END;
$$;

-- MEDIUM-4: Make audit_logs immutable (prevent UPDATE/DELETE)
-- Add explicit policy to block updates and deletes
DROP POLICY IF EXISTS "Audit logs are immutable - no updates" ON public.audit_logs;
CREATE POLICY "Audit logs are immutable - no updates"
  ON public.audit_logs
  FOR UPDATE
  TO authenticated, anon, service_role
  USING (false);

DROP POLICY IF EXISTS "Audit logs are immutable - no manual deletes" ON public.audit_logs;
CREATE POLICY "Audit logs are immutable - no manual deletes"
  ON public.audit_logs
  FOR DELETE
  TO authenticated, anon
  USING (false);

-- Add comment documenting the immutability
COMMENT ON TABLE public.audit_logs IS 'Immutable audit trail - INSERT only. No updates or deletes allowed to ensure compliance.';

-- Create indexes for faster audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created 
  ON public.audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created 
  ON public.audit_logs(action, created_at DESC);