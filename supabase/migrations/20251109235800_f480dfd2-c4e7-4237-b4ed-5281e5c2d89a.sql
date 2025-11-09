-- Structured notes: allow conversation owner to update/claim legacy/orphan rows safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='structured_notes'
      AND policyname='structured_notes_conversation_owner_update'
  ) THEN
    CREATE POLICY structured_notes_conversation_owner_update
    ON public.structured_notes
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = structured_notes.conversation_id
          AND c.user_id = auth.uid()
      )
    )
    WITH CHECK (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = structured_notes.conversation_id
          AND c.user_id = auth.uid()
      )
    );
  END IF;
END$$;