-- Enhance security with session configuration and improved rate limiting

-- Add session timeout tracking
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  ip_address text,
  user_agent text
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only view their own sessions
CREATE POLICY "Users can view own sessions"
ON public.user_sessions
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can manage sessions
CREATE POLICY "Service role can manage sessions"
ON public.user_sessions
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_sessions
  WHERE expires_at < now();
END;
$$;

-- Function to update session activity
CREATE OR REPLACE FUNCTION public.update_session_activity(_session_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_sessions
  SET last_activity_at = now(),
      expires_at = now() + interval '30 minutes'
  WHERE session_token = _session_token
    AND expires_at > now();
END;
$$;

-- Enhanced rate limiting with configurable thresholds
CREATE TABLE IF NOT EXISTS public.rate_limit_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL UNIQUE,
  max_requests integer NOT NULL DEFAULT 10,
  window_minutes integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limit_configs ENABLE ROW LEVEL SECURITY;

-- Only admins can manage rate limit configs
CREATE POLICY "Only admins can manage rate limit configs"
ON public.rate_limit_configs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default rate limit configurations
INSERT INTO public.rate_limit_configs (endpoint, max_requests, window_minutes)
VALUES 
  ('auth/signin', 5, 15),
  ('auth/signup', 3, 60),
  ('api/analyze-notes', 20, 1),
  ('api/voice-capture', 60, 1)
ON CONFLICT (endpoint) DO NOTHING;