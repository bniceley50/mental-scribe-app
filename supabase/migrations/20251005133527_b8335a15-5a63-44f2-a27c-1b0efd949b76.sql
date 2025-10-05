-- Create MFA recovery codes table
CREATE TABLE public.mfa_recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS on MFA recovery codes
ALTER TABLE public.mfa_recovery_codes ENABLE ROW LEVEL SECURITY;

-- Users can view their own recovery codes
CREATE POLICY "Users can view their own recovery codes"
ON public.mfa_recovery_codes
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own recovery codes
CREATE POLICY "Users can create their own recovery codes"
ON public.mfa_recovery_codes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can mark their own codes as used
CREATE POLICY "Users can update their own recovery codes"
ON public.mfa_recovery_codes
FOR UPDATE
USING (auth.uid() = user_id);

-- Create failed login attempts tracking table
CREATE TABLE public.failed_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email TEXT,
  ip_address TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for failed login attempts
CREATE INDEX idx_failed_logins_user_time ON public.failed_login_attempts(user_id, attempted_at);
CREATE INDEX idx_failed_logins_email_time ON public.failed_login_attempts(email, attempted_at);
CREATE INDEX idx_failed_logins_ip_time ON public.failed_login_attempts(ip_address, attempted_at);

-- Enable RLS on failed login attempts
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;

-- Only admins can view failed login attempts
CREATE POLICY "Only admins can view failed login attempts"
ON public.failed_login_attempts
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Service role can insert failed login attempts
CREATE POLICY "Service role can insert failed login attempts"
ON public.failed_login_attempts
FOR INSERT
WITH CHECK (true);

-- Create function to check if account is locked
CREATE OR REPLACE FUNCTION public.is_account_locked(_identifier TEXT, _lockout_minutes INTEGER DEFAULT 15)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) >= 5
  FROM public.failed_login_attempts
  WHERE (email = _identifier OR ip_address = _identifier)
    AND attempted_at > now() - (_lockout_minutes || ' minutes')::INTERVAL;
$$;

-- Create function to record failed login
CREATE OR REPLACE FUNCTION public.record_failed_login(_user_id UUID, _email TEXT, _ip_address TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.failed_login_attempts (user_id, email, ip_address)
  VALUES (_user_id, _email, _ip_address);
$$;

-- Create function to clear failed login attempts on successful login
CREATE OR REPLACE FUNCTION public.clear_failed_logins(_identifier TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.failed_login_attempts
  WHERE email = _identifier OR ip_address = _identifier;
$$;

-- Create cleanup job for old failed login attempts (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_failed_logins()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.failed_login_attempts
  WHERE attempted_at < now() - INTERVAL '24 hours';
END;
$$;