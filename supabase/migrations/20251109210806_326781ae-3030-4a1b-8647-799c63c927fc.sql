-- Enable realtime for audit_verify_runs table
-- This allows clients to subscribe to real-time updates when new verification runs are created

-- Add the table to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE audit_verify_runs;

-- Set REPLICA IDENTITY to FULL to capture complete row data during updates
ALTER TABLE audit_verify_runs REPLICA IDENTITY FULL;