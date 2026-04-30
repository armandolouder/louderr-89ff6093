CREATE OR REPLACE FUNCTION public.find_meta_user_by_verify_token(_token TEXT)
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.meta_credentials WHERE webhook_verify_token = _token LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.find_meta_user_by_verify_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_meta_user_by_verify_token(TEXT) TO anon, authenticated, service_role;