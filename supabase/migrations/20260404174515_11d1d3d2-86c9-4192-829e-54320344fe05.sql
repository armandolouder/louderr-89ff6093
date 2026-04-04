
-- Helper to get owner user_id for webhook contexts (no auth)
CREATE OR REPLACE FUNCTION public.get_webhook_owner_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT user_id FROM public.contacts WHERE user_id IS NOT NULL LIMIT 1),
    (SELECT id FROM auth.users LIMIT 1)
  );
$$;
