-- Critical Security Fix: Add anonymous blocks and strengthen RLS policies
-- Addresses: Patient Messages Could Be Accessed Without Login + other tables

-- ============================================================================
-- MESSAGES TABLE: Add restrictive anonymous block
-- ============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'messages' 
    AND policyname = 'Block all anonymous access to messages'
  ) THEN
    CREATE POLICY "Block all anonymous access to messages"
    ON public.messages
    AS RESTRICTIVE
    FOR ALL
    TO anon
    USING (false);
  END IF;
END $$;

-- ============================================================================
-- OTHER CRITICAL TABLES: Add anonymous blocks where missing
-- ============================================================================

-- CLIENTS TABLE
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'clients' 
    AND policyname = 'Block all anonymous access to clients'
  ) THEN
    CREATE POLICY "Block all anonymous access to clients"
    ON public.clients
    AS RESTRICTIVE
    FOR ALL
    TO anon
    USING (false);
  END IF;
END $$;

-- STRUCTURED_NOTES TABLE
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'structured_notes' 
    AND policyname = 'Block all anonymous access to structured notes'
  ) THEN
    CREATE POLICY "Block all anonymous access to structured notes"
    ON public.structured_notes
    AS RESTRICTIVE
    FOR ALL
    TO anon
    USING (false);
  END IF;
END $$;

-- UPLOADED_FILES TABLE
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'uploaded_files' 
    AND policyname = 'Block all anonymous access to uploaded files'
  ) THEN
    CREATE POLICY "Block all anonymous access to uploaded files"
    ON public.uploaded_files
    AS RESTRICTIVE
    FOR ALL
    TO anon
    USING (false);
  END IF;
END $$;

-- CONVERSATIONS TABLE
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'conversations' 
    AND policyname = 'Block all anonymous access to conversations'
  ) THEN
    CREATE POLICY "Block all anonymous access to conversations"
    ON public.conversations
    AS RESTRICTIVE
    FOR ALL
    TO anon
    USING (false);
  END IF;
END $$;

-- PART2_CONSENTS TABLE
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'part2_consents' 
    AND policyname = 'Block all anonymous access to part2 consents'
  ) THEN
    CREATE POLICY "Block all anonymous access to part2 consents"
    ON public.part2_consents
    AS RESTRICTIVE
    FOR ALL
    TO anon
    USING (false);
  END IF;
END $$;

-- ============================================================================
-- STRENGTHEN EXISTING POLICIES: Ensure auth.uid() IS NOT NULL checks
-- ============================================================================

-- Drop and recreate messages policies with explicit auth checks
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations"
ON public.messages
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id 
    AND conversations.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create messages in their conversations" ON public.messages;
CREATE POLICY "Users can create messages in their conversations"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id 
    AND conversations.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete messages in their conversations" ON public.messages;
CREATE POLICY "Users can delete messages in their conversations"
ON public.messages
FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id 
    AND conversations.user_id = auth.uid()
  )
);

-- ============================================================================
-- STORAGE SECURITY: Make clinical-documents bucket private
-- ============================================================================
UPDATE storage.buckets 
SET public = false 
WHERE id = 'clinical-documents';

UPDATE storage.buckets 
SET public = false 
WHERE id = 'recordings';

-- ============================================================================
-- VERIFY RLS IS ENABLED AND FORCED ON ALL PHI TABLES
-- ============================================================================
ALTER TABLE public.messages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;
ALTER TABLE public.structured_notes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_files FORCE ROW LEVEL SECURITY;
ALTER TABLE public.conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.recordings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.part2_consents FORCE ROW LEVEL SECURITY;