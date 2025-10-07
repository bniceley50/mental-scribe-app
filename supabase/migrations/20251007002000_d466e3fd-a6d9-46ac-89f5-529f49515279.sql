-- Create the missing check_signup_rate_limit function for secure-signup edge function
-- This was preventing signups from working

CREATE OR REPLACE FUNCTION public.check_signup_rate_limit(
  _ip_address text,
  _max_requests integer DEFAULT 10,
  _window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _window_start timestamptz;
  _current_count integer;
BEGIN
  -- Calculate window start
  _window_start := date_trunc('minute', now());
  
  -- Check current count for this IP in the window
  SELECT COUNT(*) INTO _current_count
  FROM public.rate_limits
  WHERE endpoint = 'secure-signup'
    AND ip_address = _ip_address
    AND window_start > now() - (_window_minutes || ' minutes')::INTERVAL;
  
  -- If under limit, log this attempt and return true
  IF _current_count < _max_requests THEN
    INSERT INTO public.rate_limits (user_id, endpoint, request_count, window_start, ip_address)
    VALUES (
      NULL, -- No user_id for signup attempts
      'secure-signup',
      1,
      _window_start,
      _ip_address
    )
    ON CONFLICT (endpoint, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), window_start)
    DO UPDATE SET 
      request_count = rate_limits.request_count + 1,
      updated_at = now();
    
    RETURN true;
  END IF;
  
  -- Over limit
  RETURN false;
END;
$$;

-- Allow the rate_limits table to accept NULL user_id for signup attempts
ALTER TABLE public.rate_limits ALTER COLUMN user_id DROP NOT NULL;

-- Update the unique constraint to handle NULL user_id properly
-- Drop the old constraint if it exists
ALTER TABLE public.rate_limits DROP CONSTRAINT IF EXISTS rate_limits_user_id_endpoint_window_start_key;

-- Add a new composite index that handles NULLs properly
CREATE UNIQUE INDEX IF NOT EXISTS rate_limits_unique_idx 
ON public.rate_limits (endpoint, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), window_start);

-- Add ip_address column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rate_limits' AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE public.rate_limits ADD COLUMN ip_address text;
  END IF;
END $$;