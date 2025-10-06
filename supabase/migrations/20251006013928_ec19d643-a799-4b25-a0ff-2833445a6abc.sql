-- CRITICAL FIX: Tighten clients table RLS to prevent cross-organizational data exposure
-- Users should ONLY access their own clients OR clients they're explicitly assigned to treat

-- Drop overly permissive policies
DROP POLICY IF EXISTS "clients_block_anonymous_select" ON public.clients;
DROP POLICY IF EXISTS "clients_block_anonymous_insert" ON public.clients;
DROP POLICY IF EXISTS "clients_block_anonymous_update" ON public.clients;
DROP POLICY IF EXISTS "clients_block_anonymous_delete" ON public.clients;

-- Owner policies (users access their own client records)
-- These are fine and remain unchanged:
-- - clients_owner_select
-- - clients_owner_insert
-- - clients_owner_delete
-- - clients_owner_update_safe

-- Admin policy remains unchanged:
-- - clients_admin_select

-- Tighten clinical staff policy: must be assigned + same program
DROP POLICY IF EXISTS "clients_clinical_staff_select" ON public.clients;
CREATE POLICY "clients_clinical_staff_select"
ON public.clients
FOR SELECT
USING (
  program_id IS NOT NULL
  AND is_clinical_staff(auth.uid(), program_id)
  AND is_assigned_to_patient(auth.uid(), id)
);

-- Prevent any other authenticated users from accessing clients they don't own or aren't assigned to
-- This is enforced by the FORCE ROW LEVEL SECURITY and the specific policies above
