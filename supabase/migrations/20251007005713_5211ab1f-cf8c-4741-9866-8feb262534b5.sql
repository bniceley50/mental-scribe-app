-- Fix RLS policy causing authenticated inserts to be blocked on clients table
-- Change restrictive block policy to apply only to anon (not public)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pc.relname = 'clients' AND pol.polname = 'clients_block_anon_all'
  ) THEN
    DROP POLICY "clients_block_anon_all" ON public.clients;
  END IF;
END $$;

-- Recreate as RESTRICTIVE for anon only
CREATE POLICY "clients_block_anon_all"
ON public.clients
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Ensure owner insert/update policies remain intact (no-op if they already exist)
-- Note: These are not recreated here to avoid changing behavior; only the blocking policy is corrected.