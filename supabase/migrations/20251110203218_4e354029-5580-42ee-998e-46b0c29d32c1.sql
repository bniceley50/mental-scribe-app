-- Consolidate structured_notes UPDATE policies to fix save issues
-- Remove duplicate/conflicting UPDATE policies and create one unified policy

-- Drop old/duplicate UPDATE policies
DROP POLICY IF EXISTS "Users can update their own structured notes" ON public.structured_notes;
DROP POLICY IF EXISTS "structured_notes_owner_update" ON public.structured_notes;
DROP POLICY IF EXISTS "structured_notes_conversation_owner_update" ON public.structured_notes;

-- Create single unified UPDATE policy
-- Allows update if: user owns the row OR user owns the conversation
-- Ensures updated row: user_id matches auth.uid() AND conversation is owned by user
CREATE POLICY "structured_notes_update_unified"
ON public.structured_notes
FOR UPDATE
TO authenticated
USING (
  -- Allow access if user owns the row or owns the conversation
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = structured_notes.conversation_id
      AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  -- Ensure the updated/created row is properly owned
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = structured_notes.conversation_id
      AND c.user_id = auth.uid()
  )
);

-- Verify the trigger that auto-sets user_id is in place
-- (set_structured_note_user_id should already exist)

COMMENT ON POLICY "structured_notes_update_unified" ON public.structured_notes 
IS 'Unified UPDATE policy: allows conversation owner to update, ensures updated row matches auth.uid()';