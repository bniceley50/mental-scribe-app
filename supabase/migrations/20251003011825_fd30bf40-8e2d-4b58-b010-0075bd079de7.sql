-- Review message immutability: Drop UPDATE policy on messages table
-- Clinical notes should maintain an immutable audit trail for compliance
DROP POLICY IF EXISTS "Users can update messages in their conversations" ON public.messages;

-- Add comment explaining the immutability decision
COMMENT ON TABLE public.messages IS 'Clinical messages are immutable to maintain audit trail for compliance. Users cannot edit messages after creation.';