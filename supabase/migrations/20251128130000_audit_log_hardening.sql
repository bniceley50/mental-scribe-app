-- Add new columns for Audit Log Hardening (GAP-01)-- Migration: Audit Log Hardening (GAP-01)-- Migration: Audit Log Hardening (GAP-01)-- Migration: Audit Log Hardening (GAP-01)

ALTER TABLE public.audit_logs

ADD COLUMN IF NOT EXISTS session_id UUID,-- Description: Adds HIPAA compliance fields, enforces 7-year retention, and updates hashing (V3) for integrity.

ADD COLUMN IF NOT EXISTS client_ip TEXT,

ADD COLUMN IF NOT EXISTS outcome TEXT CHECK (outcome IN ('success', 'failure', 'denied')),-- Author: GitHub Copilot-- Description: Adds HIPAA compliance fields, enforces 7-year retention, and updates hashing (V3) for integrity.-- Description: Adds HIPAA compliance fields, enforces 7-year retention, and updates hashing for integrity.

ADD COLUMN IF NOT EXISTS phi_accessed BOOLEAN DEFAULT FALSE,

ADD COLUMN IF NOT EXISTS hash_version INTEGER DEFAULT 1;-- Date: 2025-11-28



-- Create index for retention policy performance-- Author: GitHub Copilot-- Author: GitHub Copilot

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp);

-- 1. Add new columns

-- Ensure pgcrypto is available for digest function

CREATE EXTENSION IF NOT EXISTS pgcrypto;ALTER TABLE public.audit_logs-- Date: 2025-11-28-- Date: 2025-11-28



-- Update the hash generation function to V3 (HMAC-SHA256)ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.user_sessions(id),

CREATE OR REPLACE FUNCTION public.generate_audit_log_hash()

RETURNS TRIGGER AS $$ADD COLUMN IF NOT EXISTS phi_accessed BOOLEAN DEFAULT false,

DECLARE

    row_data TEXT;ADD COLUMN IF NOT EXISTS outcome TEXT CHECK (outcome IN ('success', 'failure', 'denied')),

    previous_hash TEXT;

BEGINADD COLUMN IF NOT EXISTS client_ip TEXT,-- 1. Add new columns-- 1. Add new columns

    -- Get the previous hash (if any)

    SELECT hash INTO previous_hashADD COLUMN IF NOT EXISTS hash_version INT DEFAULT 3;

    FROM public.audit_logs

    WHERE id < NEW.idALTER TABLE public.audit_logsALTER TABLE public.audit_logs

    ORDER BY id DESC

    LIMIT 1;-- 2. Backfill client_ip from ip_address (best effort)



    -- Default to empty string if no previous hashUPDATE public.audit_logs ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.user_sessions(id),ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.user_sessions(id),

    IF previous_hash IS NULL THEN

        previous_hash := '';SET client_ip = ip_address 

    END IF;

WHERE client_ip IS NULL AND ip_address IS NOT NULL;ADD COLUMN IF NOT EXISTS phi_accessed BOOLEAN DEFAULT false,ADD COLUMN IF NOT EXISTS phi_accessed BOOLEAN DEFAULT false,

    -- Construct the data string to hash: previous_hash + timestamp + user_id + action + details + new_fields

    row_data := previous_hash || 

                NEW.timestamp::TEXT || 

                NEW.user_id::TEXT || -- 3. Update retention enforcement (Modify existing function to allow cleanup after 7 years)ADD COLUMN IF NOT EXISTS outcome TEXT CHECK (outcome IN ('success', 'failure', 'denied')),ADD COLUMN IF NOT EXISTS outcome TEXT CHECK (outcome IN ('success', 'failure', 'denied')),

                NEW.action || 

                COALESCE(NEW.details::TEXT, '') ||CREATE OR REPLACE FUNCTION public._audit_logs_block_mod() 

                COALESCE(NEW.session_id::TEXT, '') ||

                COALESCE(NEW.client_ip, '') ||RETURNS TRIGGERADD COLUMN IF NOT EXISTS client_ip TEXT,ADD COLUMN IF NOT EXISTS client_ip TEXT,

                COALESCE(NEW.outcome, '') ||

                NEW.phi_accessed::TEXT;LANGUAGE plpgsql



    -- Calculate SHA-256 hashSECURITY DEFINERADD COLUMN IF NOT EXISTS hash_version INT DEFAULT 3;ADD COLUMN IF NOT EXISTS hash_version INT DEFAULT 1;

    NEW.hash := encode(digest(row_data, 'sha256'), 'hex');

    NEW.hash_version := 3;SET search_path = public



    RETURN NEW;AS $$

END;

$$ LANGUAGE plpgsql SECURITY DEFINER;BEGIN



-- Re-create the trigger if it doesn't exist  IF TG_OP = 'DELETE' THEN-- 2. Backfill client_ip from ip_address (best effort)-- 2. Backfill client_ip from ip_address (best effort)

DROP TRIGGER IF EXISTS set_audit_log_hash ON public.audit_logs;

CREATE TRIGGER set_audit_log_hash    -- Allow deletion ONLY if record is older than 7 years

BEFORE INSERT ON public.audit_logs

FOR EACH ROW    IF OLD.created_at < (NOW() - INTERVAL '7 years') THENUPDATE public.audit_logs UPDATE public.audit_logs 

EXECUTE FUNCTION public.generate_audit_log_hash();

        RETURN OLD;

-- Retention Policy: 7 Years

CREATE OR REPLACE FUNCTION public.enforce_audit_log_retention()    END IF;SET client_ip = ip_address SET client_ip = ip_address 

RETURNS TRIGGER AS $$

BEGIN    RAISE EXCEPTION 'Security Violation: Audit logs cannot be deleted within the 7-year retention period (HIPAA).';

    DELETE FROM public.audit_logs

    WHERE timestamp < NOW() - INTERVAL '7 years';  END IF;WHERE client_ip IS NULL AND ip_address IS NOT NULL;WHERE client_ip IS NULL AND ip_address IS NOT NULL;

    RETURN NULL;

END;

$$ LANGUAGE plpgsql SECURITY DEFINER;

  IF TG_OP = 'UPDATE' THEN

-- Create a scheduled trigger for retention (runs on insert for self-pruning)

DROP TRIGGER IF EXISTS prune_audit_logs ON public.audit_logs;    RAISE EXCEPTION 'Security Violation: Audit logs are immutable and cannot be updated.';

CREATE TRIGGER prune_audit_logs

AFTER INSERT ON public.audit_logs  END IF;-- 3. Update retention enforcement (Modify existing function to allow cleanup after 7 years)-- 3. Update retention enforcement (Modify existing function to allow cleanup after 7 years)

EXECUTE FUNCTION public.enforce_audit_log_retention();

    

  RETURN NULL;CREATE OR REPLACE FUNCTION public._audit_logs_block_mod() CREATE OR REPLACE FUNCTION public._audit_logs_block_mod() 

END

$$;RETURNS TRIGGERRETURNS TRIGGER



-- 4. Update Hash Computation (Version 3)LANGUAGE plpgsqlLANGUAGE plpgsql

CREATE OR REPLACE FUNCTION public._audit_logs_set_hash() 

RETURNS TRIGGERSECURITY DEFINERSECURITY DEFINER

LANGUAGE plpgsql

SECURITY DEFINERSET search_path = publicSET search_path = public

SET search_path = public, private, extensions

AS $$AS $$AS $$

DECLARE

  prev_hash_val text;BEGINBEGIN

  secret_val text;

  payload text;  IF TG_OP = 'DELETE' THEN  IF TG_OP = 'DELETE' THEN

BEGIN

  -- Set version to 3 for new rows    -- Allow deletion ONLY if record is older than 7 years    -- Allow deletion ONLY if record is older than 7 years

  NEW.hash_version := 3;

    IF OLD.created_at < (NOW() - INTERVAL '7 years') THEN    IF OLD.created_at < (NOW() - INTERVAL '7 years') THEN

  -- Get previous hash (last row ordered by id)

  SELECT l.hash INTO prev_hash_val        RETURN OLD;        RETURN OLD;

  FROM public.audit_logs l

  ORDER BY l.id DESC    END IF;    END IF;

  LIMIT 1;

        RAISE EXCEPTION 'Security Violation: Audit logs cannot be deleted within the 7-year retention period (HIPAA).';    RAISE EXCEPTION 'Security Violation: Audit logs cannot be deleted within the 7-year retention period (HIPAA).';

  NEW.prev_hash := COALESCE(prev_hash_val, '');

      END IF;  END IF;

  -- Get secret for this version

  SELECT s.secret INTO secret_val

  FROM private.audit_secrets s

  WHERE s.version = NEW.secret_version;  IF TG_OP = 'UPDATE' THEN  IF TG_OP = 'UPDATE' THEN

    

  IF secret_val IS NULL THEN    RAISE EXCEPTION 'Security Violation: Audit logs are immutable and cannot be updated.';    RAISE EXCEPTION 'Security Violation: Audit logs are immutable and cannot be updated.';

    RAISE EXCEPTION 'Missing audit secret for version %', NEW.secret_version;

  END IF;  END IF;  END IF;

    

  -- Canonical payload (Version 3 - Delimited with new fields)    

  payload := concat_ws('|',

      NEW.prev_hash,  RETURN NULL;  RETURN NULL;

      COALESCE(NEW.user_id::text, 'null'),

      NEW.action,ENDEND

      NEW.resource_type,

      COALESCE(NEW.resource_id::text, 'null'),$$;$$;

      COALESCE(NEW.metadata::text, '{}'),

      (EXTRACT(EPOCH FROM NEW.created_at)::bigint)::text,

      -- New fields for V3

      COALESCE(NEW.session_id::text, 'null'),-- 4. Update Hash Computation (Version 3)-- 4. Update Hash Computation (Version 2)

      COALESCE(NEW.phi_accessed::text, 'false'),

      COALESCE(NEW.outcome, 'null'),CREATE OR REPLACE FUNCTION public._audit_logs_set_hash() CREATE OR REPLACE FUNCTION public._audit_logs_set_hash() 

      COALESCE(NEW.client_ip, 'null')

  );RETURNS TRIGGERRETURNS TRIGGER



  -- Compute HMAC-SHA256 hashLANGUAGE plpgsqlLANGUAGE plpgsql

  NEW.hash := encode(

    extensions.hmac(payload::bytea, convert_to(secret_val, 'utf8'), 'sha256'),SECURITY DEFINERSECURITY DEFINER

    'hex'

  );SET search_path = public, private, extensionsSET search_path = public, private

  

  RETURN NEW;AS $$AS $$

END

$$;DECLAREDECLARE



-- 5. Update Verification Logic (Global) to support V1, V2, and V3  prev_hash_val text;  prev_hash_val text;

CREATE OR REPLACE FUNCTION public.verify_audit_chain(p_user_id uuid DEFAULT NULL)

RETURNS TABLE(  secret_val text;  secret_val text;

  intact boolean,

  total_entries integer,  payload text;  payload text;

  verified_entries integer,

  broken_at_id uuid,BEGINBEGIN

  expected text,

  actual text  -- Set version to 3 for new rows  -- Set version to 2 for new rows

)

LANGUAGE plpgsql  NEW.hash_version := 3;  NEW.hash_version := 2;

SECURITY DEFINER

SET search_path = public, private, extensions

AS $$

DECLARE  -- Get previous hash (last row ordered by id)  -- Get previous hash (last row ordered by id)

  r RECORD;

  prev_hash_val text := '';  SELECT l.hash INTO prev_hash_val  SELECT l.hash INTO prev_hash_val

  vcount int := 0;

  tcount int := 0;  FROM public.audit_logs l  FROM public.audit_logs l

  last_user_id uuid := NULL;

  secret_val text;  ORDER BY l.id DESC  ORDER BY l.id DESC

  expected_hash text;

  payload text;  LIMIT 1;  LIMIT 1;

  payload_v2 text;

  payload_v1 text;    

  expected_hash_v2 text;

  expected_hash_v1 text;  NEW.prev_hash := COALESCE(prev_hash_val, '');  NEW.prev_hash := COALESCE(prev_hash_val, '');

BEGIN

  FOR r IN    

    SELECT *

    FROM public.audit_logs  -- Get secret for this version  -- Get secret for this version

    WHERE p_user_id IS NULL OR user_id = p_user_id

    ORDER BY user_id, created_at, id  SELECT s.secret INTO secret_val  SELECT s.secret INTO secret_val

  LOOP

    tcount := tcount + 1;  FROM private.audit_secrets s  FROM private.audit_secrets s

    

    -- Reset chain at user boundary  WHERE s.version = NEW.secret_version;  WHERE s.version = NEW.secret_version;

    IF last_user_id IS DISTINCT FROM r.user_id THEN

      prev_hash_val := '';    

      last_user_id := r.user_id;

    END IF;  IF secret_val IS NULL THEN  IF secret_val IS NULL THEN



    -- Verify previous hash chain    RAISE EXCEPTION 'Missing audit secret for version %', NEW.secret_version;    RAISE EXCEPTION 'Missing audit secret for version %', NEW.secret_version;

    IF COALESCE(r.prev_hash, '') <> prev_hash_val THEN

      RETURN QUERY SELECT false, tcount, vcount, r.id, prev_hash_val, COALESCE(r.prev_hash, '');  END IF;  END IF;

      RETURN;

    END IF;    



    -- Get secret for this version  -- Canonical payload (Version 3 - Delimited with new fields)  -- Canonical payload (Version 2 includes new fields)

    SELECT s.secret INTO secret_val 

    FROM private.audit_secrets s   payload := concat_ws('|',  payload := NEW.prev_hash

    WHERE s.version = r.secret_version;

          NEW.prev_hash,          || COALESCE(NEW.user_id::text, 'null')

    IF secret_val IS NULL THEN

      RETURN QUERY SELECT false, tcount, vcount, r.id, '<missing secret>', r.secret_version::text;      COALESCE(NEW.user_id::text, 'null'),          || NEW.action

      RETURN;

    END IF;      NEW.action,          || NEW.resource_type



    -- Determine Hash Version      NEW.resource_type,          || COALESCE(NEW.resource_id::text, 'null')

    IF COALESCE(r.hash_version, 0) = 3 THEN

        -- V3 (New Standard)      COALESCE(NEW.resource_id::text, 'null'),          || COALESCE(NEW.metadata::text, '{}')

        payload := concat_ws('|',

            COALESCE(r.prev_hash, ''),      COALESCE(NEW.metadata::text, '{}'),          || EXTRACT(EPOCH FROM NEW.created_at)::bigint

            COALESCE(r.user_id::text, 'null'),

            COALESCE(r.action, ''),      (EXTRACT(EPOCH FROM NEW.created_at)::bigint)::text,          -- New fields for V2

            COALESCE(r.resource_type, ''),

            COALESCE(r.resource_id::text, 'null'),      -- New fields for V3          || COALESCE(NEW.session_id::text, 'null')

            COALESCE(r.metadata::text, '{}'),

            (EXTRACT(EPOCH FROM r.created_at)::bigint)::text,      COALESCE(NEW.session_id::text, 'null'),          || COALESCE(NEW.phi_accessed::text, 'false')

            COALESCE(r.session_id::text, 'null'),

            COALESCE(r.phi_accessed::text, 'false'),      COALESCE(NEW.phi_accessed::text, 'false'),          || COALESCE(NEW.outcome, 'null')

            COALESCE(r.outcome, 'null'),

            COALESCE(r.client_ip, 'null')      COALESCE(NEW.outcome, 'null'),          || COALESCE(NEW.client_ip, 'null');

        );

        expected_hash := encode(      COALESCE(NEW.client_ip, 'null')  

            extensions.hmac(payload::bytea, convert_to(secret_val, 'utf8'), 'sha256'),

            'hex'  );  -- Compute HMAC-SHA256 hash

        );

            NEW.hash := encode(

        IF expected_hash <> r.hash THEN

            RETURN QUERY SELECT false, tcount, vcount, r.id, expected_hash, r.hash;  -- Compute HMAC-SHA256 hash    hmac(payload::bytea, convert_to(secret_val, 'utf8'), 'sha256'),

            RETURN;

        END IF;  NEW.hash := encode(    'hex'



    ELSE    extensions.hmac(payload::bytea, convert_to(secret_val, 'utf8'), 'sha256'),  );

        -- Legacy (V2 or V1)

        -- Try v2 (delimited) first    'hex'  

        payload_v2 := concat_ws('|',

          COALESCE(r.prev_hash, ''),  );  RETURN NEW;

          COALESCE(r.user_id::text, 'null'),

          COALESCE(r.action, ''),  END

          COALESCE(r.resource_type, ''),

          COALESCE(r.resource_id::text, 'null'),  RETURN NEW;$$;

          COALESCE(r.metadata::text, '{}'),

          (EXTRACT(EPOCH FROM r.created_at)::bigint)::textEND

        );

        expected_hash_v2 := encode($$;-- 5. Update Verification Logic to support V1 and V2

          extensions.hmac(payload_v2::bytea, convert_to(secret_val, 'utf8'), 'sha256'),

          'hex'CREATE OR REPLACE FUNCTION public.verify_audit_chain()

        );

-- 5. Update Verification Logic (Global) to support V1, V2, and V3RETURNS TABLE(

        IF expected_hash_v2 <> r.hash THEN

          -- v2 failed, try v1 (legacy, no delimiters)CREATE OR REPLACE FUNCTION public.verify_audit_chain(p_user_id uuid DEFAULT NULL)  intact boolean,

          payload_v1 := COALESCE(r.prev_hash, '')

                      || COALESCE(r.user_id::text, 'null')RETURNS TABLE(  total_entries int,

                      || r.action

                      || r.resource_type  intact boolean,  verified_entries int,

                      || COALESCE(r.resource_id::text, 'null')

                      || COALESCE(r.metadata::text, '{}')  total_entries integer,  broken_at_id uuid,

                      || (EXTRACT(EPOCH FROM r.created_at)::bigint)::text;

  verified_entries integer,  expected text,

          expected_hash_v1 := encode(

            extensions.hmac(payload_v1::bytea, convert_to(secret_val, 'utf8'), 'sha256'),  broken_at_id uuid,  actual text

            'hex'

          );  expected text,)



          IF expected_hash_v1 <> r.hash THEN  actual textLANGUAGE plpgsql

            -- Both algorithms failed - chain broken

            RETURN QUERY SELECT false, tcount, vcount, r.id, expected_hash_v2, r.hash;)SECURITY DEFINER

            RETURN;

          END IF;LANGUAGE plpgsqlSET search_path = public, private

        END IF;

    END IF;SECURITY DEFINERAS $$



    vcount := vcount + 1;SET search_path = public, private, extensionsDECLARE

    prev_hash_val := r.hash;

  END LOOP;AS $$  r RECORD;

  

  RETURN QUERY SELECT true, tcount, vcount, NULL::uuid, NULL::text, NULL::text;DECLARE  prev_hash_val text := '';

END

$$;  r RECORD;  vcount int := 0;



-- 6. Update Verification Logic (Incremental) to support V1, V2, and V3  prev_hash_val text := '';  tcount int := 0;

CREATE OR REPLACE FUNCTION public.verify_audit_chain_incremental(p_user_id uuid)

RETURNS TABLE(  last_user_id uuid := NULL;  secret_val text;

  intact boolean,

  verified_entries integer,  vcount int := 0;  expected_hash text;

  new_cursor_id uuid,

  new_cursor_hash text,  tcount int := 0;  payload text;

  broken_at_id uuid,

  expected text,  secret_val text;BEGIN

  actual text

)  expected_hash text;  FOR r IN

LANGUAGE plpgsql

SECURITY DEFINER  payload text;    SELECT *

SET search_path = public, private, extensions

AS $$  payload_v2 text;    FROM public.audit_logs

DECLARE

  r RECORD;  payload_v1 text;    ORDER BY id

  cur RECORD;

  prev_hash_val text;  expected_hash_v2 text;  LOOP

  vcount int := 0;

  secret_val text;  expected_hash_v1 text;    tcount := tcount + 1;

  expected_hash text;

  payload text;BEGIN    

  payload_v2 text;

  payload_v1 text;  FOR r IN    -- Check previous hash chain

  expected_hash_v2 text;

  expected_hash_v1 text;    SELECT *    IF COALESCE(r.prev_hash, '') <> prev_hash_val THEN

BEGIN

  -- Prevent concurrent runs per-user (safer lock key using hashtextextended)    FROM public.audit_logs      RETURN QUERY SELECT false, tcount, vcount, r.id, prev_hash_val, COALESCE(r.prev_hash, '');

  PERFORM pg_try_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

    WHERE p_user_id IS NULL OR user_id = p_user_id      RETURN;

  -- Get cursor position with lock

  SELECT last_verified_id, last_hash, last_created_at INTO cur    ORDER BY user_id, created_at, id    END IF;

  FROM public.audit_chain_cursor

  WHERE user_id = p_user_id  LOOP    

  FOR UPDATE;

    tcount := tcount + 1;    -- Get secret for this row's version

  prev_hash_val := COALESCE(cur.last_hash, '');

    SELECT s.secret INTO secret_val 

  -- Verify only entries after cursor position using (created_at, id)

  FOR r IN    -- Reset chain at user boundary    FROM private.audit_secrets s 

    SELECT *

    FROM public.audit_logs    IF last_user_id IS DISTINCT FROM r.user_id THEN    WHERE s.version = r.secret_version;

    WHERE user_id = p_user_id

      AND (      prev_hash_val := '';    

        cur.last_created_at IS NULL

        OR (created_at, id) > (cur.last_created_at, cur.last_verified_id)      last_user_id := r.user_id;    IF secret_val IS NULL THEN

      )

    ORDER BY created_at, id    END IF;      RETURN QUERY SELECT false, tcount, vcount, r.id, '<missing secret>', r.secret_version::text;

  LOOP

    -- Verify hash chain      RETURN;

    IF COALESCE(r.prev_hash, '') <> prev_hash_val THEN

      RETURN QUERY SELECT false, vcount, cur.last_verified_id, cur.last_hash, r.id, prev_hash_val, COALESCE(r.prev_hash, '');    -- Verify previous hash chain    END IF;

      RETURN;

    END IF;    IF COALESCE(r.prev_hash, '') <> prev_hash_val THEN    



    -- Get secret      RETURN QUERY SELECT false, tcount, vcount, r.id, prev_hash_val, COALESCE(r.prev_hash, '');    -- Recompute hash based on version

    SELECT s.secret INTO secret_val 

    FROM private.audit_secrets s       RETURN;    IF COALESCE(r.hash_version, 1) = 1 THEN

    WHERE s.version = r.secret_version;

        END IF;        -- V1 Payload

    IF secret_val IS NULL THEN

      RETURN QUERY SELECT false, vcount, cur.last_verified_id, cur.last_hash, r.id, '<missing secret>', r.secret_version::text;        payload := COALESCE(r.prev_hash, '')

      RETURN;

    END IF;    -- Get secret for this version                || COALESCE(r.user_id::text, 'null')



    -- Determine Hash Version    SELECT s.secret INTO secret_val                 || r.action

    IF COALESCE(r.hash_version, 0) = 3 THEN

        -- V3 (New Standard)    FROM private.audit_secrets s                 || r.resource_type

        payload := concat_ws('|',

            COALESCE(r.prev_hash, ''),    WHERE s.version = r.secret_version;                || COALESCE(r.resource_id::text, 'null')

            COALESCE(r.user_id::text, 'null'),

            COALESCE(r.action, ''),                    || COALESCE(r.metadata::text, '{}')

            COALESCE(r.resource_type, ''),

            COALESCE(r.resource_id::text, 'null'),    IF secret_val IS NULL THEN                || EXTRACT(EPOCH FROM r.created_at)::bigint;

            COALESCE(r.metadata::text, '{}'),

            (EXTRACT(EPOCH FROM r.created_at)::bigint)::text,      RETURN QUERY SELECT false, tcount, vcount, r.id, '<missing secret>', r.secret_version::text;    ELSE

            COALESCE(r.session_id::text, 'null'),

            COALESCE(r.phi_accessed::text, 'false'),      RETURN;        -- V2 Payload

            COALESCE(r.outcome, 'null'),

            COALESCE(r.client_ip, 'null')    END IF;        payload := COALESCE(r.prev_hash, '')

        );

        expected_hash := encode(                || COALESCE(r.user_id::text, 'null')

            extensions.hmac(payload::bytea, convert_to(secret_val, 'utf8'), 'sha256'),

            'hex'    -- Determine Hash Version                || r.action

        );

            IF COALESCE(r.hash_version, 0) = 3 THEN                || r.resource_type

        IF expected_hash <> r.hash THEN

            RETURN QUERY SELECT false, vcount, cur.last_verified_id, cur.last_hash, r.id, expected_hash, r.hash;        -- V3 (New Standard)                || COALESCE(r.resource_id::text, 'null')

            RETURN;

        END IF;        payload := concat_ws('|',                || COALESCE(r.metadata::text, '{}')



    ELSE            COALESCE(r.prev_hash, ''),                || EXTRACT(EPOCH FROM r.created_at)::bigint

        -- Legacy (V2 or V1)

        -- Try v2 (delimited) first            COALESCE(r.user_id::text, 'null'),                || COALESCE(r.session_id::text, 'null')

        payload_v2 := concat_ws('|',

          COALESCE(r.prev_hash, ''),            COALESCE(r.action, ''),                || COALESCE(r.phi_accessed::text, 'false')

          COALESCE(r.user_id::text, 'null'),

          COALESCE(r.action, ''),            COALESCE(r.resource_type, ''),                || COALESCE(r.outcome, 'null')

          COALESCE(r.resource_type, ''),

          COALESCE(r.resource_id::text, 'null'),            COALESCE(r.resource_id::text, 'null'),                || COALESCE(r.client_ip, 'null');

          COALESCE(r.metadata::text, '{}'),

          (EXTRACT(EPOCH FROM r.created_at)::bigint)::text            COALESCE(r.metadata::text, '{}'),    END IF;

        );

        expected_hash_v2 := encode(            (EXTRACT(EPOCH FROM r.created_at)::bigint)::text,    

          extensions.hmac(payload_v2::bytea, convert_to(secret_val, 'utf8'), 'sha256'),

          'hex'            COALESCE(r.session_id::text, 'null'),    expected_hash := encode(

        );

            COALESCE(r.phi_accessed::text, 'false'),      hmac(payload::bytea, convert_to(secret_val, 'utf8'), 'sha256'),

        IF expected_hash_v2 <> r.hash THEN

          -- v2 failed, try v1 (legacy)            COALESCE(r.outcome, 'null'),      'hex'

          payload_v1 := COALESCE(r.prev_hash, '')

                      || COALESCE(r.user_id::text, 'null')            COALESCE(r.client_ip, 'null')    );

                      || r.action

                      || r.resource_type        );    

                      || COALESCE(r.resource_id::text, 'null')

                      || COALESCE(r.metadata::text, '{}')        expected_hash := encode(    IF expected_hash <> r.hash THEN

                      || (EXTRACT(EPOCH FROM r.created_at)::bigint)::text;

            extensions.hmac(payload::bytea, convert_to(secret_val, 'utf8'), 'sha256'),      RETURN QUERY SELECT false, tcount, vcount, r.id, expected_hash, r.hash;

          expected_hash_v1 := encode(

            extensions.hmac(payload_v1::bytea, convert_to(secret_val, 'utf8'), 'sha256'),            'hex'      RETURN;

            'hex'

          );        );    END IF;



          IF expected_hash_v1 <> r.hash THEN            

            -- Both algorithms failed

            RETURN QUERY SELECT false, vcount, cur.last_verified_id, cur.last_hash, r.id, expected_hash_v2, r.hash;        IF expected_hash <> r.hash THEN    vcount := vcount + 1;

            RETURN;

          END IF;            RETURN QUERY SELECT false, tcount, vcount, r.id, expected_hash, r.hash;    prev_hash_val := r.hash;

        END IF;

    END IF;            RETURN;  END LOOP;



    vcount := vcount + 1;        END IF;  

    prev_hash_val := r.hash;

    cur.last_verified_id := r.id;  RETURN QUERY SELECT true, tcount, vcount, NULL::uuid, NULL::text, NULL::text;

    cur.last_hash := r.hash;

    cur.last_created_at := r.created_at;    ELSEEND

  END LOOP;

        -- Legacy (V2 or V1)$$;

  -- Update cursor if we verified new entries

  IF vcount > 0 THEN        -- Try v2 (delimited) first

    INSERT INTO public.audit_chain_cursor(user_id, last_verified_id, last_hash, last_created_at, verified_at, updated_at)

    VALUES (p_user_id, cur.last_verified_id, cur.last_hash, cur.last_created_at, now(), now())        payload_v2 := concat_ws('|',-- 6. Ensure Admins can view new columns

    ON CONFLICT (user_id) DO UPDATE

    SET last_verified_id = EXCLUDED.last_verified_id,          COALESCE(r.prev_hash, ''),CREATE POLICY "Admins can view all audit logs"

        last_hash = EXCLUDED.last_hash,

        last_created_at = EXCLUDED.last_created_at,          COALESCE(r.user_id::text, 'null'),    ON public.audit_logs

        verified_at = now(),

        updated_at = now();          COALESCE(r.action, ''),    FOR SELECT

  END IF;

          COALESCE(r.resource_type, ''),    TO authenticated

  RETURN QUERY SELECT true, vcount, cur.last_verified_id, cur.last_hash, NULL::uuid, NULL::text, NULL::text;

END;          COALESCE(r.resource_id::text, 'null'),    USING (

$$;

          COALESCE(r.metadata::text, '{}'),        EXISTS (

-- 7. Ensure Admins can view new columns

CREATE POLICY "Admins can view all audit logs"          (EXTRACT(EPOCH FROM r.created_at)::bigint)::text            SELECT 1 FROM public.user_roles

    ON public.audit_logs

    FOR SELECT        );            WHERE user_id = auth.uid()

    TO authenticated

    USING (        expected_hash_v2 := encode(            AND role = 'admin'

        EXISTS (

            SELECT 1 FROM public.user_roles          extensions.hmac(payload_v2::bytea, convert_to(secret_val, 'utf8'), 'sha256'),        )

            WHERE user_id = auth.uid()

            AND role = 'admin'          'hex'    );

        )

    );        );



-- 8. Add index for session_id-- 7. Add index for session_id

CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON public.audit_logs(session_id);

        IF expected_hash_v2 <> r.hash THENCREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON public.audit_logs(session_id);

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
    END IF;

    vcount := vcount + 1;
    prev_hash_val := r.hash;
  END LOOP;
  
  RETURN QUERY SELECT true, tcount, vcount, NULL::uuid, NULL::text, NULL::text;
END
$$;

-- 6. Update Verification Logic (Incremental) to support V1, V2, and V3
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
  cur RECORD;
  prev_hash_val text;
  vcount int := 0;
  secret_val text;
  expected_hash text;
  payload text;
  payload_v2 text;
  payload_v1 text;
  expected_hash_v2 text;
  expected_hash_v1 text;
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

    -- Determine Hash Version
    IF COALESCE(r.hash_version, 0) = 3 THEN
        -- V3 (New Standard)
        payload := concat_ws('|',
            COALESCE(r.prev_hash, ''),
            COALESCE(r.user_id::text, 'null'),
            COALESCE(r.action, ''),
            COALESCE(r.resource_type, ''),
            COALESCE(r.resource_id::text, 'null'),
            COALESCE(r.metadata::text, '{}'),
            (EXTRACT(EPOCH FROM r.created_at)::bigint)::text,
            COALESCE(r.session_id::text, 'null'),
            COALESCE(r.phi_accessed::text, 'false'),
            COALESCE(r.outcome, 'null'),
            COALESCE(r.client_ip, 'null')
        );
        expected_hash := encode(
            extensions.hmac(payload::bytea, convert_to(secret_val, 'utf8'), 'sha256'),
            'hex'
        );
        
        IF expected_hash <> r.hash THEN
            RETURN QUERY SELECT false, vcount, cur.last_verified_id, cur.last_hash, r.id, expected_hash, r.hash;
            RETURN;
        END IF;

    ELSE
        -- Legacy (V2 or V1)
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

-- 7. Ensure Admins can view new columns
CREATE POLICY "Admins can view all audit logs"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- 8. Add index for session_id
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON public.audit_logs(session_id);
