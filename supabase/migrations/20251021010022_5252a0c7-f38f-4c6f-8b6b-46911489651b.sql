-- Add index for keyset pagination on messages
-- This index supports efficient "older than timestamp" queries
-- for the pagination feature

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages (conversation_id, created_at DESC);

-- Add helpful comment
COMMENT ON INDEX idx_messages_conversation_created IS 
'Supports keyset pagination queries: WHERE conversation_id = X AND created_at < Y ORDER BY created_at DESC';
