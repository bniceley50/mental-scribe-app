-- 20251201_audit_secret_hardening.sql-- 20251201_audit_secret_hardening.sql

-- Harden audit chain secret handling and remove literal fallbacks-- PR#1: Secure audit chain secrets & integrity mechanism



-- 1) Centralized secure secret retrieval-- 1) Centralized helper: private.get_audit_secret

CREATE OR REPLACE FUNCTION private.get_audit_secret(p_version int DEFAULT NULL)--    - Single source of truth for audit secrets

RETURNS text--    - Fails CLOSED if secret is missing or still a known placeholder

LANGUAGE plpgsql

SECURITY DEFINERCREATE OR REPLACE FUNCTION private.get_audit_secret(p_version int DEFAULT NULL)

SET search_path = private, publicRETURNS text

AS $$LANGUAGE plpgsql

DECLARESECURITY DEFINER

    v_secret text;SET search_path = private, public

BEGINAS $function$

    IF p_version IS NOT NULL THENDECLARE

        SELECT secret    v_secret text;

        INTO v_secretBEGIN

        FROM private.audit_secrets    -- Retrieve specific version or latest

        WHERE version = p_version;    IF p_version IS NOT NULL THEN

    ELSE        SELECT secret

        SELECT secret        INTO v_secret

        INTO v_secret        FROM private.audit_secrets

        FROM private.audit_secrets        WHERE version = p_version;

        ORDER BY version DESC    ELSE

        LIMIT 1;        SELECT secret

    END IF;        INTO v_secret

        FROM private.audit_secrets

    IF v_secret IS NULL THEN        ORDER BY version DESC

        RAISE EXCEPTION 'Audit secret not provisioned. Integrity check failed.';        LIMIT 1;

    END IF;    END IF;



    IF v_secret IN (    -- FAIL CLOSED: Missing secret

        'CHANGE-THIS-AUDIT-SECRET-IN-PRODUCTION',    IF v_secret IS NULL THEN

        'default-audit-secret-CHANGE-IN-PRODUCTION'        RAISE EXCEPTION

    ) THEN            'Audit secret not provisioned. Integrity check failed.';

        RAISE EXCEPTION 'Security Alert: Audit secret is set to an insecure placeholder. Rotation required.';    END IF;

    END IF;

    -- FAIL CLOSED: Placeholder secret still present

    RETURN v_secret;    IF v_secret IN (

END;        'CHANGE-THIS-AUDIT-SECRET-IN-PRODUCTION',

$$;        'default-audit-secret-CHANGE-IN-PRODUCTION'

    ) THEN

-- 2) Harden public.compute_audit_hash (used by older audit chain)        RAISE EXCEPTION

-- IMPORTANT: keep argument names matching existing RPC call (prev_hash, actor_id, etc)            'Security Alert: Audit secret is set to an insecure placeholder. Rotation required immediately.';

CREATE OR REPLACE FUNCTION public.compute_audit_hash(    END IF;

    prev_hash    TEXT,

    actor_id     UUID,    RETURN v_secret;

    action       TEXT,END;

    resource     TEXT,$function$;

    resource_id  TEXT,

    details      JSONB,

    "timestamp"  TIMESTAMPTZ-- 2) Harden public.compute_audit_hash (original 20251021_audit_chain.sql variant)

)--    - Remove literal fallback

RETURNS TEXT--    - Always draw secret from private.get_audit_secret()

LANGUAGE plpgsql

SECURITY DEFINERCREATE OR REPLACE FUNCTION public.compute_audit_hash(

AS $$    p_prev_hash      TEXT,

DECLARE    p_actor_id       UUID,

    v_secret  TEXT;    p_action         TEXT,

    v_payload TEXT;    p_resource       TEXT,

    v_hash    TEXT;    p_resource_id    TEXT,

BEGIN    p_details        JSONB,

    -- Secure retrieval; fails closed if secret is missing/placeholder    p_timestamp      TIMESTAMPTZ

    v_secret := private.get_audit_secret();)

RETURNS TEXT

    v_payload :=LANGUAGE plpgsql

        COALESCE(prev_hash, '') || '|' ||SECURITY DEFINER

        COALESCE(actor_id::text, 'null') || '|' ||SET search_path = public, private

        action || '|' ||AS $function$

        resource || '|' ||DECLARE

        COALESCE(resource_id, 'null') || '|' ||    v_secret  TEXT;

        COALESCE(details::text, '{}') || '|' ||    v_payload TEXT;

        "timestamp"::text;    v_hash    TEXT;

BEGIN

    v_hash := encode(    -- SECURE RETRIEVAL (replaces literal fallback)

        hmac(v_payload::bytea, v_secret::bytea, 'sha256'),    v_secret := private.get_audit_secret();

        'hex'

    );    -- Construct canonical payload

    v_payload :=

    RETURN v_hash;        COALESCE(p_prev_hash, '') || '|' ||

END;        COALESCE(p_actor_id::text, 'null') || '|' ||

$$;        p_action || '|' ||

        p_resource || '|' ||

-- 3) Harden trigger for audit_logs (newer chain implementation)        COALESCE(p_resource_id, 'null') || '|' ||

CREATE OR REPLACE FUNCTION public._audit_logs_set_hash()        COALESCE(p_details::text, '{}') || '|' ||

RETURNS TRIGGER        p_timestamp::text;

LANGUAGE plpgsql

SECURITY DEFINER    -- Compute HMAC-SHA256

SET search_path = public, private    v_hash := encode(

AS $$        hmac(v_payload::bytea, v_secret::bytea, 'sha256'),

DECLARE        'hex'

    prev_hash_val TEXT;    );

    secret_val    TEXT;

    payload       TEXT;    RETURN v_hash;

BEGINEND;

    -- Previous hash in chain$function$;

    SELECT l.hash

    INTO prev_hash_val

    FROM public.audit_logs l-- 3) Harden public._audit_logs_set_hash (trigger variant from 20251109 migration)

    ORDER BY l.id DESC--    - Uses NEW.secret_version + private.get_audit_secret(version)

    LIMIT 1;--    - Fails CLOSED if invalid/missing/placeholder secret



    NEW.prev_hash := COALESCE(prev_hash_val, '');CREATE OR REPLACE FUNCTION public._audit_logs_set_hash()

RETURNS TRIGGER

    -- Secret for this row’s version; fails if missing/placeholderLANGUAGE plpgsql

    secret_val := private.get_audit_secret(NEW.secret_version);SECURITY DEFINER

SET search_path = public, private

    payload :=AS $function$

        COALESCE(NEW.prev_hash, '') ||DECLARE

        COALESCE(NEW.user_id::text, 'null') ||    prev_hash_val text;

        NEW.action ||    secret_val    text;

        NEW.resource_type ||    payload       text;

        COALESCE(NEW.resource_id::text, 'null') ||BEGIN

        COALESCE(NEW.metadata::text, '{}') ||    -- Get previous hash in the chain

        EXTRACT(EPOCH FROM NEW.created_at)::bigint;    SELECT l.hash

    INTO prev_hash_val

    NEW.hash := encode(    FROM public.audit_logs l

        hmac(payload::bytea, convert_to(secret_val, 'utf8'), 'sha256'),    ORDER BY l.id DESC

        'hex'    LIMIT 1;

    );

    NEW.prev_hash := COALESCE(prev_hash_val, '');

    RETURN NEW;

END;    -- SECURE RETRIEVAL

$$;    -- Uses the version specified in the row; will fail closed on placeholder/missing

    secret_val := private.get_audit_secret(NEW.secret_version);

-- 4) Harden verify_audit_chain to use secure secret retrieval and fail closed

CREATE OR REPLACE FUNCTION public.verify_audit_chain()    -- Canonical payload

RETURNS TABLE(    payload :=

    intact           boolean,        COALESCE(NEW.prev_hash, '') ||

    total_entries    int,        COALESCE(NEW.user_id::text, 'null') ||

    verified_entries int,        NEW.action ||

    broken_at_id     uuid,        NEW.resource_type ||

    expected         text,        COALESCE(NEW.resource_id::text, 'null') ||

    actual           text        COALESCE(NEW.metadata::text, '{}') ||

)        EXTRACT(EPOCH FROM NEW.created_at)::bigint;

LANGUAGE plpgsql

SECURITY DEFINER    -- Compute HMAC-SHA256 hash

SET search_path = public, private    NEW.hash := encode(

AS $$        hmac(payload::bytea, convert_to(secret_val, 'utf8'), 'sha256'),

DECLARE        'hex'

    r             RECORD;    );

    prev_hash_val TEXT := '';

    vcount        int := 0;    RETURN NEW;

    tcount        int := 0;END;

    secret_val    TEXT;$function$;

    expected_hash TEXT;

    payload       TEXT;

BEGIN-- 4) Harden public.verify_audit_chain()

    FOR r IN--    - Uses private.get_audit_secret(secret_version)

        SELECT *--    - If secret is missing/placeholder, verification fails with clear explanation

        FROM public.audit_logs--    - Otherwise verifies the chain end-to-end

        ORDER BY id

    LOOPCREATE OR REPLACE FUNCTION public.verify_audit_chain()

        tcount := tcount + 1;RETURNS TABLE (

    intact           boolean,

        -- Check link to previous hash    total_entries    int,

        IF COALESCE(r.prev_hash, '') <> prev_hash_val THEN    verified_entries int,

            RETURN QUERY SELECT false, tcount, vcount, r.id, prev_hash_val, COALESCE(r.prev_hash, '');    broken_at_id     uuid,

            RETURN;    expected         text,

        END IF;    actual           text

)

        -- Secure secret retrieval; surface secret problems as verification failuresLANGUAGE plpgsql

        BEGINSECURITY DEFINER

            secret_val := private.get_audit_secret(r.secret_version);SET search_path = public, private

        EXCEPTION WHEN OTHERS THENAS $function$

            RETURN QUERY SELECT false, tcount, vcount, r.id, '<secret error>', SQLERRM;DECLARE

            RETURN;    r             RECORD;

        END;    prev_hash_val text   := '';

    vcount        int    := 0;

        payload :=    tcount        int    := 0;

            COALESCE(r.prev_hash, '') ||    secret_val    text;

            COALESCE(r.user_id::text, 'null') ||    expected_hash text;

            r.action ||    payload       text;

            r.resource_type ||BEGIN

            COALESCE(r.resource_id::text, 'null') ||    FOR r IN

            COALESCE(r.metadata::text, '{}') ||        SELECT *

            EXTRACT(EPOCH FROM r.created_at)::bigint;        FROM public.audit_logs

        ORDER BY id

        expected_hash := encode(    LOOP

            hmac(payload::bytea, convert_to(secret_val, 'utf8'), 'sha256'),        tcount := tcount + 1;

            'hex'

        );        -- Verify previous-hash linkage

        IF COALESCE(r.prev_hash, '') <> prev_hash_val THEN

        IF expected_hash <> r.hash THEN            RETURN QUERY

            RETURN QUERY SELECT false, tcount, vcount, r.id, expected_hash, r.hash;                SELECT false, tcount, vcount, r.id,

            RETURN;                       prev_hash_val,

        END IF;                       COALESCE(r.prev_hash, '');

            RETURN;

        vcount        := vcount + 1;        END IF;

        prev_hash_val := r.hash;

    END LOOP;        -- SECURE SECRET RETRIEVAL

        BEGIN

    RETURN QUERY SELECT true, tcount, vcount, NULL::uuid, NULL::text, NULL::text;            secret_val := private.get_audit_secret(r.secret_version);

END;        EXCEPTION WHEN OTHERS THEN

$$;            -- If the secret is missing or placeholder, treat as verification failure

            RETURN QUERY

-- 5) Safety guard: block deploy if secrets are missing or still placeholders                SELECT false, tcount, vcount, r.id,

DO $$                       '<secret error>',

BEGIN                       SQLERRM;

    IF EXISTS (            RETURN;

        SELECT 1        END;

        FROM private.audit_secrets

        WHERE secret IN (        -- Recompute hash

            'CHANGE-THIS-AUDIT-SECRET-IN-PRODUCTION',        payload :=

            'default-audit-secret-CHANGE-IN-PRODUCTION'            COALESCE(r.prev_hash, '') ||

        )            COALESCE(r.user_id::text, 'null') ||

    ) THEN            r.action ||

        RAISE EXCEPTION            r.resource_type ||

            'CRITICAL: Audit secrets table contains placeholder values. Rotate secrets before applying this migration.';            COALESCE(r.resource_id::text, 'null') ||

    END IF;            COALESCE(r.metadata::text, '{}') ||

            EXTRACT(EPOCH FROM r.created_at)::bigint;

    IF NOT EXISTS (SELECT 1 FROM private.audit_secrets) THEN

        RAISE EXCEPTION        expected_hash := encode(

            'CRITICAL: No audit secrets found. Provision a real secret in private.audit_secrets before applying this migration.';            hmac(payload::bytea, convert_to(secret_val, 'utf8'), 'sha256'),

    END IF;            'hex'

END;        );

$$;

        IF expected_hash <> r.hash THEN
            RETURN QUERY
                SELECT false, tcount, vcount, r.id,
                       expected_hash,
                       r.hash;
            RETURN;
        END IF;

        vcount        := vcount + 1;
        prev_hash_val := r.hash;
    END LOOP;

    RETURN QUERY
        SELECT true, tcount, vcount, NULL::uuid, NULL::text, NULL::text;
END;
$function$;


-- 5) Safety guard: block deploy if the environment is still using placeholders
--    This forces operators to rotate secrets BEFORE hardening lands.

DO $block$
BEGIN
    -- Abort if any placeholder secrets still exist
    IF EXISTS (
        SELECT 1
        FROM private.audit_secrets
        WHERE secret IN (
            'CHANGE-THIS-AUDIT-SECRET-IN-PRODUCTION',
            'default-audit-secret-CHANGE-IN-PRODUCTION'
        )
    ) THEN
        RAISE EXCEPTION
            'CRITICAL: private.audit_secrets contains placeholder values. Rotate audit secrets before applying 20251201_audit_secret_hardening.';
    END IF;

    -- Abort if no secrets exist at all
    IF NOT EXISTS (SELECT 1 FROM private.audit_secrets) THEN
        RAISE EXCEPTION
            'CRITICAL: No audit secrets found. Provision a secret before applying 20251201_audit_secret_hardening.';
    END IF;
END;
$block$;
