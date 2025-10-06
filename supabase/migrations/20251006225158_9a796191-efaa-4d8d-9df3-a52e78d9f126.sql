-- Fix: Enable RLS on user_sessions_safe view to prevent public access to session metadata
-- CRITICAL SECURITY: The user_sessions_safe view currently has no RLS, exposing session data

-- The user_sessions_safe view is designed to show session metadata without sensitive tokens
-- We need to enable RLS on this view to restrict access to:
-- 1. Users viewing only their own sessions
-- 2. Admins viewing all sessions

-- Enable RLS on the view
ALTER VIEW public.user_sessions_safe SET (security_invoker = true);

-- Add RLS policies for the view
-- Note: Views with security_invoker=true use the calling user's permissions
-- So we need to ensure the underlying user_sessions table policies are correct

-- Alternative: Convert view to materialized view with RLS, or create policies
-- Since views don't directly support RLS policies in standard PostgreSQL,
-- we'll use security_invoker to make the view respect the RLS of underlying tables

-- Verify user_sessions table has proper RLS (it already does based on schema)
-- The view will now respect those policies automatically with security_invoker=true