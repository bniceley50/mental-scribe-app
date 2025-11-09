-- Fix RLS warning for mv_refresh_log table
ALTER TABLE public.mv_refresh_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view refresh logs
CREATE POLICY "mv_refresh_log_admin_select"
  ON public.mv_refresh_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Block public access
CREATE POLICY "mv_refresh_log_block_public"
  ON public.mv_refresh_log FOR ALL
  USING (false)
  WITH CHECK (false);