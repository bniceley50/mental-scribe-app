-- P0 FIX: Secret version rotation for new hash algorithm
-- Future rows will use v2 (delimited concat), legacy rows remain on v1

-- 1) Add v2 secret (replace with actual 32-byte hex in production)
INSERT INTO private.audit_secrets(version, secret)
VALUES (2, 'REPLACE-WITH-ACTUAL-32-BYTE-HEX-IN-PRODUCTION-VIA-ENV')
ON CONFLICT (version) DO NOTHING;

-- 2) Set default secret version to 2 for all new audit log entries
-- Existing rows remain at their original version (v1)
ALTER TABLE public.audit_logs 
  ALTER COLUMN secret_version SET DEFAULT 2;

-- CRITICAL: Never alter existing rows' secret_version or hash values
-- The dual-algorithm verifier handles both v1 and v2 transparently