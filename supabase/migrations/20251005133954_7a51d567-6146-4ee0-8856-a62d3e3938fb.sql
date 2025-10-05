-- Add restrictive DELETE policy for MFA recovery codes
-- This prevents accidental deletion while allowing controlled removal if needed
CREATE POLICY "Users can delete their own recovery codes only if already used"
ON public.mfa_recovery_codes
FOR DELETE
USING (auth.uid() = user_id AND used_at IS NOT NULL);

-- Add policy to prevent updates once used
CREATE POLICY "Recovery codes cannot be updated once used"
ON public.mfa_recovery_codes
FOR UPDATE
USING (auth.uid() = user_id AND used_at IS NULL);