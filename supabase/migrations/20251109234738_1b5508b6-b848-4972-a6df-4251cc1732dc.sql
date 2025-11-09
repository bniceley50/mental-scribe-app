-- structured_notes RLS policies for owner access (idempotent)

-- SELECT: owner or owner of conversation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='structured_notes'
      AND policyname='structured_notes_owner_select'
  ) THEN
    CREATE POLICY structured_notes_owner_select
    ON public.structured_notes
    FOR SELECT TO authenticated
    USING (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = structured_notes.conversation_id
          AND c.user_id = auth.uid()
      )
    );
  END IF;
END$$;

-- INSERT: only if you own the conversation and set your own user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='structured_notes'
      AND policyname='structured_notes_owner_insert'
  ) THEN
    CREATE POLICY structured_notes_owner_insert
    ON public.structured_notes
    FOR INSERT TO authenticated
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

-- UPDATE: only if you own the row (and still own the conversation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='structured_notes'
      AND policyname='structured_notes_owner_update'
  ) THEN
    CREATE POLICY structured_notes_owner_update
    ON public.structured_notes
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
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