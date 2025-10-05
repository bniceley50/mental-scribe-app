-- CRITICAL SECURITY FIX: Block anonymous access to MFA recovery codes
-- This prevents attackers from bypassing two-factor authentication

CREATE POLICY "Block all anonymous access to mfa recovery codes"
ON public.mfa_recovery_codes
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Also block public role as defense in depth
CREATE POLICY "Block public access to mfa recovery codes"
ON public.mfa_recovery_codes
AS RESTRICTIVE
FOR ALL
TO public
USING (false);