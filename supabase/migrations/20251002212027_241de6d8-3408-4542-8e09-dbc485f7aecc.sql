-- Add UPDATE policy for messages table
CREATE POLICY "Users can update messages in their conversations"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM conversations
    WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
  )
);

-- Create audit_logs table for security monitoring
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs (for now, users can't see their own)
CREATE POLICY "Service role can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Create index for efficient querying
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);