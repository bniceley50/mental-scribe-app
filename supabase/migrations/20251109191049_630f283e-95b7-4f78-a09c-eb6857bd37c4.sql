-- Fix verifier permissions and test with sample data
GRANT EXECUTE ON FUNCTION public.verify_audit_chain(uuid) TO anon;

-- Store test results table for admin dashboard
CREATE TABLE IF NOT EXISTS public.audit_verify_runs (
  id bigserial PRIMARY KEY,
  run_at timestamptz NOT NULL DEFAULT now(),
  intact boolean NOT NULL,
  total_entries int NOT NULL,
  verified_entries int NOT NULL,
  broken_at_id uuid,
  details jsonb
);

ALTER TABLE public.audit_verify_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_verify_runs_admin_select"
  ON public.audit_verify_runs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "audit_verify_runs_block_public"
  ON public.audit_verify_runs FOR ALL
  USING (false)
  WITH CHECK (false);