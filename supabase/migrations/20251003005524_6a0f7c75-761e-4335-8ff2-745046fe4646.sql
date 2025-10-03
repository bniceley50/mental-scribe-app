-- Create table for structured clinical notes
CREATE TABLE public.structured_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Session metadata
  session_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_telehealth BOOLEAN DEFAULT false,
  
  -- Client perspective
  client_perspective TEXT,
  
  -- Current status and interventions
  current_status TEXT,
  
  -- Client response to interventions
  response_to_interventions TEXT,
  
  -- Changes since last visit
  new_issues_presented BOOLEAN DEFAULT false,
  new_issues_details TEXT,
  
  -- Additional structured fields
  goals_progress TEXT,
  safety_assessment TEXT,
  clinical_impression TEXT,
  treatment_plan TEXT,
  next_steps TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.structured_notes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own structured notes"
ON public.structured_notes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own structured notes"
ON public.structured_notes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own structured notes"
ON public.structured_notes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own structured notes"
ON public.structured_notes
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_structured_notes_updated_at
BEFORE UPDATE ON public.structured_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_structured_notes_conversation ON public.structured_notes(conversation_id);
CREATE INDEX idx_structured_notes_user ON public.structured_notes(user_id);
CREATE INDEX idx_structured_notes_session_date ON public.structured_notes(session_date);