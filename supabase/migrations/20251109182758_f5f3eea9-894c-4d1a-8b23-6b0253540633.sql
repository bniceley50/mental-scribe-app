-- Enable pgcrypto for HMAC
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create private schema for audit secrets
CREATE SCHEMA IF NOT EXISTS private;

-- Create audit secrets table (versioned for rotation)
CREATE TABLE IF NOT EXISTS private.audit_secrets (
  version int PRIMARY KEY,
  secret text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Insert initial secret (CHANGE THIS IN PRODUCTION)
INSERT INTO private.audit_secrets (version, secret) 
VALUES (1, 'CHANGE-THIS-AUDIT-SECRET-IN-PRODUCTION')
ON CONFLICT (version) DO NOTHING;

-- Add hash chain columns to audit_logs
ALTER TABLE public.audit_logs 
  ADD COLUMN IF NOT EXISTS prev_hash text,
  ADD COLUMN IF NOT EXISTS hash text,
  ADD COLUMN IF NOT EXISTS secret_version int NOT NULL DEFAULT 1;

-- Block updates and deletes (append-only)
CREATE OR REPLACE FUNCTION public._audit_logs_block_mod() 
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN
    RAISE EXCEPTION 'audit_logs is append-only and cannot be modified';
  END IF;
  RETURN NULL;
END
$$;

DROP TRIGGER IF EXISTS audit_logs_block_mod ON public.audit_logs;
CREATE TRIGGER audit_logs_block_mod
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public._audit_logs_block_mod();

-- Compute hash chain on insert
CREATE OR REPLACE FUNCTION public._audit_logs_set_hash() 
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  prev_hash_val text;
  secret_val text;
  payload text;
BEGIN
  -- Get previous hash (last row ordered by id)
  SELECT l.hash INTO prev_hash_val
  FROM public.audit_logs l
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
END
$$;

DROP TRIGGER IF EXISTS audit_logs_set_hash ON public.audit_logs;
CREATE TRIGGER audit_logs_set_hash
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public._audit_logs_set_hash();

-- Create index for chain verification
CREATE INDEX IF NOT EXISTS audit_logs_id_idx ON public.audit_logs(id);

-- DB-side verifier function
CREATE OR REPLACE FUNCTION public.verify_audit_chain()
RETURNS TABLE(
  intact boolean,
  total_entries int,
  verified_entries int,
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
    ORDER BY id
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
END
$$;

-- Create table to log verification runs
CREATE TABLE IF NOT EXISTS public.audit_verify_runs (
  id bigserial PRIMARY KEY,
  run_at timestamptz NOT NULL DEFAULT NOW(),
  intact boolean NOT NULL,
  total_entries int NOT NULL,
  verified_entries int NOT NULL,
  broken_at_id uuid,
  details jsonb
);

-- Enable RLS on audit_verify_runs (admin only)
ALTER TABLE public.audit_verify_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit verify runs"
ON public.audit_verify_runs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Schedule hourly verification
SELECT cron.schedule(
  'audit_verify_hourly',
  '0 * * * *',
  $$
  INSERT INTO audit_verify_runs(intact, total_entries, verified_entries, broken_at_id, details)
  SELECT v.intact, v.total_entries, v.verified_entries, v.broken_at_id,
         jsonb_build_object('expected', v.expected, 'actual', v.actual)
  FROM verify_audit_chain() AS v;
  $$
);