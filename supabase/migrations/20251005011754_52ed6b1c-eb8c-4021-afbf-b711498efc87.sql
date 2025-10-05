-- Fix security issue: explicitly deny anonymous access to audit_logs
CREATE POLICY "Deny anonymous access to audit logs" 
ON public.audit_logs 
FOR SELECT 
TO anon 
USING (false);