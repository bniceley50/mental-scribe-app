-- Fix CRITICAL security issue: programs table publicly readable
-- Drop the overly permissive public access policy
DROP POLICY IF EXISTS "Anyone can view programs" ON public.programs;

-- Create a secure policy: authenticated users can only view programs they're members of or if they're admins
CREATE POLICY "Authenticated users can view their programs" 
ON public.programs 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_program_member(auth.uid(), id)
);