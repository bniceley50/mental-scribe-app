-- ============================================================================
-- Phase 1: Security Backbone - Missing Audit Triggers & Enhancements
-- ============================================================================
-- This migration adds missing audit triggers for PHI tables to ensure
-- comprehensive audit trail coverage for all data modifications.

-- ============================================================================
-- 1. AUDIT TRIGGERS FOR MISSING TABLES
-- ============================================================================

-- Audit trigger for messages table (clinical session content)
CREATE OR REPLACE FUNCTION public.audit_message_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Log message creation
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      data_classification, metadata
    ) VALUES (
      (SELECT user_id FROM conversations WHERE id = NEW.conversation_id),
      'message_created',
      'message',
      NEW.id,
      NEW.data_classification,
      jsonb_build_object(
        'conversation_id', NEW.conversation_id,
        'role', NEW.role,
        'is_part2_protected', NEW.is_part2_protected
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    -- Log message deletion
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      data_classification, metadata
    ) VALUES (
      (SELECT user_id FROM conversations WHERE id = OLD.conversation_id),
      'message_deleted',
      'message',
      OLD.id,
      OLD.data_classification,
      jsonb_build_object(
        'conversation_id', OLD.conversation_id,
        'role', OLD.role,
        'deleted_at', now()
      )
    );
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_message_changes_trigger ON public.messages;
CREATE TRIGGER audit_message_changes_trigger
  AFTER INSERT OR DELETE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION audit_message_changes();

COMMENT ON FUNCTION public.audit_message_changes() IS 
'Audit trigger for messages table. Logs all message creations and deletions for compliance tracking.';

-- Audit trigger for uploaded_files table (document attachments)
CREATE OR REPLACE FUNCTION public.audit_uploaded_file_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      data_classification, metadata
    ) VALUES (
      (SELECT user_id FROM conversations WHERE id = NEW.conversation_id),
      'file_uploaded',
      'uploaded_file',
      NEW.id,
      'standard_phi'::data_classification,
      jsonb_build_object(
        'file_name', NEW.file_name,
        'file_type', NEW.file_type,
        'conversation_id', NEW.conversation_id,
        'client_id', NEW.client_id
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      data_classification, metadata
    ) VALUES (
      (SELECT user_id FROM conversations WHERE id = OLD.conversation_id),
      'file_deleted',
      'uploaded_file',
      OLD.id,
      'standard_phi'::data_classification,
      jsonb_build_object(
        'file_name', OLD.file_name,
        'conversation_id', OLD.conversation_id,
        'deleted_at', now()
      )
    );
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_uploaded_file_changes_trigger ON public.uploaded_files;
CREATE TRIGGER audit_uploaded_file_changes_trigger
  AFTER INSERT OR DELETE ON public.uploaded_files
  FOR EACH ROW
  EXECUTE FUNCTION audit_uploaded_file_changes();

-- Audit trigger for structured_notes table (clinical documentation)
CREATE OR REPLACE FUNCTION public.audit_structured_note_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      data_classification, program_id, metadata
    ) VALUES (
      NEW.user_id,
      'structured_note_created',
      'structured_note',
      NEW.id,
      NEW.data_classification,
      NEW.program_id,
      jsonb_build_object(
        'conversation_id', NEW.conversation_id,
        'client_id', NEW.client_id,
        'session_date', NEW.session_date,
        'is_telehealth', NEW.is_telehealth,
        'is_part2_protected', NEW.is_part2_protected
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      data_classification, program_id, metadata
    ) VALUES (
      NEW.user_id,
      'structured_note_updated',
      'structured_note',
      NEW.id,
      NEW.data_classification,
      NEW.program_id,
      jsonb_build_object(
        'client_id', NEW.client_id,
        'updated_fields', jsonb_build_array(
          CASE WHEN OLD.clinical_impression IS DISTINCT FROM NEW.clinical_impression THEN 'clinical_impression' END,
          CASE WHEN OLD.treatment_plan IS DISTINCT FROM NEW.treatment_plan THEN 'treatment_plan' END,
          CASE WHEN OLD.safety_assessment IS DISTINCT FROM NEW.safety_assessment THEN 'safety_assessment' END
        )
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      data_classification, program_id, metadata
    ) VALUES (
      OLD.user_id,
      'structured_note_deleted',
      'structured_note',
      OLD.id,
      OLD.data_classification,
      OLD.program_id,
      jsonb_build_object(
        'client_id', OLD.client_id,
        'deleted_at', now()
      )
    );
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_structured_note_changes_trigger ON public.structured_notes;
CREATE TRIGGER audit_structured_note_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.structured_notes
  FOR EACH ROW
  EXECUTE FUNCTION audit_structured_note_changes();

-- Audit trigger for recordings table (audio files)
CREATE OR REPLACE FUNCTION public.audit_recording_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      data_classification, program_id, metadata
    ) VALUES (
      NEW.user_id,
      'recording_created',
      'recording',
      NEW.id,
      NEW.data_classification,
      NEW.program_id,
      jsonb_build_object(
        'file_name', NEW.file_name,
        'duration_seconds', NEW.duration_seconds,
        'file_size', NEW.file_size,
        'conversation_id', NEW.conversation_id,
        'client_id', NEW.client_id
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log transcription completion
    IF OLD.transcription_status IS DISTINCT FROM NEW.transcription_status THEN
      INSERT INTO public.audit_logs (
        user_id, action, resource_type, resource_id,
        data_classification, metadata
      ) VALUES (
        NEW.user_id,
        'recording_transcribed',
        'recording',
        NEW.id,
        NEW.data_classification,
        jsonb_build_object(
          'old_status', OLD.transcription_status,
          'new_status', NEW.transcription_status
        )
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      data_classification, metadata
    ) VALUES (
      OLD.user_id,
      'recording_deleted',
      'recording',
      OLD.id,
      OLD.data_classification,
      jsonb_build_object(
        'file_name', OLD.file_name,
        'deleted_at', now()
      )
    );
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_recording_changes_trigger ON public.recordings;
CREATE TRIGGER audit_recording_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.recordings
  FOR EACH ROW
  EXECUTE FUNCTION audit_recording_changes();

-- Audit trigger for patient_assignments (staff-patient relationships)
CREATE OR REPLACE FUNCTION public.audit_patient_assignment_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id, metadata
    ) VALUES (
      NEW.assigned_by,
      'patient_assigned',
      'patient_assignment',
      NEW.id,
      jsonb_build_object(
        'staff_user_id', NEW.staff_user_id,
        'client_id', NEW.client_id,
        'assigned_at', NEW.assigned_at
      )
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.revoked_at IS NOT NULL AND OLD.revoked_at IS NULL THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id, metadata
    ) VALUES (
      auth.uid(),
      'patient_unassigned',
      'patient_assignment',
      NEW.id,
      jsonb_build_object(
        'staff_user_id', NEW.staff_user_id,
        'client_id', NEW.client_id,
        'revoked_at', NEW.revoked_at
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_patient_assignment_trigger ON public.patient_assignments;
CREATE TRIGGER audit_patient_assignment_trigger
  AFTER INSERT OR UPDATE ON public.patient_assignments
  FOR EACH ROW
  EXECUTE FUNCTION audit_patient_assignment_changes();

-- ============================================================================
-- 2. HMAC SECRET KEY VALIDATION ENHANCEMENT
-- ============================================================================

-- Update hash_external_id to fail fast when HMAC key is not configured
CREATE OR REPLACE FUNCTION public.hash_external_id(raw_id text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hmac_key text;
BEGIN
  -- Try to get HMAC key from Supabase secrets
  hmac_key := COALESCE(
    current_setting('app.secrets.hmac_key', true),
    current_setting('app.settings.hmac_key', true)
  );
  
  -- CRITICAL SECURITY CHECK: Prevent use of default or missing key
  IF hmac_key IS NULL OR hmac_key = '' THEN
    RAISE EXCEPTION 'SECURITY ERROR: HMAC_SECRET_KEY not configured. Set via Lovable Cloud secrets before using external_id field.';
  END IF;
  
  IF hmac_key = 'CHANGE-THIS-IN-PRODUCTION-VIA-SUPABASE-SECRETS' THEN
    RAISE EXCEPTION 'SECURITY ERROR: HMAC_SECRET_KEY still set to default value. Update via Lovable Cloud secrets.';
  END IF;
  
  -- Generate HMAC-SHA256 hash
  RETURN encode(
    hmac(
      raw_id::bytea, 
      hmac_key::bytea, 
      'sha256'
    ), 
    'hex'
  );
END;
$$;

COMMENT ON FUNCTION public.hash_external_id(text) IS 
'SECURITY CRITICAL: Hashes external patient IDs using HMAC-SHA256. Fails fast with descriptive error if HMAC_SECRET_KEY is not configured in Lovable Cloud secrets. This prevents accidental use of default or missing keys.';

-- ============================================================================
-- 3. ENHANCED AUDIT LOGGING FOR CONVERSATION ACCESS
-- ============================================================================

-- Track when clinical staff access Part 2 protected conversations
CREATE OR REPLACE FUNCTION public.audit_clinical_conversation_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log access to Part 2 protected conversations
  IF NEW.data_classification = 'part2_protected'::data_classification THEN
    -- This will be called when a conversation is viewed
    -- In practice, this needs to be triggered from application layer
    -- since SELECTs don't fire triggers in PostgreSQL
    NULL; -- Placeholder for future enhancement
  END IF;
  
  RETURN NEW;
END;
$$;

-- Note: PostgreSQL doesn't support SELECT triggers
-- Access logging must be implemented at application/edge function layer
COMMENT ON FUNCTION public.audit_clinical_conversation_access() IS 
'FUTURE ENHANCEMENT: Placeholder for conversation access logging. PostgreSQL does not support SELECT triggers. Implement access logging in edge functions or via application layer queries to audit_logs.';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count audit triggers per table
DO $$
DECLARE
  trigger_count int;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND t.tgname LIKE 'audit_%'
    AND NOT t.tgisinternal;
    
  RAISE NOTICE 'Total audit triggers: %', trigger_count;
END $$;