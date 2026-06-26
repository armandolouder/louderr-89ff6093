REVOKE EXECUTE ON FUNCTION public.audit_catalog() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.audit_catalog() TO authenticated, service_role;