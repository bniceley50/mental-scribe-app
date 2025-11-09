-- P0 FIX: Backward-compatible audit chain verification (supports v1 + v2 hash algorithms)
-- This allows legacy rows (pre-delimited concat) to verify correctly

-- 1) Full verifier with dual-algorithm support
CREATE OR REPLACE FUNCTION public.verify_audit_chain(p_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  intact boolean,
  total_entries integer,
  verified_entries integer,
  broken_at_id uuid,
  expected text,
  actual text
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, private, extensions
AS $$
DECLARE
  r RECORD;
  prev_hash_val text := '';
  last_user_id uuid := NULL;
  vcount int := 0;
  tcount int := 0;
  secret_val text;
  expected_hash_v2 text;
  expected_hash_v1 text;
  payload_v2 text;
  payload_v1 text;
BEGIN
  FOR r IN
    SELECT *
    FROM public.audit_logs
    WHERE p_user_id IS NULL OR user_id = p_user_id
    ORDER BY user_id, created_at, id
  LOOP
    tcount := tcount + 1;

    -- Reset chain at user boundary
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

    -- Try v2 (delimited) first
    payload_v2 := concat_ws('|',
      COALESCE(r.prev_hash, ''),
      COALESCE(r.user_id::text, 'null'),
      COALESCE(r.action, ''),
      COALESCE(r.resource_type, ''),
      COALESCE(r.resource_id::text, 'null'),
      COALESCE(r.metadata::text, '{}'),
      (EXTRACT(EPOCH FROM r.created_at)::bigint)::text
    );
    expected_hash_v2 := encode(
      extensions.hmac(payload_v2::bytea, convert_to(secret_val, 'utf8'), 'sha256'),
      'hex'
    );

    IF expected_hash_v2 <> r.hash THEN
      -- v2 failed, try v1 (legacy, no delimiters)
      payload_v1 := COALESCE(r.prev_hash, '')
                  || COALESCE(r.user_id::text, 'null')
                  || COALESCE(r.action, '')
                  || COALESCE(r.resource_type, '')
                  || COALESCE(r.resource_id::text, 'null')
                  || COALESCE(r.metadata::text, '{}')
                  || (EXTRACT(EPOCH FROM r.created_at)::bigint)::text;

      expected_hash_v1 := encode(
        extensions.hmac(payload_v1::bytea, convert_to(secret_val, 'utf8'), 'sha256'),
        'hex'
      );

      IF expected_hash_v1 <> r.hash THEN
        -- Both algorithms failed - chain broken
        RETURN QUERY SELECT false, tcount, vcount, r.id, expected_hash_v2, r.hash;
        RETURN;
      END IF;
    END IF;

    vcount := vcount + 1;
    prev_hash_val := r.hash;
  END LOOP;

  RETURN QUERY SELECT true, tcount, vcount, NULL::uuid, NULL::text, NULL::text;
END;
$$;

-- 2) Incremental verifier with dual-algorithm support
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
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, private, extensions
AS $$
DECLARE
  r RECORD;
  cur RECORD;
  prev_hash_val text;
  vcount int := 0;
  secret_val text;
  expected_hash_v2 text;
  expected_hash_v1 text;
  payload_v2 text;
  payload_v1 text;
BEGIN
  -- Prevent concurrent runs per-user (safer lock key using hashtextextended)
  PERFORM pg_try_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  -- Get cursor position with lock
  SELECT last_verified_id, last_hash, last_created_at INTO cur
  FROM public.audit_chain_cursor
  WHERE user_id = p_user_id
  FOR UPDATE;

  prev_hash_val := COALESCE(cur.last_hash, '');

  -- Verify only entries after cursor position using (created_at, id)
  FOR r IN
    SELECT *
    FROM public.audit_logs
    WHERE user_id = p_user_id
      AND (
        cur.last_created_at IS NULL
        OR (created_at, id) > (cur.last_created_at, cur.last_verified_id)
      )
    ORDER BY created_at, id
  LOOP
    -- Verify hash chain
    IF COALESCE(r.prev_hash, '') <> prev_hash_val THEN
      RETURN QUERY SELECT false, vcount, cur.last_verified_id, cur.last_hash, r.id, prev_hash_val, COALESCE(r.prev_hash, '');
      RETURN;
    END IF;

    -- Get secret
    SELECT s.secret INTO secret_val 
    FROM private.audit_secrets s 
    WHERE s.version = r.secret_version;
    
    IF secret_val IS NULL THEN
      RETURN QUERY SELECT false, vcount, cur.last_verified_id, cur.last_hash, r.id, '<missing secret>', r.secret_version::text;
      RETURN;
    END IF;

    -- Try v2 (delimited) first
    payload_v2 := concat_ws('|',
      COALESCE(r.prev_hash, ''),
      COALESCE(r.user_id::text, 'null'),
      COALESCE(r.action, ''),
      COALESCE(r.resource_type, ''),
      COALESCE(r.resource_id::text, 'null'),
      COALESCE(r.metadata::text, '{}'),
      (EXTRACT(EPOCH FROM r.created_at)::bigint)::text
    );
    expected_hash_v2 := encode(
      extensions.hmac(payload_v2::bytea, convert_to(secret_val, 'utf8'), 'sha256'),
      'hex'
    );

    IF expected_hash_v2 <> r.hash THEN
      -- v2 failed, try v1 (legacy)
      payload_v1 := COALESCE(r.prev_hash, '')
                  || COALESCE(r.user_id::text, 'null')
                  || COALESCE(r.action, '')
                  || COALESCE(r.resource_type, '')
                  || COALESCE(r.resource_id::text, 'null')
                  || COALESCE(r.metadata::text, '{}')
                  || (EXTRACT(EPOCH FROM r.created_at)::bigint)::text;

      expected_hash_v1 := encode(
        extensions.hmac(payload_v1::bytea, convert_to(secret_val, 'utf8'), 'sha256'),
        'hex'
      );

      IF expected_hash_v1 <> r.hash THEN
        -- Both algorithms failed
        RETURN QUERY SELECT false, vcount, cur.last_verified_id, cur.last_hash, r.id, expected_hash_v2, r.hash;
        RETURN;
      END IF;
    END IF;

    vcount := vcount + 1;
    prev_hash_val := r.hash;
    cur.last_verified_id := r.id;
    cur.last_hash := r.hash;
    cur.last_created_at := r.created_at;
  END LOOP;

  -- Update cursor if we verified new entries
  IF vcount > 0 THEN
    INSERT INTO public.audit_chain_cursor(user_id, last_verified_id, last_hash, last_created_at, verified_at, updated_at)
    VALUES (p_user_id, cur.last_verified_id, cur.last_hash, cur.last_created_at, now(), now())
    ON CONFLICT (user_id) DO UPDATE
    SET last_verified_id = EXCLUDED.last_verified_id,
        last_hash = EXCLUDED.last_hash,
        last_created_at = EXCLUDED.last_created_at,
        verified_at = now(),
        updated_at = now();
  END IF;

  RETURN QUERY SELECT true, vcount, cur.last_verified_id, cur.last_hash, NULL::uuid, NULL::text, NULL::text;
END;
$$;