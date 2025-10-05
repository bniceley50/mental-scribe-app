-- Update hash_external_id to use Supabase secret instead of database setting
-- This allows the HMAC key to be managed through Supabase's secrets system
CREATE OR REPLACE FUNCTION public.hash_external_id(raw_id text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hmac_key text;
BEGIN
  -- Try to get from Supabase secret (set via Supabase dashboard/API)
  -- Falls back to current_setting for backwards compatibility
  hmac_key := COALESCE(
    current_setting('app.secrets.hmac_key', true),
    current_setting('app.settings.hmac_key', true),
    'CHANGE-THIS-IN-PRODUCTION-VIA-SUPABASE-SECRETS'
  );
  
  -- Security check: prevent use of default key
  IF hmac_key = 'CHANGE-THIS-IN-PRODUCTION-VIA-SUPABASE-SECRETS' THEN
    RAISE EXCEPTION 'HMAC key not configured. Set HMAC_SECRET_KEY in Supabase secrets.';
  END IF;
  
  RETURN encode(
    hmac(
      raw_id::bytea, 
      hmac_key::bytea, 
      'sha256'
    ), 
    'hex'
  );
END;
$$;