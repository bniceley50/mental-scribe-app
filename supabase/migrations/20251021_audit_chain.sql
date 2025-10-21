-- Migration: Tamper-Evident Audit Log Chain
-- Description: Creates an immutable audit chain using HMAC hashing
-- Author: Mental Scribe Team
-- Date: 2025-10-21

-- Create audit_chain table
CREATE TABLE IF NOT EXISTS public.audit_chain (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id UUID,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id TEXT,
    details JSONB DEFAULT '{}',
    prev_hash TEXT,
    hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX idx_audit_chain_timestamp ON public.audit_chain(timestamp DESC);
CREATE INDEX idx_audit_chain_actor ON public.audit_chain(actor_id);
CREATE INDEX idx_audit_chain_resource ON public.audit_chain(resource);
CREATE INDEX idx_audit_chain_hash ON public.audit_chain(hash);

-- Enable RLS
ALTER TABLE public.audit_chain ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users can read audit logs
CREATE POLICY "Users can read audit logs"
    ON public.audit_chain
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Only system/admin can insert (will be done via trigger/function)
CREATE POLICY "System can insert audit logs"
    ON public.audit_chain
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Create function to get the last hash
CREATE OR REPLACE FUNCTION public.get_last_audit_hash()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    last_hash TEXT;
BEGIN
    SELECT hash INTO last_hash
    FROM public.audit_chain
    ORDER BY id DESC
    LIMIT 1;
    
    RETURN COALESCE(last_hash, '');
END;
$$;

-- Create function to compute audit chain hash
CREATE OR REPLACE FUNCTION public.compute_audit_hash(
    p_prev_hash TEXT,
    p_actor_id UUID,
    p_action TEXT,
    p_resource TEXT,
    p_resource_id TEXT,
    p_details JSONB,
    p_timestamp TIMESTAMPTZ
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_secret TEXT;
    v_payload TEXT;
    v_hash TEXT;
BEGIN
    -- Get secret from vault or use environment variable
    -- In production, this should come from Supabase Vault
    v_secret := current_setting('app.settings.audit_secret', true);
    IF v_secret IS NULL THEN
        v_secret := 'default-audit-secret-CHANGE-IN-PRODUCTION';
    END IF;
    
    -- Construct payload
    v_payload := p_prev_hash || '|' ||
                COALESCE(p_actor_id::text, 'null') || '|' ||
                p_action || '|' ||
                p_resource || '|' ||
                COALESCE(p_resource_id, 'null') || '|' ||
                COALESCE(p_details::text, '{}') || '|' ||
                p_timestamp::text;
    
    -- Compute HMAC-SHA256
    v_hash := encode(
        hmac(v_payload::bytea, v_secret::bytea, 'sha256'),
        'hex'
    );
    
    RETURN v_hash;
END;
$$;

-- Create trigger function for audit chain
CREATE OR REPLACE FUNCTION public.audit_chain_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_prev_hash TEXT;
BEGIN
    -- Get the previous hash
    v_prev_hash := public.get_last_audit_hash();
    
    -- Set prev_hash
    NEW.prev_hash := v_prev_hash;
    
    -- Compute and set hash
    NEW.hash := public.compute_audit_hash(
        NEW.prev_hash,
        NEW.actor_id,
        NEW.action,
        NEW.resource,
        NEW.resource_id,
        NEW.details,
        NEW.timestamp
    );
    
    RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS audit_chain_before_insert ON public.audit_chain;
CREATE TRIGGER audit_chain_before_insert
    BEFORE INSERT ON public.audit_chain
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_chain_trigger();

-- Create helper function to add audit entries
CREATE OR REPLACE FUNCTION public.add_audit_entry(
    p_actor_id UUID,
    p_action TEXT,
    p_resource TEXT,
    p_resource_id TEXT DEFAULT NULL,
    p_details JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id INTEGER;
BEGIN
    INSERT INTO public.audit_chain (
        actor_id,
        action,
        resource,
        resource_id,
        details,
        timestamp
    ) VALUES (
        p_actor_id,
        p_action,
        p_resource,
        p_resource_id,
        p_details,
        NOW()
    ) RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$;

-- Grant necessary permissions
GRANT SELECT ON public.audit_chain TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_audit_entry TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_last_audit_hash TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_audit_hash TO authenticated;

-- Add comment
COMMENT ON TABLE public.audit_chain IS 'Tamper-evident audit log chain using HMAC-SHA256 hashing';
COMMENT ON FUNCTION public.compute_audit_hash IS 'Computes HMAC-SHA256 hash for audit chain entry';
COMMENT ON FUNCTION public.add_audit_entry IS 'Helper function to add entries to the audit chain';
