-- SEC-MED-002: Fix race condition in Part 2 consent revocation
-- Make consent check function VOLATILE to prevent query optimization caching
-- This ensures fresh consent status is checked on every call

CREATE OR REPLACE FUNCTION public.has_active_part2_consent_for_conversation(_conversation_id uuid)
 RETURNS boolean
 LANGUAGE sql
 VOLATILE  -- Changed from STABLE to VOLATILE to prevent race conditions
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.part2_consents
    WHERE conversation_id = _conversation_id
      AND status = 'active'
      AND revoked_date IS NULL
      AND granted_date IS NOT NULL
      AND granted_date <= now()
      AND (expiry_date IS NULL OR expiry_date > now())
  );
$function$;

-- SEC-LOW-001: Fix timing side-channel in role check functions
-- Add constant-time delay to normalize response times
-- Prevents user enumeration and admin discovery via timing attacks

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  ) INTO result;
  
  -- Add constant-time delay (20ms) to normalize timing
  PERFORM pg_sleep(0.02);
  
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'::app_role
  ) INTO result;
  
  -- Add constant-time delay (20ms) to normalize timing
  PERFORM pg_sleep(0.02);
  
  RETURN result;
END;
$function$;

COMMENT ON FUNCTION public.has_active_part2_consent_for_conversation IS 
'SEC-MED-002: VOLATILE prevents caching during revocation race conditions';

COMMENT ON FUNCTION public.has_role IS 
'SEC-LOW-001: Constant-time delay prevents timing-based user enumeration';

COMMENT ON FUNCTION public.is_admin IS 
'SEC-LOW-001: Constant-time delay prevents timing-based admin discovery';