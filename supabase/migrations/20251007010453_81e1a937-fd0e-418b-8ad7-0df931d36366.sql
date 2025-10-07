-- Fix RLS policy blocking authenticated inserts on conversations table
-- Change restrictive block policy to apply only to anon (not all roles including authenticated)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pc.relname = 'conversations' AND pol.polname = 'conversations_block_anon_all'
  ) THEN
    DROP POLICY "conversations_block_anon_all" ON public.conversations;
  END IF;
END $$;

-- Recreate as RESTRICTIVE for anon only (not blocking authenticated users)
CREATE POLICY "conversations_block_anon_all"
ON public.conversations
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);