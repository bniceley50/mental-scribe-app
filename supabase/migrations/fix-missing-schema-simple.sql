-- ============================================================================
-- FIX MISSING SCHEMA ELEMENTS - SIMPLIFIED VERSION
-- This migration adds only the missing columns and functions
-- Run this in the Supabase SQL Editor
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

COMMENT ON FUNCTION public.is_admin IS 'Check if user has admin role';
COMMENT ON FUNCTION public.clear_failed_logins IS 'Clear failed login attempts for an identifier';
