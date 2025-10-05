-- SECURITY CONSOLIDATION: Rebuild clients table RLS policies
-- Remove overlapping policies and create a clear, minimal security model

-- Step 1: Drop all existing policies on clients table
DROP POLICY IF EXISTS "Absolute block for anonymous access to clients" ON public.clients;
DROP POLICY IF EXISTS "Block all anonymous access to clients" ON public.clients;
DROP POLICY IF EXISTS "Block public access to clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can view all clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can create their own clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can delete their own clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Clinical staff can view program clients" ON public.clients;
DROP POLICY IF EXISTS "Service role must use RLS for clients" ON public.clients;

-- Step 2: Create consolidated, minimal policy set

-- RESTRICTIVE: Absolute block for anonymous/public access (defense in depth)
CREATE POLICY "clients_anonymous_block"
ON public.clients
AS RESTRICTIVE
FOR ALL
TO anon, public
USING (false);

-- PERMISSIVE: Owner access - users manage their own client records
CREATE POLICY "clients_owner_all"
ON public.clients
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- PERMISSIVE: Admin access - admins can view all clients
CREATE POLICY "clients_admin_select"
ON public.clients
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- PERMISSIVE: Clinical staff access - scoped to assigned program only
-- This ensures clinical staff can ONLY see clients in programs where they are assigned
CREATE POLICY "clients_clinical_staff_select"
ON public.clients
FOR SELECT
TO authenticated
USING (
  program_id IS NOT NULL 
  AND is_clinical_staff(auth.uid(), program_id)
);

-- Step 3: Add audit comment
COMMENT ON TABLE public.clients IS 'Protected Health Information (PHI) table. RLS policies consolidated Oct 2025 to ensure: (1) Anonymous access blocked, (2) Users access own records, (3) Admins access all, (4) Clinical staff access only assigned programs';