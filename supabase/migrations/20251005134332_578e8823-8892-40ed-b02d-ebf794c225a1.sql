-- CRITICAL SECURITY FIX: Block anonymous access to failed login attempts
-- This prevents attackers from identifying which accounts exist and are being targeted
CREATE POLICY "Block all anonymous access to failed login attempts"
ON public.failed_login_attempts
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Also add explicit block for public role as defense in depth
CREATE POLICY "Block public access to failed login attempts"
ON public.failed_login_attempts
AS RESTRICTIVE
FOR ALL
TO public
USING (false);