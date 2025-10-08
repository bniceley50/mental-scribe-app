-- Enforce immutability of audit_logs and remove any DELETE/UPDATE capabilities
-- Apply in staging first. Take a snapshot/backup before production.

-- 0) Safety: only proceed if table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_logs'
  ) THEN
    RAISE EXCEPTION 'audit_logs table not found; aborting immutability migration';
  END IF;
END$$;

-- 1) Drop any permissive policies (best-effort)
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_logs'
      AND (cmd = 'DELETE' OR cmd = 'UPDATE')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.audit_logs;', pol.policyname);
  END LOOP;
END$$;

-- 2) Revoke DELETE/UPDATE from all roles we can safely touch
REVOKE UPDATE, DELETE ON public.audit_logs FROM PUBLIC;

-- (Optional) list known app/admin roles here if you have them:
-- REVOKE UPDATE, DELETE ON public.audit_logs FROM admin;

-- 3) Create SECURITY DEFINER trigger function that blocks UPDATE/DELETE
CREATE OR REPLACE FUNCTION public.prevent_audit_mods()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  RAISE EXCEPTION 'audit_logs are immutable and cannot be %', TG_OP;
END
$fn$;

-- 4) Replace the immutability trigger
DROP TRIGGER IF EXISTS audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_mods();

-- 5) (Strongly recommended, separate ops playbook)
-- Ship audit_logs to an external append-only target (e.g., S3 Object Lock/Glacier or SIEM)
-- on a schedule. Keep that in infra/ops, not here.