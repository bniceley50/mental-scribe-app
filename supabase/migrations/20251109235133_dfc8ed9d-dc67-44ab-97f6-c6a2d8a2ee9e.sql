-- Ensure RLS is enabled and enforced on structured_notes
ALTER TABLE public.structured_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.structured_notes FORCE ROW LEVEL SECURITY;