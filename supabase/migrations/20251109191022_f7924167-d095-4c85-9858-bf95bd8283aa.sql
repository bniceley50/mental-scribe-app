-- =============================================================================
-- DB-SIDE AUDIT CHAIN VERIFIER
-- No secrets in Edge functions - everything in Postgres
-- =============================================================================

-- ==================== 1. PREREQUISITES ====================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM public;
GRANT USAGE ON SCHEMA private TO postgres;

-- ==================== 2. VERSIONED SECRETS ====================
CREATE TABLE IF NOT EXISTS private.audit_secrets (
  version int PRIMARY KEY,
  secret text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Initial secret (MUST be rotated in production via Lovable secrets)
INSERT INTO private.audit_secrets (version, secret)
VALUES (1, 'CHANGE-THIS-IN-PRODUCTION-VIA-SUPABASE-SECRETS')
ON CONFLICT (version) DO NOTHING;

-- ==================== 3. CHAIN COLUMNS ====================
-- Add chain columns if they don't exist
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS prev_hash text,
  ADD COLUMN IF NOT EXISTS hash text,
  ADD COLUMN IF NOT EXISTS secret_version int NOT NULL DEFAULT 1;

-- ==================== 4. APPEND-ONLY ENFORCEMENT ====================
-- Already exists, but ensure it's correct
CREATE OR REPLACE FUNCTION public._audit_logs_block_mod() 
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN
    RAISE EXCEPTION 'audit_logs is append-only and cannot be modified';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_logs_block_mod ON public.audit_logs;
CREATE TRIGGER audit_logs_block_mod
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public._audit_logs_block_mod();

-- ==================== 5. HASH CHAIN COMPUTATION ====================
CREATE OR REPLACE FUNCTION public._audit_logs_set_hash() 
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  prev_hash_val text;
  secret_val text;
  payload text;
BEGIN
  -- Get previous hash (last row for this user)
  SELECT l.hash INTO prev_hash_val
  FROM public.audit_logs l
  WHERE l.user_id = NEW.user_id
  ORDER BY l.id DESC
  LIMIT 1;
  
  NEW.prev_hash := COALESCE(prev_hash_val, '');
  
  -- Get secret for this version
  SELECT s.secret INTO secret_val
  FROM private.audit_secrets s
  WHERE s.version = NEW.secret_version;
  
  IF secret_val IS NULL THEN
    RAISE EXCEPTION 'Missing audit secret for version %', NEW.secret_version;
  END IF;
  
  -- Canonical payload (stable ordering)
  payload := NEW.prev_hash
          || COALESCE(NEW.user_id::text, 'null')
          || NEW.action
          || NEW.resource_type
          || COALESCE(NEW.resource_id::text, 'null')
          || COALESCE(NEW.metadata::text, '{}')
          || EXTRACT(EPOCH FROM NEW.created_at)::bigint;
  
  -- Compute HMAC-SHA256 hash
  NEW.hash := encode(
    hmac(payload::bytea, convert_to(secret_val, 'utf8'), 'sha256'),
    'hex'
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_logs_set_hash ON public.audit_logs;
CREATE TRIGGER audit_logs_set_hash
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public._audit_logs_set_hash();

-- ==================== 6. INDEX FOR CHAIN VERIFICATION ====================
CREATE INDEX IF NOT EXISTS audit_logs_user_id_id_idx 
  ON public.audit_logs (user_id, id);

-- ==================== 7. VERIFIER RPC ====================
CREATE OR REPLACE FUNCTION public.verify_audit_chain(p_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  intact boolean,
  total_entries integer,
  verified_entries integer,
  broken_at_id uuid,
  expected text,
  actual text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  r RECORD;
  prev_hash_val text := '';
  vcount int := 0;
  tcount int := 0;
  secret_val text;
  expected_hash text;
  payload text;
BEGIN
  FOR r IN
    SELECT *
    FROM public.audit_logs
    WHERE p_user_id IS NULL OR user_id = p_user_id
    ORDER BY user_id, id
  LOOP
    tcount := tcount + 1;
    
    -- Check previous hash chain
    IF COALESCE(r.prev_hash, '') <> prev_hash_val THEN
      RETURN QUERY SELECT false, tcount, vcount, r.id, prev_hash_val, COALESCE(r.prev_hash, '');
      RETURN;
    END IF;
    
    -- Get secret for this row's version
    SELECT s.secret INTO secret_val 
    FROM private.audit_secrets s 
    WHERE s.version = r.secret_version;
    
    IF secret_val IS NULL THEN
      RETURN QUERY SELECT false, tcount, vcount, r.id, '<missing secret>', r.secret_version::text;
      RETURN;
    END IF;
    
    -- Recompute hash
    payload := COALESCE(r.prev_hash, '')
            || COALESCE(r.user_id::text, 'null')
            || r.action
            || r.resource_type
            || COALESCE(r.resource_id::text, 'null')
            || COALESCE(r.metadata::text, '{}')
            || EXTRACT(EPOCH FROM r.created_at)::bigint;
    
    expected_hash := encode(
      hmac(payload::bytea, convert_to(secret_val, 'utf8'), 'sha256'),
      'hex'
    );
    
    IF expected_hash <> r.hash THEN
      RETURN QUERY SELECT false, tcount, vcount, r.id, expected_hash, r.hash;
      RETURN;
    END IF;
    
    vcount := vcount + 1;
    prev_hash_val := r.hash;
  END LOOP;
  
  RETURN QUERY SELECT true, tcount, vcount, NULL::uuid, NULL::text, NULL::text;
END;
$$;

-- Only admins can verify
REVOKE ALL ON FUNCTION public.verify_audit_chain(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_audit_chain(uuid) TO authenticated;