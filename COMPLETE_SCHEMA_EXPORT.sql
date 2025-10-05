-- ============================================================================
-- MENTAL SCRIBE - COMPLETE DATABASE SCHEMA EXPORT
-- Generated: 2025-10-05
-- ============================================================================

-- ============================================================================
-- CUSTOM TYPES (ENUMS)
-- ============================================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TYPE public.data_classification AS ENUM ('standard_phi', 'part2_protected');

CREATE TYPE public.program_role AS ENUM ('treating_provider', 'care_team', 'program_admin');

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: user_roles
-- Purpose: Role-Based Access Control - Maps users to system roles
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user'::app_role,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Table: programs
-- Purpose: Healthcare treatment programs (including Part 2 SUD programs)
-- Security: is_part2 flag indicates 42 CFR Part 2 protected programs
-- ----------------------------------------------------------------------------
CREATE TABLE public.programs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  org_unit_code text,
  is_part2 boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Table: user_program_memberships
-- Purpose: Links users to programs with specific program roles
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_program_memberships (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  program_id uuid NOT NULL,
  role public.program_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_program_memberships ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Table: conversations
-- Purpose: Clinical conversation sessions
-- Security: Linked to programs for Part 2 classification
-- ----------------------------------------------------------------------------
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_part2_protected boolean NOT NULL DEFAULT false,
  data_classification public.data_classification NOT NULL DEFAULT 'standard_phi'::data_classification,
  part2_consent_status text DEFAULT 'none'::text,
  part2_consent_date timestamp with time zone,
  part2_consent_expiry timestamp with time zone,
  program_id uuid
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Table: messages
-- Purpose: Individual messages within conversations
-- Security: Inherits classification from parent conversation
-- ----------------------------------------------------------------------------
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_part2_protected boolean NOT NULL DEFAULT false,
  data_classification public.data_classification NOT NULL DEFAULT 'standard_phi'::data_classification
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Table: structured_notes
-- Purpose: Structured clinical documentation (SOAP notes, etc.)
-- Security: Auto-sets user_id via trigger to prevent privilege escalation
-- ----------------------------------------------------------------------------
CREATE TABLE public.structured_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL,
  user_id uuid NOT NULL,
  session_date timestamp with time zone NOT NULL DEFAULT now(),
  current_status text,
  client_perspective text,
  response_to_interventions text,
  new_issues_presented boolean DEFAULT false,
  new_issues_details text,
  goals_progress text,
  safety_assessment text,
  clinical_impression text,
  treatment_plan text,
  next_steps text,
  is_telehealth boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_part2_protected boolean NOT NULL DEFAULT false,
  data_classification public.data_classification NOT NULL DEFAULT 'standard_phi'::data_classification,
  program_id uuid
);

ALTER TABLE public.structured_notes ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Table: uploaded_files
-- Purpose: File attachments linked to conversations
-- Security: Classification inherited from program if linked
-- ----------------------------------------------------------------------------
CREATE TABLE public.uploaded_files (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_url text NOT NULL,
  processed_content text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  program_id uuid
);

ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Table: part2_consents
-- Purpose: 42 CFR Part 2 consent tracking for SUD disclosures
-- Security: Immutable audit trail (no DELETE allowed)
-- ----------------------------------------------------------------------------
CREATE TABLE public.part2_consents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL,
  user_id uuid NOT NULL,
  consent_type text NOT NULL,
  status text NOT NULL DEFAULT 'active'::text,
  granted_date timestamp with time zone NOT NULL DEFAULT now(),
  expiry_date timestamp with time zone,
  revoked_date timestamp with time zone,
  recipient_info jsonb,
  disclosure_purpose text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.part2_consents ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Table: disclosure_consents
-- Purpose: Enterprise consent management for Part 2 disclosures
-- Security: Admin-only access, contains patient external identifiers
-- WARNING: subject_external_id could expose patient identifiers
-- ----------------------------------------------------------------------------
CREATE TABLE public.disclosure_consents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_external_id text NOT NULL,
  scope jsonb NOT NULL,
  purpose text NOT NULL,
  valid_from timestamp with time zone NOT NULL,
  valid_until timestamp with time zone,
  artifact_hash text NOT NULL,
  created_by uuid NOT NULL,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.disclosure_consents ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Table: audit_logs
-- Purpose: Security audit trail
-- Security: Admin read-only, service role INSERT only
-- WARNING: Contains IP addresses and user agent strings (PII)
-- ----------------------------------------------------------------------------
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  data_classification public.data_classification NOT NULL DEFAULT 'standard_phi'::data_classification,
  part2_disclosure_purpose text,
  consent_id uuid,
  program_id uuid,
  purpose text
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Table: compliance_reports
-- Purpose: Immutable compliance reporting
-- Security: Admin-only, cannot be modified or deleted after creation
-- ----------------------------------------------------------------------------
CREATE TABLE public.compliance_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  generated_by uuid NOT NULL,
  report_type text NOT NULL,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  report_data jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.compliance_reports ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECURITY DEFINER FUNCTIONS
-- Purpose: Prevent RLS recursion, execute with elevated privileges
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: has_role
-- Purpose: Check if user has specific system role (admin, user)
-- Security: SECURITY DEFINER bypasses RLS to prevent infinite recursion
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- ----------------------------------------------------------------------------
-- Function: is_program_member
-- Purpose: Check if user is member of specific program
-- Security: SECURITY DEFINER bypasses RLS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_program_member(_user_id uuid, _program_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_program_memberships
    WHERE user_id = _user_id
      AND program_id = _program_id
  );
$$;

-- ----------------------------------------------------------------------------
-- Function: derive_classification
-- Purpose: Determine data classification based on program Part 2 status
-- Security: SECURITY DEFINER bypasses RLS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.derive_classification(_program_id uuid)
RETURNS data_classification
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN p.is_part2 THEN 'part2_protected'::public.data_classification
    ELSE 'standard_phi'::public.data_classification
  END
  FROM public.programs p
  WHERE p.id = _program_id;
$$;

-- ----------------------------------------------------------------------------
-- Function: update_updated_at_column
-- Purpose: Automatically update updated_at timestamp on row modification
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Function: set_structured_note_user_id
-- Purpose: Force user_id to auth.uid() to prevent privilege escalation
-- Security: Critical security control - prevents user impersonation
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_structured_note_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Always set user_id to the authenticated user, preventing any attempts to set it to another user
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Function: classify_conversation
-- Purpose: Auto-classify conversation based on linked program
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.classify_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.program_id IS NOT NULL THEN
    NEW.data_classification := public.derive_classification(NEW.program_id);
  END IF;
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Function: classify_structured_note
-- Purpose: Auto-classify note based on linked program
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.classify_structured_note()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.program_id IS NOT NULL THEN
    NEW.data_classification := public.derive_classification(NEW.program_id);
  END IF;
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Function: classify_uploaded_file
-- Purpose: Auto-classify file based on linked program
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.classify_uploaded_file()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.program_id IS NOT NULL THEN
    NEW.data_classification := public.derive_classification(NEW.program_id);
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Conversations
CREATE TRIGGER tr_classify_conversation
  BEFORE INSERT ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION classify_conversation();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Structured Notes
CREATE TRIGGER ensure_structured_note_user_id
  BEFORE INSERT ON structured_notes
  FOR EACH ROW
  EXECUTE FUNCTION set_structured_note_user_id();

CREATE TRIGGER tr_classify_structured_note
  BEFORE INSERT ON structured_notes
  FOR EACH ROW
  EXECUTE FUNCTION classify_structured_note();

CREATE TRIGGER update_structured_notes_updated_at
  BEFORE UPDATE ON structured_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Uploaded Files
CREATE TRIGGER tr_classify_uploaded_file
  BEFORE INSERT ON uploaded_files
  FOR EACH ROW
  EXECUTE FUNCTION classify_uploaded_file();

-- Part 2 Consents
CREATE TRIGGER update_part2_consents_updated_at
  BEFORE UPDATE ON part2_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Disclosure Consents
CREATE TRIGGER update_disclosure_consents_updated_at
  BEFORE UPDATE ON disclosure_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Programs
CREATE TRIGGER update_programs_updated_at
  BEFORE UPDATE ON programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: user_roles
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Only admins can insert roles"
  ON user_roles FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles"
  ON user_roles FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles"
  ON user_roles FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ----------------------------------------------------------------------------
-- Table: programs
-- SECURITY FINDING #1: Overly permissive - exposes is_part2 and org_unit_code
-- ----------------------------------------------------------------------------

CREATE POLICY "Only admins can manage programs"
  ON programs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view their programs"
  ON programs FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR is_program_member(auth.uid(), id)
  );

-- ----------------------------------------------------------------------------
-- Table: user_program_memberships
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view their own memberships"
  ON user_program_memberships FOR SELECT
  USING (
    (user_id = auth.uid()) 
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Only admins can manage memberships"
  ON user_program_memberships FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ----------------------------------------------------------------------------
-- Table: conversations
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
  ON conversations FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Part 2 conversations visible to program members"
  ON conversations FOR SELECT
  USING (
    (auth.uid() = user_id) 
    OR has_role(auth.uid(), 'admin'::app_role) 
    OR (
      (data_classification = 'part2_protected'::data_classification) 
      AND (program_id IS NOT NULL) 
      AND is_program_member(auth.uid(), program_id)
    )
  );

-- ----------------------------------------------------------------------------
-- Table: messages
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages in their conversations"
  ON messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Messages cannot be updated"
  ON messages FOR UPDATE
  USING (false);

-- ----------------------------------------------------------------------------
-- Table: structured_notes
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view their own structured notes"
  ON structured_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own structured notes"
  ON structured_notes FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id) 
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = structured_notes.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own structured notes"
  ON structured_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own structured notes"
  ON structured_notes FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Part 2 notes visible to program members"
  ON structured_notes FOR SELECT
  USING (
    (auth.uid() = user_id) 
    OR has_role(auth.uid(), 'admin'::app_role) 
    OR (
      (data_classification = 'part2_protected'::data_classification) 
      AND (program_id IS NOT NULL) 
      AND is_program_member(auth.uid(), program_id)
    )
  );

-- ----------------------------------------------------------------------------
-- Table: uploaded_files
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view files in their conversations"
  ON uploaded_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = uploaded_files.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create files in their conversations"
  ON uploaded_files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = uploaded_files.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete files in their conversations"
  ON uploaded_files FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = uploaded_files.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Uploaded files cannot be updated"
  ON uploaded_files FOR UPDATE
  USING (false);

CREATE POLICY "Part 2 files visible to program members"
  ON uploaded_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = uploaded_files.conversation_id
        AND (
          c.user_id = auth.uid() 
          OR has_role(auth.uid(), 'admin'::app_role) 
          OR (
            (c.data_classification = 'part2_protected'::data_classification) 
            AND (c.program_id IS NOT NULL) 
            AND is_program_member(auth.uid(), c.program_id)
          )
        )
    )
  );

-- ----------------------------------------------------------------------------
-- Table: part2_consents
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view consents for their conversations"
  ON part2_consents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = part2_consents.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create consents for their conversations"
  ON part2_consents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = part2_consents.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update consents for their conversations"
  ON part2_consents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = part2_consents.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all consents"
  ON part2_consents FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Part 2 consents cannot be deleted"
  ON part2_consents FOR DELETE
  USING (false);

-- ----------------------------------------------------------------------------
-- Table: disclosure_consents
-- SECURITY FINDING #2: No patient read access to their own consent records
-- ----------------------------------------------------------------------------

CREATE POLICY "Only admins can manage consents"
  ON disclosure_consents FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ----------------------------------------------------------------------------
-- Table: audit_logs
-- SECURITY FINDING #3: Service role INSERT policy, anonymous deny
-- ----------------------------------------------------------------------------

CREATE POLICY "Service role can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all audit logs"
  ON audit_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Deny anonymous access to audit logs"
  ON audit_logs FOR SELECT
  TO anon
  USING (false);

-- No UPDATE or DELETE policies - audit logs are append-only

-- ----------------------------------------------------------------------------
-- Table: compliance_reports
-- ----------------------------------------------------------------------------

CREATE POLICY "Only admins can view compliance reports"
  ON compliance_reports FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can create compliance reports"
  ON compliance_reports FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) 
    AND (auth.uid() = generated_by)
  );

CREATE POLICY "Compliance reports cannot be updated"
  ON compliance_reports FOR UPDATE
  USING (false);

CREATE POLICY "Compliance reports cannot be deleted"
  ON compliance_reports FOR DELETE
  USING (false);

-- ============================================================================
-- SECURITY FINDINGS SUMMARY
-- ============================================================================

/*
FINDING #1: Programs Table - Overly Permissive SELECT
┌────────────────────────────────────────────────────────────────────────┐
│ Severity: MEDIUM                                                       │
│ Table: programs                                                        │
│ Policy: "Authenticated users can view their programs"                  │
│                                                                        │
│ Issue: Program members can see sensitive metadata:                    │
│   - is_part2 (indicates SUD program - 42 CFR Part 2 protected)       │
│   - org_unit_code (organizational structure)                          │
│                                                                        │
│ Recommendation: Restrict to admins only, or create view with safe     │
│ columns (id, name only) for program members                           │
└────────────────────────────────────────────────────────────────────────┘

FINDING #2: Disclosure Consents - No Patient Read Access
┌────────────────────────────────────────────────────────────────────────┐
│ Severity: LOW                                                          │
│ Table: disclosure_consents                                             │
│ Policy: "Only admins can manage consents" (ALL operations)             │
│                                                                        │
│ Issue: Patients cannot view their own consent records                 │
│                                                                        │
│ Recommendation: Add patient SELECT policy that matches on             │
│ subject_external_id (requires linking to patient profile)             │
└────────────────────────────────────────────────────────────────────────┘

FINDING #3: Audit Logs - Broad Service Role INSERT
┌────────────────────────────────────────────────────────────────────────┐
│ Severity: LOW                                                          │
│ Table: audit_logs                                                      │
│ Policy: "Service role can insert audit logs" WITH CHECK (true)         │
│                                                                        │
│ Issue: Service role can insert any audit log without validation.      │
│ Contains PII (ip_address, user_agent)                                 │
│                                                                        │
│ Recommendation: Verify edge functions properly scope audit logging.   │
│ Current deny-anonymous policy is good but may not cover all vectors.  │
└────────────────────────────────────────────────────────────────────────┘
*/
