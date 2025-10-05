-- Create clients table with comprehensive profile information
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  
  -- Basic Information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  preferred_name TEXT,
  date_of_birth DATE,
  email TEXT,
  phone TEXT,
  
  -- Demographics
  gender TEXT,
  pronouns TEXT,
  
  -- Emergency Contact
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  
  -- Clinical Information
  primary_diagnosis TEXT,
  secondary_diagnoses TEXT[],
  treatment_goals TEXT,
  insurance_provider TEXT,
  insurance_id TEXT,
  
  -- Internal tracking
  external_id TEXT, -- For external system integration
  is_active BOOLEAN NOT NULL DEFAULT true,
  data_classification public.data_classification NOT NULL DEFAULT 'standard_phi'::public.data_classification,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, external_id)
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create policies for clients table
CREATE POLICY "Block all anonymous access to clients"
ON public.clients
FOR ALL TO anon
USING (false);

CREATE POLICY "Users can view their own clients"
ON public.clients
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all clients"
ON public.clients
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clinical staff can view program clients"
ON public.clients
FOR SELECT TO authenticated
USING (
  program_id IS NOT NULL 
  AND is_clinical_staff(auth.uid(), program_id)
);

CREATE POLICY "Users can create their own clients"
ON public.clients
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients"
ON public.clients
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients"
ON public.clients
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Trigger to classify clients based on program
CREATE OR REPLACE FUNCTION public.classify_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.program_id IS NOT NULL THEN
    NEW.data_classification := public.derive_classification(NEW.program_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER classify_client_trigger
BEFORE INSERT OR UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.classify_client();

-- Update trigger for updated_at
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add client_id to conversations
ALTER TABLE public.conversations
ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- Add client_id to structured_notes
ALTER TABLE public.structured_notes
ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- Add client_id to uploaded_files
ALTER TABLE public.uploaded_files
ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- Create recordings table for session audio
CREATE TABLE public.recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  duration_seconds INTEGER,
  transcription_status TEXT DEFAULT 'pending',
  transcription_text TEXT,
  
  data_classification public.data_classification NOT NULL DEFAULT 'standard_phi'::public.data_classification,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on recordings
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

-- Recordings policies
CREATE POLICY "Block all anonymous access to recordings"
ON public.recordings
FOR ALL TO anon
USING (false);

CREATE POLICY "Users can view their own recordings"
ON public.recordings
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Part 2 recordings visible to clinical staff"
ON public.recordings
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    data_classification = 'part2_protected'::data_classification
    AND program_id IS NOT NULL
    AND is_clinical_staff(auth.uid(), program_id)
    AND conversation_id IS NOT NULL
    AND has_active_part2_consent(user_id, conversation_id)
  )
);

CREATE POLICY "Users can create their own recordings"
ON public.recordings
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recordings"
ON public.recordings
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recordings"
ON public.recordings
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Classify recordings based on program
CREATE TRIGGER classify_recording_trigger
BEFORE INSERT OR UPDATE ON public.recordings
FOR EACH ROW
EXECUTE FUNCTION public.classify_uploaded_file();

CREATE TRIGGER update_recordings_updated_at
BEFORE UPDATE ON public.recordings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', false);

-- Storage policies for recordings bucket
CREATE POLICY "Users can view their own recordings"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own recordings"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own recordings"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own recordings"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create indexes for better query performance
CREATE INDEX idx_clients_user_id ON public.clients(user_id);
CREATE INDEX idx_clients_program_id ON public.clients(program_id);
CREATE INDEX idx_clients_external_id ON public.clients(external_id);
CREATE INDEX idx_conversations_client_id ON public.conversations(client_id);
CREATE INDEX idx_structured_notes_client_id ON public.structured_notes(client_id);
CREATE INDEX idx_recordings_client_id ON public.recordings(client_id);
CREATE INDEX idx_recordings_conversation_id ON public.recordings(conversation_id);