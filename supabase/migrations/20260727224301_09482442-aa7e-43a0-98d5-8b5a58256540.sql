CREATE OR REPLACE FUNCTION public.debug_whoami()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'current_user', current_user,
    'session_user', session_user,
    'uid', auth.uid(),
    'jwt_role', current_setting('request.jwt.claim.role', true)
  )
$$;
GRANT EXECUTE ON FUNCTION public.debug_whoami() TO authenticated, anon;