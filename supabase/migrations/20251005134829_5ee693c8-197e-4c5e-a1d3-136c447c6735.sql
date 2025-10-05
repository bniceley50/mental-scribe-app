-- CRITICAL SECURITY FIX: Add restrictive anonymous blocks for PHI tables
-- Only adding policies that don't already exist

-- Block anonymous access to clients table (PHI)
CREATE POLICY "Block all anonymous access to clients"
ON public.clients
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Block public role access to clients table
CREATE POLICY "Block public access to clients"
ON public.clients
AS RESTRICTIVE
FOR ALL
TO public
USING (false);

-- Block anonymous access to patient_identity_links
CREATE POLICY "Block all anonymous access to patient identity links"
ON public.patient_identity_links
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Block public role access to patient_identity_links
CREATE POLICY "Block public access to patient identity links"
ON public.patient_identity_links
AS RESTRICTIVE
FOR ALL
TO public
USING (false);