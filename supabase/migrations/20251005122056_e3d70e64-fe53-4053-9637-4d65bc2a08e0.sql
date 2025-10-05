-- Fix RLS policies for clients table to prevent PHI exposure
-- Current issue: All policies are RESTRICTIVE and the "Block all anonymous" policy 
-- uses false which when ANDed with other policies blocks ALL access

-- Step 1: Drop existing restrictive policies
DROP POLICY IF EXISTS "Block all anonymous access to clients" ON public.clients;
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can view all clients" ON public.clients;
DROP POLICY IF EXISTS "Clinical staff can view program clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;

-- Step 2: Create PERMISSIVE policies with explicit authentication checks
-- These use OR logic, so at least ONE must pass, providing flexible access control

-- SELECT policies (OR logic - user must match ONE of these conditions)
CREATE POLICY "Authenticated users can view their own clients"
ON public.clients
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins can view all clients"
ON public.clients
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clinical staff can view program clients"
ON public.clients
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND program_id IS NOT NULL 
  AND is_clinical_staff(auth.uid(), program_id)
);

-- INSERT policies
CREATE POLICY "Authenticated users can create their own clients"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- UPDATE policies
CREATE POLICY "Authenticated users can update their own clients"
ON public.clients
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- DELETE policies
CREATE POLICY "Authenticated users can delete their own clients"
ON public.clients
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Step 3: Add a final RESTRICTIVE policy to absolutely block anonymous access
-- This is a safety net - even if someone bypasses authentication, they get blocked
CREATE POLICY "Absolute block for anonymous access to clients"
ON public.clients
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Verify RLS is enabled (should already be, but ensuring it)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner (important security measure)
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;