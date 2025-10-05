-- Security Fix: Set explicit search_path on all functions to prevent schema injection attacks
-- This ensures functions always resolve objects from the intended schema

-- Fix generate_salt function - add search_path and ensure pgcrypto extension is available
CREATE OR REPLACE FUNCTION public.generate_salt()
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $function$
  SELECT encode(extensions.gen_random_bytes(32), 'hex');
$function$;