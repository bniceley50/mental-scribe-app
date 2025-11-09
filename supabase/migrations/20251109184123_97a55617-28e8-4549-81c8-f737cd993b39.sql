-- Sprint A: Add differential diagnosis support
ALTER TABLE public.structured_notes
  ADD COLUMN IF NOT EXISTS differential_diagnosis jsonb;

-- Sprint A: Add ProseMirror JSON storage for rich editor
ALTER TABLE public.structured_notes
  ADD COLUMN IF NOT EXISTS content_json jsonb;

-- Sprint B: Enhanced PII tracking
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS pii_redacted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS redaction_count integer DEFAULT 0;

-- Sprint D: Long-audio processing status
CREATE TYPE audio_processing_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'chunking', 'assembling');

ALTER TABLE public.recordings
  ADD COLUMN IF NOT EXISTS processing_status audio_processing_status DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS chunks_total integer,
  ADD COLUMN IF NOT EXISTS chunks_completed integer,
  ADD COLUMN IF NOT EXISTS processing_error text,
  ADD COLUMN IF NOT EXISTS resume_token text;

-- Sprint C: Tenant quotas and rate limits
CREATE TABLE IF NOT EXISTS public.tenant_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  quota_type text NOT NULL,
  limit_value integer NOT NULL,
  current_usage integer DEFAULT 0,
  reset_at timestamptz NOT NULL DEFAULT now() + interval '1 month',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, quota_type)
);

ALTER TABLE public.tenant_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quotas"
  ON public.tenant_quotas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own quota usage"
  ON public.tenant_quotas FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to check and increment quota
CREATE OR REPLACE FUNCTION public.check_and_increment_quota(
  _user_id uuid,
  _quota_type text,
  _increment integer DEFAULT 1
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _limit integer;
  _usage integer;
BEGIN
  -- Get or create quota record
  INSERT INTO public.tenant_quotas (user_id, quota_type, limit_value, current_usage)
  VALUES (_user_id, _quota_type, 
    CASE _quota_type
      WHEN 'llm_tokens' THEN 1000000
      WHEN 'stt_minutes' THEN 600
      WHEN 'api_calls' THEN 10000
      ELSE 1000
    END,
    0
  )
  ON CONFLICT (user_id, quota_type) DO NOTHING;

  -- Check current usage
  SELECT limit_value, current_usage INTO _limit, _usage
  FROM public.tenant_quotas
  WHERE user_id = _user_id AND quota_type = _quota_type
  FOR UPDATE;

  -- Reset if expired
  UPDATE public.tenant_quotas
  SET current_usage = 0, reset_at = now() + interval '1 month'
  WHERE user_id = _user_id 
    AND quota_type = _quota_type 
    AND reset_at < now();

  -- Refresh values after potential reset
  SELECT limit_value, current_usage INTO _limit, _usage
  FROM public.tenant_quotas
  WHERE user_id = _user_id AND quota_type = _quota_type;

  -- Check if over limit
  IF _usage + _increment > _limit THEN
    RETURN false;
  END IF;

  -- Increment usage
  UPDATE public.tenant_quotas
  SET current_usage = current_usage + _increment,
      updated_at = now()
  WHERE user_id = _user_id AND quota_type = _quota_type;

  RETURN true;
END;
$$;

-- Sprint D: Refresh dashboard MVs with pg_cron
SELECT cron.schedule(
  'refresh_audit_stats',
  '*/5 * * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_audit_daily_stats;$$
);

COMMENT ON TABLE public.tenant_quotas IS 'Quota management per tenant for LLM/STT endpoints';
COMMENT ON FUNCTION public.check_and_increment_quota IS 'Check if user is within quota and increment usage atomically';