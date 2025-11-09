-- P0 FIX: Admin auth hardening
-- Add explicit is_admin() wrapper for clarity and auditability
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'::app_role
  )
$$;

-- P1 FIX: Incremental audit verification
-- Cursor table to track last verified position per user
CREATE TABLE IF NOT EXISTS public.audit_chain_cursor (
  user_id uuid PRIMARY KEY,
  last_verified_id uuid NOT NULL,
  last_hash text NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on cursor table
ALTER TABLE public.audit_chain_cursor ENABLE ROW LEVEL SECURITY;

-- Only admins can read cursors
CREATE POLICY "audit_chain_cursor_admin_select"
ON public.audit_chain_cursor
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Only service role can update cursors (via verify function)
CREATE POLICY "audit_chain_cursor_service_update"
ON public.audit_chain_cursor
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Incremental verification function
-- Verifies only new entries since last cursor position
CREATE OR REPLACE FUNCTION public.verify_audit_chain_incremental(p_user_id uuid)
RETURNS TABLE(
  intact boolean,
  verified_entries integer,
  new_cursor_id uuid,
  new_cursor_hash text,
  broken_at_id uuid,
  expected text,
  actual text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions
AS $$
DECLARE
  r RECORD;
  cursor_row RECORD;
  prev_hash_val text;
  vcount int := 0;
  secret_val text;
  expected_hash text;
  payload text;
  last_id_val uuid;
  last_hash_val text;
BEGIN
  -- Get cursor position
  SELECT last_verified_id, last_hash INTO cursor_row
  FROM public.audit_chain_cursor
  WHERE user_id = p_user_id;
  
  IF cursor_row IS NULL THEN
    -- No cursor: start from beginning
    prev_hash_val := '';
  ELSE
    -- Resume from last verified position
    prev_hash_val := cursor_row.last_hash;
  END IF;
  
  -- Verify only entries after cursor
  FOR r IN
    SELECT *
    FROM public.audit_logs
    WHERE user_id = p_user_id
      AND (cursor_row IS NULL OR id > cursor_row.last_verified_id)
    ORDER BY id
  LOOP
    -- Verify hash chain
    IF COALESCE(r.prev_hash, '') <> prev_hash_val THEN
      RETURN QUERY SELECT false, vcount, last_id_val, last_hash_val, r.id, prev_hash_val, COALESCE(r.prev_hash, '');
      RETURN;
    END IF;
    
    -- Get secret
    SELECT s.secret INTO secret_val 
    FROM private.audit_secrets s 
    WHERE s.version = r.secret_version;
    
    IF secret_val IS NULL THEN
      RETURN QUERY SELECT false, vcount, last_id_val, last_hash_val, r.id, '<missing secret>', r.secret_version::text;
      RETURN;
    END IF;
    
    -- Compute expected hash
    payload := COALESCE(r.prev_hash, '')
            || COALESCE(r.user_id::text, 'null')
            || r.action
            || r.resource_type
            || COALESCE(r.resource_id::text, 'null')
            || COALESCE(r.metadata::text, '{}')
            || EXTRACT(EPOCH FROM r.created_at)::bigint;
    
    expected_hash := encode(
      extensions.hmac(payload::bytea, convert_to(secret_val, 'utf8'), 'sha256'), 
      'hex'
    );
    
    -- Verify hash
    IF expected_hash <> r.hash THEN
      RETURN QUERY SELECT false, vcount, last_id_val, last_hash_val, r.id, expected_hash, r.hash;
      RETURN;
    END IF;
    
    vcount := vcount + 1;
    prev_hash_val := r.hash;
    last_id_val := r.id;
    last_hash_val := r.hash;
  END LOOP;
  
  -- Update cursor if we verified new entries
  IF vcount > 0 THEN
    INSERT INTO public.audit_chain_cursor (user_id, last_verified_id, last_hash)
    VALUES (p_user_id, last_id_val, last_hash_val)
    ON CONFLICT (user_id) DO UPDATE
    SET last_verified_id = EXCLUDED.last_verified_id,
        last_hash = EXCLUDED.last_hash,
        updated_at = now();
  END IF;
  
  RETURN QUERY SELECT true, vcount, last_id_val, last_hash_val, NULL::uuid, NULL::text, NULL::text;
END;
$$;

COMMENT ON FUNCTION public.verify_audit_chain_incremental IS 
'Incrementally verifies audit chain from last cursor position. Much faster than full scan for large audit logs.';

-- Weekly full verification trigger (runs weekly scan from scratch)
-- This catches any cursor corruption or gaps
CREATE OR REPLACE FUNCTION public.verify_audit_chain_full_weekly()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  result RECORD;
BEGIN
  -- Verify each user's full chain
  FOR uid IN SELECT DISTINCT user_id FROM public.audit_logs
  LOOP
    -- Call original full verifier
    SELECT * INTO result FROM public.verify_audit_chain(uid) LIMIT 1;
    
    -- Log result
    INSERT INTO public.audit_verify_runs (intact, total_entries, verified_entries, broken_at_id, details)
    VALUES (
      result.intact,
      result.total_entries,
      result.verified_entries,
      result.broken_at_id,
      jsonb_build_object(
        'type', 'weekly_full_scan',
        'user_id', uid,
        'expected', result.expected,
        'actual', result.actual
      )
    );
    
    -- Reset cursor if chain broke
    IF NOT result.intact THEN
      DELETE FROM public.audit_chain_cursor WHERE user_id = uid;
    END IF;
  END LOOP;
END;
$$;