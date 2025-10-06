-- Harden permissions on user_sessions_safe view
-- Ensure it inherits RLS and is not publicly readable

-- Ensure both security settings are applied
ALTER VIEW public.user_sessions_safe SET (security_invoker = true);
ALTER VIEW public.user_sessions_safe SET (security_barrier = true);

-- Revoke any public/anon access just in case
REVOKE ALL ON public.user_sessions_safe FROM PUBLIC;
REVOKE ALL ON public.user_sessions_safe FROM anon;

-- Grant least-privilege access
GRANT SELECT ON public.user_sessions_safe TO authenticated;
GRANT SELECT ON public.user_sessions_safe TO service_role; -- for backend jobs if needed
