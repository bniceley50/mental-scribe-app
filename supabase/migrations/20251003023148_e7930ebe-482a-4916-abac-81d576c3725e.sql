-- Phase 1: 42 CFR Part 2 Compliance - Database Foundation
-- Feature flag: PART2_ENFORCEMENT (will be false initially)

-- ============================================================================
-- 1. PROGRAMS & MEMBERSHIPS
-- ============================================================================

-- Program catalog (source of Part 2 designation)
CREATE TABLE IF NOT EXISTS public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  org_unit_code TEXT,
  is_part2 BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- Program roles enum
DO $$ BEGIN
  CREATE TYPE public.program_role AS ENUM (
    'treating_provider',
    'care_team',
    'program_admin'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- User-Program memberships
CREATE TABLE IF NOT EXISTS public.user_program_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  role public.program_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, program_id, role)
);

ALTER TABLE public.user_program_memberships ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is a member of a program
CREATE OR REPLACE FUNCTION public.is_program_member(_user_id UUID, _program_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_program_memberships
    WHERE user_id = _user_id
      AND program_id = _program_id
  );
$$;

-- ============================================================================
-- 2. DISCLOSURE CONSENTS (metadata only, no PHI)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.disclosure_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_external_id TEXT NOT NULL,
  scope JSONB NOT NULL,
  purpose TEXT NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  artifact_hash TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.disclosure_consents ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. ADD CLASSIFICATION & PROGRAM TO PHI TABLES
-- ============================================================================

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id);

ALTER TABLE public.structured_notes
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id);

ALTER TABLE public.uploaded_files
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id);

-- ============================================================================
-- 4. AUTO-CLASSIFICATION LOGIC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.derive_classification(_program_id UUID)
RETURNS public.data_classification
LANGUAGE sql
STABLE
AS $$
  SELECT CASE 
    WHEN p.is_part2 THEN 'part2_protected'::public.data_classification
    ELSE 'standard_phi'::public.data_classification
  END
  FROM public.programs p
  WHERE p.id = _program_id;
$$;

CREATE OR REPLACE FUNCTION public.classify_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.program_id IS NOT NULL THEN
    NEW.data_classification := public.derive_classification(NEW.program_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_classify_conversation ON public.conversations;
CREATE TRIGGER tr_classify_conversation
  BEFORE INSERT ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.classify_conversation();

CREATE OR REPLACE FUNCTION public.classify_structured_note()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.program_id IS NOT NULL THEN
    NEW.data_classification := public.derive_classification(NEW.program_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_classify_structured_note ON public.structured_notes;
CREATE TRIGGER tr_classify_structured_note
  BEFORE INSERT ON public.structured_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.classify_structured_note();

CREATE OR REPLACE FUNCTION public.classify_uploaded_file()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.program_id IS NOT NULL THEN
    NEW.data_classification := public.derive_classification(NEW.program_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_classify_uploaded_file ON public.uploaded_files;
CREATE TRIGGER tr_classify_uploaded_file
  BEFORE INSERT ON public.uploaded_files
  FOR EACH ROW
  EXECUTE FUNCTION public.classify_uploaded_file();

-- ============================================================================
-- 5. ENRICH AUDIT LOGS FOR PART 2 DISCLOSURES
-- ============================================================================

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id),
  ADD COLUMN IF NOT EXISTS consent_id UUID REFERENCES public.disclosure_consents(id),
  ADD COLUMN IF NOT EXISTS purpose TEXT;

-- ============================================================================
-- 6. RLS POLICIES - PART 2 ACCESS CONTROL
-- ============================================================================

CREATE POLICY "Anyone can view programs"
  ON public.programs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage programs"
  ON public.programs
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own memberships"
  ON public.user_program_memberships
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can manage memberships"
  ON public.user_program_memberships
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can manage consents"
  ON public.disclosure_consents
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Part 2 conversations visible to program members"
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin')
    OR (
      data_classification = 'part2_protected'
      AND program_id IS NOT NULL
      AND public.is_program_member(auth.uid(), program_id)
    )
  );

CREATE POLICY "Part 2 notes visible to program members"
  ON public.structured_notes
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin')
    OR (
      data_classification = 'part2_protected'
      AND program_id IS NOT NULL
      AND public.is_program_member(auth.uid(), program_id)
    )
  );

CREATE POLICY "Part 2 files visible to program members"
  ON public.uploaded_files
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = uploaded_files.conversation_id
        AND (
          c.user_id = auth.uid()
          OR has_role(auth.uid(), 'admin')
          OR (
            c.data_classification = 'part2_protected'
            AND c.program_id IS NOT NULL
            AND public.is_program_member(auth.uid(), c.program_id)
          )
        )
    )
  );

-- ============================================================================
-- 7. BACKFILL "GENERAL CARE" PROGRAM & EXISTING DATA
-- ============================================================================

INSERT INTO public.programs (id, name, is_part2, org_unit_code)
VALUES ('00000000-0000-0000-0000-000000000001', 'General Care', false, 'GEN')
ON CONFLICT (id) DO NOTHING;

UPDATE public.conversations
SET program_id = '00000000-0000-0000-0000-000000000001',
    data_classification = 'standard_phi'
WHERE program_id IS NULL;

UPDATE public.structured_notes
SET program_id = '00000000-0000-0000-0000-000000000001',
    data_classification = 'standard_phi'
WHERE program_id IS NULL;

UPDATE public.uploaded_files uf
SET program_id = '00000000-0000-0000-0000-000000000001'
WHERE program_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = uf.conversation_id
      AND c.program_id = '00000000-0000-0000-0000-000000000001'
  );

-- ============================================================================
-- 8. TRIGGERS FOR TIMESTAMPS
-- ============================================================================

CREATE TRIGGER update_programs_updated_at
  BEFORE UPDATE ON public.programs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_disclosure_consents_updated_at
  BEFORE UPDATE ON public.disclosure_consents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();