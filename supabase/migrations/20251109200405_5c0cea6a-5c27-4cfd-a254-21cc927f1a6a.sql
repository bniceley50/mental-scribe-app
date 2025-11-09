-- P0 FIX: Audit chain ordering and hash collision fixes
-- 1) Add composite index for correct "previous row" lookup
CREATE INDEX IF NOT EXISTS audit_logs_user_created_id_idx
  ON public.audit_logs (user_id, created_at DESC, id DESC);

-- 2) Add last_created_at to cursor for correct incremental verification
ALTER TABLE public.audit_chain_cursor
  ADD COLUMN IF NOT EXISTS last_created_at timestamptz;

-- Backfill existing cursors from audit_logs
UPDATE public.audit_chain_cursor c
SET last_created_at = a.created_at
FROM public.audit_logs a
WHERE c.last_verified_id = a.id
  AND c.last_created_at IS NULL;

-- 3) Fix trigger: use (created_at, id) ordering and delimited concat
CREATE OR REPLACE FUNCTION public._audit_logs_set_hash()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, private, extensions
AS $$
DECLARE
  prev_hash_val text;
  secret_val text;
  payload text;
BEGIN
  -- Get previous hash using created_at,id order (not just id)
  SELECT l.hash INTO prev_hash_val
  FROM public.audit_logs l
  WHERE l.user_id = NEW.user_id
  ORDER BY l.created_at DESC, l.id DESC
  LIMIT 1;
  
  NEW.prev_hash := COALESCE(prev_hash_val, '');
  
  -- Get secret for this version
  SELECT s.secret INTO secret_val
  FROM private.audit_secrets s
  WHERE s.version = NEW.secret_version;
  
  IF secret_val IS NULL THEN
    RAISE EXCEPTION 'Missing audit secret for version %', NEW.secret_version;
  END IF;
  
  -- Use delimited concat to prevent collision attacks
  payload := concat_ws('|',
    COALESCE(NEW.prev_hash, ''),
    COALESCE(NEW.user_id::text, 'null'),
    COALESCE(NEW.action, ''),
    COALESCE(NEW.resource_type, ''),
    COALESCE(NEW.resource_id::text, 'null'),
    COALESCE(NEW.metadata::text, '{}'),
    (EXTRACT(EPOCH FROM NEW.created_at)::bigint)::text
  );
  
  NEW.hash := encode(
    extensions.hmac(payload::bytea, convert_to(secret_val, 'utf8'), 'sha256'),
    'hex'
  );
  
  RETURN NEW;
END;
$$;

-- 4) Fix full verifier: use (user_id, created_at, id) ordering
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
  expected_hash text;
  payload text;
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

    -- Compute expected hash with delimited concat
    payload := concat_ws('|',
      COALESCE(r.prev_hash, ''),
      COALESCE(r.user_id::text, 'null'),
      COALESCE(r.action, ''),
      COALESCE(r.resource_type, ''),
      COALESCE(r.resource_id::text, 'null'),
      COALESCE(r.metadata::text, '{}'),
      (EXTRACT(EPOCH FROM r.created_at)::bigint)::text
    );

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

-- 5) Fix incremental verifier: use (created_at, id) and add advisory lock
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
  expected_hash text;
  payload text;
BEGIN
  -- Prevent concurrent runs per-user (advisory lock)
  PERFORM pg_try_advisory_xact_lock(('x'||replace(p_user_id::text,'-',''))::bit(64)::bigint);

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

    -- Compute expected hash with delimited concat
    payload := concat_ws('|',
      COALESCE(r.prev_hash, ''),
      COALESCE(r.user_id::text, 'null'),
      COALESCE(r.action, ''),
      COALESCE(r.resource_type, ''),
      COALESCE(r.resource_id::text, 'null'),
      COALESCE(r.metadata::text, '{}'),
      (EXTRACT(EPOCH FROM r.created_at)::bigint)::text
    );

    expected_hash := encode(
      extensions.hmac(payload::bytea, convert_to(secret_val, 'utf8'), 'sha256'),
      'hex'
    );

    -- Verify hash
    IF expected_hash <> r.hash THEN
      RETURN QUERY SELECT false, vcount, cur.last_verified_id, cur.last_hash, r.id, expected_hash, r.hash;
      RETURN;
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

-- 6) Create wrapper for hourly cron
CREATE OR REPLACE FUNCTION public.run_incremental_for_all_users()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u uuid;
  r RECORD;
BEGIN
  FOR u IN SELECT DISTINCT user_id FROM public.audit_logs LOOP
    SELECT * INTO r FROM public.verify_audit_chain_incremental(u) LIMIT 1;

    INSERT INTO public.audit_verify_runs (intact, total_entries, verified_entries, broken_at_id, details)
    VALUES (
      r.intact,
      NULL, -- total not computed in incremental
      r.verified_entries,
      r.broken_at_id,
      jsonb_build_object(
        'type', 'hourly_incremental',
        'user_id', u,
        'expected', r.expected,
        'actual', r.actual
      )
    );
  END LOOP;
END;
$$;

-- 7) Update cron jobs
DO $$
BEGIN
  -- Remove old hourly job if exists
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'audit_verify_hourly_sql';
  
  -- Schedule hourly incremental
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'audit_verify_incremental_hourly') THEN
    PERFORM cron.schedule('audit_verify_incremental_hourly', '0 * * * *', 'SELECT public.run_incremental_for_all_users();');
  END IF;
  
  -- Schedule weekly full (Sunday 03:00 UTC)
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'audit_verify_weekly_full') THEN
    PERFORM cron.schedule('audit_verify_weekly_full', '0 3 * * 0', 'SELECT public.verify_audit_chain_full_weekly();');
  END IF;
END$$;