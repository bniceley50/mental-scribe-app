-- Optional Security Enhancements
-- 1. Add explicit anonymous block policy to rate_limit_configs (defense-in-depth)
CREATE POLICY "rate_limit_configs_block_anon_all"
ON public.rate_limit_configs AS RESTRICTIVE
FOR ALL TO anon, public
USING (false)
WITH CHECK (false);

-- 2. Password History Prevention Infrastructure
CREATE TABLE IF NOT EXISTS public.password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on password_history
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;

-- Block all anonymous access to password history
CREATE POLICY "password_history_block_anon_all"
ON public.password_history AS RESTRICTIVE
FOR ALL TO anon, public
USING (false)
WITH CHECK (false);

-- Only admins can view password history (for compliance audits)
CREATE POLICY "password_history_admin_select"
ON public.password_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert password history (via edge functions)
CREATE POLICY "password_history_service_insert"
ON public.password_history
FOR INSERT
WITH CHECK (true);

-- Password history is immutable (cannot be updated or deleted)
CREATE POLICY "password_history_immutable_updates"
ON public.password_history
FOR UPDATE
USING (false);

CREATE POLICY "password_history_immutable_deletes"
ON public.password_history
FOR DELETE
USING (false);

-- Index for efficient password history lookups
CREATE INDEX IF NOT EXISTS idx_password_history_user_id 
ON public.password_history(user_id, created_at DESC);

-- Function to check if password was used recently (last 5 passwords)
CREATE OR REPLACE FUNCTION public.check_password_history(
  _user_id uuid,
  _new_password_hash text,
  _history_limit integer DEFAULT 5
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _exists boolean;
BEGIN
  -- Check if the password hash exists in recent history
  SELECT EXISTS (
    SELECT 1
    FROM public.password_history
    WHERE user_id = _user_id
      AND password_hash = _new_password_hash
    ORDER BY created_at DESC
    LIMIT _history_limit
  ) INTO _exists;
  
  RETURN _exists;
END;
$$;

-- Function to add password to history
CREATE OR REPLACE FUNCTION public.add_password_to_history(
  _user_id uuid,
  _password_hash text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.password_history (user_id, password_hash)
  VALUES (_user_id, _password_hash);
$$;

-- Function to cleanup old password history (keep only last 10)
CREATE OR REPLACE FUNCTION public.cleanup_old_password_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.password_history
  WHERE id IN (
    SELECT id
    FROM (
      SELECT id, 
             ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
      FROM public.password_history
    ) numbered
    WHERE rn > 10
  );
END;
$$;