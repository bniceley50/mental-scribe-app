-- Fix VULN: API Rate Limiting Can Be Bypassed by Attackers
-- Replace overly permissive service_role policy with restrictive access

-- Drop the overly permissive policy on rate_limits
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limits;

-- Add restrictive policy: Block all direct user access to rate_limits
CREATE POLICY "Block all direct access to rate_limits"
ON public.rate_limits
FOR ALL
TO public, authenticated, anon
USING (false)
WITH CHECK (false);

-- Allow service_role access only through RPC functions
CREATE POLICY "Service role rate limit access via RPC only"
ON public.rate_limits
FOR ALL
TO service_role
USING (
  -- Only allow access when called from SECURITY DEFINER functions
  current_setting('search_path', true) = 'public'
)
WITH CHECK (
  current_setting('search_path', true) = 'public'
);

-- Add audit logging trigger for rate limit changes
CREATE OR REPLACE FUNCTION public.audit_rate_limit_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log rate limit modifications to audit_logs
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      resource_type,
      resource_id,
      metadata
    ) VALUES (
      NEW.user_id,
      'rate_limit_created',
      'rate_limit',
      NEW.id,
      jsonb_build_object(
        'endpoint', NEW.endpoint,
        'window_start', NEW.window_start,
        'request_count', NEW.request_count
      )
    );
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      resource_type,
      resource_id,
      metadata
    ) VALUES (
      NEW.user_id,
      'rate_limit_updated',
      'rate_limit',
      NEW.id,
      jsonb_build_object(
        'endpoint', NEW.endpoint,
        'window_start', NEW.window_start,
        'old_count', OLD.request_count,
        'new_count', NEW.request_count
      )
    );
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      resource_type,
      resource_id,
      metadata
    ) VALUES (
      OLD.user_id,
      'rate_limit_deleted',
      'rate_limit',
      OLD.id,
      jsonb_build_object(
        'endpoint', OLD.endpoint,
        'window_start', OLD.window_start,
        'request_count', OLD.request_count
      )
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS audit_rate_limit_changes_trigger ON public.rate_limits;
CREATE TRIGGER audit_rate_limit_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.rate_limits
FOR EACH ROW
EXECUTE FUNCTION public.audit_rate_limit_changes();