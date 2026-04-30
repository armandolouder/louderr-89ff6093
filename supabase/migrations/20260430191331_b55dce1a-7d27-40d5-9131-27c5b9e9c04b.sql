-- Tabela para credenciais pessoais do Instagram (método não-oficial via cookies)
CREATE TABLE public.instagram_personal_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  ig_username text,
  ig_user_id text,
  sessionid text NOT NULL,
  csrftoken text,
  ds_user_id text,
  status text NOT NULL DEFAULT 'active',
  last_verified_at timestamp with time zone,
  last_inbox_check_at timestamp with time zone,
  last_inbox_cursor text,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.instagram_personal_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner access instagram_personal_credentials"
  ON public.instagram_personal_credentials
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_user_id_instagram_personal_credentials
  BEFORE INSERT ON public.instagram_personal_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_id();

CREATE TRIGGER update_updated_at_instagram_personal_credentials
  BEFORE UPDATE ON public.instagram_personal_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();