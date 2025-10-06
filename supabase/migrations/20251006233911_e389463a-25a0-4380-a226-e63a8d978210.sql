-- ============================================================================
-- MEDIUM PRIORITY: Add CHECK constraints and ENUMs for data integrity
-- ============================================================================
-- Addresses: "Schema constraints are lax (status text, consent_type text)"
-- Adds proper validation to prevent invalid data states
-- ============================================================================

-- 1. Create ENUMs for consent statuses and types
DO $$ BEGIN
  CREATE TYPE consent_status AS ENUM ('active', 'revoked', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE part2_consent_type AS ENUM ('treatment', 'payment', 'healthcare_operations', 'research', 'legal', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE disclosure_purpose_type AS ENUM ('treatment', 'payment', 'legal', 'research', 'patient_request', 'emergency', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Add CHECK constraints to part2_consents
ALTER TABLE public.part2_consents DROP CONSTRAINT IF EXISTS part2_consents_status_check;
ALTER TABLE public.part2_consents 
  ADD CONSTRAINT part2_consents_status_check 
  CHECK (status IN ('active', 'revoked', 'expired'));

ALTER TABLE public.part2_consents DROP CONSTRAINT IF EXISTS part2_consents_type_check;
ALTER TABLE public.part2_consents 
  ADD CONSTRAINT part2_consents_type_check 
  CHECK (consent_type IN ('treatment', 'payment', 'healthcare_operations', 'research', 'legal', 'other'));

-- Temporal constraints
ALTER TABLE public.part2_consents DROP CONSTRAINT IF EXISTS part2_consents_granted_before_expiry;
ALTER TABLE public.part2_consents 
  ADD CONSTRAINT part2_consents_granted_before_expiry 
  CHECK (expiry_date IS NULL OR granted_date < expiry_date);

ALTER TABLE public.part2_consents DROP CONSTRAINT IF EXISTS part2_consents_granted_date_not_future;
ALTER TABLE public.part2_consents 
  ADD CONSTRAINT part2_consents_granted_date_not_future 
  CHECK (granted_date <= now());

-- Revocation logic constraints
ALTER TABLE public.part2_consents DROP CONSTRAINT IF EXISTS part2_consents_revoked_logic;
ALTER TABLE public.part2_consents 
  ADD CONSTRAINT part2_consents_revoked_logic 
  CHECK (
    (status = 'revoked' AND revoked_date IS NOT NULL) OR
    (status != 'revoked' AND revoked_date IS NULL)
  );

-- 3. Add CHECK constraints to disclosure_consents
ALTER TABLE public.disclosure_consents DROP CONSTRAINT IF EXISTS disclosure_consents_purpose_check;
ALTER TABLE public.disclosure_consents 
  ADD CONSTRAINT disclosure_consents_purpose_check 
  CHECK (purpose IN ('treatment', 'payment', 'legal', 'research', 'patient_request', 'emergency', 'other'));

ALTER TABLE public.disclosure_consents DROP CONSTRAINT IF EXISTS disclosure_consents_valid_window;
ALTER TABLE public.disclosure_consents 
  ADD CONSTRAINT disclosure_consents_valid_window 
  CHECK (valid_until IS NULL OR valid_from < valid_until);

ALTER TABLE public.disclosure_consents DROP CONSTRAINT IF EXISTS disclosure_consents_revoked_logic;
ALTER TABLE public.disclosure_consents 
  ADD CONSTRAINT disclosure_consents_revoked_logic 
  CHECK (revoked_at IS NULL OR revoked_at >= valid_from);

-- 4. Add CHECK constraints to data_classification fields
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_data_classification_check;
ALTER TABLE public.conversations 
  ADD CONSTRAINT conversations_data_classification_check 
  CHECK (data_classification IN ('standard_phi', 'part2_protected'));

ALTER TABLE public.structured_notes DROP CONSTRAINT IF EXISTS structured_notes_data_classification_check;
ALTER TABLE public.structured_notes 
  ADD CONSTRAINT structured_notes_data_classification_check 
  CHECK (data_classification IN ('standard_phi', 'part2_protected'));

ALTER TABLE public.recordings DROP CONSTRAINT IF EXISTS recordings_data_classification_check;
ALTER TABLE public.recordings 
  ADD CONSTRAINT recordings_data_classification_check 
  CHECK (data_classification IN ('standard_phi', 'part2_protected'));

ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_data_classification_check;
ALTER TABLE public.clients 
  ADD CONSTRAINT clients_data_classification_check 
  CHECK (data_classification IN ('standard_phi', 'part2_protected'));

-- 5. Add CHECK constraints to audit_logs
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_data_classification_check;
ALTER TABLE public.audit_logs 
  ADD CONSTRAINT audit_logs_data_classification_check 
  CHECK (data_classification IN ('standard_phi', 'part2_protected'));

ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_not_empty;
ALTER TABLE public.audit_logs 
  ADD CONSTRAINT audit_logs_action_not_empty 
  CHECK (action IS NOT NULL AND length(trim(action)) > 0);

ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_resource_type_not_empty;
ALTER TABLE public.audit_logs 
  ADD CONSTRAINT audit_logs_resource_type_not_empty 
  CHECK (resource_type IS NOT NULL AND length(trim(resource_type)) > 0);

-- 6. Document the constraints
INSERT INTO public.security_fixes (
  finding,
  severity,
  remediation,
  fix_date
) VALUES (
  'Missing CHECK constraints and ENUMs allowed invalid data states',
  'medium',
  'Added CHECK constraints to: (1) part2_consents - status/type validation, temporal logic, revocation rules, (2) disclosure_consents - purpose validation, valid window, (3) all PHI tables - data_classification validation, (4) audit_logs - non-empty action/resource_type. Created ENUMs for consent_status, part2_consent_type, disclosure_purpose_type. Prevents invalid states like revoked=true but status=active, or granted_date in future.',
  now()
);