-- =============================================================================
-- AUDIT CHAIN VERIFIER - USER BOUNDARY FIX
-- (current_user is a reserved keyword, rename to last_user_id)
-- =============================================================================

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
SET search_path = public, private, extensions
AS $$
DECLARE
  r RECORD;
  prev_hash_val text := '';
  last_user_id uuid := NULL;  -- Renamed from current_user (reserved keyword)
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

    -- CRITICAL FIX: Reset chain at user boundary
    IF last_user_id IS DISTINCT FROM r.user_id THEN
      prev_hash_val := '';
      last_user_id := r.user_id;
    END IF;

    -- Verify previous hash chain
    IF COALESCE(r.prev_hash, '') <> prev_hash_val THEN
      RETURN QUERY SELECT false, tcount, vcount, r.id, prev_hash_val, COALESCE(r.prev_hash, '');
      RETURN;
    END IF;

    -- Get secret for this version
    SELECT s.secret INTO secret_val 
    FROM private.audit_secrets s 
    WHERE s.version = r.secret_version;
    
    IF secret_val IS NULL THEN
      RETURN QUERY SELECT false, tcount, vcount, r.id, '<missing secret>', r.secret_version::text;
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

    -- Compare hashes
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

-- Lock down permissions (service_role only)
REVOKE ALL ON FUNCTION public.verify_audit_chain(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_audit_chain(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.verify_audit_chain(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.verify_audit_chain(uuid) TO service_role;

-- Performance index for MV query
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx 
  ON public.audit_logs (created_at DESC);