-- Create table to track security alert acknowledgments and resolutions
CREATE TABLE IF NOT EXISTS public.security_alert_acknowledgments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id bigint NOT NULL REFERENCES public.audit_verify_runs(id) ON DELETE CASCADE,
  acknowledged_by uuid NOT NULL,
  acknowledged_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'acknowledged' CHECK (status IN ('acknowledged', 'investigating', 'resolved', 'false_positive')),
  resolution_notes text,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_alert_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Force RLS for service role
ALTER TABLE public.security_alert_acknowledgments FORCE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Only admins can view acknowledgments"
  ON public.security_alert_acknowledgments
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can create acknowledgments"
  ON public.security_alert_acknowledgments
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND acknowledged_by = auth.uid());

CREATE POLICY "Only admins can update acknowledgments"
  ON public.security_alert_acknowledgments
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Block anonymous access"
  ON public.security_alert_acknowledgments
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Create index for faster queries
CREATE INDEX idx_alert_acknowledgments_alert_id ON public.security_alert_acknowledgments(alert_id);
CREATE INDEX idx_alert_acknowledgments_acknowledged_by ON public.security_alert_acknowledgments(acknowledged_by);
CREATE INDEX idx_alert_acknowledgments_status ON public.security_alert_acknowledgments(status);

-- Create trigger for updated_at
CREATE TRIGGER update_security_alert_acknowledgments_updated_at
  BEFORE UPDATE ON public.security_alert_acknowledgments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.security_alert_acknowledgments IS 'Tracks acknowledgment and resolution of security alerts for compliance audit trails';
