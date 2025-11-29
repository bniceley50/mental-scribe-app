-- Fix restrictive messages block that was applied to public/authenticated traffic.
-- Keep anon fully blocked while allowing authenticated users to rely on allow policies.

-- Clean up prior block definitions.
DROP POLICY IF EXISTS "messages_block_anon_all" ON public.messages;
DROP POLICY IF EXISTS "Block all anonymous access to messages" ON public.messages;

-- Recreate anon-only restrictive block.
CREATE POLICY "messages_block_anon_all"
ON public.messages
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

