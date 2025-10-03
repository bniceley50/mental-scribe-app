-- Drop the existing INSERT policy for structured_notes
DROP POLICY IF EXISTS "Users can create their own structured notes" ON public.structured_notes;

-- Create a strengthened INSERT policy that validates both user_id and conversation_id
CREATE POLICY "Users can create their own structured notes" 
ON public.structured_notes 
FOR INSERT 
WITH CHECK (
  -- Ensure the user_id matches the authenticated user
  auth.uid() = user_id 
  AND
  -- Ensure the conversation_id belongs to the authenticated user
  EXISTS (
    SELECT 1 
    FROM public.conversations 
    WHERE conversations.id = conversation_id 
    AND conversations.user_id = auth.uid()
  )
);

-- Add additional security: Create a trigger to automatically set user_id to prevent manual manipulation
CREATE OR REPLACE FUNCTION public.set_structured_note_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Always set user_id to the authenticated user, preventing any attempts to set it to another user
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_structured_note_user_id
  BEFORE INSERT ON public.structured_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_structured_note_user_id();