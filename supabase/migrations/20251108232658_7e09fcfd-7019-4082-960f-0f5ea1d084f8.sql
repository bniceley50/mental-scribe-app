-- SPEC-2 Phase 1: Critical Performance & Security Optimizations

-- ============================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- ============================================================

-- Clients table
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_program_id ON clients(program_id);

-- Conversations table
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_program_id ON conversations(program_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON conversations(client_id);

-- Messages table
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- Structured notes table
CREATE INDEX IF NOT EXISTS idx_structured_notes_user_id ON structured_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_structured_notes_program_id ON structured_notes(program_id);
CREATE INDEX IF NOT EXISTS idx_structured_notes_client_id ON structured_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_structured_notes_conversation_id ON structured_notes(conversation_id);

-- Part 2 consents table
CREATE INDEX IF NOT EXISTS idx_part2_consents_conversation_id ON part2_consents(conversation_id);
CREATE INDEX IF NOT EXISTS idx_part2_consents_user_id ON part2_consents(user_id);

-- Recordings table
CREATE INDEX IF NOT EXISTS idx_recordings_user_id ON recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_client_id ON recordings(client_id);
CREATE INDEX IF NOT EXISTS idx_recordings_conversation_id ON recordings(conversation_id);
CREATE INDEX IF NOT EXISTS idx_recordings_program_id ON recordings(program_id);

-- Uploaded files table
CREATE INDEX IF NOT EXISTS idx_uploaded_files_conversation_id ON uploaded_files(conversation_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_client_id ON uploaded_files(client_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_program_id ON uploaded_files(program_id);

-- Patient assignments
CREATE INDEX IF NOT EXISTS idx_patient_assignments_staff_user_id ON patient_assignments(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_patient_assignments_client_id ON patient_assignments(client_id);

-- User program memberships
CREATE INDEX IF NOT EXISTS idx_user_program_memberships_user_id ON user_program_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_program_memberships_program_id ON user_program_memberships(program_id);

-- ============================================================
-- 2. COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================

-- Messages: ordered by conversation + time (for pagination)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
  ON messages(conversation_id, created_at DESC);

-- Audit logs: user activity timeline
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action_ts 
  ON audit_logs(user_id, action, created_at DESC);

-- Conversations: user's recent conversations
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated 
  ON conversations(user_id, updated_at DESC);

-- Client access logs: audit trail by client
CREATE INDEX IF NOT EXISTS idx_client_access_logs_client_id_ts
  ON client_access_logs(client_id, created_at DESC);

-- ============================================================
-- 3. ENFORCE AUDIT LOG IMMUTABILITY (security hardening)
-- ============================================================

-- Block updates to audit logs (records are immutable)
DROP POLICY IF EXISTS audit_logs_immutable_update ON audit_logs;
CREATE POLICY audit_logs_immutable_update ON audit_logs
  FOR UPDATE USING (false);

-- Audit logs already have delete blocked, but make it explicit
DROP POLICY IF EXISTS audit_logs_immutable_delete_strict ON audit_logs;
CREATE POLICY audit_logs_immutable_delete_strict ON audit_logs
  FOR DELETE USING (false);

-- Same for client_access_logs (already have policies, but reinforce)
DROP POLICY IF EXISTS client_access_logs_immutable_update_strict ON client_access_logs;
CREATE POLICY client_access_logs_immutable_update_strict ON client_access_logs
  FOR UPDATE USING (false);

DROP POLICY IF EXISTS client_access_logs_immutable_delete_strict ON client_access_logs;
CREATE POLICY client_access_logs_immutable_delete_strict ON client_access_logs
  FOR DELETE USING (false);

-- ============================================================
-- 4. PERFORMANCE MONITORING HELPER VIEWS
-- ============================================================

-- View for checking index usage (helps identify unused indexes)
CREATE OR REPLACE VIEW performance_index_usage AS
SELECT 
  schemaname,
  relname as table_name,
  indexrelname as index_name,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;

-- View for checking table bloat
CREATE OR REPLACE VIEW performance_table_bloat AS
SELECT 
  schemaname,
  relname as table_name,
  n_live_tup as live_tuples,
  n_dead_tup as dead_tuples,
  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as pct_dead,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_dead_tup DESC;

-- ============================================================
-- 5. GRANT PERMISSIONS
-- ============================================================

-- Grant SELECT on performance views to authenticated users with admin role
GRANT SELECT ON performance_index_usage TO authenticated;
GRANT SELECT ON performance_table_bloat TO authenticated;