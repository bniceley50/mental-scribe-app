-- Ensure unique note per conversation for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname='public' AND tablename='structured_notes' AND indexname='structured_notes_conversation_id_key'
  ) THEN
    CREATE UNIQUE INDEX structured_notes_conversation_id_key
      ON public.structured_notes (conversation_id);
  END IF;
END$$;

-- Add updated_at trigger using existing function
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='trg_structured_notes_updated_at'
  ) THEN
    CREATE TRIGGER trg_structured_notes_updated_at
    BEFORE UPDATE ON public.structured_notes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

-- Ensure owner can SELECT their conversations (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='conversations' AND policyname='conversations_owner_select'
  ) THEN
    CREATE POLICY conversations_owner_select
    ON public.conversations
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
  END IF;
END$$;