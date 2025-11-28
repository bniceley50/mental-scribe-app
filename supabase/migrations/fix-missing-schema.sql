-- ============================================================================
-- FIX MISSING SCHEMA ELEMENTS
-- This migration adds missing columns and functions to the database
-- ============================================================================

-- Add is_part2_protected column to conversations if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'conversations' 
        AND column_name = 'is_part2_protected'
    ) THEN
        ALTER TABLE public.conversations 
        ADD COLUMN is_part2_protected boolean NOT NULL DEFAULT false;
    END IF;
END $$;

-- Add is_part2 column to programs if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'programs' 
        AND column_name = 'is_part2'
    ) THEN
        ALTER TABLE public.programs 
        ADD COLUMN is_part2 boolean NOT NULL DEFAULT false;
    END IF;
END $$;

-- Create is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'::app_role
  )
$$;

-- Create clear_failed_logins function
CREATE OR REPLACE FUNCTION public.clear_failed_logins(_identifier TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.failed_login_attempts
  WHERE email = _identifier OR ip_address = _identifier;
END;
$$;

-- Create failed_login_attempts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  email text,
  ip_address text NOT NULL,
  attempted_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on failed_login_attempts
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can manage failed login attempts
CREATE POLICY IF NOT EXISTS "Service role can manage failed logins"
ON public.failed_login_attempts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON FUNCTION public.is_admin IS 'Check if user has admin role';
COMMENT ON FUNCTION public.clear_failed_logins IS 'Clear failed login attempts for an identifier';
