-- =============================================================================
-- SECURITY HARDENING - Part 2 (Corrected)
-- Drop and recreate quota function with secure signature
-- =============================================================================

-- ==================== DROP OLD INSECURE FUNCTION ====================
DROP FUNCTION IF EXISTS public.check_and_increment_quota(uuid, text, integer);

-- ==================== CREATE SECURE QUOTA FUNCTION ====================
-- No user_id parameter - derive internally from auth.uid()
CREATE OR REPLACE FUNCTION public.check_and_increment_quota(
  _quota_type text,
  _increment integer DEFAULT 1
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _limit integer;
  _usage integer;
BEGIN
  -- Ensure authenticated
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get or create quota record with default limits
  INSERT INTO public.tenant_quotas (user_id, quota_type, limit_value, current_usage, reset_at)
  VALUES (
    _uid, 
    _quota_type,
    CASE _quota_type
      WHEN 'llm_tokens' THEN 1000000
      WHEN 'stt_minutes' THEN 600
      WHEN 'api_calls' THEN 10000
      ELSE 1000
    END,
    0,
    now() + interval '1 month' + (random() * interval '10 minutes')
  )
  ON CONFLICT (user_id, quota_type) DO NOTHING;

  -- Reset if expired (with row lock)
  UPDATE public.tenant_quotas
  SET current_usage = 0, 
      reset_at = now() + interval '1 month' + (random() * interval '10 minutes'),
      updated_at = now()
  WHERE user_id = _uid 
    AND quota_type = _quota_type 
    AND reset_at < now();

  -- Get current values with FOR UPDATE lock
  SELECT limit_value, current_usage INTO _limit, _usage
  FROM public.tenant_quotas
  WHERE user_id = _uid AND quota_type = _quota_type
  FOR UPDATE;

  -- Check if over limit
  IF _usage + _increment > _limit THEN
    RETURN false;
  END IF;

  -- Increment usage
  UPDATE public.tenant_quotas
  SET current_usage = current_usage + _increment,
      updated_at = now()
  WHERE user_id = _uid AND quota_type = _quota_type;

  RETURN true;
END;
$$;

-- Restrict function execution to authenticated users only
REVOKE ALL ON FUNCTION public.check_and_increment_quota(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_increment_quota(text, integer) TO authenticated;

-- ==================== LOCK DOWN QUOTAS TABLE ====================
-- Revoke direct modification rights
REVOKE INSERT, UPDATE, DELETE ON public.tenant_quotas FROM anon, authenticated;

-- Drop insecure update policy
DROP POLICY IF EXISTS "Users can update their own quota usage" ON public.tenant_quotas;