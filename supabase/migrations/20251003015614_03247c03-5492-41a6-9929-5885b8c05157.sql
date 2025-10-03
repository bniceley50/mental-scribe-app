-- Phase 1: 42 CFR Part 2 Data Classification System
-- Create data classification enum
CREATE TYPE public.data_classification AS ENUM ('standard_phi', 'part2_protected');

-- Add Part 2 fields to conversations table
ALTER TABLE public.conversations 
ADD COLUMN is_part2_protected BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN data_classification public.data_classification NOT NULL DEFAULT 'standard_phi',
ADD COLUMN part2_consent_status TEXT CHECK (part2_consent_status IN ('none', 'obtained', 'expired', 'revoked')) DEFAULT 'none',
ADD COLUMN part2_consent_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN part2_consent_expiry TIMESTAMP WITH TIME ZONE;

-- Add Part 2 fields to structured_notes table
ALTER TABLE public.structured_notes 
ADD COLUMN is_part2_protected BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN data_classification public.data_classification NOT NULL DEFAULT 'standard_phi';

-- Add Part 2 fields to messages table
ALTER TABLE public.messages 
ADD COLUMN is_part2_protected BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN data_classification public.data_classification NOT NULL DEFAULT 'standard_phi';

-- Enhance audit_logs with Part 2 tracking
ALTER TABLE public.audit_logs 
ADD COLUMN data_classification public.data_classification NOT NULL DEFAULT 'standard_phi',
ADD COLUMN part2_disclosure_purpose TEXT,
ADD COLUMN consent_id UUID;

-- Create part2_consents table for consent tracking
CREATE TABLE public.part2_consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  consent_type TEXT NOT NULL,
  granted_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expiry_date TIMESTAMP WITH TIME ZONE,
  revoked_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  disclosure_purpose TEXT,
  recipient_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on part2_consents
ALTER TABLE public.part2_consents ENABLE ROW LEVEL SECURITY;

-- RLS policies for part2_consents
CREATE POLICY "Users can view consents for their conversations"
ON public.part2_consents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = part2_consents.conversation_id
    AND conversations.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create consents for their conversations"
ON public.part2_consents
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = part2_consents.conversation_id
    AND conversations.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update consents for their conversations"
ON public.part2_consents
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = part2_consents.conversation_id
    AND conversations.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all consents"
ON public.part2_consents
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updating part2_consents updated_at
CREATE TRIGGER update_part2_consents_updated_at
BEFORE UPDATE ON public.part2_consents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();