-- IP-based rate limiting for signup endpoint
-- Prevents abuse of unauthenticated signup function

CREATE TABLE IF NOT EXISTS public.signup_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ip_address, window_start)
);

CREATE INDEX IF NOT EXISTS idx_signup_rate_limits_ip ON public.signup_rate_limits(ip_address, window_start);

-- Cleanup old records
CREATE OR REPLACE FUNCTION public.cleanup_signup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.signup_rate_limits
  WHERE window_start < now() - interval '1 hour';
END;
$$;

-- Check signup rate limit by IP
CREATE OR REPLACE FUNCTION public.check_signup_rate_limit(
  _ip_address text,
  _max_requests integer DEFAULT 5,
  _window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _window_start timestamptz;
  _current_count integer;
BEGIN
  _window_start := date_trunc('hour', now());
  
  SELECT request_count INTO _current_count
  FROM public.signup_rate_limits
  WHERE ip_address = _ip_address
    AND window_start = _window_start
  FOR UPDATE;
  
  IF NOT FOUND THEN
    INSERT INTO public.signup_rate_limits (ip_address, request_count, window_start)
    VALUES (_ip_address, 1, _window_start);
    RETURN true;
  END IF;
  
  IF _current_count >= _max_requests THEN
    RETURN false;
  END IF;
  
  UPDATE public.signup_rate_limits
  SET request_count = request_count + 1
  WHERE ip_address = _ip_address
    AND window_start = _window_start;
  
  RETURN true;
END;
$$;
